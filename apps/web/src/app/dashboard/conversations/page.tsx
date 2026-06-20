'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  X,
  MessageSquare,
  Tag,
  DownloadCloud,
  Trash2,
  CheckCircle2,
  Circle,
  Search,
  ArrowUpDown,
  User,
  Bot,
} from 'lucide-react';
import { conversations as conversationsApi } from '@/lib/api';
import { staggerList, listItem, slideUpBar } from '@/lib/motion';

type Conversation = {
  id: string;
  title: string;
  summary?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
  tags?: string[] | null;
  topics?: string[] | null;
  message_count?: number;
  updated_at?: string;
  created_at?: string;
  preview?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
};

const providerColors: Record<string, string> = {
  chatgpt: '#00D97E',
  claude: '#D97757',
  gemini: '#4A90E2',
  grok: '#FF6584',
  perplexity: '#FFBC00',
};

const getProviderColor = (slug?: string | null) =>
  providerColors[(slug || '').toLowerCase()] || '#6C63FF';

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'messages' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFilterOpen, setIsFilterOpen] = useState<string | null>(null);

  // Detail view state
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  useEffect(() => {
    let alive = true;
    conversationsApi.list(undefined, 100).then((res) => {
      if (!alive) return;
      setConversations((res.data ?? []) as Conversation[]);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    conversationsApi.messages(activeConvId).then((res) => {
      setMessages((res.data ?? []) as MessageRow[]);
      setIsLoadingMessages(false);
    });
  }, [activeConvId]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId],
  );

  const filteredAndSortedConversations = useMemo(() => {
    const result = conversations.filter((conv) => {
      const searchable = [
        conv.title,
        conv.summary,
        conv.preview,
        ...(conv.tags || []),
        ...(conv.topics || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = searchable.includes(searchQuery.toLowerCase());
      const provider = conv.provider_name || conv.provider_slug || '';
      const matchesProvider = selectedProvider ? provider === selectedProvider : true;
      return matchesSearch && matchesProvider;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime();
      } else if (sortBy === 'messages') {
        comparison = (a.message_count || 0) - (b.message_count || 0);
      } else if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [conversations, searchQuery, selectedProvider, sortBy, sortOrder]);

  const toggleSort = (type: 'date' | 'messages' | 'title') => {
    if (sortBy === type) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(type);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex gap-[20px] w-full h-[calc(100vh-140px)] min-h-[600px]">
      {/* Left Panel — Conversation List */}
      <div className={`flex flex-col gap-[16px] ${activeConvId ? 'hidden lg:flex' : 'flex'} w-full lg:w-[420px] lg:flex-shrink-0 overflow-hidden`}>
        {/* Header */}
        <div className="flex flex-col gap-[12px] px-[8px]">
          <div>
            <h1 className="text-2xl font-bold text-white">Conversations</h1>
            <p className="text-sm text-white/50">Browse, search, and manage synced conversation sessions.</p>
          </div>

          {/* Search */}
          <div className="flex items-center gap-[10px] h-[40px] px-[16px] rounded-full bg-white/[0.04] border border-white/[0.08] text-white/40 focus-within:bg-white/[0.08] focus-within:border-[#6C63FF]/50 focus-within:shadow-[0_0_0_3px_rgba(108,99,255,0.15)] transition-all duration-300">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search title, summary, tags..."
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

        {/* Filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-[8px] px-[8px]">
          {/* Provider filter */}
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
                  <button onClick={() => { setSelectedProvider(null); setIsFilterOpen(null); }} className="w-full text-left p-[8px] rounded-[10px] hover:bg-white/[0.06] text-xs text-white/90 transition-colors">
                    All Providers
                  </button>
                  {Array.from(new Set(conversations.map((c) => c.provider_name || c.provider_slug).filter(Boolean))).map((prov) => (
                    <button
                      key={prov as string}
                      onClick={() => { setSelectedProvider(prov as string); setIsFilterOpen(null); }}
                      className="w-full text-left p-[8px] rounded-[10px] hover:bg-white/[0.06] text-xs text-white/90 transition-colors"
                    >
                      {prov}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort pills */}
          <div className="flex items-center gap-[6px] text-xs text-white/60">
            <div className="flex items-center rounded-full bg-white/[0.03] border border-white/[0.08] p-[3px]">
              {([
                { key: 'date', label: 'Date' },
                { key: 'title', label: 'A-Z' },
              ] as const).map((opt) => {
                const active = sortBy === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleSort(opt.key)}
                    className={`flex items-center gap-[4px] px-[10px] py-[4px] rounded-full transition-all font-medium ${active ? 'bg-white/[0.08] text-white shadow-sm' : 'hover:text-white/90'}`}
                  >
                    {opt.label}
                    {active && <ArrowUpDown size={10} className="opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-[4px]">
          {filteredAndSortedConversations.length > 0 ? (
            <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col gap-[6px]">
              {filteredAndSortedConversations.map((conv) => {
                const isActive = activeConvId === conv.id;
                const accent = getProviderColor(conv.provider_slug);
                return (
                  <motion.div
                    key={conv.id}
                    variants={listItem}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`rounded-[16px] p-[14px] border transition-all duration-200 ease-out cursor-pointer flex items-center gap-[12px] group ${
                      isActive
                        ? 'bg-gradient-to-r from-[#6C63FF]/[0.08] to-[#00D2FF]/[0.04] border-[#6C63FF]/35 shadow-[0_0_15px_rgba(108,99,255,0.08)]'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    }`}
                  >
                    <div
                      className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}60` }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white/95 font-medium truncate group-hover:text-white transition-colors">
                        {conv.title}
                      </div>
                      <div className="text-[11px] text-white/40 truncate mt-[2px]">
                        {conv.summary || conv.preview || 'No preview available.'}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-[2px] flex-shrink-0 text-right">
                      <span className="text-[10px] text-white/30">
                        {formatRelativeTime(conv.updated_at || conv.created_at)}
                      </span>
                      <span className="text-[10px] px-[6px] py-[1px] rounded-full bg-white/[0.06] text-white/50">
                        {conv.message_count || 0} msgs
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        conversationsApi.delete(conv.id).then(() => {
                          setConversations((c) => c.filter((item) => item.id !== conv.id));
                          if (activeConvId === conv.id) setActiveConvId(null);
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 w-[24px] h-[24px] rounded-full flex items-center justify-center text-white/30 hover:text-[#FF6584] hover:bg-[#FF6584]/10 transition-all flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
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
        </div>
      </div>

      {/* Right Panel — Detail / Message Thread */}
      <div className={`flex-1 ${activeConvId ? 'flex' : 'hidden lg:flex'} flex-col rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden min-w-0`}>
        {activeConversation ? (
          <>
            {/* Detail Header */}
            <div className="px-[24px] py-[16px] border-b border-white/[0.08] flex items-center gap-[12px] flex-shrink-0 bg-white/[0.01]">
              <button
                onClick={() => setActiveConvId(null)}
                className="lg:hidden w-[32px] h-[32px] rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <div
                className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                style={{ backgroundColor: getProviderColor(activeConversation.provider_slug), boxShadow: `0 0 8px ${getProviderColor(activeConversation.provider_slug)}60` }}
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-white/90 truncate">
                  {activeConversation.title}
                </h2>
                <div className="flex items-center gap-[8px] text-[11px] text-white/45 mt-[2px]">
                  <span className="uppercase font-medium tracking-wider text-[9px] px-[6px] py-[1px] rounded-full bg-white/[0.05]">
                    {activeConversation.provider_name || activeConversation.provider_slug || 'Unknown'}
                  </span>
                  <span>{activeConversation.message_count || 0} messages</span>
                  <span>{formatRelativeTime(activeConversation.updated_at || activeConversation.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-[24px] py-[20px] custom-scrollbar">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full text-white/40 text-sm">
                  Loading messages...
                </div>
              ) : messages.length > 0 ? (
                <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-[16px]">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      variants={listItem}
                      className={`flex gap-[12px] max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`w-[28px] h-[28px] rounded-full flex-shrink-0 flex items-center justify-center border ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[#6C63FF]/20 to-[#00D2FF]/20 border-[#6C63FF]/30'
                            : 'bg-white/[0.04] border-white/[0.08]'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User size={12} className="text-white/70" />
                        ) : (
                          <Bot size={12} className="text-[#00D2FF]" />
                        )}
                      </div>

                      <div
                        className={`px-[16px] py-[10px] text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[#6C63FF]/15 to-[#00D2FF]/10 border border-[#6C63FF]/20 rounded-[20px_20px_4px_20px] text-white/95'
                            : 'bg-white/[0.03] border border-white/[0.06] rounded-[20px_20px_20px_4px] text-white/90'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-[9px] text-white/30 block mt-[4px] text-right">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-[8px]">
                  <MessageSquare size={32} className="text-white/15" />
                  <p className="text-sm text-white/40">No messages in this conversation.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center gap-[12px] p-[32px]">
            <div className="w-[64px] h-[64px] rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <MessageSquare size={28} className="text-white/20" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/80">Select a conversation</h3>
              <p className="text-xs text-white/40 mt-[4px] max-w-[300px] mx-auto">
                Click any conversation from the list to view its full message thread.
              </p>
            </div>
          </div>
        )}
      </div>

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
            <div className="text-sm font-medium text-white px-[8px]">{selectedIds.size} selected</div>
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
