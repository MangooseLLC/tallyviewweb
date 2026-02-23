'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  buildNetworkGraph,
  type GraphNode,
  type GraphLink,
  type NetworkGraphData,
  type NodeType,
  type LinkType,
} from '@/lib/data/network-graph';
import { nonprofits } from '@/lib/data/nonprofits';
import { boardMembers } from '@/lib/data/board-members';
import { vendors } from '@/lib/data/vendors';
import { X, Building2, User, Briefcase, MapPin, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const NAVY = '#001F3F';

type NodeObject = GraphNode & { x?: number; y?: number };
type LinkObject = GraphLink & { source: string | NodeObject; target: string | NodeObject };

function getLinkSourceId(link: { source?: unknown; target?: unknown }): string {
  const s = link.source;
  return typeof s === 'object' && s != null && 'id' in s ? String((s as { id: string }).id) : String(s ?? '');
}
function getLinkTargetId(link: { source?: unknown; target?: unknown }): string {
  const t = link.target;
  return typeof t === 'object' && t != null && 'id' in t ? String((t as { id: string }).id) : String(t ?? '');
}

function getOrgName(orgId: string): string {
  return nonprofits.find((o) => o.id === orgId)?.name ?? orgId;
}

function getBoardMemberName(bmId: string): string {
  return boardMembers.find((bm) => bm.id === bmId)?.name ?? bmId;
}

function nodeRiskColor(node: GraphNode): string {
  if (node.type === 'org' && node.riskScore != null) {
    if (node.riskScore < 45) return '#dc2626';
    if (node.riskScore < 70) return '#d97706';
    return '#16a34a';
  }
  if (node.type === 'person' && node.riskScore === 1) return '#dc2626';
  if (node.type === 'vendor' && node.riskScore === 1) return '#dc2626';
  if (node.type === 'address') return '#a855f7';
  return '#94a3b8';
}

function linkStyle(link: GraphLink): { color: string; width: number; dash: number[] | null } {
  switch (link.type) {
    case 'board-seat':
      return { color: '#64748b', width: 1, dash: [4, 4] };
    case 'payment':
      return {
        color: link.relatedParty ? '#dc2626' : '#64748b',
        width: link.value ? Math.min(4, 1 + Math.log10(link.value + 1)) : 1,
        dash: null,
      };
    case 'related-party':
      return { color: '#dc2626', width: 3, dash: null };
    case 'shared-address':
      return { color: '#a855f7', width: 1.5, dash: [2, 2] };
    default:
      return { color: '#64748b', width: 1, dash: null };
  }
}

interface NetworkGraphProps {
  width?: number;
  height?: number;
}

export function NetworkGraph({ width, height = 500 }: NetworkGraphProps) {
  const fgRef = useRef<{ zoomToFit: (a?: number, b?: number, c?: (n: { id?: string | number }) => boolean) => void } | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkObject | null>(null);
  const [hoverNode, setHoverNode] = useState<NodeObject | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());

  const graphData = useMemo<NetworkGraphData>(() => buildNetworkGraph(), []);

  const nodes = graphData.nodes as NodeObject[];
  const links = graphData.links as LinkObject[];

  const connectedToReeves = useMemo(() => {
    const ids = new Set<string>(['bm-001']);
    links.forEach((l) => {
      const s = getLinkSourceId(l);
      const t = getLinkTargetId(l);
      if (s === 'bm-001' || t === 'bm-001') {
        if (s) ids.add(s);
        if (t) ids.add(t);
      }
    });
    return ids;
  }, [links]);

  const handleEngineStop = useCallback(() => {
    if (fgRef.current && connectedToReeves.size > 0) {
      fgRef.current.zoomToFit(400, 80, (node) => connectedToReeves.has(String(node.id)));
    }
  }, [connectedToReeves.size]);

  const handleNodeClick = useCallback((node: Record<string, unknown>) => {
    const nodeObj = node as unknown as NodeObject;
    setSelectedNode(nodeObj);
    setSelectedLink(null);
    const nodeId = String(nodeObj.id);
    const connected = new Set<string>([nodeId]);
    links.forEach((l) => {
      const s = getLinkSourceId(l);
      const t = getLinkTargetId(l);
      if (s === nodeId || t === nodeId) {
        connected.add(s);
        connected.add(t);
      }
    });
    const linkIds = new Set<string>();
    links.forEach((l) => {
      const s = getLinkSourceId(l);
      const t = getLinkTargetId(l);
      if (connected.has(s) && connected.has(t)) linkIds.add(`${s}|${t}|${(l as GraphLink).type}`);
    });
    setHighlightNodes(connected);
    setHighlightLinks(linkIds);
  }, [links]);

  const handleNodeHover = useCallback((node: Record<string, unknown> | null) => {
    const nodeObj = node ? (node as unknown as NodeObject) : null;
    setHoverNode(nodeObj);
    if (!nodeObj) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }
    const nodeId = String(nodeObj.id);
    const connected = new Set<string>([nodeId]);
    links.forEach((l) => {
      const s = getLinkSourceId(l);
      const t = getLinkTargetId(l);
      if (s === nodeId || t === nodeId) {
        connected.add(s);
        connected.add(t);
      }
    });
    const linkIds = new Set<string>();
    links.forEach((l) => {
      const s = getLinkSourceId(l);
      const t = getLinkTargetId(l);
      if (connected.has(s) && connected.has(t)) linkIds.add(`${s}|${t}|${(l as GraphLink).type}`);
    });
    setHighlightNodes(connected);
    setHighlightLinks(linkIds);
  }, [links]);

  const handleLinkClick = useCallback((link: Record<string, unknown>) => {
    setSelectedLink(link as unknown as LinkObject);
    setSelectedNode(null);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedLink(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  const nodeVisibility = useCallback(
    (node: Record<string, unknown>) => {
      if (highlightNodes.size === 0) return true;
      return highlightNodes.has(String((node as unknown as NodeObject).id));
    },
    [highlightNodes]
  );

  const linkVisibility = useCallback(
    (link: Record<string, unknown>) => {
      if (highlightLinks.size === 0) return true;
      const s = getLinkSourceId(link);
      const t = getLinkTargetId(link);
      return highlightLinks.has(`${s}|${t}|${(link as unknown as GraphLink).type}`);
    },
    [highlightLinks]
  );

  const nodeColor = useCallback((node: Record<string, unknown>) => {
    const n = node as unknown as NodeObject;
    const base = nodeRiskColor(n);
    if (highlightNodes.size > 0 && !highlightNodes.has(String(n.id))) return `${base}40`;
    return base;
  }, [highlightNodes]);

  const nodeVal = useCallback((node: Record<string, unknown>) => {
    const n = node as unknown as NodeObject;
    if (n.type === 'org' && n.value) return Math.min(12, 4 + Math.log10(n.value + 1));
    if (n.type === 'vendor' && n.value) return Math.min(10, 3 + Math.log10(n.value + 1));
    if (n.type === 'person') return 5;
    if (n.type === 'address') return 3;
    return 4;
  }, []);

  const nodeCanvasObject = useCallback(
    (node: Record<string, unknown>, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as unknown as NodeObject;
      const label = n.label ?? String(n.id);
      const color = nodeRiskColor(n);
      const opacity = highlightNodes.size > 0 && !highlightNodes.has(String(n.id)) ? 0.35 : 1;
      const size = nodeVal(node);

      ctx.save();
      ctx.globalAlpha = opacity;

      const x = (n as NodeObject & { x?: number }).x ?? 0;
      const y = (n as NodeObject & { y?: number }).y ?? 0;

      if (n.type === 'org') {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fillStyle = NAVY;
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (n.type === 'person') {
        const r = size;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI / 2) * i - Math.PI / 4;
          const xi = x + r * Math.cos(angle);
          const yi = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(xi, yi);
          else ctx.lineTo(xi, yi);
        }
        ctx.closePath();
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = (n as GraphNode).riskScore === 1 ? '#dc2626' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (n.type === 'vendor') {
        const r = size;
        ctx.fillStyle = (n as GraphNode).riskScore === 1 ? '#fef2f2' : '#f1f5f9';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.strokeStyle = (n as GraphNode).riskScore === 1 ? '#dc2626' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      if (globalScale > 0.8) {
        ctx.save();
        ctx.font = `${10 / globalScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = highlightNodes.size > 0 && !highlightNodes.has(String(n.id)) ? '#64748b60' : '#f8fafc';
        ctx.fillText(label, x, y + (n.type === 'org' ? size + 6 : size + 5));
        ctx.restore();
      }
    },
    [highlightNodes, nodeVal]
  );

  const linkColor = useCallback(
    (link: Record<string, unknown>) => {
      const style = linkStyle(link as unknown as GraphLink);
      const key = `${getLinkSourceId(link)}|${getLinkTargetId(link)}|${(link as unknown as GraphLink).type}`;
      if (highlightLinks.size > 0 && !highlightLinks.has(key)) return `${style.color}40`;
      return style.color;
    },
    [highlightLinks]
  );

  const linkWidth = useCallback((link: Record<string, unknown>) => {
    return linkStyle(link as unknown as GraphLink).width;
  }, []);

  const linkLineDash = useCallback((link: Record<string, unknown>) => {
    return linkStyle(link as unknown as GraphLink).dash;
  }, []);

  const nodeLabel = useCallback((node: Record<string, unknown>) => {
    const n = node as unknown as GraphNode;
    if (n.type === 'org') return `${n.fullName ?? n.label}\nRisk: ${n.riskScore ?? '—'} | Budget: ${n.value ? formatCurrency(n.value, true) : '—'}`;
    if (n.type === 'person') return `${n.fullName ?? n.label}\n${n.metadata?.title ?? ''} | ${n.anomalyCount ?? 0} orgs`;
    if (n.type === 'vendor') return `${n.fullName ?? n.label}\n${n.value ? formatCurrency(n.value) : '—'} | ${n.anomalyCount ?? 0} orgs${(n.metadata?.relatedPartyFlag as boolean) ? ' | Related party' : ''}`;
    return n.fullName ?? n.label;
  }, []);

  if (typeof window === 'undefined') return <div style={{ width: width ?? '100%', height }} className="rounded-lg bg-[#001F3F]" />;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ width: width ?? '100%', height, backgroundColor: NAVY }}>
      <ForceGraph2D
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={fgRef as any}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor={NAVY}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeVisibility={nodeVisibility}
        linkVisibility={linkVisibility}
        nodeColor={nodeColor}
        nodeVal={nodeVal}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode="replace"
        nodeLabel={nodeLabel}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={linkLineDash}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onLinkClick={handleLinkClick}
        onBackgroundClick={handleBackgroundClick}
        onEngineStop={handleEngineStop}
        enableNodeDrag
      />

      {/* Detail panel */}
      {(selectedNode || selectedLink) && (
        <div className="absolute top-3 right-3 bottom-3 w-72 bg-white rounded-lg border border-gray-200 shadow-xl flex flex-col overflow-hidden z-10">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</span>
            <button
              type="button"
              onClick={handleBackgroundClick}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 text-sm">
            {selectedNode && (
              <>
                <div className="flex items-start gap-2 mb-3">
                  {selectedNode.type === 'org' && <Building2 className="h-4 w-4 text-[#001F3F] mt-0.5 shrink-0" />}
                  {selectedNode.type === 'person' && <User className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />}
                  {selectedNode.type === 'vendor' && <Briefcase className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
                  {selectedNode.type === 'address' && <MapPin className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />}
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedNode.fullName ?? selectedNode.label}</h4>
                    {selectedNode.type === 'org' && selectedNode.metadata && (
                      <p className="text-xs text-gray-500 mt-0.5">EIN {(selectedNode.metadata.ein as string) ?? '—'}</p>
                    )}
                  </div>
                </div>
                {selectedNode.type === 'org' && (
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><dt className="text-gray-500">Risk score</dt><dd className="font-medium">{selectedNode.riskScore ?? '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Compliance</dt><dd className="font-medium">{selectedNode.metadata != null ? `${selectedNode.metadata.complianceScore ?? '—'}%` : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Budget</dt><dd className="font-medium">{selectedNode.value != null ? formatCurrency(selectedNode.value, true) : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Anomalies</dt><dd className="font-medium">{selectedNode.anomalyCount ?? 0}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Location</dt><dd className="font-medium">{selectedNode.metadata ? `${(selectedNode.metadata.city as string) ?? '—'}, ${(selectedNode.metadata.state as string) ?? '—'}` : '—'}</dd></div>
                  </dl>
                )}
                {selectedNode.type === 'person' && (
                  <dl className="space-y-1.5 text-xs">
                    <div><dt className="text-gray-500">Title</dt><dd className="font-medium mt-0.5">{String(selectedNode.metadata?.title ?? '—')}</dd></div>
                    <div><dt className="text-gray-500">Organizations</dt><dd className="mt-0.5">{(selectedNode.metadata?.organizationIds as string[])?.map((id) => getOrgName(id)).join(', ') ?? '—'}</dd></div>
                    {selectedNode.metadata && (selectedNode.metadata.businessRelationships as string[] | undefined)?.length ? (
                      <div><dt className="text-gray-500">Related vendor(s)</dt><dd className="font-medium mt-0.5 text-red-600">{(selectedNode.metadata.businessRelationships as string[]).map((vid) => vendors.find((v) => v.id === vid)?.name ?? vid).join(', ')}</dd></div>
                    ) : null}
                  </dl>
                )}
                {selectedNode.type === 'vendor' && (
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><dt className="text-gray-500">Total payments</dt><dd className="font-medium">{selectedNode.value != null ? formatCurrency(selectedNode.value) : '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Organizations</dt><dd className="font-medium">{selectedNode.anomalyCount ?? 0}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Related party</dt><dd className="font-medium">{(selectedNode.metadata?.relatedPartyFlag as boolean) ? 'Yes' : 'No'}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Sole source</dt><dd className="font-medium">{(selectedNode.metadata?.soleSoureFlag as boolean) ? 'Yes' : 'No'}</dd></div>
                  </dl>
                )}
                {selectedNode.type === 'address' && (
                  <p className="text-xs text-gray-600">{(selectedNode.metadata?.address as string) ?? selectedNode.fullName}</p>
                )}
                {selectedNode.type === 'org' && (
                  <Link href={`/foundation/grantee/${selectedNode.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700">
                    View full profile <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </>
            )}
            {selectedLink && !selectedNode && (
              <>
                <h4 className="font-semibold text-gray-900 mb-2">Relationship</h4>
                <p className="text-xs text-gray-500 capitalize">{selectedLink.type.replace('-', ' ')}</p>
                {selectedLink.type === 'payment' && selectedLink.value != null && (
                  <p className="text-sm font-medium text-gray-900 mt-1">{formatCurrency(selectedLink.value)}</p>
                )}
                {selectedLink.type === 'payment' && selectedLink.relatedParty && (
                  <span className="inline-block mt-1 text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Related party</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hover tooltip hint */}
      {hoverNode && !selectedNode && (
        <div className="absolute bottom-3 left-3 text-[10px] text-white/80 bg-black/30 px-2 py-1 rounded pointer-events-none">
          Click to open details
        </div>
      )}
    </div>
  );
}
