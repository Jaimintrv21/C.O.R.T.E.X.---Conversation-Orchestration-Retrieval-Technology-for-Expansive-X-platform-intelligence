"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { Features } from "@/components/blocks/features-8";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { Search, BarChart3, Brain, Sparkles, Shield, Zap, ArrowRight, Github, Upload, Home, LogIn, UserPlus, BookOpen, Lock, Eye, RefreshCw, LineChart, Users, AlertTriangle } from "lucide-react";

const NAV_TABS = [
  { title: "Home", icon: Home },
  { title: "Features", icon: Sparkles },
  { type: "separator" as const },
  { title: "Pipeline", icon: Brain },
  { title: "Docs", icon: BookOpen },
  { type: "separator" as const },
  { title: "Sign In", icon: LogIn },
  { title: "Get Started", icon: UserPlus },
];

const TIMELINE_DATA = [
  { id: 1, title: "Import", date: "Step 1", content: "Upload exports from ChatGPT, Claude, Gemini, Grok, Perplexity. Auto-detect format with versioned parsers and normalize into canonical schema.", category: "Core", icon: Upload, relatedIds: [2], status: "completed" as const, energy: 100 },
  { id: 2, title: "Search", date: "Step 2", content: "Hybrid search: PostgreSQL full-text + pgvector semantic embeddings + Meilisearch BM25 reranking.", category: "Core", icon: Search, relatedIds: [1, 3], status: "completed" as const, energy: 95 },
  { id: 3, title: "Analyze", date: "Step 3", content: "Token usage, topic clusters via BERTopic, provider breakdown, activity heatmaps, and scheduled snapshot aggregation.", category: "Core", icon: BarChart3, relatedIds: [2, 4], status: "completed" as const, energy: 85 },
  { id: 4, title: "Knowledge", date: "Step 4", content: "spaCy NER + custom rules extract entities into a navigable knowledge graph.", category: "AI", icon: Brain, relatedIds: [3, 5], status: "in-progress" as const, energy: 70 },
  { id: 5, title: "Generate", date: "Step 5", content: "AI artifact engine creates wikis, reports, summaries from your conversation library.", category: "AI", icon: Sparkles, relatedIds: [4, 6], status: "in-progress" as const, energy: 55 },
  { id: 6, title: "Secure", date: "Step 6", content: "Self-hosted with AES-256 encryption, PII detection, tamper-evident audit logs, zero external API calls.", category: "Security", icon: Shield, relatedIds: [5], status: "pending" as const, energy: 40 },
];

const PROBLEMS = [
  { icon: Lock, color: "text-red-400", problem: "Vendor Lock-in", desc: "Conversations trapped in platforms with no export path" },
  { icon: Eye, color: "text-orange-400", problem: "Lost Insights", desc: "Key decisions buried in chat threads you'll never find again" },
  { icon: RefreshCw, color: "text-amber-400", problem: "Repeated Queries", desc: "Same questions asked repeatedly — wasted tokens and time" },
  { icon: LineChart, color: "text-cyan-400", problem: "No Analytics", desc: "Zero visibility into AI usage patterns or spend" },
  { icon: Users, color: "text-violet-400", problem: "No Memory", desc: "Teams can't share AI learnings — duplicated effort across org" },
  { icon: AlertTriangle, color: "text-pink-400", problem: "Privacy Risk", desc: "Chats processed by third-party cloud with no governance" },
];

export default function LandingPage() {
  const router = useRouter();

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const actions: Record<number, () => void> = {
      0: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      1: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }),
      3: () => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" }),
      4: () => window.open("https://github.com", "_blank"),
      6: () => router.push("/login"),
      7: () => router.push("/register"),
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
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#logo_grad)" />
          <path d="M10 22V10l6 4.5L22 10v12l-6-4.5L10 22z" fill="white" fillOpacity="0.9" />
          <defs><linearGradient id="logo_grad" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs>
        </svg>
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
          <a href="https://github.com" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors px-4 py-3">
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
      <footer className="relative z-10 border-t border-white/[0.04] px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="url(#f_grad)"/><path d="M10 22V10l6 4.5L22 10v12l-6-4.5L10 22z" fill="white" fillOpacity="0.9"/><defs><linearGradient id="f_grad" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#06b6d4"/></linearGradient></defs></svg>
            <span>© 2026 CORTEX · Apache 2.0</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
            <a href="https://github.com" className="hover:text-white/40 transition-colors flex items-center gap-1"><Github className="w-3 h-3" />GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
