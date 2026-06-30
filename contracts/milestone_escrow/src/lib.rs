#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String, Symbol, Vec, vec, IntoVal
};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};

// Import client structures directly from other contracts in the workspace
use stellarforge_vault::VaultContractClient;
use stellarforge_oracle::OracleContractClient;

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
    pub buyer: Option<Address>,
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
    pub fn initialize(env: Env, admin: Address, vault: Address, oracle: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::ProjectCount, &0u64);
    }

    pub fn create_project(
        env: Env,
        borrower: Address,
        buyer: Option<Address>,
        target_amount: i128,
        funding_deadline: u64,
        milestones: Vec<Milestone>
    ) -> u64 {
        borrower.require_auth();

        if target_amount <= 0 {
            panic!("Target amount must be positive");
        }

        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();

        // 50% collateral required
        let required_collateral = target_amount / 2;

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

        project_id
    }

    pub fn fund_project(env: Env, lender: Address, project_id: u64, amount: i128) {
        lender.require_auth();
        if amount <= 0 {
            panic!("Funding amount must be positive");
        }

        let mut project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        if project.status != ProjectStatus::Pending {
            panic!("Project not open for funding");
        }
        if env.ledger().timestamp() > project.funding_deadline {
            panic!("Funding deadline has passed");
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
    }

    pub fn claim_refund(env: Env, lender: Address, project_id: u64) {
        lender.require_auth();

        let project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        if project.status != ProjectStatus::Pending {
            panic!("Refund not available for active/completed projects");
        }
        if env.ledger().timestamp() <= project.funding_deadline {
            panic!("Funding deadline has not passed yet");
        }

        let amount: i128 = env.storage().persistent().get(&DataKey::Contribution(project_id, lender.clone())).unwrap_or(0);
        if amount <= 0 {
            panic!("No contribution to refund");
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
    }

    pub fn submit_milestone_proof(env: Env, project_id: u64, milestone_id: u32, proof_hash: String) {
        let mut project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        project.borrower.require_auth();

        if project.status != ProjectStatus::Active {
            panic!("Project is not active");
        }

        let mut found = false;
        let mut milestones = Vec::new(&env);

        for mut milestone in project.milestones.iter() {
            if milestone.id == milestone_id {
                if milestone.status != MilestoneStatus::Pending && milestone.status != MilestoneStatus::Rejected {
                    panic!("Milestone proof already submitted or approved");
                }
                milestone.proof_hash = proof_hash.clone();
                milestone.status = MilestoneStatus::ProofSubmitted;
                found = true;
            }
            milestones.push_back(milestone);
        }

        if !found {
            panic!("Milestone not found");
        }

        project.milestones = milestones;
        env.storage().persistent().set(&DataKey::Project(project_id), &project);

        env.events().publish(
            (Symbol::new(&env, "proof_submitted"), project_id, milestone_id),
            (proof_hash,)
        );
    }

    pub fn approve_milestone(env: Env, validator: Address, project_id: u64, milestone_id: u32) {
        validator.require_auth();

        let oracle: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();
        let is_val = OracleContractClient::new(&env, &oracle).is_validator(&validator);
        if !is_val {
            panic!("Caller is not a registered validator");
        }

        let mut project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        if project.status != ProjectStatus::Active {
            panic!("Project is not active");
        }

        let mut amount_released = 0i128;
        let mut found = false;
        let mut milestones = Vec::new(&env);

        for mut milestone in project.milestones.iter() {
            if milestone.id == milestone_id {
                if milestone.status != MilestoneStatus::ProofSubmitted {
                    panic!("No proof submitted for this milestone");
                }

                let is_valid = OracleContractClient::new(&env, &oracle).validate_proof(&project_id, &milestone_id, &milestone.proof_hash);
                if !is_valid {
                    panic!("Oracle proof validation failed");
                }

                milestone.status = MilestoneStatus::Approved;
                amount_released = milestone.amount_to_release;
                found = true;
            }
            milestones.push_back(milestone);
        }

        if !found {
            panic!("Milestone not found");
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
    }

    pub fn buyer_confirm_and_repay(env: Env, project_id: u64, repayment_amount: i128) {
        let mut project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        let buyer = project.buyer.clone().expect("Project has no registered buyer");
        buyer.require_auth();

        if project.status != ProjectStatus::Active {
            panic!("Project is not active");
        }

        // Verify all milestones are Approved
        for milestone in project.milestones.iter() {
            if milestone.status != MilestoneStatus::Approved {
                panic!("Cannot repay: outstanding unapproved milestones");
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
    }

    pub fn trigger_liquidation(env: Env, liquidator: Address, project_id: u64) {
        liquidator.require_auth();

        let mut project: Project = env.storage().persistent().get(&DataKey::Project(project_id)).unwrap();
        if project.status != ProjectStatus::Active {
            panic!("Project is not active");
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
            panic!("No defaulted milestone found; cannot liquidate");
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
    }

    pub fn get_project(env: Env, project_id: u64) -> Project {
        env.storage().persistent().get(&DataKey::Project(project_id)).unwrap()
    }
}
