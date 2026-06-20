'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Maximize, X, Network, AlertCircle, RefreshCcw } from 'lucide-react';
import { knowledge } from '@/lib/api';
import { useApiQuery } from '@/hooks/useApi';

const nodeTypes = [
  { label: 'Concept', color: '#6C63FF' },
  { label: 'Person', color: '#00D2FF' },
  { label: 'Tool', color: '#FF6584' },
  { label: 'Decision', color: '#00D97E' },
  { label: 'Insight', color: '#FFBC00' },
];

export default function KnowledgeGraphPage() {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(nodeTypes.map(n => n.label)));
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const { data: nodesData, isLoading: isNodesLoading, error: nodesError, refetch: refetchNodes } = useApiQuery(knowledge.nodes);
  const { data: edgesData, isLoading: isEdgesLoading, error: edgesError, refetch: refetchEdges } = useApiQuery(knowledge.edges);

  const isLoading = isNodesLoading || isEdgesLoading;
  const hasError = nodesError || edgesError;

  const toggleType = (label: string) => {
    const next = new Set(activeTypes);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    setActiveTypes(next);
  };

  const { nodes, edges } = useMemo(() => {
    if (!nodesData || !edgesData) return { nodes: [], edges: [] };
    
    // Minimal random positioning logic for demo since backend might not provide X/Y
    const mappedNodes = (nodesData as any[]).map((n, i) => {
      // Create deterministic random-looking positions if missing
      const x = n.x !== undefined ? n.x : 50 + Math.sin(i * 1.3) * 35;
      const y = n.y !== undefined ? n.y : 50 + Math.cos(i * 1.7) * 35;
      
      const typeLabel = n.type || 'Concept';
      const colorDef = nodeTypes.find(t => t.label.toLowerCase() === typeLabel.toLowerCase()) || nodeTypes[0];
      
      return { ...n, x, y, color: colorDef.color, typeLabel: colorDef.label };
    });

    return { nodes: mappedNodes, edges: edgesData as any[] };
  }, [nodesData, edgesData]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => activeTypes.has(n.typeLabel));
  }, [nodes, activeTypes]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] h-full w-full">
        <div className="w-[64px] h-[64px] rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
          <AlertCircle className="text-red-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Graph Error</h2>
        <p className="text-white/50 text-sm mb-6 max-w-md">There was a problem loading your knowledge graph.</p>
        <button onClick={() => { refetchNodes(); refetchEdges(); }} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
          <RefreshCcw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[16px] h-[calc(100vh-140px)] min-h-[600px] w-full">
      
      <h1 className="text-2xl font-bold text-white px-[8px] flex-shrink-0">Knowledge Graph</h1>

      <div className="w-full h-full rounded-[24px] backdrop-blur-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden relative shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
        
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-[64px] h-[64px] rounded-full border-[4px] border-[#6C63FF]/30 border-t-[#6C63FF] animate-spin mb-4" />
            <p className="text-sm text-white/50 animate-pulse">Computing graph geometry...</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
            <Network className="text-white/20 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-white/80 mb-2">Graph is Empty</h2>
            <p className="text-sm text-white/40 max-w-sm mb-6">Your semantic graph will populate as you import conversations and process knowledge.</p>
            <button className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
              Import Conversations
            </button>
          </div>
        ) : (
          <div 
            className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden touch-none"
            onClick={() => setSelectedNode(null)}
          >
            {/* Decorative background grid */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            
            {/* Canvas layer */}
            <div className="absolute inset-0">
              {/* Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {edges.map((edge, i) => {
                  const source = nodes.find(n => n.id === edge.source_id);
                  const target = nodes.find(n => n.id === edge.target_id);
                  if (!source || !target || !activeTypes.has(source.typeLabel) || !activeTypes.has(target.typeLabel)) return null;
                  return (
                    <line 
                      key={i}
                      x1={`${source.x}%`} y1={`${source.y}%`}
                      x2={`${target.x}%`} y2={`${target.y}%`}
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth={1}
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {filteredNodes.map(node => (
                <div 
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform duration-200 z-10"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    width: `${Math.max(30, Math.min(80, (node.weight || 1) * 30))}px`,
                    height: `${Math.max(30, Math.min(80, (node.weight || 1) * 30))}px`,
                    backgroundColor: `${node.color}33`,
                    borderColor: node.color,
                    boxShadow: `0 0 20px ${node.color}66`
                  }}
                >
                  <span className="text-white text-[10px] font-bold truncate px-1">{node.name || node.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top-left controls (Bottom-left on mobile so it doesn't overlap header/notifs) */}
        <div className="absolute bottom-[24px] md:bottom-auto md:top-[24px] left-[24px] flex flex-col md:flex-row items-center gap-[8px] z-20">
          {[ZoomIn, ZoomOut, RotateCcw, Maximize].map((Icon, i) => (
            <button key={i} className="w-[36px] h-[36px] rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] flex items-center justify-center text-white/70 hover:bg-white/[0.14] hover:text-white hover:scale-[1.08] active:scale-[0.95] transition-all duration-150 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Top-right filters (Top-left on mobile to use space efficiently) */}
        <div className="absolute top-[24px] left-[24px] md:left-auto md:right-[24px] flex items-center gap-[8px] flex-wrap justify-start md:justify-end max-w-[calc(100vw-48px)] md:max-w-[400px] z-20">
          {nodeTypes.map(type => {
            const isActive = activeTypes.has(type.label);
            return (
              <button
                key={type.label}
                onClick={() => toggleType(type.label)}
                className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-full border text-xs font-medium transition-all duration-200 backdrop-blur-md"
                style={{
                  backgroundColor: isActive ? `${type.color}33` : 'rgba(255,255,255,0.05)',
                  borderColor: isActive ? `${type.color}80` : 'rgba(255,255,255,0.1)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                <div className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ backgroundColor: isActive ? type.color : 'rgba(255,255,255,0.3)' }} />
                <span className="whitespace-nowrap">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Popup Card (Bottom Sheet on mobile, floating on Desktop) */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 md:bottom-auto md:top-1/2 left-0 md:left-1/2 w-full md:w-auto md:ml-[40px] md:-mt-[60px] z-30 rounded-t-[24px] md:rounded-[18px] backdrop-blur-2xl bg-[#12121A]/95 md:bg-[#12121A]/90 border-t md:border border-white/[0.12] p-[24px] md:p-[16px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-[0_16px_40px_rgba(0,0,0,0.5)] md:min-w-[280px]"
            >
              {/* Mobile Drag Handle */}
              <div className="w-[32px] h-[4px] rounded-full bg-white/20 mx-auto mb-[16px] md:hidden" />
              
              <div className="flex items-start justify-between mb-[12px]">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-[6px] mb-[4px]">
                    <div className="w-[8px] h-[8px] rounded-full flex-shrink-0" style={{ backgroundColor: selectedNode.color }} />
                    <span className="text-[10px] uppercase tracking-wider font-bold truncate" style={{ color: selectedNode.color }}>
                      {selectedNode.typeLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white truncate">{selectedNode.name || selectedNode.label}</h3>
                </div>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="w-[28px] h-[28px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white/50 hover:text-white transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm text-white/70 mb-[16px] leading-relaxed line-clamp-3">
                {selectedNode.description || 'No detailed description available for this node.'}
              </p>
              <div className="flex items-center justify-between text-xs text-white/40 pt-[12px] border-t border-white/[0.08]">
                <span>Weight: {selectedNode.weight || 1}</span>
                <button className="text-[#00D2FF] hover:underline font-medium">Explore Connections →</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
