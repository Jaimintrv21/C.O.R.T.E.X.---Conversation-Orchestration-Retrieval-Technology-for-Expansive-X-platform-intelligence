'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, X } from 'lucide-react';
import { popIn } from '@/lib/motion';

const nodeTypes = [
  { label: 'Concept', color: '#6C63FF' },
  { label: 'Person', color: '#00D2FF' },
  { label: 'Tool', color: '#FF6584' },
  { label: 'Decision', color: '#00D97E' },
  { label: 'Insight', color: '#FFBC00' },
];

export default function KnowledgeGraphPage() {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(nodeTypes.map(n => n.label)));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const toggleType = (label: string) => {
    const next = new Set(activeTypes);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setActiveTypes(next);
  };

  return (
    <div className="flex flex-col gap-[16px] h-[calc(100vh-140px)] min-h-[600px]">
      
      <h1 className="text-2xl font-bold text-white px-[8px] flex-shrink-0">Knowledge Graph</h1>

      <div className="w-full h-full rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden relative shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        
        {/* Mock Canvas Area */}
        <div 
          className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
          onClick={() => setSelectedNode(null)}
        >
          {/* Decorative background grid */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          {/* Mock Node to click */}
          <div 
            onClick={(e) => { e.stopPropagation(); setSelectedNode('node-1'); }}
            className="w-[64px] h-[64px] rounded-full bg-[#6C63FF]/20 border-2 border-[#6C63FF] shadow-[0_0_30px_rgba(108,99,255,0.4)] flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 z-10"
          >
            <span className="text-white text-xs font-bold">React</span>
          </div>
          {/* Mock lines */}
          <div className="absolute top-1/2 left-1/2 w-[150px] h-[2px] bg-white/[0.1] -rotate-45 transform origin-left" />
          <div className="absolute top-1/2 left-1/2 w-[200px] h-[2px] bg-white/[0.1] rotate-12 transform origin-left" />
        </div>

        {/* Top-left controls */}
        <div className="absolute top-[24px] left-[24px] flex items-center gap-[8px] z-20">
          {[ZoomIn, ZoomOut, RotateCcw, Maximize].map((Icon, i) => (
            <button key={i} className="w-[36px] h-[36px] rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] flex items-center justify-center text-white/70 hover:bg-white/[0.14] hover:text-white hover:scale-[1.08] active:scale-[0.95] transition-all duration-150">
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Top-right filters */}
        <div className="absolute top-[24px] right-[24px] flex items-center gap-[8px] flex-wrap justify-end max-w-[400px] z-20">
          {nodeTypes.map(type => {
            const isActive = activeTypes.has(type.label);
            return (
              <button
                key={type.label}
                onClick={() => toggleType(type.label)}
                className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-full border text-xs font-medium transition-all duration-200 backdrop-blur-md"
                style={{
                  backgroundColor: isActive ? `${type.color}33` : 'rgba(255,255,255,0.05)',
                  borderColor: isActive ? `${type.color}80` : 'rgba(255,255,255,0.1)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: isActive ? type.color : 'rgba(255,255,255,0.3)' }} />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Popup Card */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-1/2 left-1/2 ml-[40px] -mt-[60px] z-30 rounded-[18px] backdrop-blur-2xl bg-[#12121A]/90 border border-white/[0.12] p-[16px] shadow-[0_16px_40px_rgba(0,0,0,0.5)] min-w-[240px]"
            >
              <div className="flex items-start justify-between mb-[12px]">
                <div>
                  <div className="flex items-center gap-[6px] mb-[4px]">
                    <div className="w-[8px] h-[8px] rounded-full bg-[#6C63FF]" />
                    <span className="text-[10px] uppercase tracking-wider text-[#6C63FF] font-bold">Concept</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">React</h3>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-[24px] h-[24px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm text-white/70 mb-[16px] leading-relaxed">
                A JavaScript library for building user interfaces. Commonly discussed with Next.js and State Management.
              </p>
              <div className="flex items-center justify-between text-xs text-white/40 pt-[12px] border-t border-white/[0.08]">
                <span>Mentioned in 42 convos</span>
                <button className="text-[#00D2FF] hover:underline">View all →</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
