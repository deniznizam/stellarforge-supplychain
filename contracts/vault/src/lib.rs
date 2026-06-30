#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, IntoVal, Symbol, vec};
use soroban_sdk::auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation};

#[contracttype]
pub enum DataKey {
    Escrow,
    Collateral(Address),
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    pub fn initialize(env: Env, escrow: Address) {
        if env.storage().instance().has(&DataKey::Escrow) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Escrow, &escrow);
    }

    pub fn deposit_collateral(env: Env, borrower: Address, token: Address, amount: i128) {
        borrower.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        // Transfer from borrower to Vault contract address
        let token_client = soroban_sdk::token::Client::new(&env, &token);
        token_client.transfer(&borrower, &env.current_contract_address(), &amount);

        let current: i128 = env.storage().persistent().get(&DataKey::Collateral(borrower.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::Collateral(borrower), &(current + amount));
    }

    pub fn get_collateral_amount(env: Env, borrower: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Collateral(borrower)).unwrap_or(0)
    }

    pub fn lock_collateral(env: Env, borrower: Address, amount: i128) {
        let escrow: Address = env.storage().instance().get(&DataKey::Escrow).unwrap();
        escrow.require_auth();
        let current = Self::get_collateral_amount(env.clone(), borrower.clone());
        if current < amount {
            panic!("Insufficient collateral deposited");
        }
    }

    pub fn release_collateral(env: Env, borrower: Address, recipient: Address, token: Address, amount: i128) {
        let escrow: Address = env.storage().instance().get(&DataKey::Escrow).unwrap();
        escrow.require_auth();
        let current = Self::get_collateral_amount(env.clone(), borrower.clone());
        if current < amount {
            panic!("Insufficient collateral to release");
        }
        env.storage().persistent().set(&DataKey::Collateral(borrower.clone()), &(current - amount));

        // Pre-authorize token transfer from Vault address to recipient
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: token.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), recipient.clone(), amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_client = soroban_sdk::token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);
    }

    pub fn liquidate_collateral(env: Env, borrower: Address, recipient: Address, token: Address) -> i128 {
        let escrow: Address = env.storage().instance().get(&DataKey::Escrow).unwrap();
        escrow.require_auth();
        let amount = Self::get_collateral_amount(env.clone(), borrower.clone());
        if amount <= 0 {
            panic!("No collateral to liquidate");
        }
        env.storage().persistent().set(&DataKey::Collateral(borrower.clone()), &0i128);

        // Pre-authorize token transfer from Vault address to recipient
        env.authorize_as_current_contract(vec![
            &env,
            InvokerContractAuthEntry::Contract(SubContractInvocation {
                context: ContractContext {
                    contract: token.clone(),
                    fn_name: Symbol::new(&env, "transfer"),
                    args: (env.current_contract_address(), recipient.clone(), amount).into_val(&env),
                },
                sub_invocations: vec![&env],
            }),
        ]);

        let token_client = soroban_sdk::token::Client::new(&env, &token);
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);
        amount
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_vault_init_only() {
        let env = Env::default();
        let vault_id = env.register_contract(None, VaultContract);
        let vault_client = VaultContractClient::new(&env, &vault_id);
        let escrow = Address::generate(&env);
        vault_client.initialize(&escrow);
    }

    #[test]
    fn test_vault_register_sac_only() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(admin);
        let token_client = soroban_sdk::token::Client::new(&env, &token_id);
        let borrower = Address::generate(&env);
        assert_eq!(token_client.balance(&borrower), 0);
    }

    #[test]
    fn test_vault_full_flow() {
        let env = Env::default();
        let vault_id = env.register_contract(None, VaultContract);
        let vault_client = VaultContractClient::new(&env, &vault_id);

        let admin = Address::generate(&env);
        let escrow = Address::generate(&env);
        let borrower = Address::generate(&env);

        let token_id = env.register_stellar_asset_contract(admin);
        let token_admin = soroban_sdk::token::StellarAssetClient::new(&env, &token_id);
        let token_client = soroban_sdk::token::Client::new(&env, &token_id);

        vault_client.initialize(&escrow);

        env.mock_all_auths();
        token_admin.mint(&borrower, &10000);
        
        // Step 1: Deposit 1000
        vault_client.deposit_collateral(&borrower, &token_id, &1000);
        assert_eq!(vault_client.get_collateral_amount(&borrower), 1000);
        assert_eq!(token_client.balance(&borrower), 9000);
        assert_eq!(token_client.balance(&vault_id), 1000);

        // Step 2: Lock 500
        vault_client.lock_collateral(&borrower, &500);

        // Step 3: Release 400
        vault_client.release_collateral(&borrower, &borrower, &token_id, &400);
        assert_eq!(vault_client.get_collateral_amount(&borrower), 600);
        assert_eq!(token_client.balance(&borrower), 9400);
        assert_eq!(token_client.balance(&vault_id), 600);

        // Step 4: Liquidate 600
        let liquidated = vault_client.liquidate_collateral(&borrower, &escrow, &token_id);
        assert_eq!(liquidated, 600);
        assert_eq!(vault_client.get_collateral_amount(&borrower), 0);
        assert_eq!(token_client.balance(&escrow), 600);
        assert_eq!(token_client.balance(&vault_id), 0);
    }
}
