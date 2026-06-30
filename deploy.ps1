# ==============================================================================
# StellarForge Smart Contract Compile & Deployment Script (Windows PowerShell)
# Targets: Stellar Testnet / Local Sandbox
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🏗️ Building Soroban Smart Contracts (WASM)..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
cargo build --target wasm32-unknown-unknown --release

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "🔑 Checking Stellar Account Setup..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if deployer key exists
$deployerCheck = soroban keys address deployer 2>&1
if ($null -eq $deployerCheck -or $deployerCheck -like "*error*") {
    Write-Host "Creating a new testnet key pair named 'deployer'..." -ForegroundColor Yellow
    soroban keys generate deployer --network testnet
} else {
    Write-Host "Deployer address: $(soroban keys address deployer)" -ForegroundColor Green
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying Smart Contracts to Stellar Testnet..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Deploy USDC Token contract
Write-Host "Deploying Token Contract..." -ForegroundColor Yellow
$TOKEN_ID = (soroban contract deploy `
  --wasm target/wasm32-unknown-unknown/release/stellarforge_token.wasm `
  --source deployer `
  --network testnet).Trim()
Write-Host "✔ Token Contract Address: $TOKEN_ID" -ForegroundColor Green

# 2. Deploy Vault contract
Write-Host "Deploying Vault Contract..." -ForegroundColor Yellow
$VAULT_ID = (soroban contract deploy `
  --wasm target/wasm32-unknown-unknown/release/stellarforge_vault.wasm `
  --source deployer `
  --network testnet).Trim()
Write-Host "✔ Vault Contract Address: $VAULT_ID" -ForegroundColor Green

# 3. Deploy Oracle validator contract
Write-Host "Deploying Oracle Contract..." -ForegroundColor Yellow
$ORACLE_ID = (soroban contract deploy `
  --wasm target/wasm32-unknown-unknown/release/stellarforge_oracle.wasm `
  --source deployer `
  --network testnet).Trim()
Write-Host "✔ Oracle Contract Address: $ORACLE_ID" -ForegroundColor Green

# 4. Deploy Milestone Escrow contract
Write-Host "Deploying Milestone Escrow Contract..." -ForegroundColor Yellow
$ESCROW_ID = (soroban contract deploy `
  --wasm target/wasm32-unknown-unknown/release/stellarforge_milestone_escrow.wasm `
  --source deployer `
  --network testnet).Trim()
Write-Host "✔ Escrow Contract Address: $ESCROW_ID" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "⚙️ Initializing Contracts & Linking Vault / Escrow..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Initialize Token
soroban contract invoke `
  --id $TOKEN_ID `
  --source deployer `
  --network testnet `
  -- `
  initialize `
  --admin $(soroban keys address deployer) `
  --name "StellarForge USDC" `
  --symbol "USDC"

# Initialize Vault
soroban contract invoke `
  --id $VAULT_ID `
  --source deployer `
  --network testnet `
  -- `
  initialize `
  --token $TOKEN_ID `
  --escrow $ESCROW_ID

# Initialize Oracle
soroban contract invoke `
  --id $ORACLE_ID `
  --source deployer `
  --network testnet `
  -- `
  initialize `
  --admin $(soroban keys address deployer)

# Initialize Escrow
soroban contract invoke `
  --id $ESCROW_ID `
  --source deployer `
  --network testnet `
  -- `
  initialize `
  --token $TOKEN_ID `
  --vault $VAULT_ID `
  --oracle $ORACLE_ID

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment successfully completed!" -ForegroundColor Green
Write-Host "Enjoy building with StellarForge!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
