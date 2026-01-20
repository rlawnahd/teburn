'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';

interface ThemeData {
    name: string;
    stockCount: number;
    keywords: string[];
    avgChangeRate: number;
    prices: Array<{
        stockName: string;
        changeRate: number;
        tradingValue: number;
        currentPrice: number;
    }>;
    category: string;
}

interface ThemeCorrelationGraphProps {
    themes: ThemeData[];
    onThemeClick: (name: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    name: string;
    changeRate: number;
    stockCount: number;
    category: string;
    totalTradingValue: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: GraphNode | string;
    target: GraphNode | string;
    weight: number;
    sharedKeywords: string[];
}

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
    tech: '#3b82f6',      // 파랑
    battery: '#22c55e',   // 초록
    bio: '#ec4899',       // 핑크
    auto: '#f59e0b',      // 주황
    energy: '#eab308',    // 노랑
    defense: '#6366f1',   // 인디고
    shipbuild: '#06b6d4', // 시안
    finance: '#8b5cf6',   // 보라
    consumer: '#f43f5e',  // 로즈
    materials: '#78716c', // 그레이
    infra: '#64748b',     // 슬레이트
    robot: '#14b8a6',     // 틸
    other: '#9ca3af',     // 그레이
};

// 연관관계 계산: 키워드 유사도
function calculateSimilarity(theme1: ThemeData, theme2: ThemeData): { weight: number; sharedKeywords: string[] } {
    const keywords1 = new Set([...theme1.keywords, theme1.name.toLowerCase()]);
    const keywords2 = new Set([...theme2.keywords, theme2.name.toLowerCase()]);

    const sharedKeywords: string[] = [];

    // 키워드 겹침 체크
    for (const kw1 of keywords1) {
        for (const kw2 of keywords2) {
            if (kw1.includes(kw2) || kw2.includes(kw1)) {
                if (kw1.length > 1 && kw2.length > 1) {
                    sharedKeywords.push(kw1.length > kw2.length ? kw2 : kw1);
                }
            }
        }
    }

    // 같은 카테고리면 가중치 추가
    const categoryBonus = theme1.category === theme2.category && theme1.category !== 'other' ? 1 : 0;

    const uniqueShared = [...new Set(sharedKeywords)];
    const weight = uniqueShared.length + categoryBonus;

    return { weight, sharedKeywords: uniqueShared };
}

export default function ThemeCorrelationGraph({ themes, onThemeClick }: ThemeCorrelationGraphProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // 그래프 데이터 계산
    const { nodes, links } = useMemo(() => {
        const themesWithData = themes.filter(t => t.prices.length > 0);

        // 노드 생성 (상위 50개만 - 너무 많으면 복잡해짐)
        const topThemes = themesWithData
            .sort((a, b) => {
                const aValue = a.prices.reduce((sum, p) => sum + p.tradingValue, 0);
                const bValue = b.prices.reduce((sum, p) => sum + p.tradingValue, 0);
                return bValue - aValue;
            })
            .slice(0, 50);

        const nodes: GraphNode[] = topThemes.map(theme => ({
            id: theme.name,
            name: theme.name,
            changeRate: theme.avgChangeRate,
            stockCount: theme.stockCount,
            category: theme.category,
            totalTradingValue: theme.prices.reduce((sum, p) => sum + p.tradingValue, 0),
        }));

        // 링크 생성
        const links: GraphLink[] = [];
        for (let i = 0; i < topThemes.length; i++) {
            for (let j = i + 1; j < topThemes.length; j++) {
                const { weight, sharedKeywords } = calculateSimilarity(topThemes[i], topThemes[j]);
                if (weight >= 2) { // 최소 연관도 2 이상만 연결
                    links.push({
                        source: topThemes[i].name,
                        target: topThemes[j].name,
                        weight,
                        sharedKeywords,
                    });
                }
            }
        }

        return { nodes, links };
    }, [themes]);

    // 컨테이너 크기 감지
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: Math.max(entry.contentRect.height, 500),
                });
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // D3 시뮬레이션
    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;

        // 줌 기능
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        const g = svg.append('g');

        // 시뮬레이션 설정
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force('link', d3.forceLink<GraphNode, GraphLink>(links)
                .id(d => d.id)
                .distance(d => 150 - (d.weight * 10))
                .strength(d => d.weight * 0.1)
            )
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50));

        // 링크 그리기
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('stroke', 'var(--border-color)')
            .attr('stroke-opacity', 0.4)
            .attr('stroke-width', d => Math.min(d.weight, 4));

        // 노드 그룹
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('cursor', 'pointer')
            .call(d3.drag<SVGGElement, GraphNode>()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );

        // 노드 원
        node.append('circle')
            .attr('r', d => Math.min(Math.max(d.stockCount * 1.5, 20), 40))
            .attr('fill', d => {
                if (d.changeRate > 2) return 'var(--rise-color)';
                if (d.changeRate > 0) return '#fca5a5';
                if (d.changeRate < -2) return 'var(--fall-color)';
                if (d.changeRate < 0) return '#93c5fd';
                return 'var(--text-tertiary)';
            })
            .attr('stroke', d => CATEGORY_COLORS[d.category] || '#9ca3af')
            .attr('stroke-width', 3)
            .attr('opacity', 0.85);

        // 노드 텍스트
        node.append('text')
            .text(d => d.name.length > 6 ? d.name.slice(0, 5) + '…' : d.name)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', 'white')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)');

        // 등락률 표시
        node.append('text')
            .text(d => `${d.changeRate > 0 ? '+' : ''}${d.changeRate.toFixed(1)}%`)
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
            .attr('fill', 'white')
            .attr('font-size', '8px')
            .attr('font-weight', 'bold')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)');

        // 노드 클릭/호버 이벤트
        node.on('click', (event, d) => {
            event.stopPropagation();
            onThemeClick(d.name);
        });

        node.on('mouseenter', (event, d) => {
            setSelectedNode(d);

            // 연결된 노드 하이라이트
            const connectedIds = new Set<string>();
            links.forEach(l => {
                const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                if (sourceId === d.id) connectedIds.add(targetId);
                if (targetId === d.id) connectedIds.add(sourceId);
            });

            node.select('circle')
                .attr('opacity', n => n.id === d.id || connectedIds.has(n.id) ? 1 : 0.2);

            link.attr('stroke-opacity', l => {
                const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return sourceId === d.id || targetId === d.id ? 0.8 : 0.1;
            });
        });

        node.on('mouseleave', () => {
            setSelectedNode(null);
            node.select('circle').attr('opacity', 0.85);
            link.attr('stroke-opacity', 0.4);
        });

        // 시뮬레이션 업데이트
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as GraphNode).x!)
                .attr('y1', d => (d.source as GraphNode).y!)
                .attr('x2', d => (d.target as GraphNode).x!)
                .attr('y2', d => (d.target as GraphNode).y!);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // 초기 줌 설정
        const initialTransform = d3.zoomIdentity.translate(0, 0).scale(0.8);
        svg.call(zoom.transform, initialTransform);

        return () => {
            simulation.stop();
        };
    }, [nodes, links, dimensions, onThemeClick]);

    // 줌 컨트롤
    const handleZoom = (scale: number) => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const zoom = d3.zoom<SVGSVGElement, unknown>();
        svg.transition().duration(300).call(zoom.scaleBy, scale);
    };

    const handleReset = () => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        const zoom = d3.zoom<SVGSVGElement, unknown>();
        svg.transition().duration(500).call(
            zoom.transform,
            d3.zoomIdentity.translate(dimensions.width / 4, dimensions.height / 4).scale(0.8)
        );
    };

    // 연결된 테마 목록
    const connectedThemes = useMemo(() => {
        if (!selectedNode) return [];
        return links
            .filter(l => {
                const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return sourceId === selectedNode.id || targetId === selectedNode.id;
            })
            .map(l => {
                const sourceId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
                const targetId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
                return {
                    name: sourceId === selectedNode.id ? targetId : sourceId,
                    weight: l.weight,
                    sharedKeywords: l.sharedKeywords,
                };
            })
            .sort((a, b) => b.weight - a.weight);
    }, [selectedNode, links]);

    if (nodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-[var(--text-tertiary)]">
                <div className="text-lg mb-2">데이터를 기다리는 중...</div>
                <div className="text-sm">잠시 후 자동으로 업데이트됩니다</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 범례 */}
            <div className="flex flex-wrap items-center gap-3 text-xs bg-[var(--bg-primary)] rounded-xl p-3 border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">노드를 드래그하거나 휠로 확대/축소</span>
                </div>
                <div className="h-4 w-px bg-[var(--border-color)]" />
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[var(--rise-color)]" />
                    <span className="text-[var(--text-tertiary)]">상승</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-[var(--fall-color)]" />
                    <span className="text-[var(--text-tertiary)]">하락</span>
                </div>
                <div className="h-4 w-px bg-[var(--border-color)]" />
                <span className="text-[var(--text-tertiary)]">테두리=카테고리 / 선=연관관계</span>
                <span className="text-[var(--text-secondary)] font-medium ml-auto">{nodes.length}개 테마</span>
            </div>

            <div className="flex gap-4">
                {/* 그래프 */}
                <div
                    ref={containerRef}
                    className="flex-1 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-[var(--shadow-sm)] relative"
                    style={{ minHeight: '600px' }}
                >
                    <svg
                        ref={svgRef}
                        width="100%"
                        height="100%"
                        style={{ minHeight: '600px' }}
                    />

                    {/* 줌 컨트롤 */}
                    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                        <button
                            onClick={() => handleZoom(1.3)}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <ZoomIn size={16} className="text-[var(--text-secondary)]" />
                        </button>
                        <button
                            onClick={() => handleZoom(0.7)}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <ZoomOut size={16} className="text-[var(--text-secondary)]" />
                        </button>
                        <button
                            onClick={handleReset}
                            className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <Maximize2 size={16} className="text-[var(--text-secondary)]" />
                        </button>
                    </div>
                </div>

                {/* 사이드 패널 - 선택된 노드 정보 */}
                <div className="w-72 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-[var(--shadow-sm)]">
                    {selectedNode ? (
                        <div>
                            <div className="mb-4 pb-4 border-b border-[var(--border-color)]">
                                <h3 className="font-bold text-[var(--text-primary)] text-lg">{selectedNode.name}</h3>
                                <div className={`text-xl font-bold mt-1 ${
                                    selectedNode.changeRate > 0 ? 'text-[var(--rise-color)]' :
                                    selectedNode.changeRate < 0 ? 'text-[var(--fall-color)]' :
                                    'text-[var(--text-tertiary)]'
                                }`}>
                                    {selectedNode.changeRate > 0 ? '+' : ''}{selectedNode.changeRate.toFixed(2)}%
                                </div>
                                <div className="text-xs text-[var(--text-tertiary)] mt-1">
                                    {selectedNode.stockCount}종목
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
                                    연관 테마 ({connectedThemes.length})
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {connectedThemes.map(ct => (
                                        <div
                                            key={ct.name}
                                            onClick={() => onThemeClick(ct.name)}
                                            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-[var(--text-primary)] text-sm">
                                                    {ct.name}
                                                </span>
                                                <span className="text-xs text-[var(--text-tertiary)]">
                                                    연관도 {ct.weight}
                                                </span>
                                            </div>
                                            {ct.sharedKeywords.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {ct.sharedKeywords.slice(0, 3).map(kw => (
                                                        <span
                                                            key={kw}
                                                            className="px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] text-[10px]"
                                                        >
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center py-20">
                            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
                                <Info size={20} className="text-[var(--text-tertiary)]" />
                            </div>
                            <p className="text-sm text-[var(--text-tertiary)]">
                                테마 노드에 마우스를 올리면<br />연관 정보가 표시됩니다
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
