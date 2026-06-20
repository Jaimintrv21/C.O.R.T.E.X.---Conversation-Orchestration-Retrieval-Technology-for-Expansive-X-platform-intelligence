'use client';

import { useMemo, useState } from 'react';
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
import { analytics as analyticsApi, TimelinePoint, TopicCount, ProviderBreakdown } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApi';
import { staggerList, listItem } from '@/lib/motion';
import { Database, MessageSquare, Zap, AlertCircle, RefreshCcw } from 'lucide-react';

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

// Animated counter component
function AnimatedCounter({ value }: { value: number }) {
  // A real implementation might use framer-motion's useSpring and useTransform
  // For simplicity here, we just display the formatted number.
  return <span>{value.toLocaleString()}</span>;
}

export default function AnalyticsPage() {
  const [activeDateRange, setActiveDateRange] = useState('7D');

  const { data: timeline, isLoading: isTimelineLoading, error: timelineError, refetch: refetchTimeline } = useApiQuery(analyticsApi.timeline);
  const { data: topics, isLoading: isTopicsLoading } = useApiQuery(analyticsApi.topics);
  const { data: providers, isLoading: isProvidersLoading } = useApiQuery(analyticsApi.providers);
  const { data: overview, isLoading: isOverviewLoading } = useApiQuery(analyticsApi.overview);

  const isLoading = isTimelineLoading || isTopicsLoading || isProvidersLoading || isOverviewLoading;

  const activityData = useMemo(() => {
    if (!timeline) return [];
    return timeline.map((row: TimelinePoint) => ({
      date: new Date(row.date).toLocaleDateString([], { weekday: 'short' }),
      conversations: row.conversations,
      messages: row.messages,
      tokens: row.tokens,
    }));
  }, [timeline]);

  const topicData = useMemo(() => {
    if (!topics) return [];
    return topics.slice(0, 4).map((topic: TopicCount, index: number) => ({
      name: topic.topic,
      value: topic.count,
      color: ['#6C63FF', '#00D2FF', '#FF6584', '#00D97E'][index % 4],
    }));
  }, [topics]);

  const providerData = useMemo(() => {
    if (!providers) return [];
    return providers.map((p: ProviderBreakdown) => ({
      name: p.provider.substring(0, 4),
      value: p.conversations,
    }));
  }, [providers]);

  if (timelineError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="w-[64px] h-[64px] rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
          <AlertCircle className="text-red-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unable to load analytics</h2>
        <p className="text-white/50 text-sm mb-6 max-w-md">There was a problem fetching your analytics data.</p>
        <button onClick={() => refetchTimeline()} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
          <RefreshCcw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[24px] md:gap-[32px] w-full max-w-full overflow-x-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-[16px]">
        <h1 className="text-2xl font-bold text-white px-[8px]">Analytics</h1>
        <div className="flex gap-[4px] p-[4px] rounded-full bg-white/[0.04] border border-white/[0.08] overflow-x-auto custom-scrollbar self-start md:self-auto">
          {['7D', '30D', '90D', 'All time'].map((range) => {
            const isActive = activeDateRange === range;
            return (
              <button
                key={range}
                onClick={() => setActiveDateRange(range)}
                className={`relative px-[16px] py-[6px] text-xs font-medium rounded-full transition-colors duration-200 z-10 whitespace-nowrap ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
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

      {/* Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px]">
        {[
          { label: 'Total Conversations', value: overview?.total_conversations || 0, icon: MessageSquare, color: '#6C63FF' },
          { label: 'Messages Processed', value: overview?.total_messages || 0, icon: Database, color: '#00D2FF' },
          { label: 'Tokens Embedded', value: overview?.total_tokens || 0, icon: Zap, color: '#00D97E' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-[24px] p-[20px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] flex items-center gap-[16px] relative overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center gap-[16px] w-full animate-pulse">
                <div className="w-[48px] h-[48px] rounded-full bg-white/[0.05]" />
                <div className="flex-1">
                  <div className="h-[24px] w-[60%] bg-white/[0.1] rounded mb-[4px]" />
                  <div className="h-[12px] w-[40%] bg-white/[0.05] rounded" />
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="absolute -right-[20px] -top-[20px] w-[100px] h-[100px] rounded-full opacity-10 blur-[30px]" 
                  style={{ backgroundColor: stat.color }} 
                />
                <div 
                  className="w-[48px] h-[48px] rounded-full flex items-center justify-center border flex-shrink-0"
                  style={{ backgroundColor: `${stat.color}15`, borderColor: `${stat.color}30` }}
                >
                  <stat.icon size={20} color={stat.color} />
                </div>
                <div className="min-w-0">
                  <div className="text-[24px] font-bold text-white tracking-tight leading-none mb-[4px]">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-[12px] text-white/50 truncate">{stat.label}</div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <motion.div variants={staggerList} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
        
        {/* Main Area Chart */}
        <motion.div variants={listItem} className="lg:col-span-2 rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
          <h2 className="text-sm font-medium text-white/50">Message Volume by Day</h2>
          <div className="h-[250px] md:h-[300px] w-full">
            {isLoading ? (
              <div className="w-full h-full bg-white/[0.02] rounded-lg animate-pulse" />
            ) : activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="messages" stackId="1" stroke="#6C63FF" fill="url(#colorC)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">No volume data available.</div>
            )}
          </div>
        </motion.div>

        {/* Pie Chart */}
        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
          <h2 className="text-sm font-medium text-white/50">Top Topics</h2>
          <div className="h-[200px] md:h-[240px] w-full flex justify-center items-center">
            {isLoading ? (
              <div className="w-[150px] h-[150px] rounded-full border-[20px] border-white/[0.05] animate-pulse" />
            ) : topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Pie data={topicData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                    {topicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">No topics analyzed yet.</div>
            )}
          </div>
        </motion.div>

        {/* Bar Chart */}
        <motion.div variants={listItem} className="rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] p-[20px] md:p-[24px] flex flex-col gap-[20px]">
          <h2 className="text-sm font-medium text-white/50">Provider Share</h2>
          <div className="h-[200px] md:h-[240px] w-full">
            {isLoading ? (
              <div className="w-full h-full flex items-end gap-[10px] pb-[20px] animate-pulse">
                {[40, 70, 50, 80].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/[0.05] rounded-t-lg" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={providerData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {providerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6C63FF', '#00D2FF', '#00D97E', '#FF6584'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">No provider data available.</div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
