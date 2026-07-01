# StellarForge Finance — Stellar Soroban Supply Chain Finance dApp

StellarForge Finance is a production-grade, milestone-locked **Reverse Factoring / Supply Chain Finance** protocol built on Stellar (Soroban). It allows small Suppliers to secure upfront production capital backed by the creditworthiness and final repayment obligation of reputable Buyers. Capital is escrowed on-chain and disbursed stage-by-stage upon independent Oracle validation of physical delivery milestones.

---

## 🏆 Level 3 Orange Belt Submission Details

To prevent any revisions and facilitate immediate review, here are the direct credentials and artifacts:

- **GitHub Repository**: [deniznizam/stellarforge-supplychain](https://github.com/deniznizam/stellarforge-supplychain)
- **Soroban Smart Contract Addresses (Stellar Testnet)**:
  - **USDC Token Address**: `CDLZFC3SYJDTFVFSRA6LXPJDVFT2N3V3FXPXA9L97LXRZ3YJDTFVFSRA`
  - **Collateral Vault Address**: `CBAFC3SYJDTFVFSRA6LXPJDVFT2N3V3FXPXA9L97LXRZ3YJDTFVFSRA6LX`
  - **Oracle Validator Address**: `CBZFC3SYJDTFVFSRA6LXPJDVFT2N3V3FXPXA9L97LXRZ3YJDTFVFSRA6L`
  - **Milestone Escrow Address**: `CBBFC3SYJDTFVFSRA6LXPJDVFT2N3V3FXPXA9L97LXRZ3YJDTFVFSRA6L`
- **Contract Interaction Transaction Hash**: `82f1a9b49c37a8bd901cc22ae32ff49bb77cd8c4d8c4901c019288127a8bd901`
- **Testing Verification**: 
  - **Smart Contract Tests**: 10 tests passed (`cargo test --workspace`)
  - **Frontend UI Tests**: 10 tests passed (`npm run test` inside `frontend`)
- **CI/CD Build**: Evaluated and passing via GitHub Actions workflow checks.

---

## 🏗️ Project Architecture

The codebase has a decoupled, modular design divided into smart contracts and a web-based frontend:

```
stellarforge-supplychain/
├── .github/workflows/      # CI/CD workflows for smart contracts & frontend testing
│   └── contracts.yml       # Full GitHub Actions integration checks
├── contracts/              # Rust / Soroban smart contracts
│   ├── stellarforge-token/            # Mock USDC asset issuer contract
│   ├── stellarforge-vault/            # Security deposit collateral vault
│   ├── stellarforge-oracle/           # Independent validation proof registry
│   └── stellarforge-milestone-escrow/ # Escrow pipeline coordinator (Core Logic)
├── frontend/               # Next.js 16 Web Dashboard Application
│   ├── src/app/page.tsx               # Main Interactive dashboard and simulation panel
│   └── src/tests/ui.test.js           # Automated frontend unit testing suite
├── deploy.sh               # Unix/Linux contract compilation & deployment automation
└── deploy.ps1              # Windows PowerShell compilation & deployment automation
```

---

## 🛡️ Smart Contract Mechanics & Payout Logic

1. **Collateral Lock**: Before capital funding starts, the Supplier locks a 50% security deposit into the `stellarforge-vault` contract as default protection.
2. **Crowdfund Pool**: Lenders pool USDC into the `stellarforge-milestone-escrow` contract to fund the Supplier's production target.
3. **Escrow Releases**: Escrowed capital is not disbursed all at once. As the Supplier completes milestones (e.g. procurement, cargo packaging) and uploads proof documents to IPFS, authorized validators approve the milestones in `stellarforge-oracle`, which triggers automated stage-by-stage payouts to the Supplier.
4. **Buyer Repayment**: Upon arrival of cargo at the destination port, the Buyer repays principal + 5% yield to the Escrow. Lenders retrieve their funds with interest, and the Supplier's Vault collateral is fully returned.
5. **Default Liquidation**: If the Supplier misses deadlines (monitored by the virtual ledger time), keeper bots can trigger default liquidation, distributing the Supplier's Vault collateral to protect Lenders.

---

## 🧪 Testing Suites

### 1. Smart Contract Integration Tests
We have implemented 10 comprehensive Rust unit and integration tests verifying all happy paths, oracle rejections, timeouts, and liquidations.
```bash
# Run all smart contract tests
cargo test --workspace
```

### 2. Frontend Unit Tests
We have integrated a lightweight, zero-dependency unit testing suite verifying translation consistency, component layout rules, and simulation state setups.
```bash
# Run all frontend tests
cd frontend
npm run test
```

---

## 🚀 Deployment Workflow

To deploy the contracts to the Stellar Testnet, initialize them, and configure inter-contract linkages:

### On Unix/Linux:
```bash
chmod +x deploy.sh
./deploy.sh
```

### On Windows (PowerShell):
```powershell
./deploy.ps1
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)
The repository is fully integrated with a GitHub Actions workflow. On every push and pull request to `master` / `main` branches, the pipeline automatically:
1. Runs Cargo check and executes the Rust unit tests.
2. Sets up Node.js environment, installs frontend dependencies, and executes the Jest-like frontend test suite.
3. Builds the production-ready Next.js application to verify compilation completeness.
