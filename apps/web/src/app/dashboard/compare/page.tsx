'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, GitCompare, MessageSquare } from 'lucide-react';
import { popIn } from '@/lib/motion';

type Slot = {
  id: string;
  isFilled: boolean;
  content?: { title: string; provider: string; snippets: any[] };
};

const mockData = {
  title: 'React Server Components Architecture',
  provider: 'ChatGPT',
  snippets: [
    { text: 'In Next.js 14, server components are the default.', type: 'normal' },
    { text: 'They allow you to render HTML on the server,', type: 'normal' },
    { text: 'reducing the JavaScript bundle sent to the client.', type: 'diff' },
    { text: 'You can interleave client components when needed.', type: 'normal' }
  ]
};

export default function ComparePage() {
  const [slots, setSlots] = useState<Slot[]>([
    { id: '1', isFilled: true, content: mockData },
    { id: '2', isFilled: false }
  ]);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(null);
    setSlots(slots.map(s => s.id === id ? { ...s, isFilled: true, content: mockData } : s));
  };

  const removeSlotContent = (id: string) => {
    setSlots(slots.map(s => s.id === id ? { ...s, isFilled: false, content: undefined } : s));
  };

  const addSlot = () => {
    if (slots.length < 4) {
      setSlots([...slots, { id: Date.now().toString(), isFilled: false }]);
    }
  };

  return (
    <div className="flex flex-col gap-[32px]">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white px-[8px]">Compare Conversations</h1>
        {slots.length < 4 && (
          <button 
            onClick={addSlot}
            className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-white/[0.1] text-sm text-white/80 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white transition-all duration-200"
          >
            <Plus size={16} /> Add Slot
          </button>
        )}
      </div>

      <div className={`grid gap-[20px] ${slots.length === 1 ? 'grid-cols-1' : slots.length === 2 ? 'grid-cols-2' : slots.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
        <AnimatePresence>
          {slots.map(slot => (
            <motion.div
              key={slot.id}
              layout
              variants={popIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="h-full"
            >
              {!slot.isFilled ? (
                <div 
                  onDragOver={(e) => handleDragOver(e, slot.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, slot.id)}
                  data-drag-over={dragOverId === slot.id}
                  className="rounded-[24px] border-2 border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-[16px] min-h-[400px] h-full transition-all duration-300 hover:border-[#6C63FF]/40 hover:bg-[#6C63FF]/[0.03] data-[drag-over=true]:border-[#00D2FF] data-[drag-over=true]:bg-[#00D2FF]/[0.05] data-[drag-over=true]:scale-[1.01]"
                >
                  <div className="w-[48px] h-[48px] rounded-full bg-white/[0.05] flex items-center justify-center text-white/30">
                    <GitCompare size={24} />
                  </div>
                  <div className="text-sm text-white/40 text-center px-[24px]">
                    Drag a conversation here <br /> or click to select
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-[24px] flex flex-col gap-[20px] h-full relative group shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:border-white/[0.12] transition-colors duration-300">
                  
                  {/* Remove Button */}
                  <button 
                    onClick={() => removeSlotContent(slot.id)}
                    className="absolute top-[16px] right-[16px] w-[24px] h-[24px] rounded-full bg-black/30 flex items-center justify-center text-white/60 hover:text-white hover:bg-red-500/80 transition-all duration-200 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex items-center gap-[12px] pb-[16px] border-b border-white/[0.08]">
                    <div className="w-[32px] h-[32px] rounded-full bg-[#00D97E]/20 flex items-center justify-center border border-[#00D97E]/30">
                      <MessageSquare size={16} className="text-[#00D97E]" />
                    </div>
                    <div className="flex-1 pr-[24px]">
                      <div className="text-sm font-medium text-white/90 line-clamp-1">{slot.content?.title}</div>
                      <div className="text-xs text-white/50">{slot.content?.provider}</div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col gap-[12px] text-sm text-white/70 leading-relaxed overflow-y-auto custom-scrollbar pr-[8px]">
                    {slot.content?.snippets.map((snip, i) => (
                      <p key={i}>
                        {snip.type === 'diff' ? (
                          <span className="inline-block px-[6px] py-[1px] rounded-full bg-[#FF6584]/15 text-[#ff8aa3] text-[12px] mx-[2px] border border-[#FF6584]/30 shadow-[0_0_10px_rgba(255,101,132,0.1)]">
                            {snip.text}
                          </span>
                        ) : (
                          <span>{snip.text}</span>
                        )}
                      </p>
                    ))}
                  </div>

                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
