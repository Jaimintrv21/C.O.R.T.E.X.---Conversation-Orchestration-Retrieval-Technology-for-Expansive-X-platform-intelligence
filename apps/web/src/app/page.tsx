"use client";

import { useState, useEffect, useRef } from "react";
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

const PYTHON_CODE_SNIPPET = `from ollama import chat

# CORTEX automatically enriches Ollama prompts with context
response = chat(
    model='glm-5.2:cloud',
    messages=[{
        'role': 'user', 
        'content': 'How do I deploy?'
    }],
)

print(response.message.content)`;

const TERMINAL_LOGS = [
  {
    step: 0,
    logs: [
      "[SYSTEM] Gateway initialized.",
      "[SYSTEM] Waiting for incoming client queries on localhost:8000...",
      "Incoming POST -> /api/v1/conversations/chat/messages",
      "> Query: \"How do I deploy?\"",
      "[SYSTEM] Tokenizing message... (12 tokens parsed)"
    ]
  },
  {
    step: 1,
    logs: [
      "[VECTOR] Scanning PostgreSQL pgvector index...",
      "[VECTOR] Searching in-memory cache for past similarity scores...",
      "Match Found -> Document: 'deploy_prod.md' (Similarity: 0.942)",
      "Match Found -> Document: 'docker_compose_config.yml' (Similarity: 0.887)",
      "[VECTOR] Successfully fetched 2 matching context chunks."
    ]
  },
  {
    step: 2,
    logs: [
      "[GRAPH] Querying Firestore semantic entities...",
      "Entity Hit -> Key: 'DeployScript' -> Node: 'docker-compose.yml'",
      "Entity Hit -> Key: 'OllamaService' -> Node: 'Port 8000'",
      "[GRAPH] Combined 2 relational knowledge facts."
    ]
  },
  {
    step: 3,
    logs: [
      "[PROMPT] Compiling prompt template variables...",
      "[PROMPT] Injecting Vector History (840 tokens)",
      "[PROMPT] Injecting Knowledge Facts (120 tokens)",
      "[PROMPT] Enriched prompt synthesized. Payload: 1,220 tokens."
    ]
  },
  {
    step: 4,
    logs: [
      "[OLLAMA] Streaming request dispatched to local Ollama daemon.",
      "[OLLAMA] Target model: 'glm-5.2:cloud'",
      "[STREAM] chunk: \"To deploy CORTEX:\"",
      "[STREAM] chunk: \"1. Clone the repository and run:\"",
      "[STREAM] chunk: \"   docker compose up -d\"",
      "[STREAM] chunk: \"2. Verify that the api starts on port 8000.\"",
      "[SYSTEM] Stream successfully resolved in 842ms. 48 tokens emitted."
    ]
  }
];

const ContextPipelineVisualization = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'terminal'>('terminal');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Initialize with setup logs
  useEffect(() => {
    setConsoleLogs([
      "[SYSTEM] CORTEX local context daemon online.",
      "[SYSTEM] Connected to Local Firestore Instance: OK",
      "[SYSTEM] Connected to Local Ollama Client: OK",
      "[SYSTEM] Ready. Click a step or run the simulation below."
    ]);
  }, []);

  // Scroll to bottom of terminal whenever logs update
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const selectStep = (idx: number) => {
    if (isSimulating) return;
    setActiveStep(idx);
    setActiveTab('terminal');
    setConsoleLogs(prev => [
      ...prev,
      `\n--- Step ${idx + 1} Selected: ${steps[idx].title} ---`,
      ...TERMINAL_LOGS[idx].logs
    ]);
  };

  const steps = [
    { title: "User Query Entry", desc: "User drafts a message. CORTEX intercepts and starts the context retrieval pipeline.", icon: MessageSquare, color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { title: "Vector Search", desc: "Runs cosine similarity search over database embeddings to locate historical references.", icon: Search, color: "text-indigo-400", glow: "shadow-[0_0_15px_rgba(99,102,241,0.2)]", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { title: "Firestore Graph", desc: "Queries Firestore collection collections for related tags and entity nodes.", icon: Network, color: "text-purple-400", glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { title: "Prompt Synthesis", desc: "Combines query, database search results, and knowledge facts into one unified context.", icon: Terminal, color: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { title: "Local GLM Stream", desc: "Pipes enriched system prompt into local Ollama via glm-5.2:cloud and streams response.", icon: Cpu, color: "text-fuchsia-400", glow: "shadow-[0_0_15px_rgba(217,70,239,0.2)]", badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" }
  ];

  const triggerSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveTab('terminal');
    setConsoleLogs([
      "[SIMULATION STARTED] Initiating multi-stage pipeline flow...",
      "[SIMULATION STARTED] Preparing query data..."
    ]);

    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i);
      setConsoleLogs(prev => [
        ...prev,
        `\n>>> Pipeline Stage ${i + 1}/5: ${steps[i].title}`,
        ...TERMINAL_LOGS[i].logs
      ]);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setConsoleLogs(prev => [
      ...prev,
      "\n[SIMULATION COMPLETED] Context retrieval, injection, and inference cycle resolved successfully."
    ]);
    setActiveStep(null);
    setIsSimulating(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch py-12 px-6 md:px-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Description Left */}
      <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
            Context Orchestration
          </span>
          <h3 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Direct Local Knowledge Graph</h3>
          <p className="text-white/40 text-sm leading-relaxed mt-3">
            CORTEX weaves your indexed history with a local knowledge graph. Every message query undergoes semantic synthesis before prompting Ollama, ensuring responses are fully contextualized without exposing data to third-party APIs.
          </p>
        </div>

        <div className="space-y-3 my-4">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={idx}
                onClick={() => selectStep(idx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex gap-4 items-start ${
                  isActive
                    ? "bg-white/[0.06] border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.12)] scale-[1.01]"
                    : "bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.1]"
                }`}
              >
                <div className={`mt-0.5 p-2 rounded-xl border bg-white/[0.02] border-white/[0.08] ${s.color}`}>
                  <s.icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white/95">{s.title}</h4>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${s.badge}`}>
                      Stage 0{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/45 leading-relaxed mt-1.5">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={triggerSimulation}
          disabled={isSimulating}
          className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all duration-300 shadow-[0_0_25px_rgba(109,40,217,0.35)] disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <RefreshCw className="animate-spin" size={14} />
              Simulating Local Pipeline...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Simulate Context Flow
            </>
          )}
        </button>
      </div>

      {/* Visualizer Right */}
      <div className="lg:col-span-7 flex flex-col rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl bg-black/40">
        
        {/* Top visual canvas */}
        <div className="h-[280px] relative bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] bg-[#07070c] flex items-center justify-center p-6 border-b border-white/[0.06]">
          
          {/* Glowing wire paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 280">
            {/* Query to Search and Graph */}
            <path d="M 250 45 L 90 120" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />
            <path d="M 250 45 L 410 120" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />
            {/* Search/Graph to Context Builder */}
            <path d="M 90 120 L 250 190" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />
            <path d="M 410 120 L 250 190" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />
            {/* Context Builder to Ollama */}
            <path d="M 250 190 L 250 250" stroke="rgba(255,255,255,0.03)" strokeWidth="2" fill="none" />

            {/* Glowing active path overlays */}
            <motion.path
              d="M 250 45 L 90 120"
              stroke="url(#blue-grad)"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeStep === 1 || isSimulating ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 250 45 L 410 120"
              stroke="url(#purple-grad)"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeStep === 2 || isSimulating ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 90 120 L 250 190"
              stroke="url(#cyan-grad)"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeStep === 3 || isSimulating ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 410 120 L 250 190"
              stroke="url(#cyan-grad)"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeStep === 3 || isSimulating ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 250 190 L 250 250"
              stroke="url(#fuchsia-grad)"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: activeStep === 4 || isSimulating ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />

            <defs>
              <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="purple-grad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <linearGradient id="cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="fuchsia-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#d946ef" />
              </linearGradient>
            </defs>
          </svg>

          {/* Graphical Nodes */}
          {/* Node 1: User Query */}
          <motion.div
            onClick={() => selectStep(0)}
            className={`absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-full border cursor-pointer transition-all duration-300 ${
              activeStep === 0 ? "bg-blue-500/10 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-105" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <MessageSquare size={14} className={activeStep === 0 ? "text-blue-400 animate-pulse" : "text-white/60"} />
            <span className="text-[10px] font-bold text-white tracking-wide">User Query</span>
          </motion.div>

          {/* Node 2: Vector Search */}
          <motion.div
            onClick={() => selectStep(1)}
            className={`absolute top-28 left-4 flex items-center gap-2.5 px-4 py-2.5 rounded-full border cursor-pointer transition-all duration-300 ${
              activeStep === 1 ? "bg-indigo-500/10 border-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.35)] scale-105" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <Search size={14} className={activeStep === 1 ? "text-indigo-400 animate-pulse" : "text-white/60"} />
            <span className="text-[10px] font-bold text-white tracking-wide">Vector Match</span>
          </motion.div>

          {/* Node 3: Knowledge Graph */}
          <motion.div
            onClick={() => selectStep(2)}
            className={`absolute top-28 right-4 flex items-center gap-2.5 px-4 py-2.5 rounded-full border cursor-pointer transition-all duration-300 ${
              activeStep === 2 ? "bg-purple-500/10 border-purple-400/80 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-105" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <Network size={14} className={activeStep === 2 ? "text-purple-400 animate-pulse" : "text-white/60"} />
            <span className="text-[10px] font-bold text-white tracking-wide">Graph Fact</span>
          </motion.div>

          {/* Node 4: Prompt Builder */}
          <motion.div
            onClick={() => selectStep(3)}
            className={`absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-full border cursor-pointer transition-all duration-300 ${
              activeStep === 3 ? "bg-cyan-500/10 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-105" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <Terminal size={14} className={activeStep === 3 ? "text-cyan-400 animate-pulse" : "text-white/60"} />
            <span className="text-[10px] font-bold text-white tracking-wide">Prompt Builder</span>
          </motion.div>

          {/* Node 5: Ollama */}
          <motion.div
            onClick={() => selectStep(4)}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-full border cursor-pointer transition-all duration-300 ${
              activeStep === 4 ? "bg-fuchsia-500/10 border-fuchsia-400/80 shadow-[0_0_20px_rgba(217,70,239,0.35)] scale-105" : "bg-white/[0.03] border-white/[0.08] hover:border-white/[0.18]"
            }`}
          >
            <Cpu size={14} className={activeStep === 4 ? "text-fuchsia-400 animate-pulse" : "text-white/60"} />
            <span className="text-[10px] font-bold text-white tracking-wide">Ollama GLM-5.2</span>
          </motion.div>
        </div>

        {/* Lower IDE terminal console */}
        <div className="flex flex-col bg-[#050508] h-[220px]">
          {/* Tab bar header */}
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06] text-xs">
            <div className="flex items-center gap-2.5">
              {/* macOS window actions */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`font-semibold transition-all px-2.5 py-1 rounded-md ${
                  activeTab === 'terminal' ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                CORTEX Daemon Logs
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`font-semibold transition-all px-2.5 py-1 rounded-md ${
                  activeTab === 'code' ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                python_client.py
              </button>
            </div>
            <span className="text-[10px] text-white/20 font-mono">Localhost:8000</span>
          </div>

          {/* Content container */}
          <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar select-text leading-relaxed">
            {activeTab === 'code' ? (
              <pre className="text-white/70">
                {PYTHON_CODE_SNIPPET.split('\n').map((line, i) => {
                  let formattedLine = line;
                  if (line.startsWith('#')) {
                    formattedLine = `<span class="text-white/30">${line}</span>`;
                  } else if (line.includes('response') || line.includes('print')) {
                    formattedLine = line
                      .replace('response', '<span class="text-violet-400">response</span>')
                      .replace('print', '<span class="text-cyan-400">print</span>');
                  } else if (line.includes('model') || line.includes('messages')) {
                    formattedLine = line
                      .replace('model', '<span class="text-indigo-300">model</span>')
                      .replace('messages', '<span class="text-indigo-300">messages</span>');
                  }
                  return (
                    <div key={i} dangerouslySetInnerHTML={{ __html: formattedLine || '&nbsp;' }} />
                  );
                })}
              </pre>
            ) : (
              <div className="space-y-1 text-emerald-400/90">
                {consoleLogs.map((log, index) => {
                  let colorClass = "text-emerald-400/90";
                  if (log.startsWith('[SYSTEM]')) colorClass = "text-white/45";
                  else if (log.startsWith('[VECTOR]')) colorClass = "text-indigo-400/90";
                  else if (log.startsWith('[GRAPH]')) colorClass = "text-purple-400/90";
                  else if (log.startsWith('[PROMPT]')) colorClass = "text-cyan-400/90";
                  else if (log.startsWith('[OLLAMA]')) colorClass = "text-fuchsia-400/90";
                  else if (log.startsWith('[SIMULATION')) colorClass = "text-amber-400 font-semibold";
                  else if (log.startsWith('>')) colorClass = "text-blue-300 font-bold";
                  
                  return (
                    <div key={index} className={colorClass}>
                      {log}
                    </div>
                  );
                })}
                <div ref={consoleEndRef} />
              </div>
            )}
          </div>
        </div>
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
