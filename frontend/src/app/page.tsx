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

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "create" | "fund" | "execution" | "settlement">("dashboard");

  // Wallet
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [userRole, setUserRole] = useState<"Supplier" | "Buyer" | "Lender" | "Validator" | "Liquidator">("Supplier");

  // Simulator State
  const [currentTime, setCurrentTime] = useState(0); // in hours
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Apparel Shipment (Istanbul to Hamburg)",
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
          description: "Raw Material Procurement",
          deadline: 48,
          amountToRelease: 3000,
          proofHash: "ipfs://procurement-receipt-xml",
          status: "Approved",
        },
        {
          id: 2,
          description: "Manufacturing & Quality Control",
          deadline: 96,
          amountToRelease: 4000,
          proofHash: "ipfs://factory-batch-qa-report",
          status: "ProofSubmitted",
        },
        {
          id: 3,
          description: "Customs Clearance & Cargo Loading",
          deadline: 144,
          amountToRelease: 3000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
    {
      id: 2,
      name: "Organic Coffee Export (Santos to Rotterdam)",
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
          description: "Harvesting & Sorting",
          deadline: 72,
          amountToRelease: 10000,
          proofHash: "",
          status: "Pending",
        },
        {
          id: 2,
          description: "Milling & Packaging",
          deadline: 120,
          amountToRelease: 15000,
          proofHash: "",
          status: "Pending",
        },
      ],
    },
  ]);

  const [eventLogs, setEventLogs] = useState<EventLog[]>([
    { timestamp: "10:30", type: "success", message: "USDC Token contract initialized successfully." },
    { timestamp: "10:32", type: "info", message: "Supplier registered 12,500 USDC collateral to Vault." },
    { timestamp: "10:35", type: "success", message: "Organic Coffee Export project registered on-chain." },
  ]);

  // Form states for creating a new project
  const [newProjName, setNewProjName] = useState("");
  const [newProjSupplier, setNewProjSupplier] = useState("GDSupplierAddress...");
  const [newProjBuyer, setNewProjBuyer] = useState("GBBuyerAddress...");
  const [newProjTarget, setNewProjTarget] = useState(15000);
  const [newProjDeadline, setNewProjDeadline] = useState(48);
  const [newProjMilestones, setNewProjMilestones] = useState<Omit<Milestone, "status" | "proofHash">[]>([
    { id: 1, description: "Milestone 1 Description", deadline: 96, amountToRelease: 7500 },
    { id: 2, description: "Milestone 2 Description", deadline: 168, amountToRelease: 7500 },
  ]);

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
      logEvent("error", `Total milestone values (${totalMilestoneAmount} USDC) must equal the funding target (${newProjTarget} USDC).`);
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
    logEvent("success", `New project "${newProjName}" initialized on-chain. Collateral required: ${newProjTarget / 2} USDC.`);
    setActiveTab("dashboard");
    // Reset form
    setNewProjName("");
  };

  const fundProject = (id: number, amount: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const nextFunded = Math.min(p.targetAmount, p.fundedAmount + amount);
        const nextStatus = nextFunded >= p.targetAmount ? "Active" : p.status;
        logEvent("success", `Lender supplied ${amount} USDC to project #${id}. Funded: ${nextFunded}/${p.targetAmount} USDC.`);
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
              logEvent("success", `Oracle & Validator approved Milestone #${milestoneId} of Project #${projectId}. Released ${m.amountToRelease} USDC to Supplier.`);
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
        logEvent("success", `Buyer confirmed final delivery. Transferred ${repayment} USDC repayment (principal + yield) to Escrow.`);
        logEvent("info", `Collateral of ${p.collateralLocked} USDC returned to Supplier.`);
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
        logEvent("success", `Collateral pool of ${p.collateralLocked} USDC claimed from Vault.`);
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Premium Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-xl text-slate-950">SF</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">StellarForge</h1>
            <p className="text-xs text-slate-400">Milestone-Backed Supply Chain Finance</p>
          </div>
        </div>

        {/* Ledger Time Simulator */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 px-3">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Ledger Simulator Time:</span>
          <span className="text-sm font-bold text-slate-200">{currentTime} hrs</span>
          <button 
            onClick={() => fastForwardTime(24)}
            className="ml-2 text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold py-1 px-2.5 rounded-lg transition border border-indigo-500/30"
          >
            +24 hrs
          </button>
        </div>

        {/* Wallet connection */}
        <div className="flex items-center gap-4">
          <select 
            value={userRole} 
            onChange={(e) => setUserRole(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 p-2 outline-none focus:border-indigo-500"
          >
            <option value="Supplier">Supplier (Borrower)</option>
            <option value="Lender">Lender (Funder)</option>
            <option value="Buyer">Buyer (Repayer)</option>
            <option value="Validator">Validator (Oracle)</option>
            <option value="Liquidator">Liquidator (Keeper)</option>
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
            {walletConnected ? `${walletAddress.substring(0, 8)}...` : "Connect Wallet"}
          </button>
        </div>
      </header>

      {/* Main Stats Summary */}
      <section className="p-6 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Portfolio</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {projects.filter(p => p.status === "Active").length} Projects
          </p>
          <p className="text-xs text-slate-500 mt-1">Undergoing milestone execution</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Financed Capital</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {projects.reduce((acc, p) => acc + (p.status === "Active" ? p.targetAmount : 0), 0).toLocaleString()} USDC
          </p>
          <p className="text-xs text-slate-500 mt-1">Milestone funds currently locked</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Locked Supplier Collateral</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">
            {projects.reduce((acc, p) => acc + (p.status === "Active" ? p.collateralLocked : 0), 0).toLocaleString()} USDC
          </p>
          <p className="text-xs text-slate-500 mt-1">Risk protection pool active</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-900 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Yield generated</p>
          <p className="text-3xl font-extrabold mt-2 text-slate-200">5.00 %</p>
          <p className="text-xs text-slate-500 mt-1">Paid on successful buyer delivery</p>
        </div>
      </section>

      {/* Main Grid: Tabs & Action Area + Event Logs */}
      <section className="px-6 pb-12 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab Selection */}
          <nav className="flex bg-slate-900/70 border border-slate-900 rounded-xl p-1">
            {[
              { id: "dashboard", label: "Monitor Hub" },
              { id: "create", label: "Supplier Factory" },
              { id: "fund", label: "Lending Market" },
              { id: "execution", label: "Milestone Center" },
              { id: "settlement", label: "Settlement Desk" },
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
              <h2 className="text-lg font-bold tracking-tight text-slate-200">Active Supply Chain Pipelines</h2>
              {projects.length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  No active trade finance projects found. Create a new pipeline as a Supplier.
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
                        <p className="text-xs text-slate-400">Target Financing</p>
                        <p className="text-lg font-bold text-indigo-300">{p.targetAmount.toLocaleString()} USDC</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Funded: {p.fundedAmount.toLocaleString()} USDC</span>
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
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone Execution Tree</h4>
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
                              <span className="font-medium text-slate-400">{m.amountToRelease} USDC</span>
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
                <h2 className="text-lg font-bold text-slate-200">Supplier Project Factory</h2>
                <p className="text-xs text-slate-400 mt-1">Register a new trade financing pipeline backed by milestones and deposit collateral protection.</p>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Trade Contract Title</label>
                    <input 
                      type="text" 
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      placeholder="e.g. Grain Export Shipment X-20"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Capital Target (USDC)</label>
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
                    <label className="text-xs font-semibold text-slate-400">Supplier Address (Borrower)</label>
                    <input 
                      type="text" 
                      value={newProjSupplier}
                      onChange={(e) => setNewProjSupplier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 text-slate-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Buyer Address (Obligor)</label>
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone Breakdown</h4>
                  
                  {newProjMilestones.map((m, index) => (
                    <div key={m.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-2xs text-slate-500 font-bold">Description</label>
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
                        <label className="text-2xs text-slate-500 font-bold">Hours to Deadline</label>
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
                        <label className="text-2xs text-slate-500 font-bold">Amount to Release (USDC)</label>
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

                <div className="flex justify-between items-center pt-4">
                  <div className="text-xs text-amber-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20 max-w-md">
                    Note: Collateral requirement is <strong>{(newProjTarget / 2).toLocaleString()} USDC</strong>. Ensure collateral is deposited in the Vault before initializing.
                  </div>
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl text-xs font-bold text-white transition shadow-lg shadow-indigo-500/20"
                  >
                    Deploy Trade Finance Pipeline
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
                  <h2 className="text-lg font-bold text-slate-200">Active Lending Markets</h2>
                  <p className="text-xs text-slate-400 mt-1">Supply capital to trade finance pipelines. Earn 5.00% yield on final buyer delivery.</p>
                </div>
              </div>

              {projects.filter(p => p.status === "Pending").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  No projects currently seeking capital. Check back soon.
                </div>
              ) : (
                projects.filter(p => p.status === "Pending").map(p => (
                  <div key={p.id} className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 hover:border-slate-800 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-md font-bold text-slate-200">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">Borrower: {p.borrower} | Buyer: {p.buyer}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          Funding Open
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-xl text-xs">
                      <div>
                        <span className="text-slate-500 block">Required Capital</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{p.targetAmount.toLocaleString()} USDC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Supplier Collateral</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{p.collateralLocked.toLocaleString()} USDC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Funding Deadline</span>
                        <span className="font-bold text-slate-200 text-sm mt-1 block">{p.fundingDeadline} hrs</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Expected ROI</span>
                        <span className="font-bold text-emerald-400 text-sm mt-1 block">5.00 %</span>
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
                          +2,500
                        </button>
                        <button 
                          onClick={() => fundProject(p.id, p.targetAmount - p.fundedAmount)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-lg shadow-indigo-500/20"
                        >
                          Fill Target
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
                <h2 className="text-lg font-bold text-slate-200">Supplier & Validator Execution Desk</h2>
                <p className="text-xs text-slate-400 mt-1">Suppliers submit logistics/delivery proof hashes. Validators whitelist and approve releases.</p>
              </div>

              {projects.filter(p => p.status === "Active").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  No active projects currently in execution. Fund a pending project to activate.
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
                            <p className="text-xs text-slate-500">Release Payout: <strong className="text-slate-300">{m.amountToRelease.toLocaleString()} USDC</strong> | Deadline: {m.deadline}h</p>
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
                                Submit Shipping Proof
                              </button>
                            )}

                            {/* Validator approves/rejects */}
                            {m.status === "ProofSubmitted" && (
                              <div className="flex gap-2 w-full">
                                <button 
                                  onClick={() => approveMilestone(p.id, m.id, false)}
                                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-4 py-2 rounded-xl text-xs transition border border-red-500/20 flex-1 md:flex-initial"
                                >
                                  Reject
                                </button>
                                <button 
                                  onClick={() => approveMilestone(p.id, m.id, true)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5.5 py-2 rounded-xl text-xs transition flex-1 md:flex-initial shadow-lg shadow-emerald-600/20"
                                >
                                  Approve & Payout
                                </button>
                              </div>
                            )}

                            {m.status === "Approved" && (
                              <span className="text-emerald-400 text-xs font-semibold bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                Funded & Settled
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
                <h2 className="text-lg font-bold text-slate-200">Settlement & Risk Default Desk</h2>
                <p className="text-xs text-slate-400 mt-1">Buyers repay completed supply trades. Keepers trigger collateral default liquidation on breach.</p>
              </div>

              {projects.filter(p => p.status === "Active" || p.status === "Completed" || p.status === "Liquidated").length === 0 ? (
                <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-12 text-center text-slate-500">
                  No active trades currently in settlement phase.
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
                          <p className="text-xs text-slate-500 mt-1">Buyer Obligor: {p.buyer} | Supplier: {p.borrower}</p>
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
                            <span className="text-slate-500 block">Repayment Obligation (Principal + 5% Yield)</span>
                            <span className="font-bold text-slate-200 text-md mt-1 block">{(p.targetAmount * 1.05).toLocaleString()} USDC</span>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                            {/* Buyer repayments */}
                            {allApproved ? (
                              <button 
                                onClick={() => buyerRepay(p.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-indigo-500/20 w-full md:w-auto"
                              >
                                Confirm Delivery & Repay
                              </button>
                            ) : (
                              <div className="text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                                Repayment available once all milestones are Approved.
                              </div>
                            )}

                            {/* Risk Default liquidation */}
                            {hasMissedDeadline && (
                              <button 
                                onClick={() => triggerDefault(p.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition shadow-lg shadow-red-600/20 w-full md:w-auto"
                              >
                                Trigger Liquidation (Default)
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {p.status === "Completed" && (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400">
                          <strong>Settlement Finalized.</strong> All lenders paid back with 5% yield split. Collateral released back to Supplier.
                        </div>
                      )}

                      {p.status === "Liquidated" && (
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl text-xs text-red-400">
                          <strong>Project Defaulted.</strong> Collateral liquidated and distributed pro-rata to lenders.
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
              On-Chain Event Logs
            </h3>
            <button 
              onClick={() => setEventLogs([])}
              className="text-3xs text-slate-500 hover:text-slate-300 uppercase tracking-wider font-bold"
            >
              Clear
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
        StellarForge Finance • Built for Stellar Soroban Smart Contract Architecture
      </footer>
    </div>
  );
}
