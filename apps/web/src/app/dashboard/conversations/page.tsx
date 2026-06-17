'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  X, 
  MessageSquare, 
  Tag, 
  DownloadCloud, 
  Trash2,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { staggerList, listItem, slideUpBar } from '@/lib/motion';

const activeFilters = [
  { id: '1', label: 'ChatGPT', type: 'provider' },
  { id: '2', label: 'Last 7 Days', type: 'date' },
];

const conversations = [
  { id: 'c1', title: 'React Server Components Architecture', preview: 'Discussing the optimal way to structure data fetching in Next.js 14...', provider: 'ChatGPT', brandColor: '#00D97E', tags: ['react', 'architecture'], time: '2h ago', messages: 14 },
  { id: 'c2', title: 'Rust vs Go for Microservices', preview: 'A detailed comparison of memory safety and concurrency models between...', provider: 'Claude', brandColor: '#D97757', tags: ['backend', 'rust'], time: '5h ago', messages: 32 },
  { id: 'c3', title: 'Q4 Marketing Copy Generation', preview: 'Drafting emails for the upcoming Black Friday campaign targeting...', provider: 'Gemini', brandColor: '#4A90E2', tags: ['marketing'], time: '1d ago', messages: 8 },
  { id: 'c4', title: 'Database Schema for E-commerce', preview: 'Designing a normalized schema for products, variants, and orders...', provider: 'ChatGPT', brandColor: '#00D97E', tags: ['database', 'sql'], time: '2d ago', messages: 21 },
  { id: 'c5', title: 'Explaining Quantum Computing', preview: 'Can you explain quantum entanglement to a 10 year old using analogies...', provider: 'Perplexity', brandColor: '#21A0A0', tags: ['physics'], time: '3d ago', messages: 5 },
];

export default function ConversationsPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="flex flex-col gap-[32px] relative pb-[100px]">
      
      <div className="flex flex-col gap-[16px]">
        <h1 className="text-2xl font-bold text-white px-[8px]">Conversations</h1>
        
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-[10px]">
          {/* Dropdown Triggers */}
          {['All Providers', 'Date Range', 'Tags'].map((label, i) => (
            <div key={label} className="relative">
              <button 
                onClick={() => setIsFilterOpen(isFilterOpen === label ? null : label)}
                className="flex items-center gap-[6px] pl-[16px] pr-[12px] py-[8px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 focus:outline-none"
              >
                {label}
                <ChevronDown size={14} className={`text-white/50 transition-transform duration-200 ${isFilterOpen === label ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              <AnimatePresence>
                {isFilterOpen === label && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-[calc(100%+8px)] left-0 z-40 rounded-[16px] backdrop-blur-2xl bg-[#12121A]/90 border border-white/[0.1] p-[16px] shadow-2xl min-w-[200px]"
                  >
                    <div className="text-sm text-white/50 mb-[8px]">Select {label.toLowerCase()}...</div>
                    <div className="flex flex-col gap-[4px]">
                      {/* Placeholder items */}
                      <div className="p-[8px] rounded-[8px] hover:bg-white/[0.06] text-sm text-white/90 cursor-pointer transition-colors">Option 1</div>
                      <div className="p-[8px] rounded-[8px] hover:bg-white/[0.06] text-sm text-white/90 cursor-pointer transition-colors">Option 2</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Divider */}
          <div className="w-[1px] h-[24px] bg-white/[0.1] mx-[4px]" />

          {/* Active Filter Chips */}
          {activeFilters.map(filter => (
            <div key={filter.id} className="flex items-center gap-[6px] pl-[14px] pr-[8px] py-[6px] rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 text-xs text-[#a89fff]">
              {filter.label}
              <button className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-white/10 hover:text-white transition-all duration-200 hover:rotate-90">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <motion.div 
        variants={staggerList}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-[10px]"
      >
        {conversations.map(conv => {
          const isSelected = selectedIds.has(conv.id);
          return (
            <motion.div
              key={conv.id}
              variants={listItem}
              onClick={() => toggleSelect(conv.id)}
              className={`rounded-[16px] p-[16px] backdrop-blur-md border hover:translate-x-[2px] transition-all duration-250 ease-out cursor-pointer flex items-center gap-[16px] group ${
                isSelected 
                  ? 'bg-[#6C63FF]/[0.08] border-[#6C63FF]/40 shadow-[0_0_15px_rgba(108,99,255,0.1)]' 
                  : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex-shrink-0 text-white/40 group-hover:text-white/70 transition-colors">
                {isSelected ? <CheckCircle2 size={20} className="text-[#6C63FF]" /> : <Circle size={20} />}
              </div>
              
              <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center border border-white/[0.1] flex-shrink-0" style={{ backgroundColor: `${conv.brandColor}20`, boxShadow: `0 0 10px ${conv.brandColor}40` }}>
                <MessageSquare size={14} color={conv.brandColor} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-base text-white/90 font-medium truncate mb-[4px] group-hover:text-white transition-colors">{conv.title}</div>
                <div className="text-sm text-white/40 truncate">{conv.preview}</div>
              </div>

              <div className="hidden md:flex items-center gap-[6px] flex-shrink-0">
                {conv.tags.map(tag => (
                  <span key={tag} className="px-[10px] py-[4px] rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/60">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-col items-end gap-[4px] flex-shrink-0 ml-[16px] w-[80px]">
                <div className="text-[11px] text-white/40">{conv.time}</div>
                <div className="text-[11px] px-[8px] py-[2px] rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60">{conv.messages} msgs</div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            variants={slideUpBar}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed bottom-[24px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-[16px] px-[24px] py-[14px] rounded-full backdrop-blur-2xl bg-[#1A1A24]/90 border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          >
            <div className="text-sm font-medium text-white px-[8px]">
              {selectedIds.size} selected
            </div>
            
            <div className="w-[1px] h-[20px] bg-white/10" />

            <div className="flex items-center gap-[8px]">
              <button className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-transparent hover:bg-white/[0.1] hover:border-white/[0.15] text-sm text-white/80 transition-all duration-200">
                <Tag size={16} /> Tag
              </button>
              <button className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-transparent hover:bg-white/[0.1] hover:border-white/[0.15] text-sm text-white/80 transition-all duration-200">
                <DownloadCloud size={16} /> Export
              </button>
              <button className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-full bg-[#FF6584]/10 border border-transparent hover:bg-[#FF6584]/20 hover:border-[#FF6584]/30 text-sm text-[#FF6584] transition-all duration-200">
                <Trash2 size={16} /> Delete
              </button>
            </div>
            
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="ml-[8px] w-[28px] h-[28px] rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
