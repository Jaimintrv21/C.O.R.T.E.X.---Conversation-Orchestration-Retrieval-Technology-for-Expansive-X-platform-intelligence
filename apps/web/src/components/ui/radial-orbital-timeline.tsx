"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  id: number; title: string; date: string; content: string; category: string;
  icon: React.ElementType; relatedIds: number[];
  status: "completed" | "in-progress" | "pending"; energy: number;
}

interface RadialOrbitalTimelineProps { timelineData: TimelineItem[]; }

export default function RadialOrbitalTimeline({ timelineData }: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({}); setActiveNodeId(null); setPulseEffect({}); setAutoRotate(true);
    }
  };

  const getRelatedItems = (itemId: number): number[] => {
    const item = timelineData.find(i => i.id === itemId);
    return item ? item.relatedIds : [];
  };

  const toggleItem = (id: number) => {
    setExpandedItems(prev => {
      const newState: Record<number, boolean> = {};
      Object.keys(prev).forEach(k => { if (parseInt(k) !== id) newState[parseInt(k)] = false; });
      newState[id] = !prev[id];
      if (!prev[id]) {
        setActiveNodeId(id); setAutoRotate(false);
        const pulse: Record<number, boolean> = {};
        getRelatedItems(id).forEach(r => { pulse[r] = true; });
        setPulseEffect(pulse);
        const idx = timelineData.findIndex(i => i.id === id);
        setRotationAngle(270 - (idx / timelineData.length) * 360);
      } else { setActiveNodeId(null); setAutoRotate(true); setPulseEffect({}); }
      return newState;
    });
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoRotate) { timer = setInterval(() => setRotationAngle(p => Number(((p + 0.3) % 360).toFixed(3))), 50); }
    return () => { if (timer) clearInterval(timer); };
  }, [autoRotate]);

  const calcPos = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const r = 200, rad = (angle * Math.PI) / 180;
    return { x: r * Math.cos(rad), y: r * Math.sin(rad), zIndex: Math.round(100 + 50 * Math.cos(rad)), opacity: Math.max(0.4, 0.4 + 0.6 * ((1 + Math.sin(rad)) / 2)) };
  };

  const isRelated = (id: number) => activeNodeId ? getRelatedItems(activeNodeId).includes(id) : false;

  const getStatusStyle = (s: string) => s === "completed" ? "text-white bg-black border-white" : s === "in-progress" ? "text-black bg-white border-black" : "text-white bg-black/40 border-white/50";

  return (
    <div className="w-full h-[600px] flex flex-col items-center justify-center bg-white/[0.01] backdrop-blur-sm overflow-hidden rounded-2xl border border-white/[0.06]" ref={containerRef} onClick={handleContainerClick}>
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div className="absolute w-full h-full flex items-center justify-center" ref={orbitRef} style={{ perspective: "1000px" }}>
          {/* Center orb */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-500 animate-pulse flex items-center justify-center z-10">
            <div className="absolute w-20 h-20 rounded-full border border-white/20 animate-ping opacity-70" />
            <div className="absolute w-24 h-24 rounded-full border border-white/10 animate-ping opacity-50" style={{ animationDelay: "0.5s" }} />
            <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-md" />
          </div>
          <div className="absolute w-96 h-96 rounded-full border border-white/10" />

          {timelineData.map((item, index) => {
            const pos = calcPos(index, timelineData.length);
            const expanded = expandedItems[item.id];
            const related = isRelated(item.id);
            const pulsing = pulseEffect[item.id];
            const Icon = item.icon;
            return (
              <div key={item.id} ref={el => { nodeRefs.current[item.id] = el; }} className="absolute transition-all duration-700 cursor-pointer"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, zIndex: expanded ? 200 : pos.zIndex, opacity: expanded ? 1 : pos.opacity }}
                onClick={e => { e.stopPropagation(); toggleItem(item.id); }}>
                <div className={`absolute rounded-full -inset-1 ${pulsing ? "animate-pulse" : ""}`}
                  style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)", width: item.energy * 0.5 + 40, height: item.energy * 0.5 + 40, left: -((item.energy * 0.5 + 40 - 40) / 2), top: -((item.energy * 0.5 + 40 - 40) / 2) }} />
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${expanded ? "bg-white text-black border-white shadow-lg shadow-white/30 scale-150" : related ? "bg-white/50 text-black border-white animate-pulse" : "bg-white/[0.06] backdrop-blur-sm text-white border-white/30"}`}>
                  <Icon size={16} />
                </div>
                <div className={`absolute top-12 whitespace-nowrap text-xs font-semibold tracking-wider transition-all duration-300 ${expanded ? "text-white scale-125" : "text-white/70"}`}>{item.title}</div>
                {expanded && (
                  <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-black/90 backdrop-blur-lg border-white/30 shadow-xl shadow-white/10 overflow-visible">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-white/50" />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <Badge className={`px-2 text-xs ${getStatusStyle(item.status)}`}>{item.status === "completed" ? "COMPLETE" : item.status === "in-progress" ? "IN PROGRESS" : "PENDING"}</Badge>
                        <span className="text-xs font-mono text-white/50">{item.date}</span>
                      </div>
                      <CardTitle className="text-sm mt-2 text-white">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-white/80">
                      <p>{item.content}</p>
                      <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-xs mb-1"><span className="flex items-center"><Zap size={10} className="mr-1" />Energy</span><span className="font-mono">{item.energy}%</span></div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${item.energy}%` }} /></div>
                      </div>
                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center mb-2"><LinkIcon size={10} className="text-white/70 mr-1" /><h4 className="text-xs uppercase tracking-wider font-medium text-white/70">Connected</h4></div>
                          <div className="flex flex-wrap gap-1">
                            {item.relatedIds.map(rid => { const ri = timelineData.find(i => i.id === rid); return (
                              <Button key={rid} variant="outline" size="sm" className="h-6 px-2 py-0 text-xs rounded-none border-white/20 bg-transparent hover:bg-white/10 text-white/80" onClick={e => { e.stopPropagation(); toggleItem(rid); }}>
                                {ri?.title}<ArrowRight size={8} className="ml-1 text-white/60" />
                              </Button>
                            ); })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
