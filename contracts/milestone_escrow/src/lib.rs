#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, Address, Env, String, Symbol, Vec, vec, IntoVal
};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};

// Import client structures directly from other contracts in the workspace
use stellarforge_vault::VaultContractClient;
use stellarforge_oracle::OracleContractClient;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    InvalidState = 3,
    DeadlineNotPassed = 4,
    InsufficientCollateral = 5,
    InsufficientFunds = 6,
    MilestoneNotFound = 7,
    ProjectNotActive = 8,
    OracleValidationFailed = 9,
    DeadlinePassed = 10,
    NoContribution = 11,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProjectStatus {
    Pending,      // Funding in progress
    Active,       // Funding target met, execution in progress
    Completed,    // Repaid by buyer, collateral returned, lenders paid
    Liquidated,   // Default triggered, collateral distributed to lenders
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MilestoneStatus {
    Pending,
    ProofSubmitted,
    Approved,
    Rejected,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub id: u32,
    pub description: String,
    pub deadline: u64,
    pub amount_to_release: i128,
    pub proof_hash: String,
    pub status: MilestoneStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Project {
    pub id: u64,
    pub borrower: Address,
    pub buyer: Address,
    pub token: Address,
    pub target_amount: i128,
    pub funded_amount: i128,
    pub funding_deadline: u64,
    pub milestones: Vec<Milestone>,
    pub status: ProjectStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Vault,
    Oracle,
    Token,
    ProjectCount,
    Project(u64),
    Lenders(u64),
    Contribution(u64, Address),
}

#[contract]
pub struct MilestoneEscrowContract;

#[contractimpl]
impl MilestoneEscrowContract {
    pub fn initialize(env: Env, admin: Address, vault: Address, oracle: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::ProjectCount, &0u64);
        Ok(())
    }

    pub fn create_project(
        env: Env,
        borrower: Address,
        buyer: Address,
        target_amount: i128,
        funding_deadline: u64,
        milestones: Vec<Milestone>
    ) -> Result<u64, Error> {
        borrower.require_auth();

        if target_amount <= 0 {
            return Err(Error::InvalidState);
        }

        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();

        // 50% collateral required
        let required_collateral = target_amount / 2;

        // Perform explicit check before calling Vault to prevent uncatchable panic under Windows runner
        let collateral = VaultContractClient::new(&env, &vault).get_collateral_amount(&borrower);
        if collateral < required_collateral {
            return Err(Error::InsufficientCollateral);
        }

        // Call Vault to lock the collateral
        VaultContractClient::new(&env, &vault).lock_collateral(&borrower, &required_collateral);

        let count: u64 = env.storage().instance().get(&DataKey::ProjectCount).unwrap_or(0);
        let project_id = count + 1;
        env.storage().instance().set(&DataKey::ProjectCount, &project_id);

        let project = Project {
            id: project_id,
            borrower: borrower.clone(),
            buyer,
            token: token.clone(),
            target_amount,
            funded_amount: 0,
            funding_deadline,
            milestones,
            status: ProjectStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        // Emit ProjectCreated event
        env.events().publish(
            (Symbol::new(&env, "proj_created"), project_id),
            (borrower, target_amount, token)
        );

        Ok(project_id)
    }

    pub fn fund_project(env: Env, lender: Address, project_id: u64, amount: i128) -> Result<(), Error> {
        lender.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidState);
        }

        let mut project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        if project.status != ProjectStatus::Pending {
            return Err(Error::InvalidState);
        }
        if env.ledger().timestamp() > project.funding_deadline {
            return Err(Error::DeadlinePassed);
        }

        // Transfer funds from lender to Escrow contract
        let token_client = soroban_sdk::token::Client::new(&env, &project.token);
        token_client.transfer(&lender, &env.current_contract_address(), &amount);

        // Update contribution state
        let contribution: i128 = env.storage().persistent().get(&DataKey::Contribution(project_id, lender.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Contribution(project_id, lender.clone()), &(contribution + amount));

        // Update lenders list
        let mut lenders: Vec<Address> = env.storage().persistent().get(&DataKey::Lenders(project_id)).unwrap_or_else(|| Vec::new(&env));
        let mut exists = false;
        for l in lenders.iter() {
            if l == lender {
                exists = true;
                break;
            }
        }
        if !exists {
            lenders.push_back(lender);
            env.storage().persistent().set(&DataKey::Lenders(project_id), &lenders);
        }

        project.funded_amount += amount;

        if project.funded_amount >= project.target_amount {
            project.status = ProjectStatus::Active;
            env.events().publish((Symbol::new(&env, "proj_active"), project_id), ());
        }

        env.storage().persistent().set(&DataKey::Project(project_id), &project);
        Ok(())
    }

    pub fn claim_refund(env: Env, lender: Address, project_id: u64) -> Result<(), Error> {
        lender.require_auth();

        let project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        if project.status != ProjectStatus::Pending {
            return Err(Error::InvalidState);
        }
        if env.ledger().timestamp() <= project.funding_deadline {
            return Err(Error::DeadlineNotPassed);
        }

        let amount: i128 = env.storage().persistent().get(&DataKey::Contribution(project_id, lender.clone())).unwrap_or(0);
        if amount <= 0 {
            return Err(Error::NoContribution);
        }

        env.storage().persistent().set(&DataKey::Contribution(project_id, lender.clone()), &0i128);

        // Pre-authorize token transfer from Escrow address to lender
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: project.token.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), lender.clone(), amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_client = soroban_sdk::token::Client::new(&env, &project.token);
        token_client.transfer(&env.current_contract_address(), &lender, &amount);
        Ok(())
    }

    pub fn submit_milestone_proof(env: Env, project_id: u64, milestone_id: u32, proof_hash: String) -> Result<(), Error> {
        let mut project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        project.borrower.require_auth();

        if project.status != ProjectStatus::Active {
            return Err(Error::ProjectNotActive);
        }

        let mut found = false;
        let mut milestones = Vec::new(&env);

        for mut milestone in project.milestones.iter() {
            if milestone.id == milestone_id {
                if milestone.status != MilestoneStatus::Pending && milestone.status != MilestoneStatus::Rejected {
                    return Err(Error::InvalidState);
                }
                milestone.proof_hash = proof_hash.clone();
                milestone.status = MilestoneStatus::ProofSubmitted;
                found = true;
            }
            milestones.push_back(milestone);
        }

        if !found {
            return Err(Error::MilestoneNotFound);
        }

        project.milestones = milestones;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        env.events().publish(
            (Symbol::new(&env, "proof_submitted"), project_id, milestone_id),
            (proof_hash,)
        );
        Ok(())
    }

    pub fn approve_milestone(env: Env, validator: Address, project_id: u64, milestone_id: u32) -> Result<(), Error> {
        validator.require_auth();

        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        let is_val = OracleContractClient::new(&env, &oracle).is_validator(&validator);
        if !is_val {
            return Err(Error::NotAuthorized);
        }

        let mut project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        if project.status != ProjectStatus::Active {
            return Err(Error::ProjectNotActive);
        }

        let mut amount_released = 0i128;
        let mut found = false;
        let mut milestones = Vec::new(&env);

        for mut milestone in project.milestones.iter() {
            if milestone.id == milestone_id {
                if milestone.status != MilestoneStatus::ProofSubmitted {
                    return Err(Error::InvalidState);
                }

                let is_valid = OracleContractClient::new(&env, &oracle).validate_proof(&project_id, &milestone_id, &milestone.proof_hash);
                if !is_valid {
                    return Err(Error::OracleValidationFailed);
                }

                milestone.status = MilestoneStatus::Approved;
                amount_released = milestone.amount_to_release;
                found = true;
            }
            milestones.push_back(milestone);
        }

        if !found {
            return Err(Error::MilestoneNotFound);
        }

        project.milestones = milestones;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        // Transfer milestone payout to borrower
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: project.token.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), project.borrower.clone(), amount_released).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_client = soroban_sdk::token::Client::new(&env, &project.token);
        token_client.transfer(&env.current_contract_address(), &project.borrower, &amount_released);

        env.events().publish(
            (Symbol::new(&env, "milestone_approved"), project_id, milestone_id),
            (amount_released,)
        );
        Ok(())
    }

    pub fn buyer_confirm_and_repay(env: Env, project_id: u64, repayment_amount: i128) -> Result<(), Error> {
        let mut project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        let buyer = project.buyer.clone();
        buyer.require_auth();

        if project.status != ProjectStatus::Active {
            return Err(Error::ProjectNotActive);
        }

        // Verify all milestones are Approved
        for milestone in project.milestones.iter() {
            if milestone.status != MilestoneStatus::Approved {
                return Err(Error::InvalidState);
            }
        }

        // Transfer repayment from buyer to Escrow contract
        let token_client = soroban_sdk::token::Client::new(&env, &project.token);
        token_client.transfer(&buyer, &env.current_contract_address(), &repayment_amount);

        project.status = ProjectStatus::Completed;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        // Release collateral back to borrower
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        let required_collateral = project.target_amount / 2;
        VaultContractClient::new(&env, &vault).release_collateral(&project.borrower, &project.borrower, &project.token, &required_collateral);

        // Distribute repayment to lenders pro-rata
        let lenders: Vec<Address> = env.storage().persistent().get(&DataKey::Lenders(project_id)).unwrap();
        for lender in lenders.iter() {
            let contribution: i128 = env.storage().persistent().get(&DataKey::Contribution(project_id, lender.clone())).unwrap();
            let payout = (contribution * repayment_amount) / project.target_amount;

            env.authorize_as_current_contract(vec![
                &env,
                InvokerContractAuthEntry::Contract(SubContractInvocation {
                    context: ContractContext {
                        contract: project.token.clone(),
                        fn_name: Symbol::new(&env, "transfer"),
                        args: (env.current_contract_address(), lender.clone(), payout).into_val(&env),
                    },
                    sub_invocations: vec![&env],
                }),
            ]);

            token_client.transfer(&env.current_contract_address(), &lender, &payout);
        }

        env.events().publish(
            (Symbol::new(&env, "repaid"), project_id),
            (repayment_amount, buyer)
        );
        Ok(())
    }

    pub fn trigger_liquidation(env: Env, liquidator: Address, project_id: u64) -> Result<(), Error> {
        liquidator.require_auth();

        let mut project: Project = match env.storage().persistent().get(&DataKey::Project(project_id)) {
            Some(p) => p,
            None => return Err(Error::InvalidState),
        };
        if project.status != ProjectStatus::Active {
            return Err(Error::ProjectNotActive);
        }

        // Check if deadline passed on any unapproved milestone
        let mut is_defaulted = false;
        for milestone in project.milestones.iter() {
            if env.ledger().timestamp() > milestone.deadline && milestone.status != MilestoneStatus::Approved {
                is_defaulted = true;
                break;
            }
        }

        if !is_defaulted {
            return Err(Error::DeadlineNotPassed);
        }

        project.status = ProjectStatus::Liquidated;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        
        // Claim collateral from Vault
        let liquidated_collateral = VaultContractClient::new(&env, &vault).liquidate_collateral(&project.borrower, &env.current_contract_address(), &project.token);

        // 5% reward to liquidator
        let reward = liquidated_collateral * 5 / 100;
        let remaining_collateral = liquidated_collateral - reward;

        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: project.token.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), liquidator.clone(), reward).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_client = soroban_sdk::token::Client::new(&env, &project.token);
        token_client.transfer(&env.current_contract_address(), &liquidator, &reward);

        // Calculate unreleased escrow funds (target_amount - approved release amounts)
        let mut total_released = 0i128;
        for milestone in project.milestones.iter() {
            if milestone.status == MilestoneStatus::Approved {
                total_released += milestone.amount_to_release;
            }
        }
        let unreleased_escrow = project.target_amount - total_released;
        let total_pool = remaining_collateral + unreleased_escrow;

        // Distribute pool to lenders pro-rata
        let lenders: Vec<Address> = env.storage().persistent().get(&DataKey::Lenders(project_id)).unwrap();
        for lender in lenders.iter() {
            let contribution: i128 = env.storage().persistent().get(&DataKey::Contribution(project_id, lender.clone())).unwrap();
            let payout = (contribution * total_pool) / project.target_amount;

            env.authorize_as_current_contract(vec![
                &env,
                InvokerContractAuthEntry::Contract(SubContractInvocation {
                    context: ContractContext {
                        contract: project.token.clone(),
                        fn_name: Symbol::new(&env, "transfer"),
                        args: (env.current_contract_address(), lender.clone(), payout).into_val(&env),
                    },
                    sub_invocations: vec![&env],
                }),
            ]);

            token_client.transfer(&env.current_contract_address(), &lender, &payout);
        }

        env.events().publish(
            (Symbol::new(&env, "liquidated"), project_id),
            (liquidated_collateral, liquidator)
        );
        Ok(())
    }

    pub fn get_project(env: Env, project_id: u64) -> Project {
        env.storage().persistent().get(&DataKey::Project(project_id)).unwrap()
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger as _};
    use soroban_sdk::token::Client as TokenClient;
    use soroban_sdk::token::StellarAssetClient;
    use stellarforge_oracle::OracleContract;
    use stellarforge_vault::VaultContract;

    fn setup_test_env(env: &Env) -> (
        Address, // token contract ID
        Address, // oracle contract ID
        Address, // vault contract ID
        Address, // escrow contract ID
        MilestoneEscrowContractClient<'static>,
    ) {
        let token_admin = Address::generate(env);
        let token_id = env.register_stellar_asset_contract(token_admin);

        let oracle_admin = Address::generate(env);
        let oracle_id = env.register_contract(None, OracleContract);
        let oracle_client = stellarforge_oracle::OracleContractClient::new(env, &oracle_id);
        oracle_client.initialize(&oracle_admin);

        let vault_id = env.register_contract(None, VaultContract);
        let vault_client = stellarforge_vault::VaultContractClient::new(env, &vault_id);

        let escrow_id = env.register_contract(None, MilestoneEscrowContract);
        let escrow_client = MilestoneEscrowContractClient::new(env, &escrow_id);

        // Vault is initialized with the Escrow address
        vault_client.initialize(&escrow_id);

        // Escrow is initialized with admin, vault, oracle, and token
        let escrow_admin = Address::generate(env);
        escrow_client.initialize(&escrow_admin, &vault_id, &oracle_id, &token_id);

        (token_id, oracle_id, vault_id, escrow_id, escrow_client)
    }

    #[test]
    fn test_happy_path_integration() {
        let env = Env::default();
        let (token_id, oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let lender_a = Address::generate(&env);
        let lender_b = Address::generate(&env);
        let validator = Address::generate(&env);

        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let token_client = TokenClient::new(&env, &token_id);
        let oracle_client = stellarforge_oracle::OracleContractClient::new(&env, &oracle_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        // Mint USDC to Acme (borrower) for collateral
        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        // Deposit 5000 USDC collateral in Vault
        vault_client.deposit_collateral(&borrower, &token_id, &5000);

        // Whitelist validator
        oracle_client.add_validator(&validator);

        // Setup 3 Milestones
        let m1 = Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 1000,
            amount_to_release: 3000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        };
        let m2 = Milestone {
            id: 2,
            description: String::from_str(&env, "Assembly"),
            deadline: 2000,
            amount_to_release: 4000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        };
        let m3 = Milestone {
            id: 3,
            description: String::from_str(&env, "QA"),
            deadline: 3000,
            amount_to_release: 3000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        };

        let mut milestones = Vec::new(&env);
        milestones.push_back(m1);
        milestones.push_back(m2);
        milestones.push_back(m3);

        // Create Project
        let project_id = escrow_client.create_project(&borrower, &buyer, &10000, &500, &milestones);
        assert_eq!(project_id, 1);
        assert_eq!(vault_client.get_collateral_amount(&borrower), 5000);

        // Mint funds to lenders
        token_admin_client.mint(&lender_a, &4000);
        token_admin_client.mint(&lender_b, &6000);

        // Fund Project
        escrow_client.fund_project(&lender_a, &project_id, &4000);
        escrow_client.fund_project(&lender_b, &project_id, &6000);

        let project = escrow_client.get_project(&project_id);
        assert_eq!(project.status, ProjectStatus::Active);

        // Milestone 1 Flow
        escrow_client.submit_milestone_proof(&project_id, &1, &String::from_str(&env, "ipfs://cid1"));
        escrow_client.approve_milestone(&validator, &project_id, &1);
        assert_eq!(token_client.balance(&borrower), 8000); // 5000 remaining collateral + 3000 released

        // Milestone 2 Flow
        escrow_client.submit_milestone_proof(&project_id, &2, &String::from_str(&env, "ipfs://cid2"));
        escrow_client.approve_milestone(&validator, &project_id, &2);
        assert_eq!(token_client.balance(&borrower), 12000); // 5000 collateral + 3000 + 4000 released

        // Milestone 3 Flow
        escrow_client.submit_milestone_proof(&project_id, &3, &String::from_str(&env, "ipfs://cid3"));
        escrow_client.approve_milestone(&validator, &project_id, &3);
        assert_eq!(token_client.balance(&borrower), 15000); // 5000 collateral + 10000 released

        // Buyer repayment: 10,000 principal + 5% yield (500) = 10,500 USDC
        token_admin_client.mint(&buyer, &10500);
        escrow_client.buyer_confirm_and_repay(&project_id, &10500);

        // Verify state changes
        let project_final = escrow_client.get_project(&project_id);
        assert_eq!(project_final.status, ProjectStatus::Completed);

        // Acme Logistics receives 5000 collateral back (USDC balance should be 15000 + 5000 = 20000)
        assert_eq!(token_client.balance(&borrower), 20000);
        assert_eq!(vault_client.get_collateral_amount(&borrower), 0);

        // Lenders receive pro-rata repayment + yield
        assert_eq!(token_client.balance(&lender_a), 4200); // 4000 * 1.05
        assert_eq!(token_client.balance(&lender_b), 6300); // 6000 * 1.05
    }

    #[test]
    fn test_insufficient_collateral() {
        let env = Env::default();
        let (token_id, _oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        // Deposit only 4000 collateral (5000 required for 10000 project)
        vault_client.deposit_collateral(&borrower, &token_id, &4000);

        let mut milestones = Vec::new(&env);
        milestones.push_back(Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 1000,
            amount_to_release: 10000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });

        // Use standard Result return to verify error instead of panic unwind
        let res = escrow_client.try_create_project(&borrower, &buyer, &10000, &500, &milestones);
        assert_eq!(res, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_liquidation_and_reward() {
        let env = Env::default();
        let (token_id, _oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let lender = Address::generate(&env);
        let liquidator = Address::generate(&env);

        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let token_client = TokenClient::new(&env, &token_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        vault_client.deposit_collateral(&borrower, &token_id, &5000);

        let mut milestones = Vec::new(&env);
        milestones.push_back(Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 100, // short deadline
            amount_to_release: 10000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });

        let project_id = escrow_client.create_project(&borrower, &buyer, &10000, &500, &milestones);
        token_admin_client.mint(&lender, &10000);
        escrow_client.fund_project(&lender, &project_id, &10000);

        // Fast forward past milestone deadline (100) using with_mut
        env.ledger().with_mut(|li| {
            li.timestamp = 150;
        });

        // Trigger liquidation
        escrow_client.trigger_liquidation(&liquidator, &project_id);

        let project = escrow_client.get_project(&project_id);
        assert_eq!(project.status, ProjectStatus::Liquidated);

        // 5% liquidator reward: 5000 collateral * 5% = 250 USDC
        assert_eq!(token_client.balance(&liquidator), 250);

        // Lender receives unreleased escrow (10000) + remaining collateral (4750) = 14750 USDC
        assert_eq!(token_client.balance(&lender), 14750);
    }

    #[test]
    fn test_project_expiry_refund() {
        let env = Env::default();
        let (token_id, _oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let lender = Address::generate(&env);

        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let token_client = TokenClient::new(&env, &token_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        vault_client.deposit_collateral(&borrower, &token_id, &5000);

        let mut milestones = Vec::new(&env);
        milestones.push_back(Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 1000,
            amount_to_release: 10000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });

        let project_id = escrow_client.create_project(&borrower, &buyer, &10000, &500, &milestones);
        token_admin_client.mint(&lender, &4000);
        escrow_client.fund_project(&lender, &project_id, &4000);

        // Fast forward past funding deadline (500) using with_mut
        env.ledger().with_mut(|li| {
            li.timestamp = 600;
        });

        // Lender claims refund
        escrow_client.claim_refund(&lender, &project_id);
        assert_eq!(token_client.balance(&lender), 4000);
    }

    #[test]
    fn test_partial_milestone_release() {
        let env = Env::default();
        let (token_id, oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let lender_a = Address::generate(&env);
        let lender_b = Address::generate(&env);
        let validator = Address::generate(&env);

        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let token_client = TokenClient::new(&env, &token_id);
        let oracle_client = stellarforge_oracle::OracleContractClient::new(&env, &oracle_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        vault_client.deposit_collateral(&borrower, &token_id, &5000);

        oracle_client.add_validator(&validator);

        let mut milestones = Vec::new(&env);
        milestones.push_back(Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 1000,
            amount_to_release: 3000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });
        milestones.push_back(Milestone {
            id: 2,
            description: String::from_str(&env, "Assembly"),
            deadline: 2000,
            amount_to_release: 7000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });

        let project_id = escrow_client.create_project(&borrower, &buyer, &10000, &500, &milestones);
        token_admin_client.mint(&lender_a, &3000);
        token_admin_client.mint(&lender_b, &7000);

        escrow_client.fund_project(&lender_a, &project_id, &3000);
        escrow_client.fund_project(&lender_b, &project_id, &7000);

        // Approve Milestone 1
        escrow_client.submit_milestone_proof(&project_id, &1, &String::from_str(&env, "ipfs://proof"));
        escrow_client.approve_milestone(&validator, &project_id, &1);

        // Approve Milestone 2
        escrow_client.submit_milestone_proof(&project_id, &2, &String::from_str(&env, "ipfs://proof"));
        escrow_client.approve_milestone(&validator, &project_id, &2);

        // Buyer repayment: 10,500 USDC
        token_admin_client.mint(&buyer, &10500);
        escrow_client.buyer_confirm_and_repay(&project_id, &10500);

        // Lenders verify yield split
        assert_eq!(token_client.balance(&lender_a), 3150); // 3000 * 1.05
        assert_eq!(token_client.balance(&lender_b), 7350); // 7000 * 1.05
    }

    #[test]
    fn test_oracle_validation_failure() {
        let env = Env::default();
        let (token_id, oracle_id, vault_id, _escrow_id, escrow_client) = setup_test_env(&env);

        let borrower = Address::generate(&env);
        let buyer = Address::generate(&env);
        let lender = Address::generate(&env);
        let validator = Address::generate(&env);

        let token_admin_client = StellarAssetClient::new(&env, &token_id);
        let oracle_client = stellarforge_oracle::OracleContractClient::new(&env, &oracle_id);
        let vault_client = stellarforge_vault::VaultContractClient::new(&env, &vault_id);

        env.mock_all_auths();
        token_admin_client.mint(&borrower, &10000);
        vault_client.deposit_collateral(&borrower, &token_id, &5000);

        oracle_client.add_validator(&validator);

        let mut milestones = Vec::new(&env);
        milestones.push_back(Milestone {
            id: 1,
            description: String::from_str(&env, "Procurement"),
            deadline: 1000,
            amount_to_release: 10000,
            proof_hash: String::from_str(&env, ""),
            status: MilestoneStatus::Pending,
        });

        let project_id = escrow_client.create_project(&borrower, &buyer, &10000, &500, &milestones);
        token_admin_client.mint(&lender, &10000);
        escrow_client.fund_project(&lender, &project_id, &10000);

        // Submit empty proof hash "" (which will fail validation in OracleContract's validate_proof)
        escrow_client.submit_milestone_proof(&project_id, &1, &String::from_str(&env, ""));
        
        // Check for error return instead of panic unwind
        let res = escrow_client.try_approve_milestone(&validator, &project_id, &1);
        assert_eq!(res, Err(Ok(Error::OracleValidationFailed)));
    }
}
