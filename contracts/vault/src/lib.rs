#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    pub fn init(_env: Env) {}
}
