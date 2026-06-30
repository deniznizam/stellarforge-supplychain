#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    Validator(Address),
}

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn add_validator(env: Env, validator: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().set(&DataKey::Validator(validator), &true);
    }

    pub fn remove_validator(env: Env, validator: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::Validator(validator));
    }

    pub fn is_validator(env: Env, validator: Address) -> bool {
        env.storage().persistent().has(&DataKey::Validator(validator))
    }

    pub fn validate_proof(env: Env, _project_id: u64, _milestone_id: u32, proof_hash: String) -> bool {
        // Validation passes if the proof_hash length is greater than 0
        proof_hash.len() > 0
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_oracle_flow() {
        let env = Env::default();
        let contract_id = env.register_contract(None, OracleContract);
        let client = OracleContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let validator = Address::generate(&env);

        client.initialize(&admin);

        // Add validator with admin auth mock
        env.mock_all_auths();
        client.add_validator(&validator);
        assert!(client.is_validator(&validator));

        // Remove validator
        client.remove_validator(&validator);
        assert!(!client.is_validator(&validator));

        // Verify proof logic
        let proof = String::from_str(&env, "ipfs://some_cid_hash");
        assert!(client.validate_proof(&1, &1, &proof));
    }
}
