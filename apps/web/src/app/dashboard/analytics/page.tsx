'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { popIn, staggerList, listItem } from '@/lib/motion';

const activityData = [
  { date: 'Mon', chatgpt: 400, claude: 240, gemini: 100 },
  { date: 'Tue', chatgpt: 300, claude: 139, gemini: 200 },
  { date: 'Wed', chatgpt: 200, claude: 980, gemini: 300 },
  { date: 'Thu', chatgpt: 278, claude: 390, gemini: 200 },
  { date: 'Fri', chatgpt: 189, claude: 480, gemini: 218 },
  { date: 'Sat', chatgpt: 239, claude: 380, gemini: 250 },
  { date: 'Sun', chatgpt: 349, claude: 430, gemini: 210 },
];

const topicData = [
  { name: 'React', value: 400, color: '#6C63FF' },
  { name: 'System Design', value: 300, color: '#00D2FF' },
  { name: 'DevOps', value: 300, color: '#FF6584' },
  { name: 'Marketing', value: 200, color: '#00D97E' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[16px] px-[16px] py-[12px] backdrop-blur-xl bg-[#12121A]/90 border border-white/[0.15] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <p className="text-sm font-medium text-white/90 mb-[8px]">{label}</p>
        <div className="flex flex-col gap-[4px]">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-[8px] text-xs">
              <div className="w-[8px] h-[8px] rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white/70 capitalize">{entry.name}:</span>
              <span className="text-white font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const [activeDateRange, setActiveDateRange] = useState('7D');
  const dateRanges = ['7D', '30D', '90D', 'All time'];

  return (
    <div className="flex flex-col gap-[32px]">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white px-[8px]">Analytics</h1>
        
        {/* Date Range Pill Selector */}
        <div className="flex gap-[4px] p-[4px] rounded-full bg-white/[0.04] border border-white/[0.08]">
          {dateRanges.map(range => {
            const isActive = activeDateRange === range;
            return (
              <button
                key={range}
                onClick={() => setActiveDateRange(range)}
                className={`relative px-[16px] py-[6px] text-xs font-medium rounded-full transition-colors duration-200 z-10 ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="analyticsDatePill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-[#6C63FF]/20 border border-[#6C63FF]/30 rounded-full -z-10 shadow-[0_0_15px_rgba(108,99,255,0.15)]"
                  />
                )}
                {range}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div 
        variants={staggerList}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]"
      >
        {/* Main Chart: Activity Over Time */}
        <motion.div variants={listItem} className="lg:col-span-2 rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Message Volume by Provider</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D2FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D2FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D97E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00D97E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="chatgpt" stackId="1" stroke="#6C63FF" fill="url(#colorC)" strokeWidth={2} />
                <Area type="monotone" dataKey="claude" stackId="1" stroke="#00D2FF" fill="url(#colorD)" strokeWidth={2} />
                <Area type="monotone" dataKey="gemini" stackId="1" stroke="#00D97E" fill="url(#colorG)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Secondary Chart 1 */}
        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Top Topics</h2>
          <div className="h-[240px] w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={topicData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Secondary Chart 2 */}
        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Average Response Length</h2>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData.map(d => ({ ...d, name: d.name.substring(0,4) }))} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
