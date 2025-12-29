'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    X,
    RefreshCw,
    DollarSign,
    Calendar,
    BarChart3,
    PiggyBank,
} from 'lucide-react';
import { fetchETFList, fetchDividendCalendar, fetchETFDetail } from '@/lib/api/etf';
import DividendCalendar from '@/components/etf/DividendCalendar';
import ETFCard from '@/components/etf/ETFCard';
import DividendHistoryChart from '@/components/etf/DividendHistoryChart';
import Sidebar from '@/components/layout/Sidebar';

// ETF 상세 모달
function ETFDetailModal({
    symbol,
    onClose,
}: {
    symbol: string;
    onClose: () => void;
}) {
    const { data: detail, isLoading } = useQuery({
        queryKey: ['etfDetail', symbol],
        queryFn: () => fetchETFDetail(symbol),
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* 헤더 */}
                <div className="px-6 py-5 border-b border-[var(--border-color)] bg-[var(--accent-blue-light)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)] flex items-center justify-center">
                                <DollarSign size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{symbol}</h2>
                                <p className="text-sm text-[var(--text-secondary)]">{detail?.korName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-primary)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    {detail && (
                        <div className="flex items-center gap-4 mt-4">
                            <div className="text-3xl font-bold text-[var(--success-color)]">
                                {detail.yieldRate.toFixed(1)}%
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">연간 배당률</div>
                            <div className="ml-auto text-sm">
                                <span className="text-[var(--text-tertiary)]">연간 분배금:</span>
                                <span className="font-bold text-[var(--accent-blue)] ml-1">
                                    ${detail.yearlyTotal.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 바디 */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-[var(--text-tertiary)]">
                            <RefreshCw size={20} className="animate-spin mr-2 text-[var(--accent-blue)]" />
                            로딩 중...
                        </div>
                    ) : detail ? (
                        <div className="space-y-6">
                            {/* 기본 정보 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                                    <div className="text-xs text-[var(--text-tertiary)] mb-1">운용사</div>
                                    <div className="font-medium text-[var(--text-primary)]">{detail.issuer}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                                    <div className="text-xs text-[var(--text-tertiary)] mb-1">운용보수</div>
                                    <div className="font-medium text-[var(--text-primary)]">{detail.expenseRatio}%</div>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                                    <div className="text-xs text-[var(--text-tertiary)] mb-1">기초자산</div>
                                    <div className="font-medium text-[var(--text-primary)]">{detail.underlying}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                                    <div className="text-xs text-[var(--text-tertiary)] mb-1">순자산(AUM)</div>
                                    <div className="font-medium text-[var(--text-primary)]">${detail.aum}B</div>
                                </div>
                            </div>

                            {/* 전략 설명 */}
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">투자 전략</div>
                                <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-xl p-4">
                                    {detail.description}
                                </p>
                            </div>

                            {/* 분배금 차트 */}
                            <DividendHistoryChart dividends={detail.dividends} symbol={symbol} />

                            {/* 다음 배당 정보 */}
                            {detail.nextDividend && (
                                <div className="p-5 rounded-2xl bg-[var(--success-bg)] border border-[var(--success-color)]/20">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar size={16} className="text-[var(--success-color)]" />
                                        <span className="text-sm font-semibold text-[var(--success-color)]">다음 배당 정보</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-[var(--success-color)] mb-1">배당락일</div>
                                            <div className="font-medium text-[var(--text-primary)]">{detail.nextDividend.exDate}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-[var(--success-color)] mb-1">지급일</div>
                                            <div className="font-medium text-[var(--text-primary)]">{detail.nextDividend.payDate}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-[var(--success-color)] mb-1">예상 분배금</div>
                                            <div className="font-bold text-[var(--accent-blue)]">
                                                ${detail.nextDividend.amount.toFixed(4)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-[var(--text-tertiary)] py-8">데이터를 불러올 수 없습니다</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ETFPage() {
    const [selectedETF, setSelectedETF] = useState<string | null>(null);

    const { data: etfList, isLoading: etfLoading } = useQuery({
        queryKey: ['etfList'],
        queryFn: fetchETFList,
        staleTime: 1000 * 60 * 60,
    });

    const { data: calendarEvents, isLoading: calendarLoading } = useQuery({
        queryKey: ['dividendCalendar'],
        queryFn: fetchDividendCalendar,
        staleTime: 1000 * 60 * 60,
    });

    return (
        <div className="flex min-h-screen bg-[var(--bg-secondary)]">
            <Sidebar />

            <main className="flex-1 lg:ml-64">
                {/* 헤더 */}
                <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-6 bg-[var(--bg-primary)] sticky top-0 z-10 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent-blue-light)] flex items-center justify-center">
                            <PiggyBank size={18} className="text-[var(--accent-blue)]" />
                        </div>
                        <span className="font-bold text-[var(--text-primary)]">커버드콜 ETF 배당 캘린더</span>
                    </div>
                    <div className="text-sm text-[var(--text-tertiary)]">
                        월배당 ETF 분배금 일정 및 이력
                    </div>
                </header>

                {/* 컨텐츠 */}
                <div className="p-6">
                    {etfLoading || calendarLoading ? (
                        <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)]">
                            <RefreshCw size={24} className="animate-spin mr-3 text-[var(--accent-blue)]" />
                            데이터 로딩 중...
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* ETF 카드 그리드 */}
                            <section>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-blue-light)] flex items-center justify-center">
                                        <BarChart3 size={16} className="text-[var(--accent-blue)]" />
                                    </div>
                                    <h2 className="text-lg font-bold text-[var(--text-primary)]">월배당 ETF 목록</h2>
                                    <span className="text-sm text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-lg">
                                        {etfList?.length || 0}개
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {etfList?.map((etf) => (
                                        <ETFCard
                                            key={etf.symbol}
                                            etf={etf}
                                            onClick={() => setSelectedETF(etf.symbol)}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* 배당 캘린더 */}
                            <section>
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-blue-light)] flex items-center justify-center">
                                        <Calendar size={16} className="text-[var(--accent-blue)]" />
                                    </div>
                                    <h2 className="text-lg font-bold text-[var(--text-primary)]">배당 일정 캘린더</h2>
                                </div>
                                <DividendCalendar
                                    events={calendarEvents || []}
                                    onEventClick={(event) => setSelectedETF(event.symbol)}
                                />
                            </section>

                            {/* 안내 문구 */}
                            <div className="bg-[var(--warning-bg)] border border-[var(--warning-color)]/30 rounded-xl p-4 text-sm text-[var(--warning-color)]">
                                <strong>참고:</strong> 배당 일정 및 금액은 예정된 정보이며, 실제와 다를 수 있습니다.
                                투자 결정 전 공식 자료를 확인하세요.
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ETF 상세 모달 */}
            {selectedETF && (
                <ETFDetailModal
                    symbol={selectedETF}
                    onClose={() => setSelectedETF(null)}
                />
            )}
        </div>
    );
}
