'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { KiwoomTrade } from '@/lib/api/trading';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function TradingPage() {
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [savedPassword, setSavedPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const saved = sessionStorage.getItem('teburn-trading-pw');
        if (saved) {
            setAuthenticated(true);
            setSavedPassword(saved);
        }
    }, []);

    const handleLogin = async () => {
        try {
            const { data } = await axios.post(`${API_URL}/trading/auth`, { password });
            if (data.success) {
                setAuthenticated(true);
                setSavedPassword(password);
                sessionStorage.setItem('teburn-trading-pw', password);
                setError('');
            }
        } catch {
            setError('비밀번호가 틀렸습니다.');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
                <div
                    className="card p-6 w-full max-w-sm rounded"
                    style={{ borderTop: '3px solid', borderImage: 'var(--brand-gradient) 1' }}
                >
                    <h1 className="text-[var(--text-primary)] text-lg font-bold mb-4">매매일지</h1>
                    <p className="text-[var(--text-tertiary)] text-sm mb-4">비밀번호를 입력하세요.</p>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="비밀번호"
                        autoFocus
                        className="w-full px-3 py-2 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm mb-3 outline-none focus:border-[var(--text-tertiary)]"
                    />
                    {error && <p className="text-[var(--fall-color)] text-xs mb-3">{error}</p>}
                    <button
                        onClick={handleLogin}
                        className="w-full py-2 rounded bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-medium"
                    >
                        확인
                    </button>
                </div>
            </div>
        );
    }

    return <TradingJournal password={savedPassword} />;
}

function formatDateKR(d: Date): string {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function toYYYYMMDD(d: Date): string {
    return d.toISOString().split('T')[0].replace(/-/g, '');
}

function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

function groupTradesByHour(trades: KiwoomTrade[]): { hour: string; trades: KiwoomTrade[] }[] {
    const groups: Record<string, KiwoomTrade[]> = {};
    for (const trade of trades) {
        const hour = trade.orderTime ? trade.orderTime.slice(0, 2) : '??';
        if (!groups[hour]) groups[hour] = [];
        groups[hour].push(trade);
    }
    return Object.keys(groups)
        .sort()
        .map((hour) => ({ hour, trades: groups[hour] }));
}

function TradingJournal({ password }: { password: string }) {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const headers = { 'x-trading-password': password };
    const dateStr = toYYYYMMDD(selectedDate);

    const { data: accountData } = useQuery({
        queryKey: ['tradingAccount', password],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/trading/account`, { headers });
            return data.data;
        },
        refetchInterval: 60 * 1000,
    });

    const { data: historyData } = useQuery({
        queryKey: ['tradeHistory', password, dateStr],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/trading/history`, {
                headers,
                params: { date: dateStr },
            });
            return data.data;
        },
    });

    const account = accountData?.account;
    const trades: KiwoomTrade[] = historyData?.trades || [];

    // 체결 통계 계산
    const buyTrades = trades.filter(t => t.ioBuySell.includes('매수'));
    const sellTrades = trades.filter(t => t.ioBuySell.includes('매도'));
    const totalBuyAmount = buyTrades.reduce((sum, t) => sum + t.filledPrice * t.filledQty, 0);
    const totalSellAmount = sellTrades.reduce((sum, t) => sum + t.filledPrice * t.filledQty, 0);

    const tradesByHour = groupTradesByHour(trades);

    const prevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        if (d.getDay() === 0) d.setDate(d.getDate() - 2);
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        setSelectedDate(d);
    };

    const nextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        if (d.getDay() === 6) d.setDate(d.getDate() + 2);
        if (d > new Date()) return;
        setSelectedDate(d);
    };

    const isToday = formatDate(selectedDate) === formatDate(new Date());

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[1280px] mx-auto p-3 space-y-3">

                {/* 날짜 네비게이션 */}
                <div className="card px-4 py-3 rounded flex items-center justify-between">
                    <button onClick={prevDay} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center">
                        <p className="text-[var(--text-primary)] text-sm font-medium">{formatDateKR(selectedDate)}</p>
                        {isToday && <p className="text-[var(--text-tertiary)] text-xs">오늘</p>}
                    </div>
                    <button
                        onClick={nextDay}
                        disabled={isToday}
                        className={`p-1 transition-colors ${isToday ? 'text-[var(--border-color)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* 계좌 현황 (오늘만) */}
                {isToday && account && (() => {
                    const isPnlPositive = (account.totalPnlRate || 0) >= 0;
                    return (
                        <div
                            className="card p-4 rounded"
                            style={{
                                borderTop: '3px solid',
                                borderColor: isPnlPositive ? 'var(--rise-color)' : 'var(--fall-color)',
                            }}
                        >
                            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-4">계좌 현황</h2>
                            {/* Hero: 수익률 */}
                            <div className="text-center mb-4">
                                <p className={`text-3xl font-bold ${isPnlPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {isPnlPositive ? '+' : ''}{account.totalPnlRate?.toFixed(2)}%
                                </p>
                                <p className={`text-sm mt-1 ${isPnlPositive ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {isPnlPositive ? '+' : ''}{account.totalPnl?.toLocaleString()}원
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[var(--text-tertiary)] text-xs">총 평가</p>
                                    <p className="text-[var(--text-primary)] text-sm font-medium">{account.totalValue?.toLocaleString()}원</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-tertiary)] text-xs">현금</p>
                                    <p className="text-[var(--text-primary)] text-sm font-medium">{account.cash?.toLocaleString()}원</p>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* 보유 종목 (오늘만) */}
                {isToday && account?.positions && account.positions.length > 0 && (
                    <div className="card p-4 rounded">
                        <h2 className="text-[var(--text-primary)] text-sm font-medium mb-3">보유 종목</h2>
                        <div className="space-y-1">
                            {account.positions.map((pos: any) => {
                                const isProfit = (pos.pnl || 0) >= 0;
                                const evalAmount = (pos.currentPrice || 0) * (pos.quantity || 0);
                                return (
                                    <div
                                        key={pos.stockCode}
                                        className="flex items-center justify-between px-2 py-2 rounded border-b border-[var(--border-color)] last:border-0"
                                        style={{ background: isProfit ? 'var(--rise-bg)' : 'var(--fall-bg)' }}
                                    >
                                        <div>
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{pos.stockName}</p>
                                            <p className="text-[var(--text-tertiary)] text-xs">
                                                {pos.quantity}주 · 평단 {pos.avgBuyPrice?.toLocaleString()}원 · 평가 {evalAmount.toLocaleString()}원
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[var(--text-primary)] text-sm">{pos.currentPrice?.toLocaleString()}원</p>
                                            <p className={`text-xs font-medium ${isProfit ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                                {isProfit ? '+' : ''}{pos.pnlRate?.toFixed(2)}% ({isProfit ? '+' : ''}{pos.pnl?.toLocaleString()}원)
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 당일 매매 요약 */}
                {trades.length > 0 && (
                    <div className="card p-4 rounded">
                        <h2 className="text-[var(--text-primary)] text-sm font-medium mb-3">매매 요약</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">총 체결</p>
                                <p className="text-[var(--text-primary)] text-sm font-medium">{trades.length}건</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">매수 / 매도</p>
                                <p className="text-[var(--text-primary)] text-sm font-medium">
                                    <span className="text-[var(--rise-color)]">{buyTrades.length}</span>
                                    {' / '}
                                    <span className="text-[var(--fall-color)]">{sellTrades.length}</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">총 매수금액</p>
                                <p className="text-[var(--rise-color)] text-sm font-medium">{totalBuyAmount.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">총 매도금액</p>
                                <p className="text-[var(--fall-color)] text-sm font-medium">{totalSellAmount.toLocaleString()}원</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 체결 내역 상세 */}
                <div className="card rounded overflow-hidden">
                    <div className="px-4 pt-4 pb-3">
                        <h2 className="text-[var(--text-primary)] text-sm font-medium">체결 내역</h2>
                    </div>
                    {trades.length === 0 ? (
                        <p className="text-[var(--text-tertiary)] text-sm px-4 pb-4">이 날 체결 내역이 없습니다.</p>
                    ) : (
                        <div>
                            {tradesByHour.map(({ hour, trades: hourTrades }) => (
                                <div key={hour}>
                                    {/* 시간대 구분선 */}
                                    <div className="text-[11px] text-[var(--text-tertiary)] font-semibold px-3 py-1.5 bg-[var(--bg-secondary)]">
                                        {hour}시
                                    </div>
                                    {hourTrades.map((trade) => {
                                        const isBuy = trade.ioBuySell.includes('매수');
                                        const time = trade.orderTime
                                            ? `${trade.orderTime.slice(0, 2)}:${trade.orderTime.slice(2, 4)}:${trade.orderTime.slice(4, 6)}`
                                            : '';
                                        const amount = trade.filledPrice * trade.filledQty;

                                        return (
                                            <div key={trade.orderNo} className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] last:border-0">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                        isBuy ? 'bg-[var(--rise-color)]/10 text-[var(--rise-color)]' : 'bg-[var(--fall-color)]/10 text-[var(--fall-color)]'
                                                    }`}>
                                                        {isBuy ? '매수' : '매도'}
                                                    </span>
                                                    <div>
                                                        <p className="text-[var(--text-primary)] text-sm font-medium">{trade.stockName}</p>
                                                        <p className="text-[var(--text-tertiary)] text-xs">
                                                            {time} · {trade.tradeType} · 주문번호 {trade.orderNo}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[var(--text-primary)] text-sm font-medium">
                                                        {trade.filledPrice.toLocaleString()}원 × {trade.filledQty}주
                                                    </p>
                                                    <p className="text-[var(--text-tertiary)] text-xs">
                                                        체결금액 {amount.toLocaleString()}원
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
