#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    pub fn init(_env: Env) {}
}
