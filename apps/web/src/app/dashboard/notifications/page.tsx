'use client';

import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Info, AlertTriangle, AlertCircle, Clock, Check } from 'lucide-react';
import { popIn, staggerList, listItem } from '@/lib/motion';

const notifications = [
  { id: 1, type: 'success', title: 'Model Sync Complete', desc: 'Llama 3 successfully downloaded to Ollama instance.', time: '2 mins ago', read: false },
  { id: 2, type: 'info', title: 'New Artifact Generated', desc: 'Dashboard scaffolding is ready for download in your artifacts page.', time: '1 hour ago', read: false },
  { id: 3, type: 'warning', title: 'Usage Alert', desc: 'Approaching 80% of OpenAI monthly budget limit.', time: '4 hours ago', read: false },
  { id: 4, type: 'error', title: 'Connection Failed', desc: 'Failed to connect to local Redis cache. Retrying...', time: '1 day ago', read: true },
  { id: 5, type: 'info', title: 'System Update', desc: 'CORTEX Engine v2.4.1 has been successfully deployed.', time: '2 days ago', read: true },
  { id: 6, type: 'success', title: 'Payment Successful', desc: 'Your monthly Pro subscription has been renewed.', time: '3 days ago', read: true },
];

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return <CheckCircle2 className="text-[#00D97E]" size={20} />;
    case 'warning': return <AlertTriangle className="text-[#FFBC00]" size={20} />;
    case 'error': return <AlertCircle className="text-[#FF6584]" size={20} />;
    default: return <Info className="text-[#00D2FF]" size={20} />;
  }
};

const getColor = (type: string) => {
  switch (type) {
    case 'success': return '#00D97E';
    case 'warning': return '#FFBC00';
    case 'error': return '#FF6584';
    default: return '#00D2FF';
  }
};

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-[32px] max-w-[1000px] mx-auto w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[16px]">
          <div className="w-[48px] h-[48px] rounded-full bg-[#6C63FF]/20 border border-[#6C63FF]/40 flex items-center justify-center">
            <Bell className="text-[#6C63FF]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-white/50">Stay updated on your workspace activity.</p>
          </div>
        </div>
        <button className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-full bg-white/[0.05] border border-white/[0.1] text-white/70 hover:text-white hover:bg-white/[0.1] transition-all text-sm font-medium">
          <Check size={16} />
          Mark all as read
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[8px]">
        <motion.div variants={staggerList} initial="hidden" animate="visible" className="flex flex-col">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              variants={listItem}
              className={`flex items-start gap-[16px] p-[24px] rounded-[16px] transition-all duration-200 cursor-pointer ${
                notif.read ? 'hover:bg-white/[0.02]' : 'bg-white/[0.04] hover:bg-white/[0.06] shadow-[inset_4px_0_0_0_rgba(108,99,255,0.5)]'
              }`}
            >
              <div className="mt-[2px] flex-shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-[4px]">
                  <h3 className={`font-semibold ${notif.read ? 'text-white/80' : 'text-white'}`}>{notif.title}</h3>
                  <div className="flex items-center gap-[6px] text-white/40 text-xs">
                    <Clock size={12} />
                    {notif.time}
                  </div>
                </div>
                <p className={`text-sm ${notif.read ? 'text-white/40' : 'text-white/60'}`}>{notif.desc}</p>
              </div>
              {!notif.read && (
                <div className="w-[8px] h-[8px] rounded-full mt-[8px]" style={{ backgroundColor: getColor(notif.type), boxShadow: `0 0 10px ${getColor(notif.type)}` }} />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
