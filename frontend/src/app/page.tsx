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

// Translations
const translations = {
  en: {
    title: "StellarForge",
    subtitle: "Milestone-Backed Supply Chain Finance",
    simulatorTime: "Ledger Simulator Time:",
    hours: "hrs",
    connectWallet: "Connect Wallet",
    activePortfolio: "Active Portfolio",
    activeProjects: "Projects",
    undergoingExecution: "Undergoing milestone execution",
    totalFinanced: "Total Financed Capital",
    lockedCollateral: "Locked Supplier Collateral",
    avgYield: "Avg Yield Generated",
    activePipelines: "Active Supply Chain Pipelines",
    noActiveProjects: "No active trade finance projects found. Create a new pipeline as a Supplier.",
    targetFinancing: "Target Financing",
    funded: "Funded",
    milestoneExecution: "Milestone Execution Tree",
    dashboardTab: "Monitor Hub",
    createTab: "Supplier Factory",
    fundTab: "Lending Market",
    executionTab: "Milestone Center",
    settlementTab: "Settlement Desk",
    factoryTitle: "Supplier Project Factory",
    factoryDesc: "Register a new trade financing pipeline backed by milestones and deposit collateral protection.",
    tradeTitle: "Trade Contract Title",
    capitalTarget: "Capital Target",
    supplierAddr: "Supplier Address (Borrower)",
    buyerAddr: "Buyer Address (Obligor)",
    milestoneBreakdown: "Milestone Breakdown",
    milestoneDesc: "Description",
    hoursToDeadline: "Hours to Deadline",
    amountToRelease: "Amount to Release",
    collateralNote: "Note: Collateral requirement is {amount} USDC. Ensure collateral is deposited in the Vault before initializing.",
    deployBtn: "Deploy Trade Finance Pipeline",
    activeLending: "Active Lending Markets",
    lendingDesc: "Supply capital to trade finance pipelines. Earn 5.00% yield on final buyer delivery.",
    noLending: "No projects currently seeking capital. Check back soon.",
    requiredCapital: "Required Capital",
    fundingDeadline: "Funding Deadline",
    expectedROI: "Expected ROI",
    fillTarget: "Fill Target",
    executionTitle: "Supplier & Validator Execution Desk",
    executionDesc: "Suppliers submit logistics/delivery proof hashes. Validators whitelist and approve releases.",
    noExecution: "No active projects currently in execution. Fund a pending project to activate.",
    submitProof: "Submit Shipping Proof",
    rejectBtn: "Reject",
    approveBtn: "Approve & Payout",
    fundedSettled: "Funded & Settled",
    settlementTitle: "Settlement & Risk Default Desk",
    settlementDesc: "Buyers repay completed supply trades. Keepers trigger collateral default liquidation on breach.",
    noSettlement: "No active trades currently in settlement phase.",
    repaymentObligation: "Repayment Obligation (Principal + 5% Yield)",
    confirmRepay: "Confirm Delivery & Repay",
    repayNote: "Repayment available once all milestones are Approved.",
    triggerLiq: "Trigger Liquidation (Default)",
    settlementFinalized: "Settlement Finalized. All lenders paid back with 5% yield split. Collateral released back to Supplier.",
    projectDefaulted: "Project Defaulted. Collateral liquidated and distributed pro-rata to lenders.",
    onChainLogs: "On-Chain Event Logs",
    clear: "Clear",
    footer: "StellarForge Finance • Built for Stellar Soroban Smart Contract Architecture",
    toastUSDC: "USDC Token contract initialized successfully.",
    toastCollateral: "Supplier registered {amount} USDC collateral to Vault.",
    toastProject: "Organic Coffee Export project registered on-chain."
  },
  tr: {
    title: "StellarForge",
    subtitle: "Milestone Destekli Tedarik Zinciri Finansmanı",
    simulatorTime: "Ledger Simülatör Zamanı:",
    hours: "saat",
    connectWallet: "Cüzdanı Bağla",
    activePortfolio: "Aktif Portföy",
    activeProjects: "Proje",
    undergoingExecution: "Milestone süreçleri devam ediyor",
    totalFinanced: "Toplam Finanse Edilen Sermaye",
    lockedCollateral: "Kilitli Tedarikçi Teminatı",
    avgYield: "Ortalama Faiz Oranı",
    activePipelines: "Aktif Tedarik Zinciri Finansmanları",
    noActiveProjects: "Aktif ticaret finansmanı projesi bulunamadı. Tedarikçi olarak yeni bir finansman başlatın.",
    targetFinancing: "Hedef Finansman",
    funded: "Toplanan",
    milestoneExecution: "Milestone İlerleme Ağacı",
    dashboardTab: "İşlem İzleme",
    createTab: "Tedarikçi Fabrikası",
    fundTab: "Yatırım Pazarı",
    executionTab: "Milestone Yönetimi",
    settlementTab: "Ödeme & Settlement",
    factoryTitle: "Tedarikçi Proje Fabrikası",
    factoryDesc: "Milestone hedefleri ve emanet kasa korumalı yeni bir tedarik finansmanı başlatın.",
    tradeTitle: "Ticari Sözleşme Başlığı",
    capitalTarget: "Finansman Hedefi",
    supplierAddr: "Tedarikçi Adresi (Borçlu)",
    buyerAddr: "Alıcı Adresi (Yükümlü)",
    milestoneBreakdown: "Milestone Dağılımı",
    milestoneDesc: "Açıklama",
    hoursToDeadline: "Teslimat Süresi (Saat)",
    amountToRelease: "Serbest Bırakılacak Tutar",
    collateralNote: "Not: Teminat gereksinimi {amount} USDC'dir. Başlatmadan önce teminatın kasaya (Vault) yatırıldığından emin olun.",
    deployBtn: "Finansman Sözleşmesini Başlat",
    activeLending: "Aktif Yatırım Fırsatları",
    lendingDesc: "Tedarik zinciri finansmanlarına sermaye sağlayın. Alıcı teslimatı onayladığında %5 net faiz kazanın.",
    noLending: "Şu anda fon arayan bir proje bulunmuyor. Lütfen daha sonra tekrar kontrol edin.",
    requiredCapital: "Gerekli Sermaye",
    fundingDeadline: "Fonlama Süresi",
    expectedROI: "Beklenen Getiri",
    fillTarget: "Tamamını Fonla",
    executionTitle: "Tedarikçi & Denetçi İşlem Masası",
    executionDesc: "Tedarikçiler sevkiyat kanıtlarını (hash) sunar. Denetçiler bunları doğrulayarak ödemeyi serbest bırakır.",
    noExecution: "Şu anda yürütme aşamasında olan aktif bir proje yok. Aktifleştirmek için bekleyen bir projeyi fonlayın.",
    submitProof: "Sevkiyat Kanıtı Gönder",
    rejectBtn: "Reddet",
    approveBtn: "Onayla & Öde",
    fundedSettled: "Ödendi & Tamamlandı",
    settlementTitle: "Ödeme & Risk Likidasyon Masası",
    settlementDesc: "Alıcılar tamamlanan projeleri geri öder. Gecikme durumunda likidatörler teminatı çözer.",
    noSettlement: "Şu anda ödeme veya tasfiye aşamasında olan aktif bir ticaret bulunmuyor.",
    repaymentObligation: "Geri Ödeme Yükümlülüğü (Anapara + %5 Faiz)",
    confirmRepay: "Teslimatı Onayla ve Öde",
    repayNote: "Geri ödeme seçeneği, tüm milestone hedefleri Onaylandıktan sonra aktifleşir.",
    triggerLiq: "Likidasyonu Tetikle (Temerrüt)",
    settlementFinalized: "Geri Ödeme Tamamlandı. Tüm yatırımcılara %5 faiz dahil geri ödeme yapıldı. Teminat tedarikçiye iade edildi.",
    projectDefaulted: "Proje Temerrüde Düştü. Teminat tasfiye edildi ve yatırımcılara payları oranında dağıtıldı.",
    onChainLogs: "Zincir Üstü Event Akışı",
    clear: "Temizle",
    footer: "StellarForge Finance • Stellar Soroban Akıllı Sözleşme Mimarisi Üzerine İnşa Edilmiştir",
    toastUSDC: "USDC Token sözleşmesi başarıyla başlatıldı.",
    toastCollateral: "Tedarikçi Vault'a {amount} USDC teminat kilitledi.",
    toastProject: "Organik Kahve İhracatı projesi zincir üstünde oluşturuldu."
  }
};

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "create" | "fund" | "execution" | "settlement">("dashboard");

  // Language
  const [lang, setLang] = useState<"en" | "tr">("tr");

  // Hydration fix
  const [mounted, setMounted] = useState(false);

  // Wallet
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [userRole, setUserRole] = useState<"Supplier" | "Buyer" | "Lender" | "Validator" | "Liquidator">("Supplier");

  // Simulator State
  const [currentTime, setCurrentTime] = useState(0); // in hours
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Tekstil Sevkiyatı (İstanbul - Hamburg)",
      borrower: "GD...Supplier",
      buyer: "GB...Buyer",
      targetAmount: 10000,
      fundedAmount: 10000,
      fundingDeadline: 24,
      status: "Active",
      collateralLocked: 5000,
      milestones: [
        {
          id: 1,
          description: "Hammadde Tedariki",
          deadline: 48,
          amountToRelease: 3000,
          proofHash: "ipfs://procurement-receipt-xml",
          status: "Approved",
        },
        {
          id: 2,
          description: "Üretim & Kalite Kontrol",
          deadline: 96,
          amountToRelease: 4000,
          proofHash: "ipfs://factory-batch-qa-report",
          status: "ProofSubmitted",
        },
        {
          id: 3,
          description: "Gümrük İşlemleri & Gemi Yükleme",
          deadline: 144,
          amountToRelease: 3000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: 2,
      name: "Organik Kahve İhracatı (Santos - Rotterdam)",
      borrower: "GD...Supplier",
      buyer: "GB...Buyer",
      targetAmount: 25000,
      fundedAmount: 12000,
      fundingDeadline: 12,
      status: "Pending",
      collateralLocked: 12500,
      milestones: [
        {
          id: 1,
          description: "Hasat & Tasnif",
          deadline: 72,
          amountToRelease: 10000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 2,
          description: "İşleme & Paketleme",
          deadline: 120,
          amountToRelease: 15000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
  ]);

  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  useEffect(() => {
    setMounted(true);
    // Initialize default event logs with correct language translations
    const defaultLogs: EventLog[] = [
      { timestamp: "10:30", type: "success", message: translations[lang].toastUSDC },
      { timestamp: "10:32", type: "info", message: translations[lang].toastCollateral.replace("{amount}", formatNumber(12500)) },
      { timestamp: "10:35", type: "success", message: translations[lang].toastProject },
    ];
    setEventLogs(defaultLogs);
  }, [lang]);

  // Form states for creating a new project
  const [newProjName, setNewProjName] = useState("");
  const [newProjSupplier, setNewProjSupplier] = useState("GDSupplierAddress...");
  const [newProjBuyer, setNewProjBuyer] = useState("GBBuyerAddress...");
  const [newProjTarget, setNewProjTarget] = useState(15000);
  const [newProjDeadline, setNewProjDeadline] = useState(48);
  const [newProjMilestones, setNewProjMilestones] = useState<Omit<Milestone, "status" | "proofHash">[]>([
    { id: 1, description: "Milestone 1 Açıklaması", deadline: 96, amountToRelease: 7500 },
    { id: 2, description: "Milestone 2 Açıklaması", deadline: 168, amountToRelease: 7500 },
  ]);

  const t = translations[lang];

  // Format numbers properly based on selected locale
  const formatNumber = (num: number) => {
    return num.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
  };

  // Connect Freighter Wallet
  const connectWallet = async () => {
    try {
      const connected = await isConnected();
      if (connected) {
        const res = await getAddress();
        if (res && res.address) {
          setWalletAddress(res.address);
          setWalletConnected(true);
          logEvent("success", `Freighter Wallet connected: ${res.address.substring(0, 6)}...${res.address.substring(res.address.length - 4)}`);
        } else {
          throw new Error("No address returned");
        }
      } else {
        // Mock connection if Freighter extension is not present
        const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
        setWalletAddress(mockAddress);
        setWalletConnected(true);
        logEvent("info", `Freighter not detected. Connected via StellarForge sandbox: ${mockAddress.substring(0, 6)}...`);
      }
    } catch (e) {
      const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      logEvent("info", `Freighter API fallback. Connected via StellarForge sandbox: ${mockAddress.substring(0, 6)}...`);
    }
  };

  const logEvent = (type: "info" | "success" | "warning" | "error", message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLogs(prev => [{ timestamp: time, type, message }, ...prev]);
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    // Validate milestone sums
    const totalMilestoneAmount = newProjMilestones.reduce((acc, curr) => acc + curr.amountToRelease, 0);
    if (totalMilestoneAmount !== newProjTarget) {
      logEvent("error", `Total milestone values (${formatNumber(totalMilestoneAmount)} USDC) must equal the funding target (${formatNumber(newProjTarget)} USDC).`);
      return;
    }

    const newProject: Project = {
      id: projects.length + 1,
      name: newProjName,
      borrower: newProjSupplier.substring(0, 10) + "...",
      buyer: newProjBuyer.substring(0, 10) + "...",
      targetAmount: newProjTarget,
      fundedAmount: 0,
      fundingDeadline: currentTime + newProjDeadline,
      collateralLocked: newProjTarget / 2, // 50% collateral
      status: "Pending",
      milestones: newProjMilestones.map(m => ({
        ...m,
        proofHash: "",
        status: "Pending"
      }))
    };

    setProjects(prev => [...prev, newProject]);
    logEvent("success", `New project "${newProjName}" initialized on-chain. Collateral required: ${formatNumber(newProjTarget / 2)} USDC.`);
    setActiveTab("dashboard");
    // Reset form
    setNewProjName("");
  };

  const fundProject = (id: number, amount: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const nextFunded = Math.min(p.targetAmount, p.fundedAmount + amount);
        const nextStatus = nextFunded >= p.targetAmount ? "Active" : p.status;
        logEvent("success", `Lender supplied ${formatNumber(amount)} USDC to project #${id}. Funded: ${formatNumber(nextFunded)}/${formatNumber(p.targetAmount)} USDC.`);
        if (nextStatus === "Active") {
          logEvent("info", `Project #${id} meets funding target! Shifted state to Active. Execution phase started.`);
        }
        return { ...p, fundedAmount: nextFunded, status: nextStatus };
      }
      return p;
    }));
  };

  const submitProof = (projectId: number, milestoneId: number, ipfsHash: string) => {
    if (!ipfsHash) return;
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const updatedMilestones = p.milestones.map(m => {
          if (m.id === milestoneId) {
            logEvent("info", `Supplier submitted delivery proof for Project #${projectId}, Milestone #${milestoneId}.`);
            return { ...m, proofHash: ipfsHash, status: "ProofSubmitted" as const };
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
              logEvent("success", `Oracle & Validator approved Milestone #${milestoneId} of Project #${projectId}. Released ${formatNumber(m.amountToRelease)} USDC to Supplier.`);
            } else {
              logEvent("warning", `Milestone #${milestoneId} of Project #${projectId} rejected. Incomplete verification.`);
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
        const repayment = p.targetAmount * 1.05; // 5% yield
        logEvent("success", `Buyer confirmed final delivery. Transferred ${formatNumber(repayment)} USDC repayment (principal + yield) to Escrow.`);
        logEvent("info", `Collateral of ${formatNumber(p.collateralLocked)} USDC returned to Supplier.`);
        logEvent("success", `Lenders reimbursed pro-rata with 5% yield split.`);
        return { ...p, status: "Completed", fundedAmount: 0 };
      }
      return p;
    }));
  };

  const triggerDefault = (projectId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        logEvent("error", `Project #${projectId} breached milestone deadlines. Liquidation triggered.`);
        logEvent("success", `Collateral pool of ${formatNumber(p.collateralLocked)} USDC claimed from Vault.`);
        logEvent("info", `5% keeper fee paid to liquidator.`);
        logEvent("success", `Remaining collateral + unreleased escrow distributed to lenders pro-rata.`);
        return { ...p, status: "Liquidated" };
      }
      return p;
    }));
  };

  const fastForwardTime = (hours: number) => {
    const nextTime = currentTime + hours;
    setCurrentTime(nextTime);
    logEvent("warning", `Ledger time advanced by ${hours} hours. Current relative time: ${nextTime} hours.`);

    // Check deadlines
    projects.forEach(p => {
      if (p.status === "Active") {
        p.milestones.forEach(m => {
          if (nextTime > m.deadline && m.status !== "Approved") {
            logEvent("error", `Project #${p.id} Milestone #${m.id} deadline (${m.deadline}h) expired at ${nextTime}h. Supplier default risk active!`);
          }
        });
      }
      if (p.status === "Pending" && nextTime > p.fundingDeadline && p.fundedAmount < p.targetAmount) {
        logEvent("warning", `Project #${p.id} funding phase expired without meeting target. Lenders may now claim refund.`);
      }
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 animate-pulse" />
          <p className="text-sm font-semibold text-slate-400">Loading StellarForge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-xl text-slate-950">SF</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>
        </div>

        {/* Ledger Time Simulator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 px-3">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">{t.simulatorTime}</span>
          <span className="text-sm font-bold text-slate-200">{currentTime} {t.hours}</span>
          <button 
            onClick={() => fastForwardTime(24)}
            className="ml-2 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold py-1 px-2.5 rounded-lg transition border border-indigo-500/30"
          >
            +24 {t.hours}
          </button>
        </div>

        {/* Language Selection & Wallet connection */}
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button 
              onClick={() => setLang("en")}
              className={`px-2.5 py-1 rounded-lg text-2xs font-extrabold transition ${lang === "en" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang("tr")}
              className={`px-2.5 py-1 rounded-lg text-2xs font-extrabold transition ${lang === "tr" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              TR
            </button>
          </div>

          <select 
            value={userRole} 
            onChange={(e) => setUserRole(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 p-2 outline-none focus:border-indigo-500"
          >
            <option value="Supplier">{userRole === "Supplier" ? "Tedarikçi (Borçlu)" : "Supplier (Borrower)"}</option>
            <option value="Lender">{userRole === "Lender" ? "Yatırımcı (Fon Sağlayıcı)" : "Lender (Funder)"}</option>
            <option value="Buyer">{userRole === "Buyer" ? "Alıcı (Yükümlü)" : "Buyer (Repayer)"}</option>
            <option value="Validator">{userRole === "Validator" ? "Denetçi (Oracle)" : "Validator (Oracle)"}</option>
            <option value="Liquidator">{userRole === "Liquidator" ? "Likidatör (Keeper)" : "Liquidator (Keeper)"}</option>
          </select>

          <button
            onClick={connectWallet}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              walletConnected
                ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            }`}
          >
            <div className={`h-2 w-2 rounded-full ${walletConnected ? "bg-teal-400 animate-pulse" : "bg-white"}`} />
            {walletConnected ? `${walletAddress.substring(0, 8)}...` : t.connectWallet}
          </button>
        </div>
      </header>

      {/* Main Stats Summary */}
      <section className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.activePortfolio}</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {projects.filter(p => p.status === "Active").length} {t.activeProjects}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t.undergoingExecution}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.totalFinanced}</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {formatNumber(projects.reduce((acc, p) => acc + (p.status === "Active" ? p.targetAmount : 0), 0))} USDC
          </p>
          <p className="text-xs text-slate-500 mt-1">{t.undergoingExecution}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.lockedCollateral}</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {formatNumber(projects.reduce((acc, p) => acc + (p.status === "Active" ? p.collateralLocked : 0), 0))} USDC
          </p>
          <p className="text-xs text-slate-500 mt-1">{t.undergoingExecution}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t.avgYield}</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">5.00 %</p>
          <p className="text-xs text-slate-500 mt-1">{t.undergoingExecution}</p>
        </div>
      </section>

      {/* Main Grid: Tabs & Action Area + Event Logs */}
      <section className="px-6 pb-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Selection */}
          <nav className="flex bg-slate-900/70 border border-slate-900 rounded-xl p-1">
            {[
              { id: "dashboard", label: t.dashboardTab },
              { id: "create", label: t.createTab },
              { id: "fund", label: t.fundTab },
              { id: "execution", label: t.executionTab },
              { id: "settlement", label: t.settlementTab },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab content: Monitor Hub */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold tracking-tight text-slate-200">{t.activePipelines}</h2>
              {projects.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  {t.noActiveProjects}
                </div>
              ) : (
                projects.map(p => (
                  <div key={p.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-2xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          p.status === "Active" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          p.status === "Pending" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          p.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {p.status}
                        </span>
                        <h3 className="text-md font-bold text-slate-200 mt-2">{p.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">{t.targetFinancing}</p>
                        <p className="text-lg font-bold text-indigo-300">{formatNumber(p.targetAmount)} USDC</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{t.funded}: {formatNumber(p.fundedAmount)} USDC</span>
                        <span>{Math.round((p.fundedAmount / p.targetAmount) * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
                          style={{ width: `${(p.fundedAmount / p.targetAmount) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Milestones Flow */}
                    <div className="pt-2 border-t border-slate-900 space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.milestoneExecution}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {p.milestones.map(m => (
                          <div key={m.id} className="bg-slate-950 border border-slate-900 rounded-xl p-3 space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-300"># {m.id}</span>
                              <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                                m.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                                m.status === "ProofSubmitted" ? "bg-blue-500/10 text-blue-400" :
                                m.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                                "bg-slate-800 text-slate-400"
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            <p className="text-slate-400 line-clamp-1">{m.description}</p>
                            <div className="flex justify-between text-2xs text-slate-500">
                              <span>Deadline: {m.deadline}h</span>
                              <span className="font-medium text-slate-400">{formatNumber(m.amountToRelease)} USDC</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab content: Supplier Factory */}
          {activeTab === "create" && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-200">{t.factoryTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{t.factoryDesc}</p>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.tradeTitle}</label>
                    <input 
                      type="text" 
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder={lang === "tr" ? "örn. Buğday İhracat Sevkiyatı X-20" : "e.g. Grain Export Shipment X-20"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.capitalTarget} (USDC)</label>
                    <input 
                      type="number" 
                      value={newProjTarget}
                      onChange={(e) => setNewProjTarget(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.supplierAddr}</label>
                    <input 
                      type="text" 
                      value={newProjSupplier}
                      onChange={(e) => setNewProjSupplier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">{t.buyerAddr}</label>
                    <input 
                      type="text" 
                      value={newProjBuyer}
                      onChange={(e) => setNewProjBuyer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-slate-400"
                    />
                  </div>
                </div>

                {/* Milestone Builder */}
                <div className="space-y-3 pt-2 border-t border-slate-900">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.milestoneBreakdown}</h4>
                  
                  {newProjMilestones.map((m, index) => (
                    <div key={m.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-2xs text-slate-500 font-bold">{t.milestoneDesc}</label>
                        <input 
                          type="text" 
                          value={m.description}
                          onChange={(e) => {
                            const updated = [...newProjMilestones];
                            updated[index].description = e.target.value;
                            setNewProjMilestones(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs outline-none text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-2xs text-slate-500 font-bold">{t.hoursToDeadline}</label>
                        <input 
                          type="number" 
                          value={m.deadline}
                          onChange={(e) => {
                            const updated = [...newProjMilestones];
                            updated[index].deadline = Number(e.target.value);
                            setNewProjMilestones(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs outline-none text-slate-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-2xs text-slate-500 font-bold">{t.amountToRelease} (USDC)</label>
                        <input 
                          type="number" 
                          value={m.amountToRelease}
                          onChange={(e) => {
                            const updated = [...newProjMilestones];
                            updated[index].amountToRelease = Number(e.target.value);
                            setNewProjMilestones(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs outline-none text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4">
                  <div className="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 max-w-md">
                    {t.collateralNote.replace("{amount}", formatNumber(newProjTarget / 2))}
                  </div>
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl text-xs font-bold text-white transition shadow-lg shadow-indigo-500/20 w-full md:w-auto"
                  >
                    {t.deployBtn}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab content: Lending Market */}
          {activeTab === "fund" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-200">{t.activeLending}</h2>
                  <p className="text-xs text-slate-400 mt-1">{t.lendingDesc}</p>
                </div>
              </div>

              {projects.filter(p => p.status === "Pending").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  {t.noLending}
                </div>
              ) : (
                projects.filter(p => p.status === "Pending").map(p => (
                  <div key={p.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 hover:border-slate-800 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-md font-bold text-slate-200">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Supplier: {p.borrower} | Buyer: {p.buyer}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          Funding Open
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-500 block">{t.requiredCapital}</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{formatNumber(p.targetAmount)} USDC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t.lockedCollateral}</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{formatNumber(p.collateralLocked)} USDC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t.fundingDeadline}</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{p.fundingDeadline} {t.hours}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">{t.expectedROI}</span>
                        <span className="font-bold text-emerald-400 text-sm mt-1 block">{t.expectedROI === "Expected ROI" ? "5.00 %" : "%5,00"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2">
                      <div className="w-2/3 bg-slate-950 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all"
                          style={{ width: `${(p.fundedAmount / p.targetAmount) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => fundProject(p.id, 2500)}
                          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition"
                        >
                          +2.500
                        </button>
                        <button 
                          onClick={() => fundProject(p.id, p.targetAmount - p.fundedAmount)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-lg shadow-indigo-500/20"
                        >
                          {t.fillTarget}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab content: Milestone Center */}
          {activeTab === "execution" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-200">{t.executionTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{t.executionDesc}</p>
              </div>

              {projects.filter(p => p.status === "Active").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  {t.noExecution}
                </div>
              ) : (
                projects.filter(p => p.status === "Active").map(p => (
                  <div key={p.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                    <h3 className="text-md font-bold text-slate-200 border-b border-slate-900 pb-3">{p.name}</h3>

                    <div className="space-y-4">
                      {p.milestones.map(m => (
                        <div key={m.id} className="bg-slate-950 border border-slate-900 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center gap-2">
                              <span className="text-2xs font-bold text-indigo-400 uppercase tracking-wider">Milestone #{m.id}</span>
                              <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${
                                m.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                                m.status === "ProofSubmitted" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                                m.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                                "bg-slate-800 text-slate-400"
                              }`}>
                                {m.status}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-200">{m.description}</h4>
                            <p className="text-xs text-slate-500">{t.amountToRelease}: <strong className="text-slate-300">{formatNumber(m.amountToRelease)} USDC</strong> | Deadline: {m.deadline}h</p>
                            {m.proofHash && (
                              <p className="text-2xs font-mono text-indigo-300">Proof: {m.proofHash}</p>
                            )}
                          </div>

                          <div className="flex gap-2 w-full md:w-auto">
                            {/* Supplier submits proof */}
                            {m.status === "Pending" && (
                              <button 
                                onClick={() => submitProof(p.id, m.id, `ipfs://proof-milestone-${m.id}-cid-${Math.random().toString(36).substring(4, 9)}`)}
                                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-bold px-4.5 py-2.5 rounded-xl text-xs transition border border-indigo-500/30 w-full md:w-auto"
                              >
                                {t.submitProof}
                              </button>
                            )}

                            {/* Validator approves/rejects */}
                            {m.status === "ProofSubmitted" && (
                              <div className="flex gap-2 w-full">
                                <button 
                                  onClick={() => approveMilestone(p.id, m.id, false)}
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-4 py-2 rounded-xl text-xs transition border border-red-500/20 flex-1 md:flex-initial"
                                >
                                  {t.rejectBtn}
                                </button>
                                <button 
                                  onClick={() => approveMilestone(p.id, m.id, true)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5.5 py-2 rounded-xl text-xs transition flex-1 md:flex-initial shadow-lg shadow-emerald-600/20"
                                >
                                  {t.approveBtn}
                                </button>
                              </div>
                            )}

                            {m.status === "Approved" && (
                              <span className="text-emerald-400 text-xs font-semibold bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                {t.fundedSettled}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab content: Settlement Desk */}
          {activeTab === "settlement" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-200">{t.settlementTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{t.settlementDesc}</p>
              </div>

              {projects.filter(p => p.status === "Active" || p.status === "Completed" || p.status === "Liquidated").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  {t.noSettlement}
                </div>
              ) : (
                projects.filter(p => p.status === "Active" || p.status === "Completed" || p.status === "Liquidated").map(p => {
                  const allApproved = p.milestones.every(m => m.status === "Approved");
                  const hasMissedDeadline = p.milestones.some(m => currentTime > m.deadline && m.status !== "Approved");

                  return (
                    <div key={p.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-md font-bold text-slate-200">{p.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">Buyer: {p.buyer} | Supplier: {p.borrower}</p>
                        </div>
                        <div>
                          <span className={`text-2xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            p.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            p.status === "Liquidated" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>

                      {p.status === "Active" && (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-4 border border-slate-900 rounded-xl text-xs">
                          <div>
                            <span className="text-slate-500 block">{t.repaymentObligation}</span>
                            <span className="font-bold text-slate-200 text-md mt-1 block">{formatNumber(p.targetAmount * 1.05)} USDC</span>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                            {/* Buyer repayments */}
                            {allApproved ? (
                              <button 
                                onClick={() => buyerRepay(p.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-indigo-500/20 w-full md:w-auto"
                              >
                                {t.confirmRepay}
                              </button>
                            ) : (
                              <div className="text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                                {t.repayNote}
                              </div>
                            )}

                            {/* Risk Default liquidation */}
                            {hasMissedDeadline && (
                              <button 
                                onClick={() => triggerDefault(p.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-red-600/20 w-full md:w-auto"
                              >
                                {t.triggerLiq}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {p.status === "Completed" && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400">
                          {t.settlementFinalized}
                        </div>
                      )}

                      {p.status === "Liquidated" && (
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl text-xs text-red-400">
                          {t.projectDefaulted}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Right Side: On-Chain Event Logger */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 flex flex-col h-[550px] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none z-10" />
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              {t.onChainLogs}
            </h3>
            <button 
              onClick={() => setEventLogs([])}
              className="text-3xs text-slate-500 hover:text-slate-300 uppercase tracking-wider font-bold"
            >
              {t.clear}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {eventLogs.length === 0 ? (
              <div className="text-slate-600 text-xs italic text-center pt-24">No events logged yet.</div>
            ) : (
              eventLogs.map((log, index) => (
                <div key={index} className="text-2xs bg-slate-950/40 border border-slate-900/60 p-3 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">{log.timestamp}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      log.type === "success" ? "bg-emerald-400" :
                      log.type === "warning" ? "bg-amber-400" :
                      log.type === "error" ? "bg-red-400" :
                      "bg-indigo-400"
                    }`} />
                  </div>
                  <p className="text-slate-300 leading-normal">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 p-6 text-center text-xs text-slate-500">
        {t.footer}
      </footer>
    </div>
  );
}
