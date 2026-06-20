'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, MessageSquare, CheckCircle2, Circle } from 'lucide-react';
import { conversations as conversationsApi } from '@/lib/api';
import { popIn } from '@/lib/motion';

type Conversation = {
  id: string;
  title: string;
  summary?: string | null;
  provider_name?: string | null;
  tags?: string[] | null;
  topics?: string[] | null;
  message_count?: number;
};

type CompareResult = {
  shared_topics: string[];
  unique_topics: Record<string, string[]>;
  similarity_score: number;
};

export default function ComparePage() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    let alive = true;
    conversationsApi.list(undefined, 100).then((res) => {
      if (!alive) return;
      setItems((res.data ?? []) as Conversation[]);
      const firstTwo = ((res.data ?? []) as Conversation[]).slice(0, 2).map((item) => item.id);
      setSelected(firstTwo);
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 5) return current;
      return [...current, id];
    });
  };

  const selectedConversations = useMemo(() => items.filter((item) => selected.includes(item.id)), [items, selected]);

  const runCompare = async () => {
    if (selected.length < 2) return;
    const response = await conversationsApi.compare(selected);
    setResult(response.data as CompareResult);
  };

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-white px-[8px]">Compare Conversations</h1>
        <button
          onClick={runCompare}
          disabled={selected.length < 2}
          className="flex items-center justify-center gap-[8px] px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all duration-200 disabled:opacity-40 w-full sm:w-auto"
        >
          <GitCompare size={16} /> Compare selected
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
        <motion.div variants={popIn} initial="hidden" animate="visible" className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-[24px] flex flex-col gap-[16px]">
          <h2 className="text-sm font-medium text-white/50">Pick up to 5 conversations</h2>
          <div className="flex flex-col gap-[10px] max-h-[540px] overflow-y-auto pr-[6px] custom-scrollbar">
            {items.map((conversation) => {
              const isSelected = selected.includes(conversation.id);
              return (
                <button
                  key={conversation.id}
                  onClick={() => toggleSelected(conversation.id)}
                  className={`text-left rounded-[18px] p-[14px] border transition-all ${isSelected ? 'bg-[#6C63FF]/[0.08] border-[#6C63FF]/35' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'}`}
                >
                  <div className="flex items-center gap-[12px]">
                    {isSelected ? <CheckCircle2 size={18} className="text-[#6C63FF]" /> : <Circle size={18} className="text-white/30" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{conversation.title}</div>
                      <div className="text-xs text-white/40 truncate">
                        {conversation.provider_name || 'Unknown'} | {conversation.message_count || 0} messages
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={popIn} initial="hidden" animate="visible" className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-[24px] flex flex-col gap-[16px]">
          <h2 className="text-sm font-medium text-white/50">Comparison result</h2>
          {result ? (
            <div className="flex flex-col gap-[16px]">
              <div className="grid grid-cols-2 gap-[12px]">
                <div className="rounded-[18px] bg-white/[0.03] border border-white/[0.06] p-[16px]">
                  <div className="text-xs text-white/40">Shared topics</div>
                  <div className="text-lg font-semibold text-white mt-[4px]">{result.shared_topics.length}</div>
                </div>
                <div className="rounded-[18px] bg-white/[0.03] border border-white/[0.06] p-[16px]">
                  <div className="text-xs text-white/40">Similarity</div>
                  <div className="text-lg font-semibold text-white mt-[4px]">{Math.round(result.similarity_score * 100)}%</div>
                </div>
              </div>

              <div className="rounded-[18px] bg-white/[0.02] border border-white/[0.06] p-[16px]">
                <div className="text-xs uppercase tracking-wider text-white/40 mb-[10px]">Selected conversations</div>
                <div className="flex flex-col gap-[8px]">
                  {selectedConversations.map((conversation) => (
                    <div key={conversation.id} className="flex items-center justify-between text-sm">
                      <span className="text-white/85">{conversation.title}</span>
                      <span className="text-white/40">{result.unique_topics[conversation.id]?.length || 0} unique topics</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[320px] text-center gap-[12px] text-white/40">
              <MessageSquare size={32} />
              <div>Select conversations and run compare to see overlaps.</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
