'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export interface PriceUpdate {
    stockCode: string;
    price: number;
    changeRate: number;
    volume: number;
    timestamp: number;
}

export interface HotnessUpdate {
    stockCode: string;
    totalScore: number;
    grade: string;
    tradingValueScore: number;
    momentumScore: number;
    volumeScore: number;
    newsScore: number;
    themeConcentrationScore: number;
    streakScore: number;
    streakDays: number;
    timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;
type HotnessCallback = (update: HotnessUpdate) => void;

let ws: WebSocket | null = null;
let currentMode: 'authenticated' | 'anonymous' | null = null;
const priceListeners = new Set<PriceCallback>();
const hotnessListeners = new Set<HotnessCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let isConnecting = false;

function connectWithToken(token: string): void {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    isConnecting = true;
    currentMode = 'authenticated';

    ws = new WebSocket(`${WS_URL}/ws`);
    ws.onopen = () => {
        isConnecting = false;
        reconnectDelay = 1000;
        ws!.send(JSON.stringify({ type: 'auth', token }));
    };
    attachHandlers(() => {
        // Reconnect with token
        if (currentMode === 'authenticated') {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connectWithToken(token);
            }, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
    });
}

function connectAnonymous(): void {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    isConnecting = true;
    currentMode = 'anonymous';

    ws = new WebSocket(`${WS_URL}/ws`);
    ws.onopen = () => {
        isConnecting = false;
        reconnectDelay = 1000;
        ws!.send(JSON.stringify({ type: 'anonymous' }));
    };
    attachHandlers(() => {
        if (currentMode === 'anonymous') {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connectAnonymous();
            }, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
    });
}

function attachHandlers(onReconnect: () => void): void {
    if (!ws) return;

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'price') {
                for (const cb of priceListeners) cb(msg);
            } else if (msg.type === 'hotness') {
                for (const cb of hotnessListeners) cb(msg);
            } else if (msg.type === 'marketClosed') {
                disconnect();
            }
        } catch {}
    };

    ws.onclose = () => {
        isConnecting = false;
        ws = null;
        if (currentMode) onReconnect();
    };

    ws.onerror = () => {
        isConnecting = false;
    };
}

function disconnect(): void {
    currentMode = null;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
}

function subscribe(stockCode: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'subscribe', stockCode }));
    }
}

function unsubscribe(stockCode: string): void {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', stockCode }));
    }
}

/**
 * 항상 WebSocket 연결 시도.
 * 로그인 → JWT 인증 모드 (구독 가능)
 * 비로그인 → anonymous 모드 (broadcast 수신만)
 */
export function useRealtimeConnection(): void {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        disconnect();

        if (isLoggedIn) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/ws-token`, {
                credentials: 'include',
            })
                .then(r => r.json())
                .then(data => {
                    if (data.token) {
                        connectWithToken(data.token);
                    } else {
                        connectAnonymous();
                    }
                })
                .catch(() => connectAnonymous());
        } else {
            connectAnonymous();
        }

        return () => disconnect();
    }, [isLoggedIn]);
}

export function useOnPriceUpdate(callback: PriceCallback): void {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        const handler: PriceCallback = (update) => cbRef.current(update);
        priceListeners.add(handler);
        return () => { priceListeners.delete(handler); };
    }, []);
}

export function useOnHotnessUpdate(callback: HotnessCallback): void {
    const cbRef = useRef(callback);
    cbRef.current = callback;

    useEffect(() => {
        const handler: HotnessCallback = (update) => cbRef.current(update);
        hotnessListeners.add(handler);
        return () => { hotnessListeners.delete(handler); };
    }, []);
}

/**
 * 종목 개별 구독. 인증 유저만 동작 (서버에서 anonymous 구독 무시).
 * 비로그인도 globalSubscription에 포함된 종목은 broadcast로 자동 수신.
 */
export function useStockSubscription(stockCode: string): void {
    useEffect(() => {
        if (!stockCode) return;
        subscribe(stockCode);
        return () => unsubscribe(stockCode);
    }, [stockCode]);
}
