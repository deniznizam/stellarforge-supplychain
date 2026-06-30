#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct MilestoneEscrowContract;

#[contractimpl]
impl MilestoneEscrowContract {
    pub fn init(_env: Env) {}
}
