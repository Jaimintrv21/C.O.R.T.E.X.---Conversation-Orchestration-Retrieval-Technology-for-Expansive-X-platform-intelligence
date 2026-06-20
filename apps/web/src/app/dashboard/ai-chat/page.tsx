'use client';

import { type MouseEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  Bot,
  Clock,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { conversations as conversationsApi } from '@/lib/api';
import { listItem, staggerList } from '@/lib/motion';

type ConversationRow = {
  id: string;
  title?: string | null;
  provider_slug?: string | null;
  provider_name?: string | null;
  preview?: string | null;
  message_count?: number;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
  updated_at?: string | null;
};

type ChatTurnResponse = {
  conversation: ConversationRow;
  user_message: MessageRow;
  assistant_message: MessageRow;
};

const providerChoices = [
  { slug: 'chatgpt', label: 'ChatGPT', accent: '#00D97E' },
  { slug: 'claude', label: 'Claude', accent: '#D97757' },
] as const;

const providerLabel = (slug?: string | null, name?: string | null) => {
  if (name) return name;
  if (!slug) return 'Unknown';
  return providerChoices.find((item) => item.slug === slug)?.label ?? slug;
};

const providerAccent = (slug?: string | null) =>
  providerChoices.find((item) => item.slug === slug)?.accent ?? '#00D97E';

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function AiChatPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [composerProvider, setComposerProvider] = useState<'chatgpt' | 'claude'>('chatgpt');
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | 'chatgpt' | 'claude'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [inputText, setInputText] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  const activeColor = providerAccent(activeConversation?.provider_slug ?? composerProvider);
  const activeLabel = providerLabel(activeConversation?.provider_slug ?? composerProvider, activeConversation?.provider_name);

  const loadConversations = async (preferredActiveId?: string) => {
    setIsLoadingConversations(true);
    setErrorMessage(null);
    try {
      const response = await conversationsApi.list(undefined, 200);
      const rows = (response.data ?? []) as ConversationRow[];
      setConversations(rows);
      const nextActiveId = preferredActiveId && rows.some((item) => item.id === preferredActiveId)
        ? preferredActiveId
        : rows[0]?.id ?? '';
      if (nextActiveId) {
        setActiveId(nextActiveId);
      } else {
        setActiveId('');
        setMessages([]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load conversations.');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    setErrorMessage(null);
    try {
      const response = await conversationsApi.messages(conversationId);
      setMessages((response.data ?? []) as MessageRow[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load messages.');
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeId) {
      loadMessages(activeId);
      const active = conversations.find((item) => item.id === activeId);
      if (active?.provider_slug === 'claude' || active?.provider_name === 'Claude') {
        setComposerProvider('claude');
      } else {
        setComposerProvider('chatgpt');
      }
    }
  }, [activeId]);

  const filteredAndSortedConversations = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter((conversation) => {
      const searchable = [
        conversation.title,
        conversation.preview,
        conversation.provider_name,
        conversation.provider_slug,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = searchable.includes(query);
      const matchesProvider =
        providerFilter === 'all' ? true : (conversation.provider_slug || '').toLowerCase() === providerFilter;
      return matchesSearch && matchesProvider;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      } else {
        comparison = new Date(a.updated_at || a.created_at || 0).getTime() - new Date(b.updated_at || b.created_at || 0).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [conversations, searchQuery, providerFilter, sortBy, sortOrder]);

  const toggleSort = (type: 'date' | 'title') => {
    if (sortBy === type) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(type);
    setSortOrder('desc');
  };

  const createConversation = async () => {
    const response = await conversationsApi.create({
      title: 'New Chat',
      provider_slug: composerProvider,
      metadata: { source: 'dashboard-ai-chat' },
    });
    const created = response.data as ConversationRow | null;
    if (!created) {
      throw new Error('Unable to create conversation.');
    }
    setConversations((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    setActiveId(created.id);
    return created.id;
  };

  const handleNewChat = async () => {
    setErrorMessage(null);
    try {
      await createConversation();
      setInputText('');
      setMessages([]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create conversation.');
    }
  };

  const handleSelectConversation = (conversation: ConversationRow) => {
    setActiveId(conversation.id);
    setComposerProvider((conversation.provider_slug as 'chatgpt' | 'claude' | undefined) ?? 'chatgpt');
  };

  const handleDeleteConversation = async (event: MouseEvent, id: string) => {
    event.stopPropagation();
    try {
      await conversationsApi.delete(id);
      const nextConversations = conversations.filter((conversation) => conversation.id !== id);
      setConversations(nextConversations);
      if (activeId === id) {
        const nextActive = nextConversations[0]?.id ?? '';
        setActiveId(nextActive);
        if (nextActive) {
          await loadMessages(nextActive);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete conversation.');
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = inputText.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      let conversationId = activeId;
      if (!conversationId) {
        conversationId = await createConversation();
      }

      const response = await conversationsApi.sendMessage(conversationId, {
        content,
        provider_slug: composerProvider,
      });
      const turn = response.data as ChatTurnResponse | null;
      if (!turn) {
        throw new Error('Message send failed.');
      }

      setMessages((current) => [...current, turn.user_message, turn.assistant_message]);
      setConversations((current) => [
        turn.conversation,
        ...current.filter((conversation) => conversation.id !== turn.conversation.id),
      ]);
      setActiveId(turn.conversation.id);
      setInputText('');
      await loadConversations(turn.conversation.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-[20px] w-full max-w-[1400px] mx-auto h-[calc(100vh-140px)] min-h-[620px]">
      <div className="flex flex-col lg:flex-row gap-[20px] h-full items-stretch">
        <div className="flex-1 flex flex-col rounded-[32px] backdrop-blur-3xl bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-w-0">
          <div className="px-[24px] py-[16px] border-b border-white/[0.08] flex items-center justify-between flex-shrink-0 bg-white/[0.01] gap-[16px]">
            <div className="flex items-center gap-[12px] min-w-0">
              <div
                className="w-[40px] h-[40px] rounded-2xl flex items-center justify-center border transition-all duration-300"
                style={{
                  backgroundColor: `${activeColor}15`,
                  borderColor: `${activeColor}30`,
                  boxShadow: `0 0 15px ${activeColor}22`,
                }}
              >
                <Bot size={20} color={activeColor} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-white/90 truncate">
                  {activeConversation?.title || 'New Chat Session'}
                </h2>
                <p className="text-[11px] text-white/45 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Firebase conversation store
                </p>
              </div>
            </div>

            <div className="flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] p-[3px] shadow-inner">
              {providerChoices.map((provider) => (
                <button
                  key={provider.slug}
                  onClick={() => setComposerProvider(provider.slug)}
                  className={`flex items-center gap-[6px] px-[14px] py-[6px] rounded-full text-xs font-semibold tracking-wide transition-all ${
                    composerProvider === provider.slug
                      ? 'bg-white/[0.12] text-white border border-white/[0.14]'
                      : 'text-white/40 hover:text-white/75'
                  }`}
                >
                  <span className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: provider.accent }} />
                  {provider.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-[24px] py-[20px] space-y-[20px] custom-scrollbar bg-black/10">
            {isLoadingMessages && activeConversation ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-[32px] space-y-[16px]">
                <div
                  className="w-[64px] h-[64px] rounded-3xl flex items-center justify-center border animate-pulse"
                  style={{
                    backgroundColor: `${activeColor}08`,
                    borderColor: `${activeColor}25`,
                  }}
                >
                  <Sparkles size={28} color={activeColor} />
                </div>
                <div className="text-sm text-white/60">Loading message history...</div>
              </div>
            ) : messages.length > 0 ? (
              <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-[20px]">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    variants={listItem}
                    className={`flex gap-[16px] max-w-[85%] ${
                      message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    <div
                      className={`w-[32px] h-[32px] rounded-full flex-shrink-0 flex items-center justify-center text-white border ${
                        message.role === 'user'
                          ? 'bg-white/[0.05] border-white/[0.1]'
                          : 'border-white/[0.08]'
                      }`}
                      style={message.role === 'assistant' ? { backgroundColor: `${activeColor}15`, borderColor: `${activeColor}20` } : {}}
                    >
                      {message.role === 'user' ? (
                        <User size={14} className="text-white/70" />
                      ) : (
                        <Bot size={14} color={activeColor} />
                      )}
                    </div>

                    <div
                      className={`rounded-[20px] px-[18px] py-[12px] text-[14px] leading-relaxed relative ${
                        message.role === 'user'
                          ? 'bg-white/[0.06] border border-white/[0.1] rounded-tr-none text-white/95'
                          : 'bg-white/[0.02] border border-white/[0.06] rounded-tl-none text-white/90 shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap selection:bg-white/25">{message.content}</p>
                      <span className="text-[9px] text-white/30 block mt-[6px] text-right">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}

                {isSending && (
                  <div className="flex gap-[16px] max-w-[85%] mr-auto items-center">
                    <div
                      className="w-[32px] h-[32px] rounded-full flex-shrink-0 flex items-center justify-center border"
                      style={{ backgroundColor: `${activeColor}15`, borderColor: `${activeColor}20` }}
                    >
                      <Bot size={14} color={activeColor} />
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-[20px] rounded-tl-none px-[20px] py-[14px] flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-[32px] space-y-[16px]">
                <div
                  className="w-[64px] h-[64px] rounded-3xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `${activeColor}08`,
                    borderColor: `${activeColor}25`,
                    boxShadow: `0 0 25px ${activeColor}22`,
                  }}
                >
                  <Sparkles size={28} color={activeColor} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white/90">
                    {activeConversation ? 'Start a message thread' : 'Create your first chat'}
                  </h3>
                  <p className="text-xs text-white/40 mt-1 max-w-[340px] mx-auto">
                    Conversations and replies are now stored in Firestore, so the UI reflects real backend data instead of demo content.
                  </p>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-[20px] border-t border-white/[0.08] bg-white/[0.01] flex-shrink-0 flex items-center gap-[12px]">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-[38px] h-[38px] rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] flex items-center justify-center text-white/50 hover:text-white transition-all"
              title="Start new chat"
            >
              <Plus size={15} />
            </button>

            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                placeholder={`Message ${activeLabel}...`}
                className="w-full h-[42px] pl-[18px] pr-[18px] rounded-full bg-white/[0.04] border border-white/[0.08] outline-none text-[13px] text-white placeholder:text-white/30 focus:bg-white/[0.07] focus:border-[#6C63FF]/50 transition-all duration-300"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white/90 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${activeColor}, #00D2FF)`,
                boxShadow: inputText.trim() && !isSending ? `0 0 15px ${activeColor}33` : 'none',
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>

        <div className="w-full lg:w-[320px] rounded-[32px] backdrop-blur-3xl bg-white/[0.03] border border-white/[0.08] p-[20px] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden shrink-0">
          <div className="flex items-center justify-between pb-[16px] border-b border-white/[0.08] flex-shrink-0">
            <div className="flex items-center gap-[8px]">
              <MessageSquare size={16} className="text-[#00D2FF]" />
              <h3 className="font-semibold text-sm text-white">Chat History</h3>
            </div>

            <button
              onClick={handleNewChat}
              className="w-[28px] h-[28px] rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
              title="Start New Chat"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="my-[12px] flex items-center gap-[8px] h-[36px] px-[12px] rounded-full bg-white/[0.03] border border-white/[0.06] text-white/40 focus-within:bg-white/[0.06] focus-within:border-white/[0.12] transition-all flex-shrink-0">
            <Search size={13} />
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs text-white placeholder:text-white/30"
            />
          </div>

          <div className="flex flex-col gap-[10px] pb-[12px] border-b border-white/[0.08] flex-shrink-0">
            <div className="flex gap-[4px] flex-wrap">
              {(['all', 'chatgpt', 'claude'] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => setProviderFilter(provider)}
                  className={`px-[10px] py-[4px] rounded-full text-[10px] font-medium transition-all ${
                    providerFilter === provider
                      ? 'bg-white/[0.08] border border-white/[0.15] text-white'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {provider === 'all' ? 'All' : providerLabel(provider)}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] text-white/40 pt-[2px]">
              <span>
                Sort: <strong className="text-white/60">{sortBy === 'date' ? 'Date' : 'Title'} ({sortOrder === 'desc' ? 'Desc' : 'Asc'})</strong>
              </span>

              <div className="flex items-center gap-[4px]">
                <button
                  onClick={() => toggleSort('date')}
                  className={`px-[6px] py-[2px] rounded hover:bg-white/[0.05] transition-colors flex items-center gap-1 ${
                    sortBy === 'date' ? 'text-white/80 font-semibold' : ''
                  }`}
                  title="Sort by Date"
                >
                  <Clock size={8} /> Date
                </button>
                <button
                  onClick={() => toggleSort('title')}
                  className={`px-[6px] py-[2px] rounded hover:bg-white/[0.05] transition-colors flex items-center gap-1 ${
                    sortBy === 'title' ? 'text-white/80 font-semibold' : ''
                  }`}
                  title="Sort alphabetically"
                >
                  <ArrowUpDown size={8} /> Title
                </button>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-[12px] rounded-[16px] border border-red-500/20 bg-red-500/10 px-[12px] py-[10px] text-xs text-red-200">
              {errorMessage}
            </div>
          )}

          <div className="flex-1 overflow-y-auto mt-[12px] space-y-[8px] pr-[4px] custom-scrollbar">
            {isLoadingConversations ? (
              <div className="flex flex-col items-center justify-center py-[40px] text-center gap-[8px] text-white/35">
                <Sparkles size={24} className="animate-pulse" />
                <div className="text-[11px]">Loading conversations...</div>
              </div>
            ) : filteredAndSortedConversations.length > 0 ? (
              <motion.div variants={staggerList} initial="hidden" animate="visible" className="space-y-[8px]">
                {filteredAndSortedConversations.map((conversation) => {
                  const isActive = conversation.id === activeId;
                  const accent = providerAccent(conversation.provider_slug);
                  return (
                    <motion.div
                      key={conversation.id}
                      variants={listItem}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`group relative rounded-[20px] p-[12px] border cursor-pointer transition-all duration-200 flex items-center gap-[10px] ${
                        isActive
                          ? 'bg-white/[0.06] border-white/[0.15] shadow-sm'
                          : 'bg-white/[0.01] border-white/[0.05] hover:bg-white/[0.03] hover:border-white/[0.1]'
                      }`}
                    >
                      <div
                        className="w-[24px] h-[24px] rounded-lg flex items-center justify-center flex-shrink-0 text-[10px]"
                        style={{
                          backgroundColor: `${accent}15`,
                          border: `1px solid ${accent}25`,
                        }}
                      >
                        <Bot size={11} color={accent} />
                      </div>

                      <div className="flex-1 min-w-0 pr-[18px]">
                        <div className="text-[12px] font-semibold text-white/90 truncate group-hover:text-white">
                          {conversation.title || 'Untitled chat'}
                        </div>
                        <div className="text-[10px] text-white/40 truncate mt-[1px]">
                          {conversation.preview || 'No preview yet.'}
                        </div>
                      </div>

                      <div className="absolute right-[12px] top-[12px] flex flex-col items-end gap-[4px]">
                        <span className="text-[8px] text-white/30">
                          {formatDate(conversation.updated_at || conversation.created_at)}
                        </span>
                        <span className="text-[8px] text-white/45">
                          {providerLabel(conversation.provider_slug, conversation.provider_name)}
                        </span>
                      </div>

                      <button
                        onClick={(event) => handleDeleteConversation(event, conversation.id)}
                        className="absolute right-[8px] bottom-[8px] opacity-0 group-hover:opacity-100 w-[20px] h-[20px] rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-white flex items-center justify-center transition-all duration-150 scale-90 group-hover:scale-100"
                        title="Delete Conversation"
                      >
                        <Trash2 size={10} />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-[40px] text-center gap-[8px] text-white/20">
                <MessageSquare size={24} />
                <div className="text-[11px]">No history found.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
