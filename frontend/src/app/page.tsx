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
  id: number;
  name: string;
  originPort: string;
  destPort: string;
  borrower: string;
  buyer: string;
  targetAmount: number;
  fundedAmount: number;
  fundingDeadline: number; // relative hours
  milestones: Milestone[];
  status: "Pending" | "Active" | "Completed" | "Liquidated";
  collateralLocked: number;
}

interface EventLog {
  timestamp: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
}

// Translations dictionary
const translations = {
  en: {
    title: "StellarForge Finance",
    tagline: "Industrial Trade & Supply Chain Finance",
    connectWallet: "Connect Wallet",
    walletConnected: "Wallet Connected",
    activePipelines: "Active Pipelines",
    createNewPipeline: "Register Supply Trade",
    howItWorks: "How it works",
    totalFinanced: "Total Financed Capital",
    lockedCollateral: "Locked Collateral Pool",
    avgYield: "Lender Yield Rate",
    simulationPanel: "Simulation Controls",
    ledgerTime: "Ledger Relative Time:",
    add24h: "+24 Hours",
    startDemo: "Run E2E Demo Simulation",
    demoRunning: "Demo Yürütülüyor...",
    roleSelector: "Active Account Role Simulator:",
    onChainLogs: "On-Chain Log Stream",
    clearLogs: "Clear",
    auditorVerified: "Oracle Verified",
    atSea: "Cargo in transit",
    fundedAmount: "Funded Capital",
    lockedCollateralLabel: "Locked Collateral",
    lenderYield: "Lender Yield",
    milestoneProgress: "Milestone Progression Path",
    statusPending: "Awaiting Funding Target",
    statusActive: "Active Trade Execution",
    statusCompleted: "Settled & Finalized",
    statusLiquidated: "Default / Liquidated",
    supplier: "Supplier",
    buyer: "Buyer",
    lender: "Lender",
    validator: "Validator (Oracle)",
    liquidator: "Liquidator (Keeper)",
    projectDetails: "Trade finance project",
    trustFooter: "3 independent oracle nodes verifying shipment proofs · last check 2 mins ago",
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
    confirmRepay: "Confirm Delivery & Settle Trade",
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
    createTitle: "Register Supply Trade"
  },
  tr: {
    title: "StellarForge Finance",
    tagline: "Endüstriyel Ticaret Finansmanı ve Lojistik Teminat Yönetimi",
    connectWallet: "Cüzdanı Bağla",
    walletConnected: "Cüzdan Bağlandı",
    activePipelines: "Aktif Finansmanlar",
    createNewPipeline: "Yeni Ticari Finansman Kaydı",
    howItWorks: "Nasıl Çalışır",
    totalFinanced: "Finanse Edilen Sermaye",
    lockedCollateral: "Kilitli Teminat Havuzu",
    avgYield: "Yatırımcı Getirisi",
    simulationPanel: "Simülasyon Denetimleri",
    ledgerTime: "Ledger Sanal Zamanı:",
    add24h: "+24 Saat İlerlet",
    startDemo: "E2E Akıllı Demosu Başlat",
    demoRunning: "Demo Yürütülüyor...",
    roleSelector: "Aktif Hesap Rol Simülatörü:",
    onChainLogs: "Zincir Üstü Event Akışı",
    clearLogs: "Temizle",
    auditorVerified: "Oracle doğrulamalı",
    atSea: "Açık denizde",
    fundedAmount: "Toplanan fon",
    lockedCollateralLabel: "Kilitli teminat",
    lenderYield: "Yatırımcı getirisi",
    milestoneProgress: "Kilometre taşı ilerlemesi",
    statusPending: "Fon Toplanıyor",
    statusActive: "Sevkiyat ve Yürütmede",
    statusCompleted: "Ödendi & Kapatıldı",
    statusLiquidated: "Temerrüt (Tasfiye)",
    supplier: "Tedarikçi (Borçlu)",
    buyer: "Alıcı (Yükümlü)",
    lender: "Yatırımcı (Lender)",
    validator: "Denetçi (Oracle)",
    liquidator: "Likidatör (Keeper)",
    projectDetails: "Tedarik finansmanı projesi",
    trustFooter: "3 bağımsız denetçi tarafından doğrulanan kanıtlar · son işlem 2 saat önce",
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
    confirmRepay: "Teslimatı Onayla ve Öde",
    repayNote: "Alıcı ödemesinin açılması için tüm milestone hedeflerinin Onaylanması gerekir.",
    triggerLiq: "Likidasyonu Tetikle (Temerrüt)",
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
    createTitle: "Yeni Ticari Finansman Kaydı"
  }
};

export default function Home() {
  const [lang, setLang] = useState<"en" | "tr">("tr");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"pipelines" | "create">("pipelines");
  
  // Wallet
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [userRole, setUserRole] = useState<"Supplier" | "Buyer" | "Lender" | "Validator" | "Liquidator">("Supplier");

  // Time & Simulator
  const [currentTime, setCurrentTime] = useState(0);
  const [demoActive, setDemoActive] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(true);

  // Active Project Selection
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);

  // Trade Pipelines State
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Organik kahve ihracatı",
      originPort: "Santos limanı",
      destPort: "Rotterdam limanı",
      borrower: "GD...BrazilCoffee",
      buyer: "GB...NestleBuyer",
      targetAmount: 25000,
      fundedAmount: 12000,
      fundingDeadline: 24,
      status: "Pending",
      collateralLocked: 12500,
      milestones: [
        {
          id: 1,
          description: "Hammadde tedariki",
          deadline: 48,
          amountToRelease: 10000,
          proofHash: "ipfs://santos-loading-bill-xml",
          status: "Approved",
        },
        {
          id: 2,
          description: "Üretim ve paketleme",
          deadline: 96,
          amountToRelease: 10000,
          proofHash: "ipfs://nestle-qa-check",
          status: "ProofSubmitted",
        },
        {
          id: 3,
          description: "Liman teslimi",
          deadline: 144,
          amountToRelease: 5000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: 2,
      name: "Tekstil sevkiyatı",
      originPort: "İstanbul limanı",
      destPort: "Hamburg limanı",
      borrower: "GD...AcmeTextile",
      buyer: "GB...ZaraGroup",
      targetAmount: 10000,
      fundedAmount: 10000,
      fundingDeadline: 48,
      status: "Active",
      collateralLocked: 5000,
      milestones: [
        {
          id: 1,
          description: "Hammadde tedariki ve iplik alımı",
          deadline: 72,
          amountToRelease: 4000,
          proofHash: "ipfs://procurement-docs",
          status: "Approved",
        },
        {
          id: 2,
          description: "Konfeksiyon üretim aşaması",
          deadline: 120,
          amountToRelease: 6000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
  ]);

  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // Form State
  const [newProjName, setNewProjName] = useState("");
  const [newProjOrigin, setNewProjOrigin] = useState("İzmir limanı");
  const [newProjDest, setNewProjDest] = useState("Hamburg limanı");
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
    try {
      const connected = await isConnected();
      if (connected) {
        const res = await getAddress();
        if (res && res.address) {
          setWalletAddress(res.address);
          setWalletConnected(true);
          logEvent("success", `Freighter connected: ${res.address.substring(0, 6)}...`);
        }
      } else {
        const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
        setWalletAddress(mockAddress);
        setWalletConnected(true);
        logEvent("info", `Connected via StellarForge Sandbox: ${mockAddress.substring(0, 6)}...`);
      }
    } catch (e) {
      const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
      setWalletAddress(mockAddress);
      setWalletConnected(true);
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

    const newProject: Project = {
      id: projects.length + 1,
      name: newProjName,
      originPort: newProjOrigin,
      destPort: newProjDest,
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
    setSelectedProjectId(newProject.id);
  };

  const fundProject = (id: number, amount: number) => {
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

  const submitProof = (projectId: number, milestoneId: number) => {
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

  const approveMilestone = (projectId: number, milestoneId: number, accept: boolean) => {
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

  const buyerRepay = (projectId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const repayment = p.targetAmount * 1.05;
        logEvent("success", `Buyer confirmed delivery. Settled ${formatNumber(repayment)} USDC.`);
        return { ...p, status: "Completed", fundedAmount: 0 };
      }
      return p;
    }));
  };

  const triggerDefault = (projectId: number) => {
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
        id: 3,
        name: "Akıllı Tarım İthalatı",
        originPort: "İzmir limanı",
        destPort: "Rotterdam limanı",
        borrower: "GD...IzmirAgri",
        buyer: "GB...NestleHQ",
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
      setSelectedProjectId(3);
      logEvent("success", "Project created. 10,000 USDC collateral locked in Vault.");
    }, 1500);

    // Fund
    setTimeout(() => {
      setProjects(prev => prev.map(p => p.id === 3 ? { ...p, fundedAmount: 20000, status: "Active" } : p));
      logEvent("success", "Lenders funded 20,000 USDC target. Status: Active.");
    }, 3500);

    // Submit Proof 1
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
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
        if (p.id === 3) {
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
        if (p.id === 3) {
          const updated = p.milestones.map(m => m.id === 2 ? { ...m, status: "Approved" as const, proofHash: "ipfs://delivery-receipt" } : m);
          logEvent("success", "Milestone #2 approved. Repayment available.");
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 9500);

    // Repay
    setTimeout(() => {
      setProjects(prev => prev.map(p => p.id === 3 ? { ...p, status: "Completed", fundedAmount: 0 } : p));
      logEvent("success", "Buyer settled repayment. 10,000 USDC collateral returned to supplier.");
      setDemoActive(false);
    }, 11500);
  };

  if (!mounted) return null;

  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const allApproved = currentProject.milestones.every(m => m.status === "Approved");
  const hasMissedDeadline = currentProject.milestones.some(m => currentTime > m.deadline && m.status !== "Approved");

  return (
    <div className="min-h-screen bg-[#16181C] text-[#E2E8F0] font-sans antialiased selection:bg-amber-500/20 selection:text-white">
      
      {/* Top Header */}
      <header className="border-b border-[#242930] bg-[#111215] px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md text-[#111215]">
            <svg className="w-6.5 h-6.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v2H3v-2z" />
              <path d="M2 10c3 0 4.5 1.5 5 3.5h10c.5-2 2-3.5 5-3.5v-2H2v2z" />
              <path d="M8 13.5h8v4.5H8v-4.5z" />
              <path d="M12 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="#E2E8F0" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-white">{t.title}</h1>
            <p className="text-xs text-[#8E97A4] font-medium">{t.tagline}</p>
          </div>
        </div>

        {/* Global Nav Tabs */}
        <div className="flex bg-[#1D2128] border border-[#2B313A] rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("pipelines")}
            className={`py-1.5 px-4 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "pipelines" ? "bg-[#2D343F] text-white shadow-sm" : "text-[#8E97A4] hover:text-white"
            }`}
          >
            📊 {t.activePipelines}
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`py-1.5 px-4 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "create" ? "bg-[#2D343F] text-white shadow-sm" : "text-[#8E97A4] hover:text-white"
            }`}
          >
            ➕ {t.createNewPipeline}
          </button>
        </div>

        {/* Primary Wallet connection */}
        <div className="flex items-center gap-4">
          
          {/* Language Switch */}
          <div className="flex bg-[#1A1C20] border border-[#2B313A] rounded-lg p-0.5">
            <button 
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded text-xs font-extrabold transition ${lang === "en" ? "bg-amber-500 text-[#111215]" : "text-[#8E97A4] hover:text-white"}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang("tr")}
              className={`px-2.5 py-1 rounded text-xs font-extrabold transition ${lang === "tr" ? "bg-amber-500 text-[#111215]" : "text-[#8E97A4] hover:text-white"}`}
            >
              TR
            </button>
          </div>

          <button
            onClick={connectWallet}
            className={`px-4.5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
              walletConnected
                ? "bg-amber-950/20 text-amber-400 border-amber-500/30"
                : "bg-amber-500 hover:bg-amber-400 text-[#111215] shadow-sm font-extrabold"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${walletConnected ? "bg-amber-400 animate-pulse" : "bg-[#111215]"}`} />
            {walletConnected ? `${walletAddress.substring(0, 8)}...` : t.connectWallet}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Column: Pipeline Selector (Only when viewing active pipelines) */}
        {activeTab === "pipelines" && (
          <aside className="lg:col-span-1 space-y-4">
            <h2 className="text-xs font-black text-[#8E97A4] uppercase tracking-widest">{t.activePipelines}</h2>
            <div className="space-y-2.5">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col gap-2.5 ${
                    p.id === selectedProjectId
                      ? "bg-[#20232A] border-amber-500/40 shadow-sm"
                      : "bg-[#1C1E24]/60 border-[#2A2F3A]/60 hover:border-[#373F4D]"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      p.status === "Active" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      p.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      p.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {p.status === "Active" ? t.statusActive :
                       p.status === "Pending" ? t.statusPending :
                       p.status === "Completed" ? t.statusCompleted :
                       t.statusLiquidated}
                    </span>
                    <span className="text-xs text-white font-bold">{formatNumber(p.targetAmount)} USDC</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-[#8E97A4] mt-0.5">{p.originPort} ➔ {p.destPort}</p>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Center/Main workspace (Lg: col-span-2 when side selector is active) */}
        <div className={`space-y-6 ${activeTab === "pipelines" ? "lg:col-span-2" : "lg:col-span-3"}`}>
          
          {activeTab === "pipelines" ? (
            <div className="bg-[#1C1E24] border border-[#2B313A]/80 rounded-2xl p-6 md:p-8 space-y-8 relative">
              
              {/* Trust Signal / Oracle Badge */}
              <div className="absolute top-6 right-6 md:top-8 md:right-8">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-950/40 text-amber-400 border border-amber-900/60 text-xs font-bold">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {t.auditorVerified}
                </span>
              </div>

              {/* Title Block */}
              <div className="space-y-1 max-w-[70%]">
                <span className="text-xs text-[#8E97A4] font-black uppercase tracking-wider">{t.projectDetails}</span>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{currentProject.name}</h2>
                <p className="text-sm text-[#8E97A4] font-medium">{currentProject.originPort} ➔ {currentProject.destPort}</p>
              </div>

              {/* Flat Shipping Rota Illustration */}
              <div className="bg-[#14161A]/80 border border-[#22272E] p-6 rounded-2xl h-24 flex items-center relative">
                {/* Shipping Track Line */}
                <div className="absolute left-[10%] right-[10%] h-0.5 bg-[#2D333F]" />
                
                {/* Finished Track Line */}
                <div 
                  className="absolute left-[10%] h-0.5 bg-amber-500 transition-all duration-700" 
                  style={{ 
                    width: currentProject.status === "Completed" ? "80%" :
                           currentProject.status === "Liquidated" ? "20%" :
                           currentProject.status === "Pending" ? "0%" : "40%"
                  }} 
                />

                {/* Dispatch Point */}
                <div className="absolute left-[10%] top-[40%] -translate-x-1/2 flex flex-col items-center">
                  <div className="h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-[#14161A] shadow" />
                  <span className="text-xs font-bold text-[#8E97A4] mt-5 whitespace-nowrap">{currentProject.originPort.split(" ")[0]}</span>
                </div>

                {/* Current Position / Vessel */}
                <div 
                  className="absolute z-20 flex flex-col items-center transition-all duration-700 -translate-x-1/2"
                  style={{ 
                    left: currentProject.status === "Completed" ? "90%" :
                          currentProject.status === "Liquidated" ? "30%" :
                          currentProject.status === "Pending" ? "10%" : "50%",
                    top: "8px"
                  }}
                >
                  <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider mb-1 block whitespace-nowrap">
                    {currentProject.status === "Active" ? t.atSea : 
                     currentProject.status === "Pending" ? (lang === "tr" ? "Limanda" : "Port loading") :
                     currentProject.status === "Completed" ? (lang === "tr" ? "Teslim Edildi" : "Delivered") :
                     (lang === "tr" ? "Temerrüt" : "Breached")}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-amber-500 text-[#111215] flex items-center justify-center border-4 border-[#14161A] shadow-md">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 17h20M2 17l2.5-8h15l2.5 8M8 9V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4M12 3v6"/></svg>
                  </div>
                </div>

                {/* Destination Point */}
                <div className="absolute left-[90%] top-[40%] -translate-x-1/2 flex flex-col items-center">
                  <div className={`h-3.5 w-3.5 rounded-full border-2 border-[#14161A] shadow ${currentProject.status === "Completed" ? "bg-amber-500" : "bg-[#2D333F]"}`} />
                  <span className="text-xs font-bold text-[#8E97A4] mt-5 whitespace-nowrap">{currentProject.destPort.split(" ")[0]}</span>
                </div>
              </div>

              {/* Stats Metrics Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat 1: Funded Amount */}
                <div className="bg-[#181A20] border border-[#252A33] p-5 rounded-xl space-y-1">
                  <span className="text-xs text-[#8E97A4] font-black uppercase tracking-wider">{t.fundedAmount}</span>
                  <p className="text-lg md:text-xl font-bold text-white mt-1.5">
                    {formatNumber(currentProject.fundedAmount)} <span className="text-sm text-[#8E97A4] font-medium">/ {formatNumber(currentProject.targetAmount)} USDC</span>
                  </p>
                  
                  {currentProject.status === "Pending" && (
                    <div className="flex gap-2 pt-3 w-full">
                      <button 
                        onClick={() => fundProject(currentProject.id, 5000)}
                        className="flex-1 bg-[#232731] hover:bg-[#2D3341] border border-[#343B48] text-xs font-bold py-2.5 rounded-lg transition"
                      >
                        +5.000 USDC
                      </button>
                      <button 
                        onClick={() => fundProject(currentProject.id, currentProject.targetAmount - currentProject.fundedAmount)}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#111215] text-xs font-extrabold py-2.5 rounded-lg transition shadow-sm"
                      >
                        {t.fillTarget}
                      </button>
                    </div>
                  )}
                </div>

                {/* Stat 2: Locked Collateral */}
                <div className="bg-[#181A20] border border-[#252A33] p-5 rounded-xl space-y-1">
                  <span className="text-xs text-[#8E97A4] font-black uppercase tracking-wider">{t.lockedCollateralLabel}</span>
                  <p className="text-lg md:text-xl font-bold text-white mt-1.5">{formatNumber(currentProject.collateralLocked)} USDC</p>
                </div>

                {/* Stat 3: Yield */}
                <div className="bg-[#181A20] border border-[#252A33] p-5 rounded-xl space-y-1">
                  <span className="text-xs text-[#8E97A4] font-black uppercase tracking-wider">{t.lenderYield}</span>
                  <p className="text-lg md:text-xl font-black text-amber-500 mt-1.5">%5.00</p>
                </div>

              </div>

              {/* Milestones progression */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-[#8E97A4] uppercase tracking-wider">{t.milestoneProgress}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {currentProject.milestones.map((m, index) => (
                    <div 
                      key={m.id} 
                      className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition ${
                        m.status === "Approved" ? "bg-emerald-950/15 border-emerald-900/60 text-emerald-400" :
                        m.status === "ProofSubmitted" ? "bg-[#30210A]/20 border-[#5A4010] text-[#FBBF24]/80 animate-pulse" :
                        m.status === "Rejected" ? "bg-red-950/20 border-red-900/60" :
                        "bg-[#14161A]/40 border-[#22272E]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
                            {m.status === "Approved" && (
                              <>
                                <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                <span className="text-emerald-400">{lang === "tr" ? "Onaylandı" : "Approved"}</span>
                              </>
                            )}
                            {m.status === "ProofSubmitted" && (
                              <>
                                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span className="text-amber-500">{lang === "tr" ? "Kanıt sunuldu" : "Proof submitted"}</span>
                              </>
                            )}
                            {m.status === "Pending" && (
                              <>
                                <svg className="w-4 h-4 text-[#8E97A4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="22"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
                                <span className="text-[#8E97A4]">{lang === "tr" ? "Bekliyor" : "Pending"}</span>
                              </>
                            )}
                            {m.status === "Rejected" && (
                              <span className="text-red-400">{lang === "tr" ? "Reddedildi" : "Rejected"}</span>
                            )}
                          </span>
                          <span className="text-xs text-[#8E97A4] font-bold"># {m.id}</span>
                        </div>
                        <h4 className="text-xs md:text-sm font-bold text-white leading-snug">{m.description}</h4>
                      </div>

                      <div className="pt-2 border-t border-[#262B34]/60 space-y-3">
                        <div className="flex justify-between text-xs text-[#8E97A4] font-bold">
                          <span>Vade: {m.deadline}h</span>
                          <span className="text-white">{formatNumber(m.amountToRelease)} USDC</span>
                        </div>

                        {/* Milestone action triggers based on active role */}
                        {currentProject.status === "Active" && (
                          <div className="pt-1">
                            {m.status === "Pending" && (
                              <button
                                onClick={() => submitProof(currentProject.id, m.id)}
                                className="w-full bg-[#1F2228] hover:bg-[#2C313B] border border-[#373F4F] text-[#E2E8F0] py-2 rounded-lg text-xs font-bold transition"
                              >
                                {t.submitProof}
                              </button>
                            )}
                            {m.status === "ProofSubmitted" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveMilestone(currentProject.id, m.id, false)}
                                  className="flex-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/60 text-red-400 py-1.5 rounded-lg text-xs font-bold transition"
                                >
                                  {t.rejectBtn}
                                </button>
                                <button
                                  onClick={() => approveMilestone(currentProject.id, m.id, true)}
                                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#111215] py-1.5 rounded-lg text-xs font-extrabold transition shadow-sm"
                                >
                                  {t.approveBtn}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlement and Liquidations */}
              {currentProject.status === "Active" && (
                <div className="border-t border-[#242930] pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-xs text-[#8E97A4] font-black uppercase tracking-wider block">{t.repaymentObligation}</span>
                    <span className="text-lg md:text-xl font-bold text-white mt-1 block">{formatNumber(currentProject.targetAmount * 1.05)} USDC</span>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto">
                    {allApproved ? (
                      <button 
                        onClick={() => buyerRepay(currentProject.id)}
                        className="bg-amber-500 hover:bg-amber-400 text-[#111215] font-extrabold px-6 py-2.5 rounded-xl text-xs transition w-full md:w-auto shadow-md"
                      >
                        {t.confirmRepay}
                      </button>
                    ) : (
                      <div className="text-xs text-[#8E97A4] bg-[#14161A] p-2.5 rounded-lg border border-[#22272E] font-medium max-w-xs">
                        🔒 {t.repayNote}
                      </div>
                    )}

                    {hasMissedDeadline && (
                      <button 
                        onClick={() => triggerDefault(currentProject.id)}
                        className="bg-red-700 hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition w-full md:w-auto shadow-md"
                      >
                        {t.triggerLiq}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* End status cards */}
              {currentProject.status === "Completed" && (
                <div className="bg-emerald-950/10 border border-emerald-900/60 p-4.5 rounded-xl text-xs text-emerald-400 font-medium">
                  🎉 {t.settledSuccess}
                </div>
              )}
              {currentProject.status === "Liquidated" && (
                <div className="bg-red-950/15 border border-red-900/60 p-4.5 rounded-xl text-xs text-red-400 font-medium">
                  ⚠️ {t.defaultedWarning}
                </div>
              )}

              {/* Verified Trust Footer */}
              <div className="border-t border-[#242930]/60 pt-4 flex items-center gap-2 text-xs text-[#8E97A4] font-medium">
                <svg className="w-3.5 h-3.5 text-[#5F6774]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {t.trustFooter}
              </div>

            </div>
          ) : (
            
            // Tab: Register Supply Trade Form
            <div className="bg-[#1C1E24] border border-[#2B313A]/80 rounded-2xl p-6 md:p-8 space-y-6">
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
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#8E97A4]">{t.originPortLabel}</label>
                    <input 
                      type="text" 
                      value={newProjOrigin}
                      onChange={(e) => setNewProjOrigin(e.target.value)}
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#8E97A4]">{t.destPortLabel}</label>
                    <input 
                      type="text" 
                      value={newProjDest}
                      onChange={(e) => setNewProjDest(e.target.value)}
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-white font-medium"
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
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#8E97A4]">{t.supplierAddr}</label>
                    <input 
                      type="text" 
                      value={newProjSupplier}
                      onChange={(e) => setNewProjSupplier(e.target.value)}
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-[#8E97A4] font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#8E97A4]">{t.buyerAddr}</label>
                    <input 
                      type="text" 
                      value={newProjBuyer}
                      onChange={(e) => setNewProjBuyer(e.target.value)}
                      className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl p-3 text-xs outline-none focus:border-amber-500 text-[#8E97A4] font-medium"
                    />
                  </div>
                </div>

                {/* Milestone Builder */}
                <div className="space-y-4 pt-3 border-t border-[#242930]">
                  <h4 className="text-xs md:text-sm font-black text-[#8E97A4] uppercase tracking-wider">{t.milestoneBreakdown}</h4>
                  
                  {newProjMilestones.map((m, index) => (
                    <div key={m.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#14161A]/50 p-4 border border-[#22272E] rounded-xl">
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
                          className="w-full bg-[#14161A] border border-[#2B313A] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
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
                          className="w-full bg-[#14161A] border border-[#2B313A] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
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
                          className="w-full bg-[#14161A] border border-[#2B313A] rounded-lg p-2.5 text-xs outline-none text-white font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-[#242930]">
                  <div className="text-xs text-amber-500 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10 max-w-md font-medium leading-relaxed">
                    ⚠️ {t.collateralWarning.replace("{amount}", formatNumber(newProjTarget / 2))}
                  </div>
                  <button 
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-[#111215] font-extrabold px-6 py-3 rounded-xl text-xs transition w-full md:w-auto shadow-md"
                  >
                    {t.submitContract}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Right Column: Simulation Controls & Logs */}
        <aside className="lg:col-span-1 space-y-4">
          {showSimPanel ? (
            <div className="bg-[#1C1E24] border border-[#2B313A] rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex justify-between items-center border-b border-[#242930] pb-2.5">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  ⚙️ {t.simulationPanel}
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
                  className="text-xs bg-[#242930] hover:bg-[#2D333F] border border-[#333B49] text-white font-bold py-1.5 px-3 rounded-lg transition"
                >
                  +24 {t.hours}
                </button>
              </div>

              {/* Auto Demo trigger */}
              <button
                onClick={runAutoDemo}
                disabled={demoActive}
                className={`w-full text-xs font-black py-2.5 rounded-xl border transition ${
                  demoActive
                    ? "bg-[#14161A] text-slate-600 border-[#22272E] cursor-not-allowed"
                    : "bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#111215] border-amber-500/20"
                }`}
              >
                {demoActive ? t.demoRunning : t.startDemo}
              </button>

              {/* Role Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#8E97A4] font-bold block">{t.roleSelector}</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="w-full bg-[#14161A] border border-[#2B313A] rounded-xl text-xs text-white p-2 outline-none focus:border-amber-500 font-medium"
                >
                  <option value="Supplier">{userRole === "Supplier" ? "Tedarikçi (Supplier)" : "Supplier"}</option>
                  <option value="Lender">{userRole === "Lender" ? "Yatırımcı (Lender)" : "Lender"}</option>
                  <option value="Buyer">{userRole === "Buyer" ? "Alıcı (Buyer)" : "Buyer"}</option>
                  <option value="Validator">{userRole === "Validator" ? "Denetçi (Validator)" : "Validator"}</option>
                </select>
              </div>

              {/* Interactive log viewer */}
              <div className="bg-[#14161A] border border-[#22272E] rounded-xl p-3.5 h-40 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-[#8E97A4] uppercase tracking-wider">{t.onChainLogs}</span>
                  <button onClick={() => setEventLogs([])} className="text-[10px] text-[#5F6774] hover:text-[#8E97A4] font-bold uppercase">{t.clearLogs}</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                  {eventLogs.map((log, i) => (
                    <div key={i} className="text-[10px] bg-[#1C1E24]/60 p-2 rounded-lg space-y-0.5 border border-[#242930]">
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
              className="w-full bg-[#1C1E24] hover:bg-[#20232A] border border-[#2B313A] rounded-2xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-white transition shadow-sm"
            >
              ⚙️ {t.simulationPanel} [ Show ]
            </button>
          )}
        </aside>

      </main>

    </div>
  );
}
