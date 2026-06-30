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

// Translations dictionary
const translations = {
  en: {
    title: "StellarForge Finance",
    tagline: "Reverse Factoring & Supply Chain Milestone Escrow",
    howItWorksTitle: "How StellarForge Works (Interactive Pipeline)",
    simulatorTime: "Ledger Simulator Time:",
    step1: "1. Deposit Collateral",
    step1Desc: "Supplier locks 50% collateral in the Vault to back their commitment.",
    step2: "2. Crowdfund Capital",
    step2Desc: "Lenders supply USDC to fund production costs, trusting the reputable Buyer.",
    step3: "3. Milestone Payouts",
    step3Desc: "As Supplier uploads shipping proofs, funds are released step-by-step.",
    step4: "4. Buyer Settlement",
    step4Desc: "Buyer receives goods, pays back principal + 5% yield to Lenders. Collateral released.",
    autoDemoBtn: "Start Automated Demo Flow",
    autoDemoActive: "Demo Flow in Progress...",
    activePipelines: "Active Supply Chain Pipelines",
    totalFinanced: "Total Financed Capital",
    lockedCollateral: "Supplier Collateral Pool",
    avgYield: "Lender Yield Rate",
    projectCreated: "Project Created",
    lendingMarket: "Open Lending Markets",
    noLending: "No pending projects. Create one below!",
    createTitle: "Register a New Trade Finance Pipeline",
    createDesc: "Fill in the buyer, target budget, and delivery milestones. 50% collateral will be automatically locked in the Vault.",
    repaymentTitle: "Repayment & Risk Default Desk",
    onChainLogs: "Zincir Üstü Event Akışı",
    clear: "Clear",
    hours: "hrs",
    connectWallet: "Connect Wallet",
    buyer: "Buyer",
    supplier: "Supplier",
    lender: "Lender",
    validator: "Oracle Validator",
    statusPending: "Awaiting Funding",
    statusActive: "In Execution",
    statusCompleted: "Fully Repaid",
    statusLiquidated: "Defaulted & Liquidated",
    toastUSDC: "USDC Token contract initialized successfully.",
    toastCollateral: "Supplier registered {amount} USDC collateral to Vault.",
    toastProject: "Organic Coffee Export project registered on-chain.",
    backToDash: "Back to Dashboard",
    targetFinancing: "Target Financing",
    funded: "Funded",
    fillTarget: "Fill Target",
    milestoneExecution: "Milestone Progress Map",
    submitProof: "Submit Shipping Proof",
    rejectBtn: "Reject",
    approveBtn: "Approve & Release",
    repaymentObligation: "Repayment Obligation (Principal + 5% Yield)",
    confirmRepay: "Confirm Delivery & Repay",
    repayNote: "Repayment unlocked after all milestones are Approved.",
    triggerLiq: "Trigger Liquidation (Default)",
    settlementFinalized: "Settlement finalized. All lenders paid back with 5% yield. Collateral returned to Supplier.",
    projectDefaulted: "Project defaulted. Collateral liquidated and distributed pro-rata to lenders.",
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
    footer: "StellarForge Finance • Built for Stellar Soroban Smart Contract Architecture"
  },
  tr: {
    title: "StellarForge Finance",
    tagline: "Tedarik Zinciri Finansmanı ve Otomatik Teminat Yönetimi",
    howItWorksTitle: "Sistem Nasıl Çalışır? (Tedarik Finansmanı Akış Şeması)",
    simulatorTime: "Ledger Simülatör Zamanı:",
    step1: "1. Teminat Kilitleme",
    step1Desc: "Tedarikçi taahhüt güvencesi olarak finansman hedefinin %50'sini kasaya kilitler.",
    step2: "2. Sermaye Fonlama",
    step2Desc: "Yatırımcılar, güçlü Alıcıya güvenerek tedarikçinin üretim bütçesini USDC ile fonlar.",
    step3: "3. Milestone Aşamaları",
    step3Desc: "Tedarikçi teslimat kanıtı sundukça, fonlar adım adım serbest bırakılır.",
    step4: "4. Alıcı Geri Ödemesi",
    step4Desc: "Alıcı malı teslim alır; yatırımcılara anapara + %5 faiz öder. Teminat iade edilir.",
    autoDemoBtn: "Akıllı Demo Simülasyonunu Başlat",
    autoDemoActive: "Simülasyon Yürütülüyor...",
    activePipelines: "Aktif Tedarik Zinciri Finansmanları",
    totalFinanced: "Finanse Edilen Sermaye",
    lockedCollateral: "Kilitli Tedarikçi Teminatı",
    avgYield: "Yatırımcı Faiz Oranı",
    projectCreated: "Sözleşme Oluşturuldu",
    lendingMarket: "Yatırıma Açık Projeler (Fonlama)",
    noLending: "Fonlama bekleyen proje bulunmuyor. Aşağıdan yeni bir talep oluşturun!",
    createTitle: "Yeni Tedarik Finansmanı Talebi Oluştur",
    createDesc: "Anlaşmalı alıcıyı, toplam bütçeyi ve milestone vadelerini girin. %50 teminat kasada otomatik bloke edilir.",
    repaymentTitle: "Geri Ödeme & Temmerüt (Risk) Masası",
    onChainLogs: "Zincir Üstü Event Akışı",
    clear: "Temizle",
    hours: "saat",
    connectWallet: "Cüzdanı Bağla",
    buyer: "Alıcı",
    supplier: "Tedarikçi",
    lender: "Yatırımcı",
    validator: "Denetçi (Oracle)",
    statusPending: "Fon Toplanıyor",
    statusActive: "Üretim ve Sevkiyatta",
    statusCompleted: "Geri Ödendi & Kapatıldı",
    statusLiquidated: "Temerrüt (Tasfiye Edildi)",
    toastUSDC: "USDC Token sözleşmesi başarıyla başlatıldı.",
    toastCollateral: "Tedarikçi Vault'a {amount} USDC teminat kilitledi.",
    toastProject: "Organik Kahve İhracatı projesi zincir üstünde oluşturuldu.",
    backToDash: "Gösterge Paneline Dön",
    targetFinancing: "Hedef Finansman",
    funded: "Toplanan",
    fillTarget: "Tamamını Fonla",
    milestoneExecution: "Milestone İlerleme Haritası",
    submitProof: "Sevkiyat Kanıtı Gönder",
    rejectBtn: "Reddet",
    approveBtn: "Onayla & Öde",
    repaymentObligation: "Geri Ödeme Yükümlülüğü (Anapara + %5 Faiz)",
    confirmRepay: "Teslimatı Onayla ve Öde",
    repayNote: "Geri ödeme seçeneği, tüm milestone hedefleri Onaylandıktan sonra aktifleşir.",
    triggerLiq: "Likidasyonu Tetikle (Temerrüt)",
    settlementFinalized: "Geri Ödeme Tamamlandı. Tüm yatırımcılara %5 faiz dahil geri ödeme yapıldı. Teminat tedarikçiye iade edildi.",
    projectDefaulted: "Proje Temerrüde Düştü. Teminat tasfiye edildi ve yatırımcılara payları oranında dağıtıldı.",
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
    footer: "StellarForge Finance • Stellar Soroban Akıllı Sözleşme Mimarisi Üzerine İnşa Edilmiştir"
  }
};

export default function Home() {
  // Config States
  const [lang, setLang] = useState<"en" | "tr">("tr");
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "create">("overview");

  // Wallet State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [userRole, setUserRole] = useState<"Supplier" | "Buyer" | "Lender" | "Validator" | "Liquidator">("Supplier");

  // Simulator Time and Data States
  const [currentTime, setCurrentTime] = useState(0); // in hours
  const [demoActive, setDemoActive] = useState(false);
  
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Tekstil Sevkiyatı (İstanbul - Hamburg Limanı)",
      borrower: "GD...AcmeSupplier",
      buyer: "GB...ZaraBuyer",
      targetAmount: 10000,
      fundedAmount: 10000,
      fundingDeadline: 24,
      status: "Active",
      collateralLocked: 5000,
      milestones: [
        {
          id: 1,
          description: "Hammadde Tedariki ve İplik Alımı",
          deadline: 48,
          amountToRelease: 3000,
          proofHash: "ipfs://procurement-receipt-xml",
          status: "Approved",
        },
        {
          id: 2,
          description: "Kumaş Dokuma ve Dikim Aşaması",
          deadline: 96,
          amountToRelease: 4000,
          proofHash: "ipfs://factory-batch-qa-report",
          status: "ProofSubmitted",
        },
        {
          id: 3,
          description: "Hamburg Konteyner Yükleme & Gümrük",
          deadline: 144,
          amountToRelease: 3000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: 2,
      name: "Organik Kahve İhracatı (Santos - Rotterdam Limanı)",
      borrower: "GD...BrazilCoffee",
      buyer: "GB...NestleBuyer",
      targetAmount: 25000,
      fundedAmount: 12000,
      fundingDeadline: 12,
      status: "Pending",
      collateralLocked: 12500,
      milestones: [
        {
          id: 1,
          description: "Kahve Çekirdeği Hasadı ve Ayıklama",
          deadline: 72,
          amountToRelease: 10000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 2,
          description: "Fırınlama ve Vakumlu Paketleme",
          deadline: 120,
          amountToRelease: 15000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
  ]);

  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

  // Form states for creating a new project
  const [newProjName, setNewProjName] = useState("");
  const [newProjSupplier, setNewProjSupplier] = useState("GDSupplierAddress...");
  const [newProjBuyer, setNewProjBuyer] = useState("GBBuyerAddress...");
  const [newProjTarget, setNewProjTarget] = useState(15000);
  const [newProjDeadline, setNewProjDeadline] = useState(48);
  const [newProjMilestones, setNewProjMilestones] = useState<Omit<Milestone, "status" | "proofHash">[]>([
    { id: 1, description: "Milestone 1 - Üretim Başlangıcı", deadline: 96, amountToRelease: 7500 },
    { id: 2, description: "Milestone 2 - Gümrük ve Sevkiyat", deadline: 168, amountToRelease: 7500 },
  ]);

  const t = translations[lang];

  useEffect(() => {
    setMounted(true);
    const defaultLogs: EventLog[] = [
      { timestamp: "10:30", type: "success", message: translations[lang].toastUSDC },
      { timestamp: "10:32", type: "info", message: translations[lang].toastCollateral.replace("{amount}", formatNumber(12500)) },
      { timestamp: "10:35", type: "success", message: translations[lang].toastProject },
    ];
    setEventLogs(defaultLogs);
  }, [lang]);

  // Format numbers properly based on selected locale
  const formatNumber = (num: number) => {
    return num.toLocaleString(lang === "tr" ? "tr-TR" : "en-US");
  };

  const logEvent = (type: "info" | "success" | "warning" | "error", message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setEventLogs(prev => [{ timestamp: time, type, message }, ...prev]);
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
          logEvent("success", `Freighter Wallet connected: ${res.address.substring(0, 6)}...`);
        }
      } else {
        const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
        setWalletAddress(mockAddress);
        setWalletConnected(true);
        logEvent("info", `Freighter not detected. Connected via StellarForge Sandbox: ${mockAddress.substring(0, 6)}...`);
      }
    } catch (e) {
      const mockAddress = "GC" + Math.random().toString(36).substring(2, 15).toUpperCase();
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      logEvent("info", `Connected via StellarForge Sandbox: ${mockAddress.substring(0, 6)}...`);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    const totalMilestoneAmount = newProjMilestones.reduce((acc, curr) => acc + curr.amountToRelease, 0);
    if (totalMilestoneAmount !== newProjTarget) {
      logEvent("error", lang === "tr" 
        ? `Milestone bütçelerinin toplamı (${formatNumber(totalMilestoneAmount)} USDC) proje bütçesine (${formatNumber(newProjTarget)} USDC) eşit olmalıdır.`
        : `Total milestone values (${formatNumber(totalMilestoneAmount)} USDC) must equal the funding target (${formatNumber(newProjTarget)} USDC).`
      );
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
    logEvent("success", lang === "tr"
      ? `"${newProjName}" sözleşmesi oluşturuldu. Gerekli teminat: ${formatNumber(newProjTarget / 2)} USDC Vault kasasında kilitlendi.`
      : `New project "${newProjName}" initialized. Required collateral of ${formatNumber(newProjTarget / 2)} USDC locked in Vault.`
    );
    setActiveTab("overview");
    setNewProjName("");
  };

  const fundProject = (id: number, amount: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const nextFunded = Math.min(p.targetAmount, p.fundedAmount + amount);
        const nextStatus = nextFunded >= p.targetAmount ? "Active" : p.status;
        logEvent("success", lang === "tr"
          ? `Yatırımcı projeye #${id} için ${formatNumber(amount)} USDC yatırdı. Fonlama: ${formatNumber(nextFunded)}/${formatNumber(p.targetAmount)} USDC.`
          : `Lender supplied ${formatNumber(amount)} USDC to project #${id}. Funded: ${formatNumber(nextFunded)}/${formatNumber(p.targetAmount)} USDC.`
        );
        if (nextStatus === "Active") {
          logEvent("info", lang === "tr"
            ? `Proje #${id} bütçesi tamamlandı! Akış Aktif aşamasına geçti. Üretim bütçesi serbest bırakılmaya hazır.`
            : `Project #${id} meets funding target! Shifted state to Active.`
          );
        }
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
            const mockIpfs = `ipfs://delivery-proof-${m.id}-cid-${Math.random().toString(36).substring(4, 8)}`;
            logEvent("info", lang === "tr"
              ? `Tedarikçi Proje #${projectId}, Milestone #${milestoneId} için sevkiyat kanıtı sundu: ${mockIpfs}`
              : `Supplier submitted delivery proof for Project #${projectId}, Milestone #${milestoneId}.`
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
              logEvent("success", lang === "tr"
                ? `Denetçi Proje #${projectId}, Milestone #${milestoneId} teslimatını onayladı. Kilitli ${formatNumber(m.amountToRelease)} USDC tedarikçiye ödendi.`
                : `Validator approved Milestone #${milestoneId} of Project #${projectId}. Released ${formatNumber(m.amountToRelease)} USDC.`
              );
            } else {
              logEvent("warning", lang === "tr"
                ? `Milestone #${milestoneId} teslimat kanıtı reddedildi! Yeniden kanıt yüklenmesi bekleniyor.`
                : `Milestone #${milestoneId} of Project #${projectId} rejected.`
              );
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
        logEvent("success", lang === "tr"
          ? `Alıcı mal teslimatını onayladı ve kasaya ${formatNumber(repayment)} USDC (Anapara + %5 faiz) geri ödeme yaptı.`
          : `Buyer repaid ${formatNumber(repayment)} USDC (Principal + 5% Yield) to Escrow.`
        );
        logEvent("info", lang === "tr"
          ? `Tedarikçinin bloke edilen ${formatNumber(p.collateralLocked)} USDC teminatı iade edildi.`
          : `Supplier collateral of ${formatNumber(p.collateralLocked)} USDC returned.`
        );
        logEvent("success", lang === "tr"
          ? `Yatırımcılara paraları %5 net kar marjı ile pro-rata (oranları dahilinde) dağıtıldı.`
          : `Lenders reimbursed pro-rata with 5% yield.`
        );
        return { ...p, status: "Completed", fundedAmount: 0 };
      }
      return p;
    }));
  };

  const triggerDefault = (projectId: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        logEvent("error", lang === "tr"
          ? `Proje #${projectId} teslimat süresini aştı! Temerrüt ve tasfiye süreci başladı.`
          : `Project #${projectId} breached milestone deadlines. Liquidation triggered.`
        );
        logEvent("success", lang === "tr"
          ? `Tedarikçinin Vault kasasında duran ${formatNumber(p.collateralLocked)} USDC değerindeki teminatına el konuldu.`
          : `Collateral pool of ${formatNumber(p.collateralLocked)} USDC claimed from Vault.`
        );
        logEvent("info", lang === "tr"
          ? `%5 likidatör teşvik primi (ödülü) ödendi.`
          : `5% keeper fee paid to liquidator.`
        );
        logEvent("success", lang === "tr"
          ? `Kalan teminat ve henüz serbest bırakılmamış bütçe havuzu yatırımcılara payları oranında iade edilerek risk sıfırlandı.`
          : `Remaining collateral + unreleased escrow distributed to lenders pro-rata.`
        );
        return { ...p, status: "Liquidated" };
      }
      return p;
    }));
  };

  const fastForwardTime = (hours: number) => {
    const nextTime = currentTime + hours;
    setCurrentTime(nextTime);
    logEvent("warning", lang === "tr"
      ? `Ledger simülatör süresi ${hours} saat ileri alındı. Güncel zaman: ${nextTime} saat.`
      : `Ledger time advanced by ${hours} hours. Current time: ${nextTime} hours.`
    );
  };

  // Run automated E2E Demo Simulation
  const runAutoDemo = () => {
    if (demoActive) return;
    setDemoActive(true);
    logEvent("info", lang === "tr" ? "Otomatik demo akışı başlatılıyor..." : "Starting automated demo flow...");

    // Step 1: Create new demo project
    setTimeout(() => {
      const demoProject: Project = {
        id: 3,
        name: "Akıllı Tarım İthalatı (İzmir - Rotterdam)",
        borrower: "GD...IzmirAgri",
        buyer: "GB...NestleHQ",
        targetAmount: 20000,
        fundedAmount: 0,
        fundingDeadline: 24,
        status: "Pending",
        collateralLocked: 10000,
        milestones: [
          { id: 1, description: "Tohum Tedariki", deadline: 48, amountToRelease: 8000, proofHash: "", status: "Pending" },
          { id: 2, description: "Gümrükleme & Paketleme", deadline: 96, amountToRelease: 12000, proofHash: "", status: "Pending" }
        ]
      };
      setProjects(prev => [...prev, demoProject]);
      logEvent("success", lang === "tr" 
        ? "Demo Projesi oluşturuldu. %50 teminat (10.000 USDC) Vault kasasına bloke edildi."
        : "Demo Project created. 10,000 USDC collateral locked in Vault."
      );
    }, 1500);

    // Step 2: Lender funding
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
          logEvent("success", lang === "tr" 
            ? "Yatırımcılar 20.000 USDC finansman bütçesini tamamen doldurdu! Proje Akış Durumu: Aktif."
            : "Lenders funded 20,000 USDC target! Project status: Active."
          );
          return { ...p, fundedAmount: 20000, status: "Active" };
        }
        return p;
      }));
    }, 3500);

    // Step 3: Submit proof for milestone 1
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
          const updated = p.milestones.map(m => m.id === 1 ? { ...m, status: "ProofSubmitted" as const, proofHash: "ipfs://seeds-freight-docs" } : m);
          logEvent("info", lang === "tr" 
            ? "Tedarikçi Milestone #1 (Tohum Tedariki) için nakliye faturasını sundu."
            : "Supplier submitted shipping proof for Milestone #1."
          );
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 5500);

    // Step 4: Approve milestone 1
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
          const updated = p.milestones.map(m => m.id === 1 ? { ...m, status: "Approved" as const } : m);
          logEvent("success", lang === "tr" 
            ? "Denetçi (Validator) kanıtı doğruladı. 8.000 USDC tedarikçinin hesabına otomatik aktarıldı."
            : "Oracle verified Milestone #1. 8,000 USDC released to Supplier."
          );
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 7500);

    // Step 5: Fast forward time and trigger default risk warning
    setTimeout(() => {
      setCurrentTime(50);
      logEvent("warning", lang === "tr" 
        ? "Simülatör süresi 50. saate alındı. Milestone #1 süresi aşıldığı halde onaylanmış olduğundan sorun yok."
        : "Simulator time advanced to 50h."
      );
    }, 9500);

    // Step 6: Complete second milestone
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
          const updated = p.milestones.map(m => m.id === 2 ? { ...m, status: "Approved" as const, proofHash: "ipfs://customs-declaration" } : m);
          logEvent("success", lang === "tr" 
            ? "Milestone #2 (Gümrükleme & Paketleme) sevkiyatı yapıldı ve denetçi tarafından onaylandı. Kalan 12.000 USDC tedarikçiye aktarıldı."
            : "Milestone #2 approved. Remaining 12,000 USDC released to Supplier."
          );
          return { ...p, milestones: updated };
        }
        return p;
      }));
    }, 11500);

    // Step 7: Repayment by Buyer
    setTimeout(() => {
      setProjects(prev => prev.map(p => {
        if (p.id === 3) {
          logEvent("success", lang === "tr" 
            ? "Alıcı (NestleHQ) malı teslim aldı. Kasaya 21.000 USDC geri ödeme yaptı. Tedarikçinin 10.000 USDC teminatı iade edildi. Yatırımcılara faizleri dağıtıldı."
            : "Buyer fully repaid 21,000 USDC. Collateral returned to Supplier. Lenders reimbursed with yield."
          );
          setDemoActive(false);
          return { ...p, status: "Completed", fundedAmount: 0 };
        }
        return p;
      }));
    }, 13500);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 animate-pulse" />
          <p className="text-sm font-semibold text-slate-400">StellarForge Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Glow Effects */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 h-[400px] w-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900/60 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-black text-xl text-slate-950">SF</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-xs text-slate-400 font-medium">{t.tagline}</p>
          </div>
        </div>

        {/* Ledger Time Simulator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 px-3">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{t.simulatorTime}</span>
          <span className="text-sm font-black text-slate-200">{currentTime} {t.hours}</span>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-8 flex-1">
        
        {/* Interactive Pipeline Visual Diagram (How it works banner) */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-br from-indigo-500/10 to-teal-400/5 blur-3xl rounded-full" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800/50 pb-4">
            <div>
              <h2 className="text-md font-extrabold tracking-tight text-slate-200 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                {t.howItWorksTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {lang === "tr" 
                  ? "Sözleşme akışını adım adım takip edebilir veya demo ile tüm akışı simüle edebilirsiniz." 
                  : "Track the supply chain finance steps visually or test with the automated simulator."}
              </p>
            </div>
            
            <button
              onClick={runAutoDemo}
              disabled={demoActive}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 border ${
                demoActive 
                  ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed" 
                  : "bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border-indigo-500/30 shadow-lg shadow-indigo-500/5"
              }`}
            >
              {demoActive ? t.autoDemoActive : t.autoDemoBtn}
            </button>
          </div>

          {/* Step-by-Step Flow Map */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            
            {/* Step 1 */}
            <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl space-y-2 relative group hover:border-slate-800 transition">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-indigo-400">{t.step1}</span>
              <p className="text-xs font-bold text-slate-200">{lang === "tr" ? "Supplier (Tedarikçi)" : "Supplier"}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step1Desc}</p>
              <div className="absolute top-1/2 -right-3 hidden md:block text-slate-700 text-xl font-bold">➜</div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl space-y-2 relative group hover:border-slate-800 transition">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-teal-400">{t.step2}</span>
              <p className="text-xs font-bold text-slate-200">{lang === "tr" ? "Yatırımcı (Lender)" : "Lenders"}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step2Desc}</p>
              <div className="absolute top-1/2 -right-3 hidden md:block text-slate-700 text-xl font-bold">➜</div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl space-y-2 relative group hover:border-slate-800 transition">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-400">{t.step3}</span>
              <p className="text-xs font-bold text-slate-200">{lang === "tr" ? "Denetçi (Validator)" : "Validator"}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step3Desc}</p>
              <div className="absolute top-1/2 -right-3 hidden md:block text-slate-700 text-xl font-bold">➜</div>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-950/60 border border-slate-900 p-4.5 rounded-2xl space-y-2 group hover:border-slate-800 transition">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-400">{t.step4}</span>
              <p className="text-xs font-bold text-slate-200">{lang === "tr" ? "Alıcı (Buyer)" : "Buyer"}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{t.step4Desc}</p>
            </div>
          </div>
        </section>

        {/* Dynamic Navigation & Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action Workspace (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Tabs */}
            <nav className="flex bg-slate-900/60 border border-slate-900 rounded-2xl p-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                  activeTab === "overview" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                📊 {t.activePipelines}
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                  activeTab === "create" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ➕ {t.createTitle}
              </button>
            </nav>

            {/* Tab: Pipelines Overview */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-900/40 border border-slate-900/80 p-5 rounded-2xl">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">{t.totalFinanced}</span>
                    <span className="text-2xl font-black text-slate-200 mt-1 block">
                      {formatNumber(projects.reduce((acc, p) => acc + (p.status === "Active" ? p.targetAmount : 0), 0))} USDC
                    </span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-900/80 p-5 rounded-2xl">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">{t.lockedCollateral}</span>
                    <span className="text-2xl font-black text-slate-200 mt-1 block">
                      {formatNumber(projects.reduce((acc, p) => acc + (p.status === "Active" ? p.collateralLocked : 0), 0))} USDC
                    </span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-900/80 p-5 rounded-2xl">
                    <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">{t.avgYield}</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">5.00 %</span>
                  </div>
                </div>

                {/* Pipelines List */}
                {projects.map(p => {
                  const allApproved = p.milestones.every(m => m.status === "Approved");
                  const hasMissedDeadline = p.milestones.some(m => currentTime > m.deadline && m.status !== "Approved");

                  return (
                    <div key={p.id} className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 hover:border-slate-800/80 transition space-y-4">
                      
                      {/* Project Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-3xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${
                            p.status === "Active" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                            p.status === "Pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            p.status === "Completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {p.status === "Active" ? t.statusActive :
                             p.status === "Pending" ? t.statusPending :
                             p.status === "Completed" ? t.statusCompleted :
                             t.statusLiquidated}
                          </span>
                          <h3 className="text-base font-bold text-slate-200 mt-2.5">{p.name}</h3>
                          <div className="flex gap-4 text-2xs text-slate-500 mt-1 font-medium">
                            <span>{t.supplier}: <strong className="text-slate-400">{p.borrower}</strong></span>
                            <span>{t.buyer}: <strong className="text-slate-400">{p.buyer}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xs text-slate-500 block font-bold uppercase tracking-wider">{t.targetFinancing}</span>
                          <span className="text-lg font-black text-indigo-400 mt-0.5 block">{formatNumber(p.targetAmount)} USDC</span>
                        </div>
                      </div>

                      {/* Funding Progress Bar (Only visible if Pending/Active) */}
                      {(p.status === "Pending" || p.status === "Active") && (
                        <div className="space-y-1.5 bg-slate-950/40 p-4 border border-slate-900/60 rounded-xl">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-400">{t.funded}: {formatNumber(p.fundedAmount)} / {formatNumber(p.targetAmount)} USDC</span>
                            <span className="text-indigo-400">{Math.round((p.fundedAmount / p.targetAmount) * 100)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-500"
                              style={{ width: `${(p.fundedAmount / p.targetAmount) * 100}%` }}
                            />
                          </div>

                          {/* Lender Actions when Pending */}
                          {p.status === "Pending" && (
                            <div className="flex justify-between items-center pt-2.5">
                              <span className="text-3xs text-amber-400/90 font-medium">⚠️ {lang === "tr" ? "Yatırımcıların bütçeyi doldurması bekleniyor." : "Awaiting lender funding target."}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => fundProject(p.id, 5000)}
                                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-2xs transition"
                                >
                                  +5.000 USDC
                                </button>
                                <button 
                                  onClick={() => fundProject(p.id, p.targetAmount - p.fundedAmount)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4.5 py-1.5 rounded-lg text-2xs transition shadow-md shadow-indigo-600/10"
                                >
                                  {t.fillTarget}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Milestone execution tree map */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📦</span> {t.milestoneExecution}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {p.milestones.map(m => (
                            <div key={m.id} className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="font-extrabold text-2xs text-indigo-400"># {m.id}</span>
                                  <span className={`text-3xs px-2 py-0.5 rounded-full font-bold ${
                                    m.status === "Approved" ? "bg-emerald-500/10 text-emerald-400" :
                                    m.status === "ProofSubmitted" ? "bg-blue-500/10 text-blue-400 animate-pulse" :
                                    m.status === "Rejected" ? "bg-red-500/10 text-red-400" :
                                    "bg-slate-900 text-slate-500"
                                  }`}>
                                    {m.status === "Approved" ? (lang === "tr" ? "Onaylandı" : "Approved") :
                                     m.status === "ProofSubmitted" ? (lang === "tr" ? "Kanıt Sunuldu" : "Proof Submitted") :
                                     m.status === "Rejected" ? (lang === "tr" ? "Reddedildi" : "Rejected") :
                                     (lang === "tr" ? "Bekliyor" : "Pending")}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-200 line-clamp-2 leading-relaxed">{m.description}</p>
                              </div>

                              <div className="space-y-2.5 pt-2 border-t border-slate-900/60">
                                <div className="flex justify-between text-3xs text-slate-500 font-medium">
                                  <span>Vade: {m.deadline}h</span>
                                  <span className="font-bold text-slate-400">{formatNumber(m.amountToRelease)} USDC</span>
                                </div>

                                {/* Actions on Milestone (Supplier/Validator roles) */}
                                {p.status === "Active" && (
                                  <div className="pt-1">
                                    {m.status === "Pending" && (
                                      <button
                                        onClick={() => submitProof(p.id, m.id)}
                                        className="w-full bg-indigo-600/10 hover:bg-indigo-600/30 text-indigo-400 font-bold py-2 rounded-lg text-3xs transition border border-indigo-500/20"
                                      >
                                        {t.submitProof}
                                      </button>
                                    )}
                                    {m.status === "ProofSubmitted" && (
                                      <div className="flex gap-1.5">
                                        <button
                                          onClick={() => approveMilestone(p.id, m.id, false)}
                                          className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-1.5 rounded-lg text-3xs transition border border-red-500/10"
                                        >
                                          {t.rejectBtn}
                                        </button>
                                        <button
                                          onClick={() => approveMilestone(p.id, m.id, true)}
                                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-3xs transition shadow-sm"
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

                      {/* Repayment and default options */}
                      {p.status === "Active" && (
                        <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500 font-bold uppercase tracking-wider text-3xs block">{t.repaymentObligation}</span>
                            <span className="text-slate-200 font-extrabold mt-1 block">{formatNumber(p.targetAmount * 1.05)} USDC</span>
                          </div>

                          <div className="flex gap-2 w-full md:w-auto">
                            {allApproved ? (
                              <button 
                                onClick={() => buyerRepay(p.id)}
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-emerald-500/10 w-full md:w-auto"
                              >
                                {t.confirmRepay}
                              </button>
                            ) : (
                              <div className="text-3xs text-amber-400 bg-amber-500/5 p-2.5 rounded-lg border border-amber-500/20 font-medium">
                                🔒 {t.repayNote}
                              </div>
                            )}

                            {hasMissedDeadline && (
                              <button 
                                onClick={() => triggerDefault(p.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-red-600/10 w-full md:w-auto"
                              >
                                {t.triggerLiq}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {p.status === "Completed" && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400/90 font-medium leading-relaxed">
                          🎉 <strong>{lang === "tr" ? "Başarıyla Sonuçlandırıldı." : "Trade Completed."}</strong> {t.settlementFinalized}
                        </div>
                      )}

                      {p.status === "Liquidated" && (
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl text-xs text-red-400/90 font-medium leading-relaxed">
                          🚨 <strong>{lang === "tr" ? "Temerrüt Durumu." : "Project Defaulted."}</strong> {t.projectDefaulted}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab: Create Finance Pipeline */}
            {activeTab === "create" && (
              <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-md font-extrabold text-slate-200">{t.createTitle}</h3>
                  <p className="text-xs text-slate-400 mt-1">{t.createDesc}</p>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">{t.tradeTitle}</label>
                      <input 
                        type="text" 
                        value={newProjName}
                        onChange={(e) => setNewProjName(e.target.value)}
                        placeholder={lang === "tr" ? "örn. Kakao Çekirdeği Sevkiyatı #4" : "e.g. Cocoa Bean Export #4"}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 text-slate-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">{t.capitalTarget} (USDC)</label>
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
                      <label className="text-xs font-bold text-slate-400">{t.supplierAddr}</label>
                      <input 
                        type="text" 
                        value={newProjSupplier}
                        onChange={(e) => setNewProjSupplier(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">{t.buyerAddr}</label>
                      <input 
                        type="text" 
                        value={newProjBuyer}
                        onChange={(e) => setNewProjBuyer(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Milestone breakdown editor */}
                  <div className="space-y-3.5 pt-2 border-t border-slate-900">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.milestoneBreakdown}</h4>
                    {newProjMilestones.map((m, index) => (
                      <div key={m.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 border border-slate-900 rounded-xl">
                        <div className="space-y-1">
                          <label className="text-3xs text-slate-500 font-bold">{t.milestoneDesc}</label>
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
                          <label className="text-3xs text-slate-500 font-bold">{t.hoursToDeadline}</label>
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
                          <label className="text-3xs text-slate-500 font-bold">{t.amountToRelease} (USDC)</label>
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

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-4 border-t border-slate-900/60">
                    <div className="text-2xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 max-w-md font-medium">
                      ⚠️ {t.collateralNote.replace("{amount}", formatNumber(newProjTarget / 2))}
                    </div>
                    <button 
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-indigo-500/20 w-full md:w-auto"
                    >
                      {t.deployBtn}
                    </button>
                  </div>
                </form>
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

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 p-6 text-center text-xs text-slate-500">
        {t.footer}
      </footer>
    </div>
  );
}
