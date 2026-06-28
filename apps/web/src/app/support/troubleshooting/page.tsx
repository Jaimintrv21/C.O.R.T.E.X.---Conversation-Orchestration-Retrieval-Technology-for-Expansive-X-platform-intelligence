"use client";

import Link from "next/link";
import { ArrowLeft, Terminal, ChevronRight } from "lucide-react";
import { WebGLShader } from "@/components/ui/web-gl-shader";
import { motion } from "framer-motion";

export default function TroubleshootingPage() {
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
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
            <Terminal size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">Troubleshooting</h1>
            <p className="text-white/40 mt-2 text-lg">Common issues, error codes, and debugging steps.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="flex flex-col gap-4 border-r border-white/[0.08] pr-8 hidden md:flex">
                <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">Topics</h3>
                <ul className="flex flex-col gap-3 text-sm text-white/50 font-medium">
                    <li className="hover:text-white cursor-pointer text-amber-400">Docker Issues</li>
                    <li className="hover:text-white cursor-pointer">Ollama Connection</li>
                    <li className="hover:text-white cursor-pointer">Import Failures</li>
                    <li className="hover:text-white cursor-pointer">Sync Errors</li>
                </ul>
            </div>
            
            {/* Main content */}
            <div className="md:col-span-3 flex flex-col gap-6">
                {[
                  {
                    code: "ERR_OLLAMA_TIMEOUT",
                    title: "Local Ollama Node Not Responding",
                    desc: "This occurs when the gateway fails to connect to localhost:11434. Ensure that the Ollama service is running and not blocked by firewall rules."
                  },
                  {
                    code: "IMPORT_PARSE_FAIL",
                    title: "ChatGPT JSON Import Failure",
                    desc: "If your conversations.json file is over 500MB, the browser parser might run out of memory. Learn how to use the CLI chunking tool."
                  },
                  {
                    code: "DB_SYNC_CONFLICT",
                    title: "Cloud Sync Conflict Detected",
                    desc: "When editing an artifact offline and online simultaneously, CORTEX creates a sync conflict. See how to resolve version mismatch via the UI."
                  }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-6 md:p-8 rounded-[28px] bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.15] backdrop-blur-md transition-all group cursor-pointer"
                  >
                      <div className="inline-block px-2.5 py-1 rounded bg-amber-400/10 text-amber-400 font-mono text-[10px] uppercase tracking-wider mb-3">
                        {item.code}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">{item.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed mb-5">{item.desc}</p>
                      <button className="text-amber-400 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        View Solution <ChevronRight size={14} />
                      </button>
                  </motion.div>
                ))}
            </div>
        </div>
      </div>
    </main>
  );
}
