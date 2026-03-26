'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHotnessHistory, HotnessHistoryItem } from '@/lib/api/stocks';

function gradeColor(grade: string): string {
    switch (grade) {
        case 'S': return 'var(--rise-color)';
        case 'A': return '#f97316';
        case 'B': return 'var(--text-tertiary)';
        case 'C': return 'var(--accent-blue)';
        default: return 'var(--fall-color)';
    }
}

function MiniLineChart({ data }: { data: HotnessHistoryItem[] }) {
    if (data.length < 2) return null;

    const w = 100;
    const h = 100;
    const padTop = 8;
    const padBottom = 20;
    const chartH = h - padTop - padBottom;

    const scores = data.map(d => d.totalScore);
    const max = 100;
    const min = 0;
    const range = max - min;

    const points = data.map((d, i) => ({
        x: (i / (data.length - 1)) * w,
        y: padTop + chartH - ((d.totalScore - min) / range) * chartH,
        score: d.totalScore,
        grade: d.grade,
        date: d.date,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    // S구간(70+) 배경, A구간(50-70) 배경
    const sLineY = padTop + chartH - (70 / range) * chartH;
    const aLineY = padTop + chartH - (50 / range) * chartH;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
            {/* S구간 배경 */}
            <rect x="0" y={padTop} width={w} height={sLineY - padTop}
                fill="var(--rise-color)" opacity="0.05" />
            {/* A구간 배경 */}
            <rect x="0" y={sLineY} width={w} height={aLineY - sLineY}
                fill="#f97316" opacity="0.05" />

            {/* S/A 기준선 */}
            <line x1="0" y1={sLineY} x2={w} y2={sLineY}
                stroke="var(--rise-color)" strokeWidth="0.3" strokeDasharray="2,2" />
            <line x1="0" y1={aLineY} x2={w} y2={aLineY}
                stroke="#f97316" strokeWidth="0.3" strokeDasharray="2,2" />

            {/* 기준선 라벨 */}
            <text x={w - 1} y={sLineY - 1} textAnchor="end"
                fontSize="3" fill="var(--rise-color)" opacity="0.6">S</text>
            <text x={w - 1} y={aLineY - 1} textAnchor="end"
                fontSize="3" fill="#f97316" opacity="0.6">A</text>

            {/* 점수 라인 */}
            <path d={linePath} fill="none" stroke="var(--accent-blue)" strokeWidth="1"
                strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

            {/* 포인트 */}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="1.2"
                    fill={gradeColor(p.grade)} stroke="var(--bg-primary)" strokeWidth="0.4" />
            ))}

            {/* 날짜 라벨 (처음, 끝) */}
            <text x="0" y={h - 2} fontSize="3" fill="var(--text-tertiary)">
                {data[0].date.slice(5)}
            </text>
            <text x={w} y={h - 2} textAnchor="end" fontSize="3" fill="var(--text-tertiary)">
                {data[data.length - 1].date.slice(5)}
            </text>
        </svg>
    );
}

export default function HotnessHistoryChart({ stockCode }: { stockCode: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['hotnessHistory', stockCode],
        queryFn: () => fetchHotnessHistory(stockCode, 30),
        enabled: !!stockCode,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="h-[120px] flex items-center justify-center">
                <span className="text-xs text-[var(--text-tertiary)]">점수 추이 로딩 중...</span>
            </div>
        );
    }

    if (!data || data.length < 2) {
        return (
            <div className="h-[80px] flex items-center justify-center">
                <span className="text-xs text-[var(--text-tertiary)]">
                    {data && data.length === 1
                        ? '데이터 수집 중 (1일차)'
                        : '점수 히스토리가 아직 없습니다'}
                </span>
            </div>
        );
    }

    const latest = data[data.length - 1];
    const prev = data[data.length - 2];
    const diff = latest.totalScore - prev.totalScore;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text-tertiary)]">
                    점수 추이 ({data.length}일)
                </span>
                {diff !== 0 && (
                    <span className={`text-xs font-medium ${diff > 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                        전일 대비 {diff > 0 ? '+' : ''}{diff.toFixed(0)}점
                    </span>
                )}
            </div>
            <div className="h-[120px]">
                <MiniLineChart data={data} />
            </div>
        </div>
    );
}
