"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Code, Cpu, Database, Network } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { useAppearance } from "@/hooks/useAppearance";

export default function DocsPage() {
  const { accentColor } = useAppearance();
  const githubUrl = "https://github.com/Jaimintrv21/C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence";
  const sections = [
    { title: "Getting Started", icon: BookOpen, desc: "Installation, environment setup, and architecture overview.", link: githubUrl },
    { title: "Document Skills (docx, pdf, pptx)", icon: FileText, desc: "How to leverage Anthropic's document capabilities for parsing advanced file formats.", link: githubUrl },
    { title: "API Reference", icon: Code, desc: "FastAPI endpoint definitions and websocket streaming interfaces.", link: githubUrl },
    { title: "Knowledge Graph", icon: Network, desc: "Entity extraction pipeline and D3 graph visualization concepts.", link: githubUrl },
    { title: "Vector Indexing", icon: Database, desc: "pgvector configuration, BM25 reranking, and semantic search queries.", link: githubUrl },
    { title: "AI Providers", icon: Cpu, desc: "Configuration for OpenAI, Anthropic, Gemini, and local Ollama instances.", link: githubUrl },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <WebGLShader />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        <div className="mb-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary mb-6 shadow-[0_0_30px_rgba(var(--accent-rgb),0.15)]">
            <BookOpen size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">C.O.R.T.E.X. Documentation</h1>
          <p className="text-lg text-white/60 leading-relaxed">
            Everything you need to orchestrate your AI conversations, integrate advanced document parsing (docx, pdf), and manage your intelligence pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, idx) => (
            <a key={idx} href={section.link} target="_blank" rel="noopener noreferrer" className="group p-6 rounded-3xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/70 mb-6 group-hover:bg-[#00D2FF]/10 group-hover:text-[#00D2FF] group-hover:border-[#00D2FF]/30 transition-colors">
                <section.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white/90 group-hover:text-white">{section.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {section.desc}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
