'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  X, 
  MessageSquare, 
  Tag, 
  DownloadCloud, 
  Trash2,
  CheckCircle2,
  Circle,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { staggerList, listItem, slideUpBar } from '@/lib/motion';

const conversationsData = [
  { id: 'c1', title: 'React Server Components Architecture', preview: 'Discussing the optimal way to structure data fetching in Next.js 14...', provider: 'ChatGPT', brandColor: '#00D97E', tags: ['react', 'architecture'], time: '2h ago', timestamp: Date.now() - 2 * 60 * 60 * 1000, messages: 14 },
  { id: 'c2', title: 'Rust vs Go for Microservices', preview: 'A detailed comparison of memory safety and concurrency models between...', provider: 'Claude', brandColor: '#D97757', tags: ['backend', 'rust'], time: '5h ago', timestamp: Date.now() - 5 * 60 * 60 * 1000, messages: 32 },
  { id: 'c3', title: 'Q4 Marketing Copy Generation', preview: 'Drafting emails for the upcoming Black Friday campaign targeting...', provider: 'Gemini', brandColor: '#4A90E2', tags: ['marketing'], time: '1d ago', timestamp: Date.now() - 24 * 60 * 60 * 1000, messages: 8 },
  { id: 'c4', title: 'Database Schema for E-commerce', preview: 'Designing a normalized schema for products, variants, and orders...', provider: 'ChatGPT', brandColor: '#00D97E', tags: ['database', 'sql'], time: '2d ago', timestamp: Date.now() - 48 * 60 * 60 * 1000, messages: 21 },
  { id: 'c5', title: 'Explaining Quantum Computing', preview: 'Can you explain quantum entanglement to a 10 year old using analogies...', provider: 'Perplexity', brandColor: '#21A0A0', tags: ['physics'], time: '3d ago', timestamp: Date.now() - 72 * 60 * 60 * 1000, messages: 5 },
];

export default function ConversationsPage() {
  const [conversations, setConversations] = useState(conversationsData);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering & Sorting State
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'messages' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [isFilterOpen, setIsFilterOpen] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Filter & Sort Logic
  const filteredAndSortedConversations = useMemo(() => {
    let result = conversations.filter(conv => {
      const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            conv.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            conv.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesProvider = selectedProvider ? conv.provider === selectedProvider : true;
      return matchesSearch && matchesProvider;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.timestamp - b.timestamp;
      } else if (sortBy === 'messages') {
        comparison = a.messages - b.messages;
      } else if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [conversations, searchQuery, selectedProvider, sortBy, sortOrder]);

  const toggleSort = (type: 'date' | 'messages' | 'title') => {
    if (sortBy === type) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex flex-col gap-[24px] relative pb-[100px] w-full max-w-[1200px] mx-auto">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[16px] px-[8px]">
        <div>
          <h1 className="text-2xl font-bold text-white">Conversations</h1>
          <p className="text-sm text-white/50">Browse, search, and manage synced conversation sessions.</p>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-[10px] h-[40px] px-[16px] rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 focus-within:bg-white/[0.08] focus-within:border-[#6C63FF]/50 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.15)] transition-all duration-300 w-full md:w-[320px]">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search title, preview, tags..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-white placeholder:text-white/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Filter & Sort controls */}
      <div className="flex flex-wrap items-center justify-between gap-[12px] px-[8px]">
        <div className="flex flex-wrap items-center gap-[8px]">
          {/* Provider Filter */}
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(isFilterOpen === 'provider' ? null : 'provider')}
              className="flex items-center gap-[6px] pl-[14px] pr-[10px] py-[6px] rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all"
            >
              {selectedProvider ? `Provider: ${selectedProvider}` : 'All Providers'}
              <ChevronDown size={12} className={`text-white/40 transition-transform ${isFilterOpen === 'provider' ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterOpen === 'provider' && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-[calc(100%+6px)] left-0 z-40 rounded-[16px] backdrop-blur-2xl bg-[#0F0F15]/95 border border-white/[0.1] p-[8px] shadow-2xl min-w-[160px]"
                >
                  <button 
                    onClick={() => { setSelectedProvider(null); setIsFilterOpen(null); }}
                    className="w-full text-left p-[8px] rounded-[10px] hover:bg-white/[0.06] text-xs text-white/90 transition-colors"
                  >
                    All Providers
                  </button>
                  {['ChatGPT', 'Claude', 'Gemini', 'Perplexity'].map((prov) => (
                    <button 
                      key={prov}
                      onClick={() => { setSelectedProvider(prov); setIsFilterOpen(null); }}
                      className="w-full text-left p-[8px] rounded-[10px] hover:bg-white/[0.06] text-xs text-white/90 transition-colors"
                    >
                      {prov}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-[8px] text-xs text-white/60">
          <span>Sort by:</span>
          <div className="flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] p-[3px]">
            {([
              { key: 'date', label: 'Date' },
              { key: 'messages', label: 'Messages' },
              { key: 'title', label: 'Alphabetical' }
            ] as const).map(opt => {
              const active = sortBy === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleSort(opt.key)}
                  className={`flex items-center gap-[4px] px-[12px] py-[5px] rounded-full transition-all font-medium ${
                    active 
                      ? 'bg-white/[0.08] text-white shadow-sm' 
                      : 'hover:text-white/90'
                  }`}
                >
                  {opt.label}
                  {active && <ArrowUpDown size={10} className="opacity-70" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List view */}
      {filteredAndSortedConversations.length > 0 ? (
        <motion.div 
          variants={staggerList}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-[8px]"
        >
          {filteredAndSortedConversations.map(conv => {
            const isSelected = selectedIds.has(conv.id);
            return (
              <motion.div
                key={conv.id}
                variants={listItem}
                onClick={() => toggleSelect(conv.id)}
                className={`rounded-[20px] p-[16px] backdrop-blur-md border hover:translate-x-[2px] transition-all duration-200 ease-out cursor-pointer flex items-center gap-[16px] group ${
                  isSelected 
                    ? 'bg-[#6C63FF]/[0.08] border-[#6C63FF]/35 shadow-[0_0_15px_rgba(108,99,255,0.08)]' 
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                }`}
              >
                <div className="flex-shrink-0 text-white/30 group-hover:text-white/60 transition-colors">
                  {isSelected ? <CheckCircle2 size={18} className="text-[#6C63FF]" /> : <Circle size={18} />}
                </div>
                
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-white/[0.08] flex-shrink-0" style={{ backgroundColor: `${conv.brandColor}15`, boxShadow: `0 0 12px ${conv.brandColor}30` }}>
                  <MessageSquare size={13} color={conv.brandColor} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[14px] text-white/95 font-medium truncate mb-[3px] group-hover:text-white transition-colors">{conv.title}</div>
                  <div className="text-[12px] text-white/40 truncate">{conv.preview}</div>
                </div>

                <div className="hidden md:flex items-center gap-[6px] flex-shrink-0">
                  {conv.tags.map(tag => (
                    <span key={tag} className="px-[9px] py-[3px] rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-white/50">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col items-end gap-[2px] flex-shrink-0 ml-[16px] w-[80px]">
                  <div className="text-[10px] text-white/40">{conv.time}</div>
                  <div className="text-[10px] px-[8px] py-[2px] rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50">{conv.messages} msgs</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-[80px] text-center gap-[12px] bg-white/[0.01] border border-dashed border-white/[0.08] rounded-[24px]">
          <MessageSquare className="text-white/20" size={40} />
          <div>
            <h3 className="text-sm font-semibold text-white/80">No conversations found</h3>
            <p className="text-xs text-white/40 mt-[2px]">Try refining your search query or provider filter.</p>
          </div>
        </div>
      )}

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

