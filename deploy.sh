#!/bin/bash
# ==============================================================================
# StellarForge Smart Contract Compile & Deployment Script
# Targets: Stellar Testnet / Local Sandbox
# ==============================================================================

set -e

echo "=================================================="
echo "🏗️ Building Soroban Smart Contracts (WASM)..."
echo "=================================================="
cargo build --target wasm32-unknown-unknown --release

echo -e "\n=================================================="
echo "🔑 Checking Stellar Account Setup..."
echo "=================================================="
# Verify that the testnet account exists
if ! soroban keys address deployer &> /dev/null; then
    echo "Creating a new testnet key pair named 'deployer'..."
    soroban keys generate deployer --network testnet
else
    echo "Deployer address: $(soroban keys address deployer)"
fi

echo -e "\n=================================================="
echo "🚀 Deploying Smart Contracts to Stellar Testnet..."
echo "=================================================="

# 1. Deploy USDC Token contract
echo "Deploying Token Contract..."
TOKEN_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarforge_token.wasm \
  --source deployer \
  --network testnet)
echo "✔ Token Contract Address: $TOKEN_ID"

# 2. Deploy Vault contract
echo "Deploying Vault Contract..."
VAULT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarforge_vault.wasm \
  --source deployer \
  --network testnet)
echo "✔ Vault Contract Address: $VAULT_ID"

# 3. Deploy Oracle validator contract
echo "Deploying Oracle Contract..."
ORACLE_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarforge_oracle.wasm \
  --source deployer \
  --network testnet)
echo "✔ Oracle Contract Address: $ORACLE_ID"

# 4. Deploy Milestone Escrow contract
echo "Deploying Milestone Escrow Contract..."
ESCROW_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarforge_milestone_escrow.wasm \
  --source deployer \
  --network testnet)
echo "✔ Escrow Contract Address: $ESCROW_ID"

echo -e "\n=================================================="
echo "⚙️ Initializing Contracts & Linking Vault / Escrow..."
echo "=================================================="

# Initialize Token
soroban contract invoke \
  --id $TOKEN_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --admin $(soroban keys address deployer) \
  --name "StellarForge USDC" \
  --symbol "USDC"

# Initialize Vault
soroban contract invoke \
  --id $VAULT_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --token $TOKEN_ID \
  --escrow $ESCROW_ID

# Initialize Oracle
soroban contract invoke \
  --id $ORACLE_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --admin $(soroban keys address deployer)

# Initialize Escrow
soroban contract invoke \
  --id $ESCROW_ID \
  --source deployer \
  --network testnet \
  -- \
  initialize \
  --token $TOKEN_ID \
  --vault $VAULT_ID \
  --oracle $ORACLE_ID

echo -e "\n=================================================="
echo "🎉 Deployment successfully completed!"
echo "Enjoy building with StellarForge!"
echo "=================================================="
