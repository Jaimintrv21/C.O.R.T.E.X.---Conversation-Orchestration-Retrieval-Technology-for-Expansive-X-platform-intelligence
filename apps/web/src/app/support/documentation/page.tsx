"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { motion } from "framer-motion";

export default function DocumentationPage() {
  return (
    <main className="relative min-h-screen bg-black text-white py-16 px-6 md:px-12 overflow-y-auto">
      <WebGLShader />
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-12">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/support" className="group flex items-center gap-2 text-xs font-semibold text-white/40 hover:text-white transition-colors w-fit bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-full backdrop-blur-md">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Support
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">CORTEX</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 border-b border-white/[0.08] pb-10">
          <div className="w-16 h-16 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center text-[#6C63FF] shrink-0">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">Documentation</h1>
            <p className="text-white/40 mt-2 text-lg">Comprehensive guides, tutorials, and API references.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar / Table of contents */}
            <div className="flex flex-col gap-4 border-r border-white/[0.08] pr-8 hidden md:flex">
                <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Categories</h3>
                <ul className="flex flex-col gap-3 text-sm text-white/50 font-medium">
                    <li className="hover:text-white cursor-pointer text-[#6C63FF]">Getting Started</li>
                    <li className="hover:text-white cursor-pointer">Core Architecture</li>
                    <li className="hover:text-white cursor-pointer">API Reference</li>
                    <li className="hover:text-white cursor-pointer">Local Deployment</li>
                    <li className="hover:text-white cursor-pointer">Integrations</li>
                </ul>
            </div>
            
            {/* Main content placeholder */}
            <div className="md:col-span-3 flex flex-col gap-6">
                {[
                  {
                    title: "Getting Started with CORTEX",
                    desc: "Learn how to install and configure CORTEX locally using Docker Compose, set up your first workspace, and import your existing AI conversations."
                  },
                  {
                    title: "Architecture Overview",
                    desc: "Deep dive into the hybrid search system, pgvector embeddings, and how the local Firestore knowledge graph maps semantic entities."
                  },
                  {
                    title: "API Reference (v1.0)",
                    desc: "Complete documentation for the CORTEX REST API. Learn how to pragmatically import conversations, run semantic searches, and query the graph database."
                  },
                  {
                    title: "Model Compare Mode Guide",
                    desc: "How to run side-by-side prompt tests using Local Ollama and Cloud LLMs simultaneously with our benchmark utilities."
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 md:p-8 rounded-[28px] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.15] backdrop-blur-md transition-all group cursor-pointer"
                  >
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#6C63FF] transition-colors">{item.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed mb-5">{item.desc}</p>
                      <button className="text-[#6C63FF] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Read Guide <ChevronRight size={14} />
                      </button>
                  </motion.div>
                ))}
            </div>
        </div>
      </div>
    </main>
  );
}
