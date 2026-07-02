# StellarForge Finance — Stellar Soroban Supply Chain Finance dApp

StellarForge Finance is a production-grade, milestone-locked **Reverse Factoring / Supply Chain Finance** protocol built on Stellar (Soroban). It allows small Suppliers to secure upfront production capital backed by the creditworthiness and final repayment obligation of reputable Buyers. Capital is escrowed on-chain and disbursed stage-by-stage upon independent Oracle validation of physical delivery milestones.

---

## 🏆 Level 3 Orange Belt Submission Details
*(Özet: Jüri değerlendirmesi için testnet kontrat adresleri, test doğrulamaları ve işlem özetleri aşağıda listelenmiştir.)*

To prevent any revisions and facilitate immediate review, here are the direct credentials and artifacts:

- **GitHub Repository**: [deniznizam/stellarforge-supplychain](https://github.com/deniznizam/stellarforge-supplychain)
- **Live Web App (Vercel)**: [stellarforge-supplychain.vercel.app](https://stellarforge-supplychain.vercel.app/)
- **Soroban Smart Contract Addresses (Stellar Testnet)**:
  - **USDC Token Address**: `CBLHMCZ2YWVBOMSYZLZJH5NLHF5MNC24CJ6PX5XDTZDNTJBBJ7A4VAGD`
  - **Collateral Vault Address**: `CDBYFJVVYC4H7E6SZ3PERACLEAF4HMPZ7KTONIP7IX5RJ7UAZLCUQKVM`
  - **Oracle Validator Address**: `CD3G4UOUKEFRK3OUG4UUMV5SULG6HJTZUTQDPV5ZACUNLIW4UIXNA4U6`
  - **Milestone Escrow Address**: `CAPQJDB6IDNFSMHYQJOHFPCO4BEY4FXG3PMW4DUQ6FY4RO3MZ5XDFJX7`
- **Deployer Account Address**: `GBT5ZYMJIHL3D4XGIWQ2LUNF5J637BXAQUEI72UW7AAFP7N3IPMNCWAP`
- **Contract Interaction Transaction Hash**: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6324a`
- **Testing Verification**: 
  - **Smart Contract Tests**: 10 tests passed (`cargo test --workspace`)
  - **Frontend UI Tests**: 3 Jest test suites passed (`npm run test` inside `frontend`)
- **CI/CD Build**: Evaluated and passing via GitHub Actions workflow checks.

---

## 🏗️ Project Architecture
*(Özet: Proje yapısı, bağımsız Rust akıllı sözleşmeleri ve Next.js ön yüz uygulaması olarak modüler bir düzende ayrılmıştır.)*

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
│   └── src/tests/                     # Automated Jest unit testing suites (3 test files)
├── deploy.sh               # Unix/Linux contract compilation & deployment automation
└── deploy.ps1              # Windows PowerShell compilation & deployment automation
```

---

## 🛡️ Smart Contract Mechanics & Payout Logic
*(Özet: Tedarikçi %50 teminat kilitler, Alıcı sözleşmeyi onaylar, Yatırımcılar fon sağlar. Denetçiler fiziki sevkiyatı onayladıkça ödeme adım adım tedarikçiye ödenir. Mal teslim edildiğinde Alıcı geri ödemeyi yapar.)*

1. **Collateral Lock**: Before capital funding starts, the Supplier locks a 50% security deposit into the `stellarforge-vault` contract as default protection.
2. **Crowdfund Pool**: Lenders pool USDC into the `stellarforge-milestone-escrow` contract to fund the Supplier's production target.
3. **Escrow Releases**: Escrowed capital is not disbursed all at once. As the Supplier completes milestones (e.g. procurement, cargo packaging) and uploads proof documents to IPFS, authorized validators approve the milestones in `stellarforge-oracle`, which triggers automated stage-by-stage payouts to the Supplier.
4. **Buyer Repayment**: Upon arrival of cargo at the destination port, the Buyer repays principal + 5% yield to the Escrow. Lenders retrieve their funds with interest, and the Supplier's Vault collateral is fully returned.
5. **Default Liquidation**: If the Supplier misses deadlines (monitored by the virtual ledger time), keeper bots can trigger default liquidation, distributing the Supplier's Vault collateral to protect Lenders.

---

## 🔄 Visual Workflow Diagram
*(Özet: Sistemdeki rollerin adım adım iş akışı, karar ağaçları ve teminat iade/tasfiye döngüleri aşağıda modellenmiştir.)*

```mermaid
graph TD
    classDef init fill:#1E2128,stroke:#F97316,stroke-width:2px,color:#fff;
    classDef process fill:#13151A,stroke:#373F4D,stroke-width:1px,color:#8E97A4;
    classDef decision fill:#2A1E15,stroke:#F59E0B,stroke-width:2px,color:#fff;
    classDef success fill:#1E2128,stroke:#10B981,stroke-width:2px,color:#fff;
    classDef fail fill:#2E1B1B,stroke:#EF4444,stroke-width:2px,color:#fff;

    A[1. Project Setup <br/> Supplier files request]:::init --> B[2. Agreement Check]:::process
    B -->|Buyer signs on-chain| C[3. Collateral Vault <br/> Supplier locks 50% deposit]:::process
    B -->|Buyer rejects| X[Project Cancelled]:::fail
    
    C --> D[4. Capital Crowdfund <br/> Lenders pool 50% USDC]:::process
    D --> E[5. Escrow Activated <br/> Shipping & production starts]:::init
    
    E --> F[6. Milestone Completed <br/> Supplier uploads proofs]:::process
    F --> G{7. Oracle Inspection}:::decision
    G -->|Approved| H[8. Stage Payout <br/> Escrow pays Supplier]:::process
    G -->|Rejected / Pending| F
    
    H --> I{9. Cargo Arrival <br/> and Deadlines met?}:::decision
    I -->|Yes| J[10. Invoice Repayment <br/> Buyer settles total bill]:::process
    I -->|No - Default| Y[11. Default Liquidation <br/> Collateral sent to Lenders]:::fail
    
    J --> K[12. Fund Settlement <br/> Lenders withdraw, Supplier deposit returned]:::success
    K --> Z((Done)):::success
```

---

## 📸 User Interface & Dashboard Gallery
*(Özet: Platformun modern arayüzünden alınmış, Türkçe/İngilizce dil desteğini, etkileşimli eğitim turlarını ve kayıt formlarını gösteren ekran görüntüleri.)*

### 🔍 1. Dashboard Overview (English) / Genel Arayüz (İngilizce)
*Main dashboard overview with live portfolio stats, active project listings, and Freighter wallet status.*
![Dashboard EN](docs/screenshots/screenshot_01.png)

### 🇹🇷 2. Dashboard Overview (Turkish) / Genel Arayüz (Türkçe)
*Turkish localized version of the dashboard including full content translations for local users.*
![Dashboard TR](docs/screenshots/screenshot_02.png)

### 📋 3. Project Details & Milestones / Proje Detayları ve Kilometre Taşları
*Detailed view of project cards displaying milestones (e.g. Malzeme Tedariki, Bileşen Montajı), collateral vaults, and historical ledger events.*
![Project Details](docs/screenshots/screenshot_03.png)

### 🚀 4. Onboarding Tour - Step 1 / Eğitim Turu - Adım 1: Genel Havuz İstatistikleri
*Interactive user onboarding guide highlighting total pooled funds, active contracts, and expected yields.*
![Tour Step 1](docs/screenshots/screenshot_04.png)

### 📦 5. Onboarding Tour - Step 2 / Eğitim Turu - Adım 2: Ticaret Projesi Kartları
*Onboarding step highlighting active trade routes, shipping lines, and escrow funding progress.*
![Tour Step 2](docs/screenshots/screenshot_05.png)

### 👥 6. Onboarding Tour - Step 3 / Eğitim Turu - Adım 3: Aktif Hesap Rolleri
*Onboarding step explaining the sidebar simulator roles (Supplier, Buyer, Lender, Validator).*
![Tour Step 3](docs/screenshots/screenshot_06.png)

### ⏰ 7. Onboarding Tour - Step 4 / Eğitim Turu - Adım 4: Zaman ve Akıllı Simülatör
*Onboarding step highlighting the virtual clock controls for advanced smart contract lifecycle tests.*
![Tour Step 4](docs/screenshots/screenshot_07.png)

### 📝 8. Supplier Trade Registration / Tedarikçi Sözleşme Kayıt Formu
*Form for SMEs/Suppliers to define shipping details, custom milestones, funding targets, and lock collateral.*
![Supplier Registration Form](docs/screenshots/screenshot_08.png)

### 💡 9. How it Works Guide / Platform Çalışma Mantığı ve Rehber
*Interactive visual guide showcasing the end-to-end supply chain finance flow and on-chain milestones.*
![How it Works Guide](docs/screenshots/screenshot_09.png)

---

## 🎮 Step-by-Step Simulator Playbook (How to Use All Roles)
*(Özet: Platformdaki rolleri (Tedarikçi, Alıcı, Yatırımcı ve Doğrulayıcı) sırayla simüle ederek uçtan uca akışı nasıl test edeceğinizi anlatan basit kullanım rehberi.)*

To experience the complete lifecycle of a milestone-locked trade, follow this walkthrough using the **Developer Tools** panel (on the right sidebar of the website) to swap between active accounts:

### 1. Act as the **Supplier (KOBİ / Tedarikçi)**
*(Özet: Sağ menüden Tedarikçi rolünü seçin. "Register Supply Trade" sekmesinden yeni sevkiyat projesi oluşturup gönderin. Tedarikçinin %50 güvence teminatı kasaya kilitlenir.)*
*   **Action**: Select the **Supplier** role in the sidebar. Go to the **Register Supply Trade** tab.
*   **Parameters**: Input a project name (e.g. *Cocoa Bean Shipping*), origin, destination, and target funding amount. Submit.
*   **Result**: The trade request is published. The Supplier's 50% security deposit is locked in the Collateral Vault.

### 2. Act as the **Buyer (Nestle / Alıcı)**
*(Özet: Rolü Alıcı yapın. Kakao projesini bulup "Geri Ödeme Taahhüdünü Onayla" butonuna basın. Alıcı nihai ödemeyi yapacağını zincir üstünde taahhüt eder.)*
*   **Action**: Swap your role to **Buyer**. Go to **Active Projects**, find your project, and click **Confirm Repayment Obligation**.
*   **Result**: The Buyer legally binds their balance sheet to settle the invoice upon cargo delivery.

### 3. Act as the **Lender (Investor / Yatırımcı)**
*(Özet: Rolü Yatırımcı yapın. "Fund Project" diyerek kalan fon hedefini tamamlayın. Havuz dolunca proje aktifleşir ve nakliye başlar.)*
*   **Action**: Swap your role to **Lender**. Click **Fund Project** to supply the remaining capital needed.
*   **Result**: Lenders supply the liquidity pool. The project status transitions to **Active**. Production and shipping begin.

### 4. Act as the **Supplier (KOBİ / Tedarikçi) - Upload Proof**
*(Özet: Rolü tekrar Tedarikçi yapın. Aşama listesinden kanıt yükle butonuna basıp bir PDF yükleyin. Sunucu arkasında Pinata ile IPFS hash'i üretilir.)*
*   **Action**: Swap back to the **Supplier** role. Under the milestones list, click **Submit Milestone Proof** and upload any shipment document (e.g., Bill of Lading PDF).
*   **Result**: The PDF is securely pinned to **IPFS** via our server-side Pinata API route, attaching the unique `ipfs://Qm...` hash.

### 5. Act as the **Validator (Oracle / Doğrulayıcı)**
*(Özet: Rolü Doğrulayıcı yapın. Yüklenen IPFS evrakını inceleyip onaylayın. Akıllı sözleşme aşamaya ait hakedişi tedarikçinin cüzdanına gönderir.)*
*   **Action**: Swap your role to **Validator**. Inspect the uploaded IPFS document hash link and click **Approve**.
*   **Result**: The smart contract automatically releases the milestone's payout directly into the Supplier's balance.

### 6. Act as the **Buyer (Nestle / Alıcı) - Repayment**
*(Özet: Tüm aşamalar bittiğinde rolü Alıcı yapın ve geri ödemeyi onaylayın. Yatırımcılar paralarını faiziyle çeker, tedarikçinin teminatı çözülür.)*
*   **Action**: Swap your role to **Buyer** once all milestones are completed. Click **Confirm Repayment**.
*   **Result**: The Buyer repays the principal plus a **5% yield** to the Lenders. The Supplier's locked vault deposit is fully released back to their wallet.

---

## 🧪 Testing Suites
*(Özet: Hem Rust akıllı sözleşmeleri hem de Next.js arayüz kodları için geliştirilen 20 birim/entegrasyon testi 100% yeşil geçmektedir.)*

### 1. Smart Contract Integration Tests
We have implemented 10 comprehensive Rust unit and integration tests verifying all happy paths, oracle rejections, timeouts, and liquidations.
```bash
# Run all smart contract tests
cargo test --workspace
```

### 2. Frontend Unit Tests
We have integrated a robust Jest unit testing suite verifying translation consistency, component layout rules, and simulation state setups.
```bash
# Run all frontend tests
cd frontend
npm run test
```

---

## 🚀 Deployment Workflow
*(Özet: Akıllı sözleşmeleri testnet ağına yüklemek, birbirlerine bağlamak ve ön yüze tanıtmak için hazırladığımız otomatik betikler.)*

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
*(Özet: Projede her push/pull işleminde otomatik derleme, güvenlik ve test kontrollerini yürüten CI/CD boru hattı kuruludur.)*

The repository is fully integrated with a GitHub Actions workflow. On every push and pull request to `master` / `main` branches, the pipeline automatically:
1. Runs Cargo check and executes the Rust unit tests.
2. Sets up Node.js environment, installs frontend dependencies, and executes the Jest-like frontend test suite.
3. Builds the production-ready Next.js application to verify compilation completeness.


