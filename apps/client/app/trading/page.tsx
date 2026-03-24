'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { fetchTradeHistory, KiwoomTrade } from '@/lib/api/trading';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function TradingPage() {
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        try {
            const { data } = await axios.post(`${API_URL}/trading/auth`, { password });
            if (data.success) {
                setAuthenticated(true);
                setError('');
            }
        } catch {
            setError('비밀번호가 틀렸습니다.');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
                <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-6 w-full max-w-sm">
                    <h1 className="text-[var(--text-primary)] text-lg font-bold mb-4">매매일지</h1>
                    <p className="text-[var(--text-tertiary)] text-sm mb-4">비밀번호를 입력하세요.</p>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="비밀번호"
                        className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm mb-3 outline-none focus:border-[var(--text-tertiary)]"
                    />
                    {error && <p className="text-[var(--fall-color)] text-xs mb-3">{error}</p>}
                    <button
                        onClick={handleLogin}
                        className="w-full py-2 rounded-md bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-medium"
                    >
                        확인
                    </button>
                </div>
            </div>
        );
    }

    return <TradingJournal password={password} />;
}

function TradingJournal({ password }: { password: string }) {
    const { data: accountData } = useQuery({
        queryKey: ['tradingAccount', password],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/trading/account`, {
                headers: { 'x-trading-password': password },
            });
            return data.data;
        },
        refetchInterval: 60 * 1000,
    });

    const { data: historyData } = useQuery({
        queryKey: ['tradeHistory', password],
        queryFn: async () => {
            const { data } = await axios.get(`${API_URL}/trading/history`, {
                headers: { 'x-trading-password': password },
            });
            return data.data;
        },
        refetchInterval: 60 * 1000,
    });

    const account = accountData?.account;
    const trades: KiwoomTrade[] = historyData?.trades || [];

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            <div className="max-w-[1280px] mx-auto p-3 space-y-3">
                <h1 className="text-[var(--text-primary)] text-lg font-bold">매매일지</h1>

                {/* 계좌 현황 */}
                {account && (
                    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
                        <h2 className="text-[var(--text-primary)] text-sm font-medium mb-3">계좌 현황</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">총 평가</p>
                                <p className="text-[var(--text-primary)] text-sm font-medium">{account.totalValue?.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">현금</p>
                                <p className="text-[var(--text-primary)] text-sm font-medium">{account.cash?.toLocaleString()}원</p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">총 손익</p>
                                <p className={`text-sm font-medium ${(account.totalPnl || 0) >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {(account.totalPnl || 0) >= 0 ? '+' : ''}{account.totalPnl?.toLocaleString()}원
                                </p>
                            </div>
                            <div>
                                <p className="text-[var(--text-tertiary)] text-xs">수익률</p>
                                <p className={`text-sm font-medium ${(account.totalPnlRate || 0) >= 0 ? 'text-[var(--rise-color)]' : 'text-[var(--fall-color)]'}`}>
                                    {(account.totalPnlRate || 0) >= 0 ? '+' : ''}{account.totalPnlRate?.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 보유 종목 */}
                {account?.positions && account.positions.length > 0 && (
                    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
                        <h2 className="text-[var(--text-primary)] text-sm font-medium mb-3">보유 종목</h2>
                        <div className="space-y-2">
                            {account.positions.map((pos: any) => {
                                const isProfit = (pos.pnl || 0) >= 0;
                                return (
                                    <div key={pos.stockCode} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                                        <div>
                                            <p className="text-[var(--text-primary)] text-sm font-medium">{pos.stockName}</p>
                                            <p className="text-[var(--text-tertiary)] text-xs">{pos.quantity}주 · 평단 {pos.avgBuyPrice?.toLocaleString()}원</p>
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

                {/* 오늘 체결 내역 */}
                <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-4">
                    <h2 className="text-[var(--text-primary)] text-sm font-medium mb-3">오늘 체결 내역</h2>
                    {trades.length === 0 ? (
                        <p className="text-[var(--text-tertiary)] text-sm">오늘 체결 내역이 없습니다.</p>
                    ) : (
                        <div className="space-y-1">
                            {trades.map((trade) => {
                                const isBuy = trade.ioBuySell.includes('매수');
                                const time = trade.orderTime
                                    ? `${trade.orderTime.slice(0, 2)}:${trade.orderTime.slice(2, 4)}:${trade.orderTime.slice(4, 6)}`
                                    : '';
                                return (
                                    <div key={trade.orderNo} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                                isBuy ? 'bg-[var(--rise-color)]/10 text-[var(--rise-color)]' : 'bg-[var(--fall-color)]/10 text-[var(--fall-color)]'
                                            }`}>
                                                {isBuy ? '매수' : '매도'}
                                            </span>
                                            <div>
                                                <p className="text-[var(--text-primary)] text-sm">{trade.stockName}</p>
                                                <p className="text-[var(--text-tertiary)] text-xs">{time}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[var(--text-primary)] text-sm">{trade.filledPrice.toLocaleString()}원</p>
                                            <p className="text-[var(--text-tertiary)] text-xs">
                                                {trade.filledQty}주 · {(trade.filledPrice * trade.filledQty).toLocaleString()}원
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
