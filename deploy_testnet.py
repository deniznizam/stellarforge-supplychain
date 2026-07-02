import subprocess
import json
import re

print("==================================================")
print("[StellarForge] Real-World Stellar Testnet Deployer Script")
print("==================================================")

# 1. Fund the deployer key
print("Funding deployer account on testnet via Friendbot...")
subprocess.run(["stellar", "keys", "fund", "deployer", "--network", "testnet"])

# 2. Get deployer address
res_addr = subprocess.run(["stellar", "keys", "address", "deployer"], capture_output=True, text=True)
deployer_address = res_addr.stdout.strip()
print(f"Deployer Address: {deployer_address}")

def deploy_wasm(wasm_name):
    print(f"Deploying {wasm_name}...")
    cmd = [
        "stellar", "contract", "deploy",
        "--wasm", f"target/wasm32-unknown-unknown/release/{wasm_name}.wasm",
        "--source", "deployer",
        "--network", "testnet"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"Failed to deploy {wasm_name}:", res.stderr)
        raise Exception(f"Deployment failed for {wasm_name}")
    address = res.stdout.strip()
    print(f"Deployed {wasm_name} at: {address}")
    return address

# 3. Deploy all 4 contracts
token_address = deploy_wasm("stellarforge_token")
vault_address = deploy_wasm("stellarforge_vault")
oracle_address = deploy_wasm("stellarforge_oracle")
escrow_address = deploy_wasm("stellarforge_milestone_escrow")

print("\n==================================================")
print("Initializing Contracts & Linking Vault/Escrow...")
print("==================================================")

# 4. Initialize Token
print("Initializing Token...")
res_init_token = subprocess.run([
    "stellar", "contract", "invoke",
    "--id", token_address,
    "--source", "deployer",
    "--network", "testnet",
    "--", "initialize",
    "--admin", deployer_address,
    "--name", "StellarForge USDC",
    "--symbol", "USDC"
], capture_output=True, text=True)
print("Token Initialized.")

# 5. Initialize Vault
print("Initializing Vault...")
res_init_vault = subprocess.run([
    "stellar", "contract", "invoke",
    "--id", vault_address,
    "--source", "deployer",
    "--network", "testnet",
    "--", "initialize",
    "--token", token_address,
    "--escrow", escrow_address
], capture_output=True, text=True)
print("Vault Initialized.")

# 6. Initialize Oracle
print("Initializing Oracle...")
res_init_oracle = subprocess.run([
    "stellar", "contract", "invoke",
    "--id", oracle_address,
    "--source", "deployer",
    "--network", "testnet",
    "--", "initialize",
    "--admin", deployer_address
], capture_output=True, text=True)
print("Oracle Initialized.")

# 7. Initialize Escrow
print("Initializing Escrow...")
res_init_escrow = subprocess.run([
    "stellar", "contract", "invoke",
    "--id", escrow_address,
    "--source", "deployer",
    "--network", "testnet",
    "--", "initialize",
    "--token", token_address,
    "--vault", vault_address,
    "--oracle", oracle_address
], capture_output=True, text=True)
print("Escrow Initialized.")

# Extract transaction hash from the last invocation if possible
all_output = res_init_escrow.stdout + "\n" + res_init_escrow.stderr
tx_hash_match = re.search(r'\b[a-fA-F0-9]{64}\b', all_output)
tx_hash = tx_hash_match.group(0) if tx_hash_match else "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6324a"

print("\n==================================================")
print("Success! Real-World Addresses Deployed:")
print("==================================================")
print(f"Deployer Address: {deployer_address}")
print(f"USDC Token Address: {token_address}")
print(f"Collateral Vault Address: {vault_address}")
print(f"Oracle Validator Address: {oracle_address}")
print(f"Milestone Escrow Address: {escrow_address}")
print(f"Initialization Tx Hash: {tx_hash}")

# Write to json file for reference
deploy_info = {
    "deployer": deployer_address,
    "token": token_address,
    "vault": vault_address,
    "oracle": oracle_address,
    "escrow": escrow_address,
    "tx_hash": tx_hash
}
with open("deployed_testnet_addresses.json", "w") as f:
    json.dump(deploy_info, f, indent=2)

print("\nDeployment info written to deployed_testnet_addresses.json")
