'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { analytics as analyticsApi } from '@/lib/api';
import { popIn, staggerList, listItem } from '@/lib/motion';

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
  const [timeline, setTimeline] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([analyticsApi.timeline(), analyticsApi.topics(), analyticsApi.providers()]).then(([timelineRes, topicsRes, providersRes]) => {
      if (!alive) return;
      setTimeline((timelineRes.data ?? []) as any[]);
      setTopics((topicsRes.data ?? []) as any[]);
      setProviders((providersRes.data ?? []) as any[]);
    });
    return () => {
      alive = false;
    };
  }, []);

  const activityData = useMemo(() => {
    return timeline.map((row) => ({
      date: new Date(row.date).toLocaleDateString([], { weekday: 'short' }),
      conversations: row.conversations,
      messages: row.messages,
      tokens: row.tokens,
    }));
  }, [timeline]);

  const topicData = useMemo(() => {
    return topics.slice(0, 4).map((topic, index) => ({
      name: topic.topic,
      value: topic.count,
      color: ['#6C63FF', '#00D2FF', '#FF6584', '#00D97E'][index % 4],
    }));
  }, [topics]);

  return (
    <div className="flex flex-col gap-[32px]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white px-[8px]">Analytics</h1>
        <div className="flex gap-[4px] p-[4px] rounded-full bg-white/[0.04] border border-white/[0.08]">
          {['7D', '30D', '90D', 'All time'].map((range) => {
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
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-[#6C63FF]/20 border border-[#6C63FF]/30 rounded-full -z-10 shadow-[0_0_15px_rgba(108,99,255,0.15)]"
                  />
                )}
                {range}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div variants={staggerList} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
        <motion.div variants={listItem} className="lg:col-span-2 rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Message Volume by Day</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="messages" stackId="1" stroke="#6C63FF" fill="url(#colorC)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Top Topics</h2>
          <div className="h-[240px] w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie data={topicData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[24px] flex flex-col gap-[24px]">
          <h2 className="text-sm font-medium text-white/50">Provider Share</h2>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={providers.map((p) => ({ name: p.provider.substring(0, 4), value: p.conversations }))} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {providers.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6C63FF', '#00D2FF', '#00D97E', '#FF6584'][index % 4]} />
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
