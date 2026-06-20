"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { Features } from "@/components/blocks/features-8";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Search, BarChart3, Brain, Sparkles, Shield, Zap, ArrowRight, Github, Upload, Home, LogIn, UserPlus, BookOpen, Lock, Eye, RefreshCw, LineChart, Users, AlertTriangle, CreditCard, Cpu, Network, MessageSquare, Terminal } from "lucide-react";

const NAV_TABS = [
  { title: "Home", icon: Home },
  { title: "Features", icon: Sparkles },
  { title: "Pricing", icon: CreditCard },
  { type: "separator" as const },
  { title: "Pipeline", icon: Brain },
  { title: "DOCX", icon: BookOpen },
  { type: "separator" as const },
  { title: "Sign In", icon: LogIn },
  { title: "Get Started", icon: UserPlus },
];

const TIMELINE_DATA = [
  { id: 1, title: "Import", date: "Step 1", content: "Upload exports from ChatGPT, Claude, Gemini, Grok, Perplexity. Auto-detect format with versioned parsers and normalize into canonical schema.", category: "Core", icon: Upload, relatedIds: [2], status: "completed" as const, energy: 100 },
  { id: 2, title: "Search", date: "Step 2", content: "Hybrid search: PostgreSQL full-text + pgvector semantic embeddings + Meilisearch BM25 reranking.", category: "Core", icon: Search, relatedIds: [1, 3], status: "completed" as const, energy: 95 },
  { id: 3, title: "Analyze", date: "Step 3", content: "Token usage, topic clusters via BERTopic, provider breakdown, activity heatmaps, and scheduled snapshot aggregation.", category: "Core", icon: BarChart3, relatedIds: [2, 4], status: "completed" as const, energy: 85 },
  { id: 4, title: "Knowledge", date: "Step 4", content: "spaCy NER + custom rules extract entities and populate local Firestore knowledge graph nodes.", category: "AI", icon: Brain, relatedIds: [3, 5], status: "completed" as const, energy: 75 },
  { id: 5, title: "Local GLM", date: "Step 5", content: "Query glm-5.2:cloud via local Ollama. Automatically retrieves and injects vector matches and knowledge nodes into the context.", category: "AI", icon: Cpu, relatedIds: [4, 6], status: "completed" as const, energy: 90 },
  { id: 6, title: "Secure", date: "Step 6", content: "Self-hosted with AES-256 encryption, PII detection, tamper-evident audit logs, zero external API leaks.", category: "Security", icon: Shield, relatedIds: [5], status: "completed" as const, energy: 95 },
];

const PROBLEMS = [
  { icon: Lock, color: "text-red-400", problem: "Vendor Lock-in", desc: "Conversations trapped in platforms with no export path" },
  { icon: Eye, color: "text-orange-400", problem: "Lost Insights", desc: "Key decisions buried in chat threads you'll never find again" },
  { icon: RefreshCw, color: "text-amber-400", problem: "Repeated Queries", desc: "Same questions asked repeatedly — wasted tokens and time" },
  { icon: LineChart, color: "text-cyan-400", problem: "No Analytics", desc: "Zero visibility into AI usage patterns or spend" },
  { icon: Users, color: "text-violet-400", problem: "No Memory", desc: "Teams can't share AI learnings — duplicated effort across org" },
  { icon: AlertTriangle, color: "text-pink-400", problem: "Privacy Risk", desc: "Chats processed by third-party cloud with no governance" },
];

const ContextPipelineVisualization = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const steps = [
    { title: "1. User Query Entry", desc: "User drafts a message. CORTEX catches it and initiates the retrieval pipeline.", icon: MessageSquare, color: "text-blue-400" },
    { title: "2. Vector Similarity Search", desc: "Performs in-memory cosine similarity search over vector embeddings of past messages to find contextually relevant history.", icon: Search, color: "text-indigo-400" },
    { title: "3. Knowledge Graph Retrieval", desc: "Queries Firestore collections for entities and metadata nodes related to the conversation topics.", icon: Network, color: "text-purple-400" },
    { title: "4. System Prompt Synthesis", desc: "Combines the query, vector search results, and knowledge graph facts into an enriched system message context.", icon: Terminal, color: "text-cyan-400" },
    { title: "5. Local Ollama Chat Stream", desc: "Calls the local Ollama API using `glm-5.2:cloud` and streams tokens back to the web console.", icon: Cpu, color: "text-fuchsia-400" }
  ];

  const triggerSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    setActiveStep(null);
    setIsSimulating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-12 px-6 md:px-10 rounded-3xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl">
      {/* Description Left */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest">Local Orchestration</span>
          <h3 className="text-3xl font-extrabold text-white mt-1">Direct Knowledge Injection</h3>
          <p className="text-white/40 text-sm leading-relaxed mt-3">
            CORTEX connects your local Ollama daemon directly to your indexed conversation history and knowledge nodes. Every message query is automatically enriched with the exact context it needs to provide accurate, relevant answers.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex gap-3.5 items-start ${
                activeStep === idx
                  ? "bg-white/[0.06] border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                  : "bg-transparent border-transparent hover:bg-white/[0.02]"
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${s.color}`}>
                <s.icon size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white/95">{s.title}</h4>
                <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={triggerSimulation}
          disabled={isSimulating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-[0_0_20px_rgba(109,40,217,0.3)] disabled:opacity-50"
        >
          {isSimulating ? "Simulating Flow..." : "Simulate Context Flow"}
        </button>
      </div>

      {/* Visualizer Right */}
      <div className="lg:col-span-7 h-[360px] relative border border-white/[0.06] bg-black/35 rounded-2xl overflow-hidden flex items-center justify-center p-6">
        {/* Animated paths/connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 360">
          {/* Query to Search and Graph */}
          <motion.path
            d="M 250 50 L 120 150"
            stroke="url(#grad1)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: activeStep === 1 || isSimulating ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            d="M 250 50 L 380 150"
            stroke="url(#grad2)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: activeStep === 2 || isSimulating ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />
          {/* Search/Graph to Context Builder */}
          <motion.path
            d="M 120 150 L 250 240"
            stroke="url(#grad3)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: activeStep === 3 || isSimulating ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />
          <motion.path
            d="M 380 150 L 250 240"
            stroke="url(#grad4)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: activeStep === 3 || isSimulating ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />
          {/* Context Builder to Ollama */}
          <motion.path
            d="M 250 240 L 250 320"
            stroke="url(#grad5)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: activeStep === 4 || isSimulating ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          />

          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="grad4" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="grad5" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
        </svg>

        {/* Nodes */}
        {/* Node 1: User Query */}
        <motion.div
          className={`absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center p-3 rounded-xl border transition-all ${
            activeStep === 0 ? "bg-blue-500/10 border-blue-400/80 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105" : "bg-white/[0.02] border-white/[0.08]"
          }`}
          style={{ width: "130px" }}
        >
          <MessageSquare size={18} className={activeStep === 0 ? "text-blue-400 animate-pulse" : "text-white/50"} />
          <span className="text-[10px] font-semibold text-white/90 mt-1">1. User Query</span>
          <span className="text-[8px] text-white/40">"How to deploy?"</span>
        </motion.div>

        {/* Node 2: Vector Search */}
        <motion.div
          className={`absolute top-28 left-4 flex flex-col items-center p-3 rounded-xl border transition-all ${
            activeStep === 1 ? "bg-indigo-500/10 border-indigo-400/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-105" : "bg-white/[0.02] border-white/[0.08]"
          }`}
          style={{ width: "140px" }}
        >
          <Search size={18} className={activeStep === 1 ? "text-indigo-400 animate-pulse" : "text-white/50"} />
          <span className="text-[10px] font-semibold text-white/90 mt-1">2. Vector Search</span>
          <span className="text-[8px] text-white/40">In-Memory Cosine Sim</span>
        </motion.div>

        {/* Node 3: Knowledge Graph */}
        <motion.div
          className={`absolute top-28 right-4 flex flex-col items-center p-3 rounded-xl border transition-all ${
            activeStep === 2 ? "bg-purple-500/10 border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105" : "bg-white/[0.02] border-white/[0.08]"
          }`}
          style={{ width: "140px" }}
        >
          <Network size={18} className={activeStep === 2 ? "text-purple-400 animate-pulse" : "text-white/50"} />
          <span className="text-[10px] font-semibold text-white/90 mt-1">3. Firestore Nodes</span>
          <span className="text-[8px] text-white/40">Entities & Facts API</span>
        </motion.div>

        {/* Node 4: Prompt Builder */}
        <motion.div
          className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center p-3 rounded-xl border transition-all ${
            activeStep === 3 ? "bg-cyan-500/10 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-105" : "bg-white/[0.02] border-white/[0.08]"
          }`}
          style={{ width: "150px" }}
        >
          <Terminal size={18} className={activeStep === 3 ? "text-cyan-400 animate-pulse" : "text-white/50"} />
          <span className="text-[10px] font-semibold text-white/90 mt-1">4. Context Synthesis</span>
          <span className="text-[8px] text-white/40">System Prompt Injection</span>
        </motion.div>

        {/* Node 5: Ollama */}
        <motion.div
          className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center p-3 rounded-xl border transition-all ${
            activeStep === 4 ? "bg-fuchsia-500/10 border-fuchsia-400/80 shadow-[0_0_15px_rgba(217,70,239,0.3)] scale-105" : "bg-white/[0.02] border-white/[0.08]"
          }`}
          style={{ width: "150px" }}
        >
          <Cpu size={18} className={activeStep === 4 ? "text-fuchsia-400 animate-pulse" : "text-white/50"} />
          <span className="text-[10px] font-semibold text-white/90 mt-1">5. Ollama GLM-5.2</span>
          <span className="text-[8px] text-white/40">Streaming Tokens</span>
        </motion.div>

        {/* Live response bubble simulation */}
        <AnimatePresence>
          {activeStep === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-6 p-2 bg-fuchsia-500/20 border border-fuchsia-400/35 rounded-lg max-w-[120px] shadow-lg text-[9px] text-fuchsia-100"
            >
              "data: chunk: deployment guide..."
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const actions: Record<number, () => void> = {
      0: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      1: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }),
      2: () => router.push("/pricing"),
      4: () => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" }),
      5: () => router.push("/docx"),
      7: () => router.push("/login"),
      8: () => router.push("/register"),
    };
    actions[index]?.();
  };

  return (
    <div className="relative min-h-screen bg-black">
      {/* WebGL Shader — covers entire page */}
      <WebGLShader />

      {/* ExpandableTabs Header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <ExpandableTabs tabs={NAV_TABS as any} activeColor="text-violet-400" onChange={handleTabChange} />
      </header>

      {/* Brand (top-left) */}
      <div className="fixed top-5 left-6 z-40 flex items-center gap-2">
        <img src="/logo.png" alt="CORTEX Logo" className="w-[28px] h-[28px] object-contain rounded-md" />
        <span className="text-base font-bold tracking-tight text-white hidden md:block">CORTEX</span>
      </div>

      {/* ─── HERO — Full width, no box ─────────────── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Status pill */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/[0.15] bg-white/[0.06] backdrop-blur-xl text-xs text-white/60 mb-10 shadow-lg shadow-white/[0.02]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Open Source · Self Hosted · Apache 2.0
        </div>

        {/* Heading — full width, massive */}
        <h1 className="text-white text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.9] max-w-6xl">
          Your AI Conversations
        </h1>
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.9] max-w-6xl mt-2 bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
          Unified & Intelligent
        </h1>

        <p className="text-white/40 text-base md:text-xl max-w-2xl mx-auto leading-relaxed mt-8">
          Import, search, analyze, and generate knowledge from every AI conversation you&apos;ve ever had. One platform. Total control.
        </p>

        {/* CTA */}
        <div className="mt-12 flex items-center gap-4">
          <LiquidButton className="text-white border border-white/20 rounded-full" size="xl"
            onClick={() => router.push("/login")}>
            Get Started <ArrowRight className="w-4 h-4 ml-1" />
          </LiquidButton>
          <a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence.git" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-3">
            <Github className="w-4 h-4" /> Star on GitHub
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20">
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ─── PROBLEM — glass cards blend with shader ── */}
      <section className="relative z-10 px-6 md:px-12 py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-red-400/70 mb-3 tracking-[0.2em] uppercase">The Problem</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Your AI history is fragmented</h2>
            <p className="text-base text-white/30 mt-4 max-w-lg mx-auto leading-relaxed">ChatGPT, Claude, Gemini, Perplexity, Grok — all siloed. Key insights are buried, queries are repeated, and there&apos;s zero governance.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="group p-5 rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-lg hover:shadow-violet-500/[0.05] transition-all duration-300">
                <div className={`w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${p.color}`}>
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{p.problem}</h3>
                <p className="text-xs text-white/30 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES (Bento) — transparent bg ───── */}
      <div id="features" className="relative z-10">
        <Features />
      </div>

      {/* ─── HOW IT WORKS ────────────────────────── */}
      <section id="how" className="relative z-10 px-6 md:px-12 py-32">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-cyan-400 mb-3 tracking-[0.2em] uppercase">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Three steps to knowledge</h2>
            <p className="text-base text-white/30 mt-4 max-w-md mx-auto">From <code className="text-cyan-400/50 text-sm font-mono">docker compose up</code> to your first searchable import in under 15 minutes.</p>
          </div>
          <div className="grid gap-5">
            {[
              { step: "01", icon: Upload, title: "Import", desc: "Upload exports from any AI provider. CORTEX auto-detects format with versioned parsers, deduplicates by external_id, and normalizes into a unified canonical schema." },
              { step: "02", icon: Search, title: "Discover", desc: "Hybrid search combines PostgreSQL full-text, pgvector semantic embeddings, and Meilisearch BM25 reranking. Filter by provider, date, tags, or folders." },
              { step: "03", icon: Sparkles, title: "Generate", desc: "Create knowledge articles, reports, and presentations from your conversation history. Export to JSON, Markdown, CSV, or PDF." },
            ].map((s, i) => (
              <div key={i} className="flex gap-6 items-start p-6 rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/[0.18] hover:shadow-lg hover:shadow-cyan-500/[0.05] transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-white/[0.08] flex items-center justify-center shrink-0">
                  <s.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-mono text-white/15 uppercase tracking-wider">Step {s.step}</span>
                    <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                  </div>
                  <p className="text-sm text-white/35 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOCAL CONTEXT PIPELINE ──────────────── */}
      <section id="pipeline-flow" className="relative z-10 px-6 md:px-12 py-16">
        <div className="max-w-6xl mx-auto">
          <ContextPipelineVisualization />
        </div>
      </section>

      {/* ─── ORBITAL PIPELINE ────────────────────── */}
      <section id="timeline" className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-pink-400 mb-3 tracking-[0.2em] uppercase">Pipeline</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">The CORTEX Pipeline</h2>
            <p className="text-sm text-white/30 mt-4 max-w-md mx-auto">Click any node to explore how your data flows through the system.</p>
          </div>
          <RadialOrbitalTimeline timelineData={TIMELINE_DATA} />
        </div>
      </section>

      {/* ─── PERSONAS ────────────────────────────── */}
      <section className="relative z-10 px-6 md:px-12 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-amber-400/70 mb-3 tracking-[0.2em] uppercase">Built For</p>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">From solo devs to enterprise</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: "Solo Developer", desc: "Uses 3+ AI tools daily. Needs semantic search, local Ollama, zero cloud dependency. docker compose up → searchable in 15 min.", icon: "🧑‍💻" },
              { name: "Team Lead", desc: "8-person team needs shared workspace, RBAC, analytics on team AI usage. 80% of conversations in shared workspace within 30 days.", icon: "👥" },
              { name: "Enterprise Admin", desc: "Fortune 500 IT/Security. Requires SSO, PII redaction, tamper-evident audit, multi-tenant. Zero data leakage.", icon: "🏢" },
            ].map((p, i) => (
              <div key={i} className="p-7 rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/[0.2] hover:shadow-lg hover:shadow-violet-500/[0.05] transition-all duration-300">
                <span className="text-4xl block mb-4">{p.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">{p.name}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="relative z-10 px-6 py-32 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Ready to take control?</h2>
          <p className="text-white/35 mb-10 text-base">Your AI conversations. Your knowledge. Your control.</p>
          <div className="flex justify-center gap-4">
            <LiquidButton className="text-white border border-white/20 rounded-full" size="xl"
              onClick={() => router.push("/register")}>
              Create Free Account <ArrowRight className="w-4 h-4 ml-1" />
            </LiquidButton>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-black/40 backdrop-blur-2xl px-6 md:px-16 pt-16 pb-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="CORTEX Logo" className="w-[24px] h-[24px] object-contain rounded-md" />
                <span className="text-sm font-bold tracking-tight text-white">CORTEX</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Unified cross-platform conversation intelligence. Index, search, analyze, and automate local or cloud AI memory.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] text-white/55 font-medium tracking-wider uppercase">All Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Resources & Specs */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources & Specs</h4>
              <ul className="flex flex-col gap-2 text-xs text-white/40">
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/tree/main/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation Hub</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/blob/main/docs/planning/PRD.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Product Specs (PRD)</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/blob/main/docs/planning/erd.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Database Schema & ERD</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/blob/main/docs/architecture/overview.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">System Architecture</a></li>
              </ul>
            </div>

            {/* Column 3: Console Pages */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Console Pages</h4>
              <ul className="flex flex-col gap-2 text-xs text-white/40">
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard Console</Link></li>
                <li><Link href="/dashboard/artifacts" className="hover:text-white transition-colors">Artifacts Engine</Link></li>
                <li><Link href="/dashboard/compare" className="hover:text-white transition-colors">Model Compare Mode</Link></li>
                <li><Link href="/dashboard/settings" className="hover:text-white transition-colors">Billing & Settings</Link></li>
              </ul>
            </div>

            {/* Column 4: Community & Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Community & Legal</h4>
              <ul className="flex flex-col gap-2 text-xs text-white/40">
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub Repository</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Issues & Requests</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/blob/main/docs/planning/threat-model.md" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Security Threat Model</a></li>
                <li><a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Apache 2.0 License</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <span>© 2026 CORTEX Core Team. Apache License 2.0.</span>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <a href="https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence.git" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                <Github size={12} /> GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
