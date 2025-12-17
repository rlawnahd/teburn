'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// 실시간 가격 데이터 타입
export interface RealtimePrice {
    stockCode: string;
    stockName: string;
    currentPrice: number;
    changePrice: number;
    changeRate: number;
    volume: number;
    tradingValue: number;  // 거래대금 (currentPrice × volume)
    tradeTime: string;
}

// 테마별 실시간 가격
export interface ThemeRealtimePrice {
    themeName: string;
    avgChangeRate: number;
    prices: RealtimePrice[];
    updatedAt: string;
}

// 장 상태 타입
export type MarketStatus = 'pre_market' | 'regular' | 'post_market' | 'closed';

export interface MarketStatusInfo {
    status: MarketStatus;
    statusText: string;
    isOpen: boolean;
    nextOpenTime?: string;
    closeTime?: string;
}

// 서버 응답 타입
interface ThemePricesResponse {
    themes: ThemeRealtimePrice[];
    marketStatus: MarketStatusInfo;
    lastUpdateTime: string | null;
    cachedStockCount: number;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function useRealtimeStockPrices() {
    const [themePrices, setThemePrices] = useState<ThemeRealtimePrice[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [marketStatus, setMarketStatus] = useState<MarketStatusInfo | null>(null);
    const [cachedStockCount, setCachedStockCount] = useState(0);

    useEffect(() => {
        // 소켓 연결 (싱글톤)
        if (!socket) {
            socket = io(SOCKET_URL, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
        }

        const handleConnect = () => {
            console.log('📈 실시간 주가 소켓 연결됨');
            setIsConnected(true);
            // 주가 구독 요청
            socket?.emit('subscribeStockPrices');
        };

        const handleDisconnect = () => {
            console.log('📉 실시간 주가 소켓 연결 끊김');
            setIsConnected(false);
        };

        const handleThemePricesUpdate = (data: ThemePricesResponse | ThemeRealtimePrice[]) => {
            // 새 형식 (ThemePricesResponse) 또는 이전 형식 (ThemeRealtimePrice[]) 지원
            if (Array.isArray(data)) {
                // 이전 형식 (하위 호환성)
                setThemePrices(data);
            } else {
                // 새 형식
                setThemePrices(data.themes);
                setMarketStatus(data.marketStatus);
                setCachedStockCount(data.cachedStockCount);
                if (data.lastUpdateTime) {
                    setLastUpdate(new Date(data.lastUpdateTime));
                }
            }
            // 로컬 업데이트 시간도 설정
            if (!lastUpdate) {
                setLastUpdate(new Date());
            }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('themePricesUpdate', handleThemePricesUpdate);

        // 이미 연결된 상태면 구독 요청
        if (socket.connected) {
            setIsConnected(true);
            socket.emit('subscribeStockPrices');
        }

        return () => {
            socket?.emit('unsubscribeStockPrices');
            socket?.off('connect', handleConnect);
            socket?.off('disconnect', handleDisconnect);
            socket?.off('themePricesUpdate', handleThemePricesUpdate);
        };
    }, []);

    // 테마별 가격 맵
    const priceMap = new Map(themePrices.map((t) => [t.themeName, t]));

    // 특정 테마 가격 조회
    const getThemePrice = useCallback(
        (themeName: string) => priceMap.get(themeName),
        [themePrices]
    );

    return {
        themePrices,
        priceMap,
        getThemePrice,
        isConnected,
        lastUpdate,
        marketStatus,
        cachedStockCount,
    };
}
