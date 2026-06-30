"use client";

import React, { useState, useEffect } from "react";
import { isConnected, getAddress } from "@stellar/freighter-api";

// Business types
interface Milestone {
  id: number;
  description: string;
  deadline: number; // relative hours
  amountToRelease: number;
  proofHash: string;
  status: "Pending" | "ProofSubmitted" | "Approved" | "Rejected";
}

interface Project {
  id: string;
  name: string;
  originPort: string;
  destPort: string;
  originPortCode: string;
  destPortCode: string;
  borrower: string;
  buyer: string;
  targetAmount: number;
  fundedAmount: number;
  fundingDeadline: number;
  status: "Pending" | "Active" | "Completed" | "Liquidated";
  collateralLocked: number;
  milestones: Milestone[];
}

interface EventLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

// Translations dictionary
const translations = {
  en: {
    title: "StellarForge",
    tagline: "Supply Chain Escrow Finance",
    connectWallet: "Connect Wallet",
    walletConnected: "Wallet Connected",
    activePipelines: "Active Projects",
    createNewPipeline: "Register Supply Trade",
    howItWorks: "How it works",
    totalPool: "Total Pool",
    activeProjectsLabel: "Active Projects",
    myInvestment: "My Investment",
    expectedYield: "Expected Yield",
    simulationPanel: "Developer Tools",
    ledgerTime: "Ledger Time (Simulated block clock for contract deadlines):",
    add24h: "+24 Hours",
    startDemo: "Run E2E Demo Simulation",
    demoRunning: "Demo Running...",
    roleSelector: "Active Account Role Simulator:",
    onChainLogs: "On-Chain Log Stream",
    clearLogs: "Clear",
    auditorVerified: "Oracle Verified",
    atSea: "Transit",
    fundedAmount: "Funding progress",
    lockedCollateralLabel: "Collateral",
    lenderYield: "Yield Rate",
    milestoneProgress: "Milestones",
    statusPending: "Awaiting Funding",
    statusActive: "Active",
    statusCompleted: "Completed",
    statusLiquidated: "Liquidated",
    supplier: "Supplier",
    buyer: "Buyer",
    lender: "Lender",
    validator: "Validator (Oracle)",
    liquidator: "Liquidator (Keeper)",
    projectDetails: "Trade finance project",
    trustFooter: "3 independent oracle nodes verifying shipment proofs",
    createDesc: "Deploy a milestone-locked trade contract. 50% USDC security deposit will be locked in the Vault.",
    tradeTitle: "Trade Contract / Commodity Title",
    originPortLabel: "Origin Port / Dispatch Hub",
    destPortLabel: "Destination Port / Warehouse Hub",
    fundingTarget: "Funding Target (USDC)",
    supplierAddr: "Supplier Stellar Address",
    buyerAddr: "Buyer Stellar Address",
    milestoneBreakdown: "Milestone Deliverables Breakdown",
    milestoneDesc: "Deliverable Description",
    hoursToDeadline: "Hours to Deadline",
    amountToRelease: "Amount to Release (USDC)",
    collateralWarning: "Security Notice: This contract requires {amount} USDC to be locked as default protection in the Vault.",
    submitContract: "Deploy Trade Finance Pipeline",
    submitProof: "Submit Shipping Proof (IPFS)",
    rejectBtn: "Reject",
    approveBtn: "Approve & Payout",
    repaymentDescr: "Settlement & Liquidation Actions",
    confirmRepay: "Confirm Delivery & Settle",
    repayNote: "Awaiting all milestone approvals before buyer settlement is unlocked.",
    triggerLiq: "Trigger Default Liquidation",
    settledSuccess: "Trade settled successfully. Lenders reimbursed with yield, collateral returned to Supplier.",
    defaultedWarning: "Supplier defaulted. Collateral liquidated and distributed pro-rata to lenders.",
    toastUSDC: "USDC Token contract initialized successfully.",
    toastCollateral: "Supplier locked {amount} USDC collateral in the Vault.",
    toastProject: "Supply chain trade registered on-chain.",
    backToDash: "Back to Dashboard",
    targetFinancing: "Target Financing",
    funded: "Funded",
    fillTarget: "Fill Target",
    milestoneExecution: "Milestone Progress Map",
    hours: "hrs",
    repaymentObligation: "Repayment Obligation (Principal + 5% Yield)",
    createTitle: "Register Supply Trade",
    guideTitle: "How StellarForge Works",
    guideSubtitle: "Learn the mechanics of Milestone-Locked Reverse Factoring",
    slide1Title: "1. Supplier Security Deposit (Vault Setup)",
    slide1Desc: "Before production begins, the Supplier deposits 50% of the target budget into the Vault smart contract. This serves as an on-chain safety pledge. If the Supplier fails to perform or default, these funds are automatically liquidated and distributed to protect Lenders.",
    slide2Title: "2. Lender Capital Crowdfund",
    slide2Desc: "Lenders pool USDC to fund the Supplier's production budget. This is backed by the creditworthiness and payment obligation of the reputable Buyer. This model allows small suppliers to leverage the financial strength of giant buyers (e.g., Nestle, Zara) to obtain early funding.",
    slide3Title: "3. Milestone-Based Payouts (Escrow)",
    slide3Desc: "Funds are locked in the Escrow contract and not handed over all at once. As the Supplier completes stages (e.g., raw material procurement, shipping packaging) and uploads shipping manifests, independent Oracle Validators verify the proofs on-chain, releasing funds stage-by-stage.",
    slide4Title: "4. Buyer Repayment & Release",
    slide4Desc: "Upon cargo arrival, the Buyer repays the total capital + 5% yield. Lenders are reimbursed with interest, and the Supplier's initial 50% security deposit is fully unlocked and returned to their wallet.",
    closeGuide: "Got it, go to Dashboard",
    next: "Next",
    prev: "Previous"
  },
  tr: {
    title: "StellarForge",
    tagline: "Tedarik Zinciri Finansmanı",
    connectWallet: "Cüzdanı Bağla",
    walletConnected: "Cüzdan Bağlandı",
    activePipelines: "Aktif Projeler",
    createNewPipeline: "Yeni Ticari Finansman Kaydı",
    howItWorks: "Nasıl Çalışır",
    totalPool: "TOPLAM HAVUZ",
    activeProjectsLabel: "AKTİF PROJE",
    myInvestment: "YATIRIMIM",
    expectedYield: "BEKLENEN GETİRİ",
    simulationPanel: "Geliştirici Araçları",
    ledgerTime: "Ledger Zamanı (Sözleşme sürelerini simüle eden yapay blok saati):",
    add24h: "+24 Saat",
    startDemo: "E2E Akıllı Demosu Başlat",
    demoRunning: "Demo Yürütülüyor...",
    roleSelector: "Aktif Hesap Rol Simülatörü:",
    onChainLogs: "Zincir Üstü Event Akışı",
    clearLogs: "Temizle",
    auditorVerified: "Oracle Doğrulamalı",
    atSea: "Açık denizde",
    fundedAmount: "FONLAMA",
    lockedCollateralLabel: "Teminat",
    lenderYield: "Getiri Oranı",
    milestoneProgress: "KİLOMETRE TAŞLARI",
    statusPending: "Beklemede",
    statusActive: "Aktif",
    statusCompleted: "Tamamlandı",
    statusLiquidated: "Temerrüt",
    supplier: "Tedarikçi",
    buyer: "Alıcı",
    lender: "Yatırımcı",
    validator: "Doğrulayıcı",
    liquidator: "Likidatör",
    projectDetails: "Tedarik finansmanı projesi",
    trustFooter: "3 bağımsız denetçi tarafından doğrulanan kanıtlar",
    createDesc: "Milestone kilitli yeni bir ticaret finansmanı başlatın. Bütçenin %50'si güvence olarak kasada bloke edilir.",
    tradeTitle: "Ticari Sözleşme / Emtia Başlığı",
    originPortLabel: "Çıkış Limanı / Üretim Merkezi",
    destPortLabel: "Varış Limanı / Depolama Merkezi",
    fundingTarget: "Finansman Hedefi (USDC)",
    supplierAddr: "Tedarikçi Stellar Adresi",
    buyerAddr: "Alıcı Stellar Adresi",
    milestoneBreakdown: "Milestone Teslimat Detayları",
    milestoneDesc: "Teslimat Açıklaması",
    hoursToDeadline: "Teslimat Süresi (Saat)",
    amountToRelease: "Serbest Bırakılacak Tutar (USDC)",
    collateralWarning: "Güvenlik Bildirimi: Bu sözleşme için {amount} USDC teminatın kasada bloke edilmesi gerekmektedir.",
    submitContract: "Ticaret Finansmanı Sözleşmesini Başlat",
    submitProof: "Sevkiyat Kanıtı Gönder (IPFS)",
    rejectBtn: "Reddet",
    approveBtn: "Onayla & Öde",
    repaymentDescr: "Geri Ödeme & Tasfiye Yönetimi",
    confirmRepay: "Teslimatı Onayla",
    repayNote: "Alıcı ödemesinin açılması için tüm milestone hedeflerinin Onaylanması gerekir.",
    triggerLiq: "Tasfiyeyi Tetikle",
    settledSuccess: "Geri Ödeme Tamamlandı. Yatırımcılara faizleri dağıtıldı, tedarikçinin teminatı serbest bırakıldı.",
    defaultedWarning: "Proje temerrüde düştü. Kilitli teminat tasfiye edildi ve yatırımcılara payları oranında iade edildi.",
    toastUSDC: "USDC Token sözleşmesi başarıyla başlatıldı.",
    toastCollateral: "Tedarikçi Vault'a {amount} USDC teminat kilitledi.",
    toastProject: "Organik Kahve İhracatı projesi zincir üstünde oluşturuldu.",
    backToDash: "Gösterge Paneline Dön",
    targetFinancing: "Hedef Finansman",
    funded: "Toplanan",
    fillTarget: "Tamamını Fonla",
    milestoneExecution: "Milestone İlerleme Haritası",
    hours: "saat",
    repaymentObligation: "Geri Ödeme Yükümlülüğü (Anapara + %5 Faiz)",
    createTitle: "Yeni Ticari Finansman Kaydı",
    guideTitle: "StellarForge Nasıl Çalışır?",
    guideSubtitle: "Milestone Kilitli Ters Faktoring Mekanizmasını Keşfedin",
    slide1Title: "1. Tedarikçi Teminat Blokesi (Vault Kurulumu)",
    slide1Desc: "Tedarikçi (Supplier), üretime başlamadan önce bütçenin yarısını (%50) Vault akıllı sözleşmesine güvence teminatı olarak kilitler. Bu bloke, işin ciddiyetini garanti altına alır. Tedarikçi taahhüdünü yerine getirmez veya projeyi terk ederse, kilitli teminat yatırımcılara paylaştırılır.",
    slide2Title: "2. Yatırımcı Sermaye Fonlaması",
    slide2Desc: "Yatırımcılar (Lenders), büyük ve itibarlı Alıcı firmanın (örn: Nestle, Zara) nihai geri ödeme taahhüdüne dayanarak tedarikçinin üretim bütçesini fonlar. Yatırımcıların USDC sermayesi, tedarikçinin kendi kredi puanı yetersiz olsa bile güvence altındadır.",
    slide3Title: "3. Milestone Aşamalı Ödeme (Escrow)",
    slide3Desc: "Fonlanan sermaye tek seferde tedarikçiye verilmez; Milestone Escrow sözleşmesinde kilitli kalır. Tedarikçi üretim/sevkiyat adımlarını tamamlayıp kanıtları (konşimento vb.) sisteme yükledikçe, bağımsız Denetçiler (Oracle) onay verir ve fon adım adım serbest kalır.",
    slide4Title: "4. Alıcı Geri Ödemesi ve İade",
    slide4Desc: "Tüm sevkiyat tamamlanıp kargo alıcıya ulaştığında, Alıcı (Buyer) anapara + %5 faizi akıllı sözleşmeye yatırır. Yatırımcılar paralarını faiziyle geri alır, tedarikçinin Vault'ta kilitli olan %50 teminatı ise çözülerek cüzdanına iade edilir.",
    closeGuide: "Anladım, Gösterge Paneline Git",
    next: "İleri",
    prev: "Geri"
  }
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "tr">("tr");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipelines" | "create">("pipelines");
  
  // Wallet
  const [walletConnected, setWalletConnected] = useState(true);
  const [walletAddress, setWalletAddress] = useState("GB...BUYER (Alıcı)");
  const [userRole, setUserRole] = useState<"Supplier" | "Buyer" | "Lender" | "Validator" | "Liquidator">("Buyer");
  const [tourStep, setTourStep] = useState(0);

  const handleRoleChange = (role: "Lender" | "Supplier" | "Buyer" | "Validator") => {
    setUserRole(role);
    if (role === "Lender") {
      setWalletAddress("GC...LEND (Yatırımcı)");
    } else if (role === "Supplier") {
      setWalletAddress("GD...SUPP (Tedarikçi)");
    } else if (role === "Buyer") {
      setWalletAddress("GB...BUYER (Alıcı)");
    } else if (role === "Validator") {
      setWalletAddress("GA...ORACL (Oracle)");
    }
  };

  // Time & Simulator
  const [currentTime, setCurrentTime] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(true);

  // Onboarding Guide Slide Deck state (Off by default as in the screenshot, but triggerable)
  const [showGuide, setShowGuide] = useState(false);
  const [guideSlide, setGuideSlide] = useState(0);

  // Active Project Selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>("SF-001");

  // Trade Pipelines State exactly mapping the Figma snapshot
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "SF-001",
      name: "Acme Logistics",
      originPort: "Santos",
      originPortCode: "SAN",
      destPort: "Rotterdam",
      destPortCode: "RTM",
      borrower: "GD...BrazilCoffee",
      buyer: "MegaCorp Industries",
      targetAmount: 10000,
      fundedAmount: 10000,
      fundingDeadline: 24,
      status: "Active",
      collateralLocked: 5000,
      milestones: [
        {
          id: 1,
          description: "Malzeme Tedariki",
          deadline: 48,
          amountToRelease: 3000,
          proofHash: "ipfs://procure-raw-cotton",
          status: "Approved",
        },
        {
          id: 2,
          description: "Bileşen Montajı",
          deadline: 96,
          amountToRelease: 4000,
          proofHash: "ipfs://assembly-check",
          status: "Approved",
        },
        {
          id: 3,
          description: "KK & Teslimat",
          deadline: 144,
          amountToRelease: 3000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: "SF-002",
      name: "Orion Textiles",
      originPort: "İstanbul",
      originPortCode: "IST",
      destPort: "Hamburg",
      destPortCode: "HAM",
      borrower: "GD...AcmeTextile",
      buyer: "EuroFashion Group",
      targetAmount: 25000,
      fundedAmount: 17588,
      fundingDeadline: 48,
      status: "Pending",
      collateralLocked: 12500,
      milestones: [
        {
          id: 1,
          description: "Ham Madde Alımı",
          deadline: 72,
          amountToRelease: 8000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 2,
          description: "Dokuma & Boyama",
          deadline: 120,
          amountToRelease: 10000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 3,
          description: "Paket & Nakliye",
          deadline: 168,
          amountToRelease: 7000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: "SF-003",
      name: "Pacific Coffee Co.",
      originPort: "Santos",
      originPortCode: "SAN",
      destPort: "Hamburg",
      destPortCode: "HAM",
      borrower: "GD...PacCoffee",
      buyer: "NordRoast GmbH",
      targetAmount: 15000,
      fundedAmount: 15000,
      fundingDeadline: 72,
      status: "Completed",
      collateralLocked: 7500,
      milestones: [
        {
          id: 1,
          description: "Hasat & Toplama",
          deadline: 96,
          amountToRelease: 5000,
          proofHash: "ipfs://harvest-receipt",
          status: "Approved",
        },
        {
          id: 2,
          description: "İşleme & Paket",
          deadline: 144,
          amountToRelease: 5500,
          proofHash: "ipfs://qa-grade-a",
          status: "Approved",
        },
        {
          id: 3,
          description: "Sevkiyat & Teslim",
          deadline: 192,
          amountToRelease: 4500,
          proofHash: "ipfs://hamburg-port-bill",
          status: "Approved",
        },
      ],
    },
    {
      id: "SF-004",
      name: "Meridian Electronics",
      originPort: "Shenzhen",
      originPortCode: "SZX",
      destPort: "Dubai",
      destPortCode: "DXB",
      borrower: "GD...ShenzhenChip",
      buyer: "GlobalTech Solutions",
      targetAmount: 50000,
      fundedAmount: 50000,
      fundingDeadline: 96,
      status: "Active",
      collateralLocked: 25000,
      milestones: [
        {
          id: 1,
          description: "Bileşen Tedariki",
          deadline: 120,
          amountToRelease: 18000,
          proofHash: "ipfs://semiconductor-bill",
          status: "Approved",
        },
        {
          id: 2,
          description: "Üretim & Test",
          deadline: 180,
          amountToRelease: 20000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 3,
          description: "Gümrük & Nakliye",
          deadline: 240,
          amountToRelease: 12000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
  ]);

  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // Form State
  const [newProjName, setNewProjName] = useState("");
  const [newProjOrigin, setNewProjOrigin] = useState("İzmir");
  const [newProjDest, setNewProjDest] = useState("Rotterdam");
  const [newProjSupplier, setNewProjSupplier] = useState("GDSupplierAddress...");
  const [newProjBuyer, setNewProjBuyer] = useState("GBBuyerAddress...");
  const [newProjTarget, setNewProjTarget] = useState(15000);
  const [newProjDeadline, setNewProjDeadline] = useState(48);
  const [newProjMilestones, setNewProjMilestones] = useState<Omit<Milestone, "status" | "proofHash">[]>([
    { id: 1, description: "Milestone 1 - Paketleme ve Yükleme", deadline: 96, amountToRelease: 7500 },
    { id: 2, description: "Milestone 2 - Gümrük ve Teslimat", deadline: 168, amountToRelease: 7500 },
  ]);

  const t = translations[lang];

  useEffect(() => {
    setMounted(true);
    // Initialize default log output
    setEventLogs([
      { timestamp: "10:30", type: "success", message: translations[lang].toastUSDC },
      { timestamp: "10:32", type: "info", message: translations[lang].toastCollateral.replace("{amount}", formatNumber(12500)) },
      { timestamp: "10:35", type: "success", message: translations[lang].toastProject },
    ]);
  }, [lang]);

  const formatNumber = (num: number) => {
    return num.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
  };

  const logEvent = (type: "info" | "success" | "warning" | "error", message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLogs(prev => [{ timestamp: time, type, message }, ...prev]);
  };

  const connectWallet = async () => {
    logEvent("info", lang === "tr" ? "Cüzdan bağlantısı başlatılıyor..." : "Initializing wallet connection...");
    
    let resolved = false;
    const timeoutPromise = new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 500));

    try {
      const freighterPromise = (async (): Promise<string | null> => {
        const connected = await isConnected();
        if (connected) {
          const res = await getAddress();
          return res?.address || null;
        }
        return null;
      })();

      const address = await Promise.race([freighterPromise, timeoutPromise]);
      if (address && typeof address === "string") {
        setWalletAddress(address);
        setWalletConnected(true);
        logEvent("success", `Freighter connected: ${address.substring(0, 8)}...`);
        resolved = true;
      }
    } catch (e) {
      console.warn("Freighter API error, falling back to sandbox:", e);
    }

    if (!resolved) {
      const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
      setWalletAddress(mockAddress.substring(0, 4) + "..." + mockAddress.substring(mockAddress.length - 4));
      setWalletConnected(true);
      logEvent("success", lang === "tr" 
        ? `StellarForge Sandbox cüzdanı bağlandı: ${mockAddress.substring(0, 8)}...` 
        : `Connected via StellarForge Sandbox: ${mockAddress.substring(0, 8)}...`
      );
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    const totalMilestoneAmount = newProjMilestones.reduce((acc, curr) => acc + curr.amountToRelease, 0);
    if (totalMilestoneAmount !== newProjTarget) {
      logEvent("error", lang === "tr" 
        ? `Milestone bütçeleri toplamı (${formatNumber(totalMilestoneAmount)} USDC) proje bütçesine (${formatNumber(newProjTarget)} USDC) eşit olmalıdır.`
        : `Total milestone values (${formatNumber(totalMilestoneAmount)} USDC) must equal the funding target.`
      );
      return;
    }

    const nextId = "SF-00" + (projects.length + 1);

    const newProject: Project = {
      id: nextId,
      name: newProjName,
      originPort: newProjOrigin,
      originPortCode: newProjOrigin.substring(0, 3).toUpperCase(),
      destPort: newProjDest,
      destPortCode: newProjDest.substring(0, 3).toUpperCase(),
      borrower: newProjSupplier.substring(0, 10) + "...",
      buyer: newProjBuyer.substring(0, 10) + "...",
      targetAmount: newProjTarget,
      fundedAmount: 0,
      fundingDeadline: currentTime + newProjDeadline,
      collateralLocked: newProjTarget / 2,
      status: "Pending",
      milestones: newProjMilestones.map(m => ({
        ...m,
        proofHash: "",
        status: "Pending"
      }))
    };

    setProjects(prev => [...prev, newProject]);
    logEvent("success", lang === "tr"
      ? `"${newProjName}" sözleşmesi oluşturuldu. Güvence teminatı Vault kasasına bloke edildi.`
      : `Project "${newProjName}" registered. Collateral locked in Vault.`
    );
    setActiveTab("pipelines");
    setSelectedProjectId(nextId);
  };

  const fundProject = (id: string, amount: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const nextFunded = Math.min(p.targetAmount, p.fundedAmount + amount);
        const nextStatus = nextFunded >= p.targetAmount ? "Active" : p.status;
        logEvent("success", `Lender supplied ${formatNumber(amount)} USDC. Funded: ${formatNumber(nextFunded)}/${formatNumber(p.targetAmount)} USDC.`);
        return { ...p, fundedAmount: nextFunded, status: nextStatus };
      }
      return p;
    }));
  };

  const submitProof = (projectId: string, milestoneId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedMilestones = p.milestones.map(m => {
          if (m.id === milestoneId) {
            const mockIpfs = `ipfs://freight-manifest-${m.id}-cid-${Math.random().toString(36).substring(4, 8)}`;
            logEvent("info", lang === "tr"
              ? `Tedarikçi teslimat kanıtı yükledi: ${mockIpfs}`
              : `Supplier submitted delivery proof: ${mockIpfs}`
            );
            return { ...m, proofHash: mockIpfs, status: "ProofSubmitted" as const };
          }
          return m;
        });
        return { ...p, milestones: updatedMilestones };
      }
      return p;
    }));
  };

  const approveMilestone = (projectId: string, milestoneId: number, accept: boolean) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedMilestones = p.milestones.map(m => {
          if (m.id === milestoneId) {
            const nextStatus = accept ? "Approved" as const : "Rejected" as const;
            if (accept) {
              logEvent("success", `Oracle verified and approved Milestone #${milestoneId}. Released ${formatNumber(m.amountToRelease)} USDC to Supplier.`);
            } else {
              logEvent("warning", `Milestone #${milestoneId} proof rejected.`);
            }
            return { ...m, status: nextStatus };
          }
          return m;
        });
        return { ...p, milestones: updatedMilestones };
      }
      return p;
    }));
  };

  const buyerRepay = (projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const repayment = p.targetAmount * 1.05;
        logEvent("success", `Buyer confirmed delivery. Settled ${formatNumber(repayment)} USDC.`);
        return { ...p, status: "Completed", fundedAmount: p.targetAmount };
      }
      return p;
    }));
  };

  const triggerDefault = (projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        logEvent("error", `Supplier default triggered. Liquidating collateral of ${formatNumber(p.collateralLocked)} USDC.`);
        return { ...p, status: "Liquidated" };
      }
      return p;
    }));
  };

  const fastForwardTime = (hours: number) => {
    const nextTime = currentTime + hours;
    setCurrentTime(nextTime);
    logEvent("warning", `Ledger time advanced to ${nextTime} hours.`);
  };

  // Auto-demo script
  const runAutoDemo = () => {
    if (demoActive) return;
    setDemoActive(true);
    logEvent("info", "Starting interactive simulation flow...");

    // Create
    setTimeout(() => {
      const demoProject: Project = {
        id: "SF-005",
        name: "Akıllı Tarım İthalatı",
        originPort: "İzmir",
        originPortCode: "IZM",
        destPort: "Rotterdam",
        destPortCode: "RTM",
        borrower: "GD...IzmirAgri",
        buyer: "NestleHQ",
        targetAmount: 20000,
        fundedAmount: 0,
        fundingDeadline: 24,
        status: "Pending",
        collateralLocked: 10000,
        milestones: [
          { id: 1, description: "Tohum tedariki", deadline: 48, amountToRelease: 8000, proofHash: "", status: "Pending" },
          { id: 2, description: "Gümrükleme & Paketleme", deadline: 96, amountToRelease: 12000, proofHash: "", status: "Pending" }
        ]
      };
      setProjects(prev => [...prev, demoProject]);
      setSelectedProjectId("SF-005");
      logEvent("success", "Project created. 10,000 USDC collateral locked in Vault.");
    }, 1500);

    // Fund
    setTimeout(() => {
      setProjects(prev => prev.map(p => p.id === "SF-005" ? { ...p, fundedAmount: 20000, status: "Active" } : p));
      logEvent("success", "Lenders funded 20,000 USDC target. Status: Active.");
    }, 3500);

    // Submit Proof 1
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === "SF-005") {
          const updated = p.milestones.map(m => m.id === 1 ? { ...m, status: "ProofSubmitted" as const, proofHash: "ipfs://seeds-manifest-xml" } : m);
          logEvent("info", "Supplier uploaded shipment proof manifest for Milestone #1.");
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 5500);

    // Approve 1
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === "SF-005") {
          const updated = p.milestones.map(m => m.id === 1 ? { ...m, status: "Approved" as const } : m);
          logEvent("success", "Oracle verified Milestone #1. Released 8,000 USDC.");
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 7500);

    // Finalize
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === "SF-005") {
          const updated = p.milestones.map(m => m.id === 2 ? { ...m, status: "Approved" as const, proofHash: "ipfs://delivery-receipt" } : m);
          logEvent("success", "Milestone #2 approved. Repayment available.");
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 9500);

    // Repay
    setTimeout(() => {
      setProjects(prev => prev.map(p => p.id === "SF-005" ? { ...p, status: "Completed", fundedAmount: 20000 } : p));
      logEvent("success", "Buyer settled repayment. 10,000 USDC collateral returned to supplier.");
      setDemoActive(false);
    }, 11500);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#E2E8F0] font-sans antialiased selection:bg-orange-500/20 selection:text-white pb-12">
      
      {/* Top Header */}
      <header className="border-b border-[#1E2128] bg-[#0E0F12] px-8 py-4.5 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Brand logo & tagline */}
        <div className="flex items-center gap-2.5">
          <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            <polygon points="12 22 12 12 2 8.5" />
            <polygon points="12 12 22 8.5" />
            <polygon points="12 2 12 12" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          <div>
            <h1 className="text-base font-black tracking-tight text-white">{t.title}</h1>
            <p className="text-[10px] text-[#5F6774] font-bold uppercase tracking-wider">{t.tagline}</p>
          </div>
        </div>

        {/* Global Nav Tabs */}
        <div className="flex bg-[#121418] border border-[#1E2128] p-0.5 rounded-lg">
          <button
            onClick={() => { setActiveTab("pipelines"); setShowGuide(false); }}
            className={`py-1.5 px-4 text-xs font-bold transition flex items-center gap-2 rounded-md ${
              activeTab === "pipelines" && !showGuide ? "bg-[#1E2128] text-white" : "text-[#8E97A4] hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            {t.activePipelines}
          </button>
          <button
            onClick={() => { setActiveTab("create"); setShowGuide(false); }}
            className={`py-1.5 px-4 text-xs font-bold transition flex items-center gap-2 rounded-md ${
              activeTab === "create" && !showGuide ? "bg-[#1E2128] text-white" : "text-[#8E97A4] hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t.createNewPipeline}
          </button>
          <button
            onClick={() => { setShowGuide(true); }}
            className={`py-1.5 px-4 text-xs font-bold transition flex items-center gap-2 rounded-md ${
              showGuide ? "bg-[#1E2128] text-orange-400" : "text-[#8E97A4] hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {lang === "tr" ? "Rehber" : "How it Works"}
          </button>
        </div>

        {/* Primary Wallet connection */}
        <div className="flex items-center gap-4">
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-[#10B981] border border-emerald-900/60 text-[10px] font-bold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
            {t.auditorVerified}
          </span>

          <div className="flex bg-[#121418] border border-[#1E2128] p-0.5 rounded-lg">
            <button 
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 text-xs font-extrabold transition rounded ${lang === "en" ? "bg-orange-500 text-[#111215]" : "text-[#8E97A4] hover:text-white"}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang("tr")}
              className={`px-2.5 py-1 text-xs font-extrabold transition rounded ${lang === "tr" ? "bg-orange-500 text-[#111215]" : "text-[#8E97A4] hover:text-white"}`}
            >
              TR
            </button>
          </div>

          <button
            onClick={connectWallet}
            className={`px-4.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
              walletConnected
                ? "bg-orange-950/20 text-orange-400 border-orange-500/30"
                : "bg-orange-500 hover:bg-orange-400 text-[#111215] shadow-sm font-extrabold"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
              <path d="M22 10h-6a2 2 0 0 0 0 4h6" />
            </svg>
            {walletConnected ? walletAddress : t.connectWallet}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">

        {/* Marketing Monitor Component */}
        <div className={`w-full bg-[#13151A] border p-4.5 relative overflow-hidden transition-all duration-300 min-h-[60px] flex flex-col justify-center group hover:bg-[#181B22] rounded-xl ${
          tourStep === 4 
            ? "ring-4 ring-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.01] border-orange-500" 
            : "border-orange-500/20 hover:border-orange-500/50"
        }`}>
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee {
              animation: marquee 40s linear infinite;
            }
          `}</style>

          {/* Non-hovered state: Marquee text */}
          <div className="group-hover:hidden w-full overflow-hidden whitespace-nowrap relative flex items-center">
            <div className="inline-block animate-marquee pl-[20px] text-xs font-black text-orange-400 tracking-widest uppercase select-none">
              {lang === "tr" 
                ? "★ STELLARFORGE · NEDEN BİZ? · GÜVENLİ TİCARET FİNANSMANI · ORACLE DOĞRULAMALI MILESTONE ESCROW · SIFIR TEMERRÜT RİSKİ · KOBİ SERMAYE GEÇİDİ · ★" 
                : "★ STELLARFORGE · WHY US? · SECURE SUPPLY CHAIN FINANCE · ORACLE-VERIFIED ESCROW PAYOUTS · ZERO DEFAULT RISK · ★"}
            </div>
          </div>

          {/* Hovered state: Concise Marketing Pitch */}
          <div className="hidden group-hover:grid grid-cols-1 md:grid-cols-3 gap-6 text-left py-2 px-4 transition-all duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4.5 h-4.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider">{lang === "tr" ? "Neden Biz?" : "Why StellarForge?"}</h4>
              </div>
              <p className="text-xs text-[#8E97A4] leading-relaxed">
                {lang === "tr" 
                  ? "KOBİ'lerin dev alıcılar (Nestle, Zara) karşısındaki teminat ve nakit tıkanıklığını çözeriz." 
                  : "We unlock capital for suppliers using the creditworthiness of giant buyers."}
              </p>
            </div>
            <div className="space-y-2 border-l border-[#1E2128] pl-6">
              <div className="flex items-center gap-2">
                <svg className="w-4.5 h-4.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider">{lang === "tr" ? "Nasıl Çalışır?" : "How It Works?"}</h4>
              </div>
              <p className="text-xs text-[#8E97A4] leading-relaxed">
                {lang === "tr" 
                  ? "Tedarikçi %50 teminat kilitler ➔ Yatırımcı fonlar ➔ Oracle on-chain sevkiyat kanıtıyla parayı adım adım öder." 
                  : "Supplier locks 50% ➔ Lenders pool USDC ➔ Oracles verify proofs on-chain to release escrow payouts."}
              </p>
            </div>
            <div className="space-y-2 border-l border-[#1E2128] pl-6">
              <div className="flex items-center gap-2">
                <svg className="w-4.5 h-4.5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider">{lang === "tr" ? "Sonuç & Güvence" : "Settle & Guarantee"}</h4>
              </div>
              <p className="text-xs text-[#8E97A4] leading-relaxed">
                {lang === "tr" 
                  ? "Teslimatta alıcı öder, yatırımcı %5 kazanır, teminat iade edilir. Akıllı sözleşmeyle sıfır temerrüt riski!" 
                  : "Buyer repays at delivery, lenders earn 5% yield, deposit is returned. Risk-free escrow settlement."}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Row Cards */}
        {!showGuide && activeTab === "pipelines" && (
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-5 transition-all duration-300 ${
            tourStep === 1 ? "ring-4 ring-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.01] p-2 bg-[#13151A]/40 rounded-2xl" : ""
          }`}>
            {/* Stat 1: Total Pool */}
            <div className="bg-[#13151A] border border-[#1E2128] p-5 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-950/40 border border-orange-900/30 rounded-lg flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
              </div>
              <div>
                <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider">{t.totalPool}</span>
                <p className="text-xl font-bold text-white tracking-tight mt-0.5">$100,000</p>
                <span className="text-[10px] text-[#5F6774] font-medium">USDC — 4 projede</span>
              </div>
            </div>

            {/* Stat 2: Active Projects */}
            <div className="bg-[#13151A] border border-[#1E2128] p-5 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-950/40 border border-orange-900/30 rounded-lg flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
              </div>
              <div>
                <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider">{t.activeProjectsLabel}</span>
                <p className="text-xl font-bold text-white tracking-tight mt-0.5">2</p>
                <span className="text-[10px] text-[#5F6774] font-medium">proje devam ediyor</span>
              </div>
            </div>

            {/* Stat 3: My Investment */}
            <div className="bg-[#13151A] border border-[#1E2128] p-5 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-950/40 border border-orange-900/30 rounded-lg flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider">{t.myInvestment}</span>
                <p className="text-xl font-bold text-white tracking-tight mt-0.5">$6,500</p>
                <span className="text-[10px] text-[#5F6774] font-medium">Bağlı değil</span>
              </div>
            </div>

            {/* Stat 4: Expected Yield */}
            <div className="bg-[#13151A] border border-[#1E2128] p-5 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 bg-orange-950/40 border border-orange-900/30 rounded-lg flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
              </div>
              <div>
                <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider">{t.expectedYield}</span>
                <p className="text-xl font-bold text-orange-400 tracking-tight mt-0.5">+$325</p>
                <span className="text-[10px] text-[#5F6774] font-medium">@5% yıllık getiri</span>
              </div>
            </div>
          </div>
        )}

        {/* Content Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Workspace (Left Column) */}
          <div className="lg:col-span-3 space-y-6">
            
            {showGuide ? (
              <div className="bg-[#13151A] border border-[#1E2128] p-8 space-y-6 relative min-h-[550px] flex flex-col justify-between transition-all duration-300 rounded-xl">
                
                {/* Onboarding Header */}
                <div className="space-y-2">
                  <span className="text-xs text-orange-400 font-black uppercase tracking-wider">{lang === "tr" ? "İNTERAKTİF REHBER" : "INTERACTIVE TUTORIAL"}</span>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{t.guideTitle}</h2>
                  <p className="text-sm text-[#8E97A4] font-medium">{t.guideSubtitle}</p>
                </div>

                {/* Progress Stepper Visual */}
                <div className="grid grid-cols-4 gap-2 relative py-2">
                  <div className="absolute left-[12%] right-[12%] top-1/2 -translate-y-1/2 h-0.5 bg-[#1E2128]" />
                  
                  {[0, 1, 2, 3].map((step) => {
                    const isActive = guideSlide === step;
                    const isCompleted = guideSlide > step;
                    return (
                      <button
                        key={step}
                        onClick={() => setGuideSlide(step)}
                        className="relative z-10 flex flex-col items-center gap-2 group"
                      >
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition ${
                          isActive ? "bg-orange-400 text-[#111215] border-orange-400 font-bold" :
                          isCompleted ? "bg-[#13151A] text-orange-400 border-orange-400" :
                          "bg-[#0B0C0E] text-[#5F6774] border-[#1E2128] group-hover:border-[#373F4D]"
                        }`}>
                          {step + 1}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Slide Content Card */}
                <div className="bg-[#0B0C0E]/80 border border-[#1E2128] p-6 flex flex-col items-center text-center space-y-4 min-h-[220px] justify-center transition-all duration-300 rounded-xl">
                  {guideSlide === 0 && (
                    <>
                      <svg className="w-12 h-12 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <h3 className="text-base font-bold text-white mt-2">{t.slide1Title}</h3>
                      <p className="text-xs md:text-sm text-[#8E97A4] max-w-md leading-relaxed">{t.slide1Desc}</p>
                    </>
                  )}
                  {guideSlide === 1 && (
                    <>
                      <svg className="w-12 h-12 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" /><path d="M12 6v12" />
                      </svg>
                      <h3 className="text-base font-bold text-white mt-2">{t.slide2Title}</h3>
                      <p className="text-xs md:text-sm text-[#8E97A4] max-w-md leading-relaxed">{t.slide2Desc}</p>
                    </>
                  )}
                  {guideSlide === 2 && (
                    <>
                      <svg className="w-12 h-12 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <h3 className="text-base font-bold text-white mt-2">{t.slide3Title}</h3>
                      <p className="text-xs md:text-sm text-[#8E97A4] max-w-md leading-relaxed">{t.slide3Desc}</p>
                    </>
                  )}
                  {guideSlide === 3 && (
                    <>
                      <svg className="w-12 h-12 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <h3 className="text-base font-bold text-white mt-2">{t.slide4Title}</h3>
                      <p className="text-xs md:text-sm text-[#8E97A4] max-w-md leading-relaxed">{t.slide4Desc}</p>
                    </>
                  )}
                </div>

                {/* Brand Concept Illustration */}
                <div className="border-t border-[#1E2128] pt-6 space-y-3">
                  <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider block text-center">
                    {lang === "tr" ? "GÖRSEL TİCARET FİNANSMANI İŞ AKIŞI" : "VISUAL TRADE FINANCE WORKFLOW"}
                  </span>
                  <div className="relative overflow-hidden border border-[#1E2128] bg-[#0B0C0E] rounded-xl">
                    <img 
                      src="/stellarforge_illustration.jpg" 
                      alt="StellarForge Supply Chain Finance Illustration" 
                      className="w-full h-auto object-cover opacity-80 max-h-48"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E] via-transparent to-transparent" />
                  </div>
                </div>

                {/* Slide Deck Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-[#1E2128]">
                  <button
                    disabled={guideSlide === 0}
                    onClick={() => setGuideSlide(prev => prev - 1)}
                    className={`px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 rounded-lg ${
                      guideSlide === 0 ? "text-[#5F6774] cursor-not-allowed" : "bg-[#1E2128] hover:bg-[#2A2F3D] text-white"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                    </svg>
                    {t.prev}
                  </button>

                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((step) => (
                      <button 
                        key={step} 
                        onClick={() => setGuideSlide(step)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          guideSlide === step ? "bg-orange-400 w-5" : "bg-[#1E2128] w-2"
                        }`}
                      />
                    ))}
                  </div>

                  {guideSlide === 3 ? (
                    <button
                      onClick={() => setShowGuide(false)}
                      className="bg-orange-500 hover:bg-orange-400 text-[#111215] font-extrabold px-6 py-2.5 text-xs transition shadow-md rounded-lg flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5 text-[#111215]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {t.closeGuide}
                    </button>
                  ) : (
                    <button
                      onClick={() => setGuideSlide(prev => prev + 1)}
                      className="bg-orange-500 hover:bg-orange-400 text-[#111215] font-extrabold px-6 py-2.5 text-xs transition shadow-md rounded-lg flex items-center gap-1"
                    >
                      {t.next}
                      <svg className="w-3.5 h-3.5 text-[#111215]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  )}
                </div>

              </div>
            ) : activeTab === "pipelines" ? (
              <div className="space-y-6">
                
                {/* Header info */}
                <div className="flex justify-between items-center border-b border-[#1E2128] pb-3">
                  <h2 className="text-lg font-black text-white">{lang === "tr" ? "Projeler" : "Projects"}</h2>
                  <span className="text-xs text-[#5F6774] font-bold">4 {lang === "tr" ? "proje listelendi" : "projects listed"}</span>
                </div>

                {/* Projects Grid exactly mapping the Figma snapshot (2 columns layout) */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-300 ${
                  tourStep === 2 ? "ring-4 ring-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.01] p-2 bg-[#13151A]/40 rounded-2xl" : ""
                }`}>
                  {projects.map((p) => {
                    const allApproved = p.milestones.every(m => m.status === "Approved");
                    const hasMissedDeadline = p.milestones.some(m => currentTime > m.deadline && m.status !== "Approved");
                    const progressPercent = Math.min(100, Math.floor((p.fundedAmount / p.targetAmount) * 100));

                    return (
                      <div 
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className={`bg-[#13151A] border p-6 rounded-xl flex flex-col justify-between gap-6 transition relative cursor-pointer ${
                          p.id === selectedProjectId
                            ? "border-orange-500/40 shadow-lg shadow-orange-950/5"
                            : "border-[#1E2128] hover:border-[#272B35]"
                        }`}
                      >
                        
                        {/* Project Header Row */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#5F6774]">{p.id}</span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${
                              p.status === "Active" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                              p.status === "Pending" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              p.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              "bg-red-500/10 text-red-400 border-red-500/20"
                            }`}>
                              {p.status === "Active" ? t.statusActive :
                               p.status === "Pending" ? t.statusPending :
                               p.status === "Completed" ? t.statusCompleted :
                               t.statusLiquidated}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-950/20 text-[#10B981] border border-emerald-900/40 text-[9px] font-bold uppercase tracking-wider">
                            <span className="h-1 w-1 rounded-full bg-[#10B981]" />
                            {lang === "tr" ? "Oracle Doğrulamalı" : "Oracle Verified"}
                          </span>
                        </div>

                        {/* Title Block */}
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">{p.name}</h3>
                          <p className="text-xs text-[#8E97A4] font-medium mt-0.5">{p.originPort} ➔ {p.destPort}</p>
                        </div>

                        {/* Visual Shipping Route map */}
                        <div className="bg-[#0B0C0E]/60 border border-[#1E2128] p-5 h-20 flex items-center relative rounded-lg">
                          <div className="absolute left-[10%] right-[10%] h-0.5 bg-[#1E2128]" />
                          
                          {/* Active filled line */}
                          <div 
                            className="absolute left-[10%] h-0.5 bg-orange-400 transition-all duration-700" 
                            style={{ 
                              width: p.status === "Completed" ? "80%" :
                                     p.status === "Liquidated" ? "20%" :
                                     p.status === "Pending" ? "0%" : "40%"
                            }} 
                          />

                          {/* Port Origin */}
                          <div className="absolute left-[10%] top-[40%] -translate-x-1/2 flex flex-col items-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-orange-400 border-2 border-[#0B0C0E]" />
                            <span className="text-[10px] font-black text-[#5F6774] mt-4 whitespace-nowrap">{p.originPortCode}</span>
                          </div>

                          {/* Cargo vessel position */}
                          <div 
                            className="absolute z-20 flex flex-col items-center transition-all duration-700 -translate-x-1/2"
                            style={{ 
                              left: p.status === "Completed" ? "90%" :
                                    p.status === "Liquidated" ? "30%" :
                                    p.status === "Pending" ? "15%" : "50%",
                              top: "10px"
                            }}
                          >
                            <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M2 17h20M2 17l2.5-8h15l2.5 8M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4M12 3v6" />
                            </svg>
                          </div>

                          {/* Port Destination */}
                          <div className="absolute left-[90%] top-[40%] -translate-x-1/2 flex flex-col items-center">
                            <div className={`h-2.5 w-2.5 rounded-full border-2 border-[#0B0C0E] ${p.status === "Completed" ? "bg-orange-400" : "bg-[#1E2128]"}`} />
                            <span className="text-[10px] font-black text-[#5F6774] mt-4 whitespace-nowrap">{p.destPortCode}</span>
                          </div>
                        </div>

                        {/* Capital Funding Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-white">
                            <span className="text-[#8E97A4] font-black uppercase text-[10px] tracking-wider">{t.fundedAmount}</span>
                            <span>{formatNumber(p.fundedAmount)} / {formatNumber(p.targetAmount)} USDC</span>
                          </div>

                          <div className="h-1.5 bg-[#1E2128] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-500 rounded-full" 
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                            <span className="text-[#5F6774]">{progressPercent}% {lang === "tr" ? "fonlandı" : "funded"}</span>
                            {progressPercent >= 100 ? (
                              <span className="text-emerald-400">{lang === "tr" ? "Tam fonlandı ✓" : "Fully funded ✓"}</span>
                            ) : (
                              <span className="text-amber-500">{lang === "tr" ? "Fon toplanıyor" : "Funding"}</span>
                            )}
                          </div>
                        </div>

                        {/* Milestones timeline */}
                        <div className="space-y-3">
                          <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider block">{t.milestoneProgress}</span>
                          
                          <div className="flex items-center justify-between gap-1 relative py-2">
                            <div className="absolute left-4 right-4 h-0.5 bg-[#1E2128] z-0" />
                            
                            {p.milestones.map((m, index) => {
                              const isApproved = m.status === "Approved";
                              const isSubmitted = m.status === "ProofSubmitted";
                              return (
                                <div key={m.id} className="relative z-10 flex flex-col items-center gap-1 flex-1 text-center">
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition ${
                                    isApproved ? "bg-[#13151A] text-emerald-400 border-emerald-500/50" :
                                    isSubmitted ? "bg-[#13151A] text-amber-400 border-amber-500/50 animate-pulse" :
                                    "bg-[#13151A] text-[#5F6774] border-[#1E2128]"
                                  }`}>
                                    {isApproved ? (
                                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                    ) : isSubmitted ? (
                                      <svg className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    ) : (
                                      <span className="text-xs">{m.id}</span>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-bold text-white line-clamp-1 mt-1">{m.description}</span>
                                  <span className="text-[9px] text-[#5F6774] font-medium">{formatNumber(m.amountToRelease)} USDC</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Flat Details list */}
                        <div className="border-t border-[#1E2128] pt-4.5 flex flex-wrap justify-between items-center text-[10px] text-[#8E97A4] font-bold gap-2">
                          <div>
                            {lang === "tr" ? "Alıcı: " : "Buyer: "}<span className="text-white">{p.buyer}</span>
                          </div>
                          <div>
                            {lang === "tr" ? "Teminat: " : "Collateral: "}<span className="text-orange-400">{formatNumber(p.collateralLocked)} USDC</span>
                          </div>
                          <div>
                            {lang === "tr" ? "Getiri Oranı: " : "Yield: "}<span className="text-orange-400">5%</span>
                          </div>
                        </div>

                        {/* Interactive operations button mapped by selected role */}
                        <div className="pt-2">
                          {p.status === "Active" && (
                            <>
                              {userRole === "Supplier" && p.milestones.some(m => m.status === "Pending") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextPending = p.milestones.find(m => m.status === "Pending");
                                    if (nextPending) submitProof(p.id, nextPending.id);
                                  }}
                                  className="w-full bg-orange-500 hover:bg-orange-400 text-[#111215] py-2.5 rounded-lg text-xs font-extrabold transition shadow-md"
                                >
                                  {t.submitProof}
                                </button>
                              )}
                              {userRole === "Validator" && p.milestones.some(m => m.status === "ProofSubmitted") && (
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      const nextSub = p.milestones.find(m => m.status === "ProofSubmitted");
                                      if (nextSub) approveMilestone(p.id, nextSub.id, false);
                                    }}
                                    className="flex-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/60 text-red-400 py-2 rounded-lg text-xs font-bold transition"
                                  >
                                    {t.rejectBtn}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const nextSub = p.milestones.find(m => m.status === "ProofSubmitted");
                                      if (nextSub) approveMilestone(p.id, nextSub.id, true);
                                    }}
                                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-[#111215] py-2 rounded-lg text-xs font-extrabold transition shadow-md"
                                  >
                                    {t.approveBtn}
                                  </button>
                                </div>
                              )}
                              {userRole === "Buyer" && (
                                <button
                                  disabled={!allApproved}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (allApproved) buyerRepay(p.id);
                                  }}
                                  className={`w-full py-2.5 rounded-lg text-xs font-extrabold transition shadow-md ${
                                    allApproved 
                                      ? "bg-orange-500 hover:bg-orange-400 text-[#111215]" 
                                      : "bg-[#1E2128] text-slate-500 cursor-not-allowed"
                                  }`}
                                >
                                  {t.confirmRepay}
                                </button>
                              )}
                            </>
                          )}

                          {p.status === "Pending" && userRole === "Lender" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fundProject(p.id, p.targetAmount - p.fundedAmount);
                              }}
                              className="w-full bg-orange-500 hover:bg-orange-400 text-[#111215] py-2.5 rounded-lg text-xs font-extrabold transition shadow-md"
                            >
                              {t.fillTarget}
                            </button>
                          )}

                          {p.status === "Completed" && (
                            <button className="w-full bg-[#102A1E]/30 border border-emerald-900/40 text-emerald-400 py-2.5 rounded-lg text-xs font-bold cursor-default flex items-center justify-center gap-1">
                              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                              {lang === "tr" ? "Tamamlandı" : "Completed"}
                            </button>
                          )}

                          {/* Fallback button if no actions apply */}
                          {(!((p.status === "Active" && (userRole === "Supplier" || userRole === "Validator" || userRole === "Buyer")) || (p.status === "Pending" && userRole === "Lender")) && p.status !== "Completed") && (
                            <button className="w-full bg-[#1A1C20] text-[#5F6774] py-2.5 rounded-lg text-xs font-bold cursor-default">
                              {lang === "tr" ? "Bu rol için aksiyon yok" : "No action for this role"}
                            </button>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Create Trade form styled with rounded layout
              <div className="bg-[#13151A] border border-[#1E2128] p-6 md:p-8 space-y-6 rounded-xl">
                <div>
                  <h3 className="text-md md:text-lg font-bold text-white">{t.createTitle}</h3>
                  <p className="text-xs md:text-sm text-[#8E97A4] mt-1">{t.createDesc}</p>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.tradeTitle}</label>
                      <input 
                        type="text" 
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        placeholder={lang === "tr" ? "Kakao Çekirdeği Sevkiyatı" : "Cocoa Bean Shipping"}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-white font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.originPortLabel}</label>
                      <input 
                        type="text" 
                        value={newProjOrigin}
                        onChange={(e) => setNewProjOrigin(e.target.value)}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-white font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.destPortLabel}</label>
                      <input 
                        type="text" 
                        value={newProjDest}
                        onChange={(e) => setNewProjDest(e.target.value)}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.fundingTarget}</label>
                      <input 
                        type="number" 
                        value={newProjTarget}
                        onChange={(e) => setNewProjTarget(Number(e.target.value))}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-white font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.supplierAddr}</label>
                      <input 
                        type="text" 
                        value={newProjSupplier}
                        onChange={(e) => setNewProjSupplier(e.target.value)}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-[#8E97A4] font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#8E97A4]">{t.buyerAddr}</label>
                      <input 
                        type="text" 
                        value={newProjBuyer}
                        onChange={(e) => setNewProjBuyer(e.target.value)}
                        className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-3 text-xs outline-none focus:border-orange-500 text-[#8E97A4] font-medium"
                      />
                    </div>
                  </div>

                  {/* Milestone Builder */}
                  <div className="space-y-4 pt-3 border-t border-[#1E2128]">
                    <h4 className="text-xs md:text-sm font-black text-[#8E97A4] uppercase tracking-wider">{t.milestoneBreakdown}</h4>
                    
                    {newProjMilestones.map((m, index) => (
                      <div key={m.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0B0C0E]/50 p-4 border border-[#181B22] rounded-lg">
                        <div className="space-y-1">
                          <label className="text-xs text-[#8E97A4] font-bold">{t.milestoneDesc}</label>
                          <input 
                            type="text" 
                            value={m.description}
                            onChange={(e) => {
                              const updated = [...newProjMilestones];
                              updated[index].description = e.target.value;
                              setNewProjMilestones(updated);
                            }}
                            className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#8E97A4] font-bold">{t.hoursToDeadline}</label>
                          <input 
                            type="number" 
                            value={m.deadline}
                            onChange={(e) => {
                              const updated = [...newProjMilestones];
                              updated[index].deadline = Number(e.target.value);
                              setNewProjMilestones(updated);
                            }}
                            className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-[#8E97A4] font-bold">{t.amountToRelease}</label>
                          <input 
                            type="number" 
                            value={m.amountToRelease}
                            onChange={(e) => {
                              const updated = [...newProjMilestones];
                              updated[index].amountToRelease = Number(e.target.value);
                              setNewProjMilestones(updated);
                            }}
                            className="w-full bg-[#0B0C0E] border border-[#1E2128] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-[#1E2128]">
                    <div className="text-xs text-orange-400 bg-orange-500/5 p-3 border border-orange-500/10 max-w-md font-medium leading-relaxed rounded-lg flex items-start gap-1.5">
                      <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>{t.collateralWarning.replace("{amount}", formatNumber(newProjTarget / 2))}</span>
                    </div>
                    <button 
                      type="submit"
                      className="bg-orange-500 hover:bg-orange-400 text-[#111215] font-extrabold px-6 py-3 text-xs transition w-full md:w-auto shadow-md rounded-lg"
                    >
                      {t.submitContract}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Right Sidebar Column exactly matching the Figma layout */}
          <aside className="lg:col-span-1 space-y-6">
            
            {/* Active Role Control Block */}
            <div className={`bg-[#13151A] border p-5 rounded-xl space-y-4 transition-all duration-300 ${
              tourStep === 3 
                ? "ring-4 ring-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.01] border-orange-500" 
                : "border-[#1E2128]"
            }`}>
              <span className="text-[10px] text-[#5F6774] font-black uppercase tracking-wider block">
                {lang === "tr" ? "AKTİF ROL" : "ACTIVE ROLE"}
              </span>
              
              <div className="flex flex-col gap-2">
                {[
                  { id: "Lender", labelEn: "Investor", labelTr: "Yatırımcı" },
                  { id: "Supplier", labelEn: "Supplier", labelTr: "Tedarikçi" },
                  { id: "Buyer", labelEn: "Buyer", labelTr: "Alıcı" },
                  { id: "Validator", labelEn: "Validator", labelTr: "Doğrulayıcı" }
                ].map((role) => {
                  const isActive = userRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => handleRoleChange(role.id as any)}
                      className={`w-full text-left p-3 text-xs font-bold transition rounded-lg border ${
                        isActive
                          ? "bg-orange-950/20 text-orange-400 border-orange-500/40"
                          : "bg-[#0B0C0E]/40 text-[#8E97A4] border-[#1E2128] hover:border-[#272B35]"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{lang === "tr" ? role.labelTr : role.labelEn}</span>
                        {isActive && (
                          <span className="text-[8px] bg-orange-500 text-[#111215] px-1 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                            {lang === "tr" ? "AKTİF ADRES" : "ACTIVE ADDR"}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanatory description of how role is proven in production */}
              <div className="text-[10px] text-[#8E97A4] leading-normal pt-2 border-t border-[#1E2128] space-y-1">
                <span className="text-orange-400 font-extrabold block">🛡️ {lang === "tr" ? "Rolümü Nasıl Kanıtlarım?" : "How do I prove my role?"}</span>
                <p>
                  {lang === "tr" 
                    ? "Gerçek bir dApp'te rolünüz cüzdanınızın şifreleme imzası (Stellar adresi) ile kanıtlanır. Simülatörde rol seçtiğinizde cüzdan adresiniz otomatik olarak o rolün adresine geçer."
                    : "In a real dApp, your role is cryptographically proven by signing with your wallet. Selecting a role here simulates switching your active Stellar address."}
                </p>
              </div>
            </div>

            {/* Developer controls panel */}
            {showSimPanel ? (
              <div className={`bg-[#13151A] border p-5 shadow-md space-y-4 rounded-xl transition-all duration-300 ${
                tourStep === 4 
                  ? "ring-4 ring-orange-500 shadow-2xl shadow-orange-500/20 scale-[1.01] border-orange-500" 
                  : "border-[#1E2128]"
              }`}>
                <div className="flex justify-between items-center border-b border-[#1E2128] pb-2.5">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    {t.simulationPanel}
                  </h3>
                  <button 
                    onClick={() => setShowSimPanel(false)}
                    className="text-xs text-[#8E97A4] hover:text-white font-black"
                  >
                    [ Hide ]
                  </button>
                </div>

                {/* Time Simulator */}
                <div className="flex justify-between items-center gap-3">
                  <div className="text-xs">
                    <span className="text-[#8E97A4] block">{t.ledgerTime}</span>
                    <span className="text-white font-extrabold mt-0.5 block">{currentTime} {t.hours}</span>
                  </div>
                  <button 
                    onClick={() => fastForwardTime(24)}
                    className="text-xs bg-[#1E2128] hover:bg-[#2A2F3D] text-white font-bold py-1.5 px-3 rounded-lg transition"
                  >
                    +24 {t.hours}
                  </button>
                </div>

                {/* Auto Demo trigger */}
                <button
                  onClick={runAutoDemo}
                  disabled={demoActive}
                  className={`w-full text-xs font-black py-2.5 rounded-lg border transition ${
                    demoActive
                      ? "bg-[#0B0C0E] text-slate-600 border-[#1E2128] cursor-not-allowed"
                      : "bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-[#111215] border-orange-500/20"
                  }`}
                >
                  {demoActive ? t.demoRunning : t.startDemo}
                </button>

                {/* Interactive log viewer */}
                <div className="bg-[#0B0C0E] border border-[#1E2128] p-3.5 h-40 flex flex-col relative overflow-hidden rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-[#5F6774] uppercase tracking-wider">{t.onChainLogs}</span>
                    <button onClick={() => setEventLogs([])} className="text-[10px] text-[#5F6774] hover:text-[#8E97A4] font-bold uppercase">{t.clearLogs}</button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                    {eventLogs.map((log, i) => (
                      <div key={i} className="text-[10px] bg-[#13151A] p-2 space-y-0.5 border border-[#1E2128] rounded">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{log.timestamp}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${log.type === "success" ? "bg-emerald-400" : log.type === "warning" ? "bg-amber-400" : "bg-red-400"}`} />
                        </div>
                        <p className="text-slate-300 leading-normal">{log.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <button 
                onClick={() => setShowSimPanel(true)}
                className="w-full bg-[#13151A] hover:bg-[#1E2128] border border-[#1E2128] p-4 flex items-center justify-center gap-2 text-xs font-bold text-white transition shadow-sm rounded-xl"
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                {t.simulationPanel} [ Show ]
              </button>
            )}
            
            {/* Collapsed/Active developer badge */}
            <div className="flex justify-end pr-2 text-[10px] text-[#5F6774] font-bold gap-1 items-center">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              <span>{lang === "tr" ? "Geliştirici Araçları" : "Developer Tools"}: </span>
              <span className="text-orange-400 bg-orange-950/20 px-1.5 py-0.5 rounded border border-orange-900/30 uppercase">{getRoleTranslation(userRole, lang)}</span>
            </div>
            
          </aside>

        </div>
        {/* Onboarding Interactive Tour Panel */}
        {tourStep > 0 && (
          <div className="fixed bottom-24 right-6 z-50 bg-[#13151A] border-2 border-orange-500 p-5 rounded-xl shadow-2xl max-w-sm w-80 animate-fadeIn space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E2128] pb-2">
              <span className="text-[10px] text-orange-400 font-black tracking-widest uppercase">
                {lang === "tr" ? `ADIM ${tourStep} / 4` : `STEP ${tourStep} / 4`}
              </span>
              <button 
                onClick={() => setTourStep(0)}
                className="text-xs text-[#5F6774] hover:text-white font-extrabold"
              >
                [ {lang === "tr" ? "Kapat" : "Close"} ]
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                {tourStep === 1 && (lang === "tr" ? "1. Genel Havuz İstatistikleri" : "1. Global Pool Stats")}
                {tourStep === 2 && (lang === "tr" ? "2. Ticaret Projesi Kartları" : "2. Trade Project Cards")}
                {tourStep === 3 && (lang === "tr" ? "3. Aktif Hesap Rolleri" : "3. Active Simulator Roles")}
                {tourStep === 4 && (lang === "tr" ? "4. Zaman ve Akıllı Simülatör" : "4. Time & Block Simulator")}
              </h4>
              <p className="text-[11px] text-[#8E97A4] leading-relaxed">
                {tourStep === 1 && (lang === "tr" 
                  ? "Toplam havuz büyüklüğünü, aktif projeleri, yatırımlarınızı ve beklenen getiri oranlarını buradan takip edersiniz." 
                  : "Track total pool size, active trade projects, your mock investments, and expected yield rates here.")}
                {tourStep === 2 && (lang === "tr" 
                  ? "Santos'tan Hamburg'a uzanan sevkiyat rotalarını, toplanan USDC fonlarını ve onaylanması gereken aşamaları (Milestones) listeler." 
                  : "Lists active shipping routes (e.g. Santos to Hamburg), funded USDC amounts, and stage-by-stage milestone approvals.")}
                {tourStep === 3 && (lang === "tr" 
                  ? "Geliştirici modunda işlemler yapmak için rolünüzü (Tedarikçi, Alıcı vb.) değiştirebilir, cüzdan imzanızı simüle edebilirsiniz." 
                  : "Switch your account type (Supplier, Buyer, Oracle, etc.) to perform simulation actions with the correct wallet signature.")}
                {tourStep === 4 && (lang === "tr" 
                  ? "Ledger süresini ileri alarak proje teslim tarihlerini simüle edebilir, E2E otomatik demoyu tek tıkla izleyebilirsiniz." 
                  : "Advance blockchain time (+24h) to test deadlines, and watch the full automatic end-to-end demo flow.")}
              </p>
            </div>

            <div className="flex justify-between pt-2 border-t border-[#1E2128]">
              <button
                disabled={tourStep === 1}
                onClick={() => setTourStep(prev => Math.max(1, prev - 1))}
                className={`px-3 py-1.5 text-[10px] font-bold rounded transition ${
                  tourStep === 1 ? "text-slate-600 bg-[#0B0C0E] cursor-not-allowed" : "bg-[#1E2128] hover:bg-[#2A2F3D] text-white"
                }`}
              >
                {lang === "tr" ? "Geri" : "Prev"}
              </button>
              
              {tourStep === 4 ? (
                <button
                  onClick={() => setTourStep(0)}
                  className="bg-orange-500 hover:bg-orange-400 text-[#111215] font-extrabold px-4 py-1.5 text-[10px] rounded transition shadow-md"
                >
                  {lang === "tr" ? "Bitir" : "Finish"}
                </button>
              ) : (
                <button
                  onClick={() => setTourStep(prev => Math.min(4, prev + 1))}
                  className="bg-orange-500 hover:bg-orange-400 text-[#111215] font-extrabold px-4 py-1.5 text-[10px] rounded transition shadow-md"
                >
                  {lang === "tr" ? "İleri" : "Next"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Help Chain Icon Button */}
        <div className="fixed bottom-6 right-6 z-50 group flex flex-col items-end">
          {/* Tooltip balloon */}
          <div className="bg-[#13151A] border border-orange-500/30 text-orange-400 text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-lg mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap uppercase tracking-wider">
            {lang === "tr" ? "Yardıma mı ihtiyacınız var?" : "Need help?"}
          </div>
          
          <button
            onClick={() => setTourStep(prev => (prev > 0 ? 0 : 1))}
            className="h-12 w-12 rounded-full bg-[#13151A] border-2 border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-white flex items-center justify-center shadow-lg transition-all duration-300 scale-100 hover:scale-105 active:scale-95 relative"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-orange-500 text-[#111215] font-black text-[9px] h-4 w-4 rounded-full flex items-center justify-center tracking-tighter shadow-md">i</span>
          </button>
        </div>

      </main>

    </div>
  );
}

// Resilient role translation helper
function getRoleTranslation(role: string, locale: "tr" | "en") {
  const norm = role.toLowerCase();
  if (locale === "tr") {
    if (norm === "supplier") return "Tedarikçi";
    if (norm === "buyer") return "Alıcı";
    if (norm === "lender") return "Yatırımcı";
    return "Doğrulayıcı";
  } else {
    if (norm === "supplier") return "Supplier";
    if (norm === "buyer") return "Buyer";
    if (norm === "lender") return "Lender";
    return "Validator";
  }
}
