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
import { Search, BarChart3, Brain, Sparkles, Shield, Zap, ArrowRight, Github, Upload, Home, LogIn, UserPlus, BookOpen, Lock, Eye, RefreshCw, LineChart, Users, AlertTriangle, CreditCard, Cpu, Network, MessageSquare, Terminal, Menu, X, Target, Download } from "lucide-react";

// FIXED hardcoded landing page theme - never reads from user AppearanceProvider
const LANDING_ACCENT = '#6C63FF';
const LANDING_SECONDARY = '#00D2FF';

const NAV_TABS = [
  { title: "Home", icon: Home },
  { title: "Features", icon: Sparkles },
  { title: "Pricing", icon: CreditCard },
  { type: "separator" as const },
  { title: "Pipeline", icon: Brain },
  { title: "DOCX", icon: BookOpen },
  { title: "Support", icon: MessageSquare },
  { type: "separator" as const },
  { title: "Sign In", icon: LogIn },
  { title: "Get Started", icon: UserPlus },
];

const TIMELINE_DATA = [
  { id: 1, title: "Import", date: "Step 1", content: "Upload exports from ChatGPT, Claude, Gemini, Grok, Perplexity. Auto-detect format with versioned parsers and normalize into canonical schema.", category: "Core", icon: Upload, relatedIds: [2], status: "completed" as const, energy: 100 },
  { id: 2, title: "Search", date: "Step 2", content: "Hybrid search: PostgreSQL full-text + pgvector semantic embeddings + Meilisearch BM25 reranking.", category: "Core", icon: Search, relatedIds: [1, 3], status: "completed" as const, energy: 95 },
  { id: 3, title: "Analyze", date: "Step 3", content: "Token usage, topic clusters via BERTopic, provider breakdown, activity heatmaps, and scheduled snapshot aggregation.", category: "Core", icon: BarChart3, relatedIds: [2, 4], status: "completed" as const, energy: 85 },
  { id: 4, title: "Knowledge", date: "Step 4", content: "spaCy NER + custom rules extract entities and populate local Firestore knowledge graph nodes.", category: "AI", icon: Brain, relatedIds: [3, 5], status: "completed" as const, energy: 75 },
  { id: 5, title: "CORTEX AI", date: "Step 5", content: "Query cortex-core:native via local CORTEX Engine. Automatically retrieves and injects vector matches and knowledge nodes into the context.", category: "AI", icon: Cpu, relatedIds: [4, 6], status: "completed" as const, energy: 90 },
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

const PYTHON_CODE_SNIPPET = `from cortex import chat

# CORTEX automatically enriches AI prompts with context
response = chat(
    model='cortex-core:native',
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
      "[CORTEX-AI] Streaming request dispatched to local neural engine.",
      "[CORTEX-AI] Target model: 'cortex-core:native'",
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
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with setup logs
  useEffect(() => {
    setConsoleLogs([
      "[SYSTEM] CORTEX local context daemon online.",
      "[SYSTEM] Connected to Local Firestore Instance: OK",
      "[SYSTEM] Connected to Local CORTEX Engine: OK",
      "[SYSTEM] Ready. Click a step or run the simulation below."
    ]);
  }, []);

  // Scroll to bottom of terminal container whenever logs update without scrolling the main window
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Lock body scroll during simulation (desktop only)
  useEffect(() => {
    if (isSimulating && typeof window !== 'undefined' && window.innerWidth > 768) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isSimulating]);

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
    { title: "Firestore Graph", desc: "Queries Firestore collections for related tags and entity nodes.", icon: Network, color: "text-purple-400", glow: "shadow-[0_0_15px_rgba(168,85,247,0.2)]", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { title: "Prompt Synthesis", desc: "Combines query, database search results, and knowledge facts into one unified context.", icon: Terminal, color: "text-cyan-400", glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { title: "CORTEX AI Stream", desc: "Pipes enriched system prompt into local CORTEX Engine via cortex-core:native and streams response.", icon: Cpu, color: "text-fuchsia-400", glow: "shadow-[0_0_15px_rgba(217,70,239,0.2)]", badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20" }
  ];

  const triggerSimulation = async () => {
    if (isSimulating) return;

    // Smoothly scroll the visualizer container to center in view
    const container = document.getElementById("context-pipeline-visualizer");
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait for scroll transition to finish before starting simulation and locking body scroll
      await new Promise(resolve => setTimeout(resolve, 600));
    }

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
    setActiveStep(4); // Lock on the final step (CORTEX Engine) at the end of the simulation
    setIsSimulating(false);
  };

  return (
    <div id="context-pipeline-visualizer" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch py-12 px-6 md:px-10 rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      {/* Description Left */}
      <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
        <div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase tracking-wider">
            Context Orchestration
          </span>
          <h3 className="text-3xl font-extrabold text-white mt-3 tracking-tight">Direct Local Knowledge Graph</h3>
          <p className="text-white/40 text-sm leading-relaxed mt-3">
            CORTEX weaves your indexed history with a local knowledge graph. Every message query undergoes semantic synthesis before prompting our native CORTEX AI model, ensuring responses are fully contextualized without exposing data to third-party APIs.
          </p>
        </div>

        <div className="space-y-3 my-4">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={idx}
                onClick={() => selectStep(idx)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex gap-4 items-start ${isActive
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

        {/* Top visual canvas (Desktop View) */}
        <div className="hidden lg:flex h-[420px] relative bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] bg-[#07070c] items-center justify-center p-6 border-b border-white/[0.06] overflow-hidden">

          {/* Glowing wire paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 420">
            {/* SVG connections with rounded corners (using Q bezier curves) */}

            {/* User Query -> Vector Match */}
            <path d="M 300 90 L 300 105 Q 300 110 295 110 L 165 110 Q 160 110 160 115 L 160 135" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* User Query -> Graph Fact */}
            <path d="M 300 90 L 300 105 Q 300 110 305 110 L 435 110 Q 440 110 440 115 L 440 135" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* Vector Match -> Prompt Builder */}
            <path d="M 160 205 L 160 215 Q 160 220 165 220 L 295 220 Q 300 220 300 225 L 300 240" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* Graph Fact -> Prompt Builder */}
            <path d="M 440 205 L 440 215 Q 440 220 435 220 L 305 220 Q 300 220 300 225 L 300 240" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* Prompt Builder -> Ollama */}
            <path d="M 300 310 L 300 330" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* Glowing active path overlays */}
            <motion.path
              d="M 300 90 L 300 105 Q 300 110 295 110 L 165 110 Q 160 110 160 115 L 160 135"
              stroke="url(#blue-grad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (activeStep !== null && activeStep >= 1) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 300 90 L 300 105 Q 300 110 305 110 L 435 110 Q 440 110 440 115 L 440 135"
              stroke="url(#green-grad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (activeStep !== null && activeStep >= 2) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 160 205 L 160 215 Q 160 220 165 220 L 295 220 Q 300 220 300 225 L 300 240"
              stroke="url(#orange-grad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (activeStep !== null && activeStep >= 3) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 440 205 L 440 215 Q 440 220 435 220 L 305 220 Q 300 220 300 225 L 300 240"
              stroke="url(#orange-grad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (activeStep !== null && activeStep >= 3) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.path
              d="M 300 310 L 300 330"
              stroke="url(#pink-grad)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (activeStep !== null && activeStep >= 4) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
            />

            <defs>
              <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="pink-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Glowing connection dots */}
            <circle cx="300" cy="90" r="3.5" fill="#a855f7" style={{ filter: 'drop-shadow(0 0 3px #a855f7)' }} />
            <circle cx="300" cy="110" r="3.5" fill="#6366f1" style={{ filter: 'drop-shadow(0 0 3px #6366f1)' }} />
            <circle cx="160" cy="135" r="3.5" fill="#3b82f6" style={{ filter: 'drop-shadow(0 0 3px #3b82f6)' }} />
            <circle cx="440" cy="135" r="3.5" fill="#10b981" style={{ filter: 'drop-shadow(0 0 3px #10b981)' }} />
            <circle cx="160" cy="205" r="3.5" fill="#3b82f6" style={{ filter: 'drop-shadow(0 0 3px #3b82f6)' }} />
            <circle cx="440" cy="205" r="3.5" fill="#10b981" style={{ filter: 'drop-shadow(0 0 3px #10b981)' }} />
            <circle cx="300" cy="220" r="3.5" fill="#f97316" style={{ filter: 'drop-shadow(0 0 3px #f97316)' }} />
            <circle cx="300" cy="240" r="3.5" fill="#f97316" style={{ filter: 'drop-shadow(0 0 3px #f97316)' }} />
            <circle cx="300" cy="310" r="3.5" fill="#f97316" style={{ filter: 'drop-shadow(0 0 3px #f97316)' }} />
            <circle cx="300" cy="330" r="3.5" fill="#ec4899" style={{ filter: 'drop-shadow(0 0 3px #ec4899)' }} />
          </svg>

          {/* Cards for desktop */}
          {/* Node 1: User Query */}
          <motion.div
            onClick={() => selectStep(0)}
            className={`absolute top-[55px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-[220px] ${activeStep === 0
                ? "bg-purple-500/10 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-105"
                : "bg-[#0c0a1a]/85 border-purple-500/30 hover:border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${activeStep === 0 ? "bg-purple-500/20 text-purple-400 border-purple-400" : "bg-purple-500/10 text-purple-400/70 border-purple-500/20"
              }`}>
              <MessageSquare size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">User Query</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">User inputs a question or request</span>
            </div>
          </motion.div>

          {/* Node 2: Vector Match */}
          <motion.div
            onClick={() => selectStep(1)}
            className={`absolute top-[170px] left-[26.6%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-[220px] ${activeStep === 1
                ? "bg-blue-500/10 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)] scale-105"
                : "bg-[#080b18]/85 border-blue-500/30 hover:border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${activeStep === 1 ? "bg-blue-500/20 text-blue-400 border-blue-400" : "bg-blue-500/10 text-blue-400/70 border-blue-500/20"
              }`}>
              <Search size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Vector Match</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Find relevant context using vector similarity</span>
            </div>
          </motion.div>

          {/* Node 3: Graph Fact */}
          <motion.div
            onClick={() => selectStep(2)}
            className={`absolute top-[170px] left-[73.3%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-[220px] ${activeStep === 2
                ? "bg-green-500/10 border-green-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-105"
                : "bg-[#08130f]/85 border-green-500/30 hover:border-green-400/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${activeStep === 2 ? "bg-green-500/20 text-green-400 border-green-400" : "bg-green-500/10 text-green-400/70 border-green-500/20"
              }`}>
              <Network size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Graph Fact</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Retrieve structured facts from knowledge graph</span>
            </div>
          </motion.div>

          {/* Node 4: Prompt Builder */}
          <motion.div
            onClick={() => selectStep(3)}
            className={`absolute top-[275px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-[220px] ${activeStep === 3
                ? "bg-orange-500/10 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.35)] scale-105"
                : "bg-[#160e0a]/85 border-orange-500/30 hover:border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${activeStep === 3 ? "bg-orange-500/20 text-orange-400 border-orange-400" : "bg-orange-500/10 text-orange-400/70 border-orange-500/20"
              }`}>
              <Terminal size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Prompt Builder</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Combine context and facts into optimized prompt</span>
            </div>
          </motion.div>

          {/* Node 5: CORTEX Engine */}
          <motion.div
            onClick={() => selectStep(4)}
            className={`absolute top-[365px] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-[220px] ${activeStep === 4
                ? "bg-pink-500/10 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.35)] scale-105"
                : "bg-[#150a14]/85 border-pink-500/30 hover:border-pink-400/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${activeStep === 4 ? "bg-pink-500/20 text-pink-400 border-pink-400" : "bg-pink-500/10 text-pink-400/70 border-pink-500/20"
              }`}>
              <Cpu size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">CORTEX AI Core</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Generate accurate, context-aware response</span>
            </div>
          </motion.div>
        </div>

        {/* Top visual canvas (Mobile stacked list: lg:hidden) */}
        <div className="flex lg:hidden flex-col items-center gap-6 p-6 bg-[#07070c] border-b border-white/[0.06] w-full">

          {/* Card 1: User Query */}
          <div
            onClick={() => selectStep(0)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-full max-w-[280px] ${activeStep === 0
                ? "bg-purple-500/10 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
                : "bg-[#0c0a1a]/85 border-purple-500/30 hover:border-purple-400/50"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${activeStep === 0 ? "bg-purple-500/20 text-purple-400 border-purple-400" : "bg-purple-500/10 text-purple-400/70 border-purple-500/20"
              }`}>
              <MessageSquare size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">User Query</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">User inputs a question or request</span>
            </div>
          </div>

          <div className="w-[1.5px] h-6 bg-white/[0.1] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6] to-[#3b82f6] opacity-70 animate-pulse" />
          </div>

          {/* Card 2: Vector Match */}
          <div
            onClick={() => selectStep(1)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-full max-w-[280px] ${activeStep === 1
                ? "bg-blue-500/10 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                : "bg-[#080b18]/85 border-blue-500/30 hover:border-blue-400/50"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${activeStep === 1 ? "bg-blue-500/20 text-blue-400 border-blue-400" : "bg-blue-500/10 text-blue-400/70 border-blue-500/20"
              }`}>
              <Search size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Vector Match</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Find relevant context using vector similarity</span>
            </div>
          </div>

          <div className="w-[1.5px] h-6 bg-white/[0.1] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#3b82f6] to-[#10b981] opacity-70 animate-pulse" />
          </div>

          {/* Card 3: Graph Fact */}
          <div
            onClick={() => selectStep(2)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-full max-w-[280px] ${activeStep === 2
                ? "bg-green-500/10 border-green-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                : "bg-[#08130f]/85 border-green-500/30 hover:border-green-400/50"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${activeStep === 2 ? "bg-green-500/20 text-green-400 border-green-400" : "bg-green-500/10 text-green-400/70 border-green-500/20"
              }`}>
              <Network size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Graph Fact</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Retrieve structured facts from knowledge graph</span>
            </div>
          </div>

          <div className="w-[1.5px] h-6 bg-white/[0.1] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#10b981] to-[#f97316] opacity-70 animate-pulse" />
          </div>

          {/* Card 4: Prompt Builder */}
          <div
            onClick={() => selectStep(3)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-full max-w-[280px] ${activeStep === 3
                ? "bg-orange-500/10 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.35)]"
                : "bg-[#160e0a]/85 border-orange-500/30 hover:border-orange-400/50"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${activeStep === 3 ? "bg-orange-500/20 text-orange-400 border-orange-400" : "bg-orange-500/10 text-orange-400/70 border-orange-500/20"
              }`}>
              <Terminal size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">Prompt Builder</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Combine context and facts into optimized prompt</span>
            </div>
          </div>

          <div className="w-[1.5px] h-6 bg-white/[0.1] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#f97316] to-[#ec4899] opacity-70 animate-pulse" />
          </div>

          {/* Card 5: CORTEX AI Core */}
          <div
            onClick={() => selectStep(4)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-300 w-full max-w-[280px] ${activeStep === 4
                ? "bg-pink-500/10 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.35)]"
                : "bg-[#150a14]/85 border-pink-500/30 hover:border-pink-400/50"
              }`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${activeStep === 4 ? "bg-pink-500/20 text-pink-400 border-pink-400" : "bg-pink-500/10 text-pink-400/70 border-pink-500/20"
              }`}>
              <Cpu size={16} />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[10px] font-bold text-white tracking-wide block">CORTEX AI Core</span>
              <span className="text-[8px] text-white/50 leading-tight block mt-0.5">Generate accurate, context-aware response</span>
            </div>
          </div>
        </div>

        {/* Lower IDE terminal console */}
        <div className="flex flex-col bg-[#050508] flex-grow flex-1 min-h-[220px]">
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
                className={`font-semibold transition-all px-2.5 py-1 rounded-md ${activeTab === 'terminal' ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
                  }`}
              >
                CORTEX Daemon Logs
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`font-semibold transition-all px-2.5 py-1 rounded-md ${activeTab === 'code' ? "bg-white/[0.06] text-white" : "text-white/40 hover:text-white/70"
                  }`}
              >
                python_client.py
              </button>
            </div>
            <span className="text-[10px] text-white/20 font-mono">Localhost:8000</span>
          </div>

          {/* Content container */}
          <div ref={consoleContainerRef} className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar select-text leading-relaxed">
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
                  else if (log.startsWith('[CORTEX-AI]')) colorClass = "text-fuchsia-400/90";
                  else if (log.startsWith('[SIMULATION')) colorClass = "text-amber-400 font-semibold";
                  else if (log.startsWith('>')) colorClass = "text-blue-300 font-bold";

                  return (
                    <div key={index} className={colorClass}>
                      {log}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Features dashboard bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-t border-white/[0.06] bg-black/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
              <Zap size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white/90 truncate">Smart Retrieval</div>
              <div className="text-[8px] text-white/45 truncate">Vector + Graph power</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Target size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white/90 truncate">Better Accuracy</div>
              <div className="text-[8px] text-white/45 truncate">Relevant context + facts</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 flex-shrink-0">
              <Shield size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white/90 truncate">Reliable Output</div>
              <div className="text-[8px] text-white/45 truncate">Optimized prompting</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-white/90 truncate">Local & Private</div>
              <div className="text-[8px] text-white/45 truncate">Powered by CORTEX Core</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const [isMobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<number | null>(0);
  // HARDCODED - landing page NEVER reads from user AppearanceProvider
  const accentColor = LANDING_ACCENT;
  const secondaryColor = LANDING_SECONDARY;

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 250; // Trigger threshold
      
      const featuresEl = document.getElementById("features");
      const timelineEl = document.getElementById("timeline");
      
      if (timelineEl && scrollPos >= timelineEl.offsetTop) {
        setActiveTab(4); // Pipeline / timeline is tab index 4
      } else if (featuresEl && scrollPos >= featuresEl.offsetTop) {
        setActiveTab(1); // Features is tab index 1
      } else {
        setActiveTab(0); // Home is tab index 0
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial run on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const actions: Record<number, () => void> = {
      0: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      1: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }),
      2: () => router.push("/pricing"),
      4: () => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" }),
      5: () => router.push("/docx"),
      6: () => router.push("/support"),
      8: () => router.push("/login"),
      9: () => router.push("/register"),
    };
    actions[index]?.();
  };

  // Static Liquid Glass theme variables for the landing page
  const landingPageStyle = {
    '--accent-color': '#6C63FF',
    '--accent-rgb': '108, 99, 255',
    '--accent-secondary': '#00D2FF',
    '--accent-secondary-rgb': '0, 210, 255',
    '--primary': '244 100% 63%',
    '--ring': '244 100% 63%',
  } as React.CSSProperties;

  return (
    <div className="theme-liquid-glass relative min-h-screen bg-black" style={landingPageStyle}>
      {/* WebGL Shader — covers entire page */}
      <WebGLShader isStatic />

      {/* ExpandableTabs Header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 hidden md:block">
        <ExpandableTabs tabs={NAV_TABS as any} activeTab={activeTab} onChange={handleTabChange} />
      </header>

      {/* Brand (top-left) */}
      <div className="fixed top-5 left-6 z-40 flex items-center gap-2">
        <img src="/logo.png" alt="CORTEX Logo" className="w-[28px] h-[28px] object-contain rounded-md" />
        <span className="text-base font-bold tracking-tight text-white hidden md:block">CORTEX</span>
      </div>

      {/* Mobile More Overlay */}
      <AnimatePresence>
        {isMobileMoreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMoreOpen(false)}
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Bottom Navigation (Aesthetic Glassmorphism) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[420px] md:hidden">
        {/* Background panel */}
        <div className="relative h-[72px] rounded-full backdrop-blur-2xl bg-[#0A0A0F]/70 border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-around px-2 pointer-events-auto">
          {/* Glass reflection shine */}
          <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] overflow-hidden" />
          
          {/* Home */}
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setMobileMoreOpen(false);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
          >
            {activeTab === 0 && (
              <motion.div
                layoutId="activeMobileLandingTab"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Home size={18} className={`transition-colors ${activeTab === 0 ? 'text-[#6C63FF]' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[10px] font-semibold transition-colors ${activeTab === 0 ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Home</span>
          </button>

          {/* Features */}
          <button
            onClick={() => {
              document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              setMobileMoreOpen(false);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
          >
            {activeTab === 1 && (
              <motion.div
                layoutId="activeMobileLandingTab"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Sparkles size={18} className={`transition-colors ${activeTab === 1 ? 'text-[#6C63FF]' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[10px] font-semibold transition-colors ${activeTab === 1 ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Features</span>
          </button>

          {/* Pipeline */}
          <button
            onClick={() => {
              document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" });
              setMobileMoreOpen(false);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
          >
            {activeTab === 4 && (
              <motion.div
                layoutId="activeMobileLandingTab"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Brain size={18} className={`transition-colors ${activeTab === 4 ? 'text-[#6C63FF]' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[10px] font-semibold transition-colors ${activeTab === 4 ? 'text-white' : 'text-white/50 group-hover:text-white'}`}>Pipeline</span>
          </button>

          {/* Get Started */}
          <button
            onClick={() => {
              router.push("/register");
              setMobileMoreOpen(false);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
          >
            <UserPlus size={18} className="text-white/60 group-hover:text-white transition-colors" />
            <span className="text-[10px] font-semibold text-white/50 group-hover:text-white transition-colors">Start</span>
          </button>

          {/* More */}
          <button
            onClick={() => setMobileMoreOpen(!isMobileMoreOpen)}
            className="relative flex flex-col items-center justify-center gap-0.5 w-[64px] h-[52px] rounded-full group outline-none"
          >
            {isMobileMoreOpen && (
              <motion.div
                layoutId="activeMobileLandingTab"
                className="absolute inset-0 bg-white/[0.08] border border-white/[0.1] rounded-full -z-10 shadow-[inset_1px_1px_1px_rgba(255,255,255,0.15)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Menu size={18} className={`transition-all duration-300 ${isMobileMoreOpen ? 'text-[#6C63FF] rotate-90 scale-110' : 'text-white/60 group-hover:text-white'}`} />
            <span className={`text-[10px] font-semibold transition-colors ${isMobileMoreOpen ? 'text-[#6C63FF]' : 'text-white/50 group-hover:text-white'}`}>More</span>
          </button>
        </div>

        {/* More popup */}
        <AnimatePresence>
          {isMobileMoreOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-[84px] left-0 right-0 rounded-[28px] border border-white/[0.12] bg-[#0A0A0F]/95 backdrop-blur-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-3 z-50"
            >
              {/* Glass Reflection Shine */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.01] via-white/[0.03] to-white/[0.08] rounded-[28px] overflow-hidden" />
              
              {/* Header with Back button */}
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/[0.08] relative z-10 px-1">
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">More Options</span>
                <button 
                  onClick={() => setMobileMoreOpen(false)}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 relative z-10">
                {/* Pricing */}
                <button
                  onClick={() => {
                    router.push("/pricing");
                    setMobileMoreOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <CreditCard size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-white font-sans">Pricing</span>
                    <span className="text-[8px] text-white/40 font-medium font-sans">View Plans</span>
                  </div>
                </button>

                {/* DOCX */}
                <button
                  onClick={() => {
                    router.push("/docx");
                    setMobileMoreOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <BookOpen size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-white font-sans">DOCX</span>
                    <span className="text-[8px] text-white/40 font-medium font-sans">Documentation</span>
                  </div>
                </button>

                {/* Support */}
                <button
                  onClick={() => {
                    router.push("/support");
                    setMobileMoreOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <MessageSquare size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-white font-sans">Support</span>
                    <span className="text-[8px] text-white/40 font-medium font-sans">Help Center</span>
                  </div>
                </button>

                {/* Sign In */}
                <button
                  onClick={() => {
                    router.push("/login");
                    setMobileMoreOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <LogIn size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-white font-sans">Sign In</span>
                    <span className="text-[8px] text-white/40 font-medium font-sans">Access Account</span>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        <h1 className="text-white text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.9] max-w-6xl">
          Free Your AI Data
        </h1>
        <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter leading-[0.9] max-w-6xl mt-2 bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
          Unified Import & Export
        </h1>

        <p className="text-white/40 text-base md:text-xl max-w-2xl mx-auto leading-relaxed mt-8">
          Break out of vendor lock-in. Seamlessly import your chat history from ChatGPT, Claude, Gemini, and Grok into a single, searchable, and exportable intelligence hub.
        </p>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap justify-center items-center gap-4">
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
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
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
              { step: "01", icon: Upload, title: "Universal Import", desc: "Upload raw zip exports from ChatGPT, Claude, or Gemini. CORTEX auto-detects the provider format, normalizes your data into a unified canonical schema, and seamlessly handles deduplication." },
              { step: "02", icon: Search, title: "Discover & Analyze", desc: "Search across all platforms instantly. Hybrid search combines PostgreSQL full-text, pgvector semantic embeddings, and BM25 reranking to find any thought you've ever had." },
              { step: "03", icon: Download, title: "Platform-Agnostic Export", desc: "Re-export your unified data to universal Markdown or JSON zip bundles at any time. Take your knowledge anywhere without being locked into a single provider's format." },
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
              { name: "Solo Developer", desc: "Uses 3+ AI tools daily. Needs semantic search, local AI, zero cloud dependency. docker compose up → searchable in 15 min.", icon: "🧑‍💻" },
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
