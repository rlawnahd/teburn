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
    timestamp: number;
}

type PriceCallback = (update: PriceUpdate) => void;
type HotnessCallback = (update: HotnessUpdate) => void;

let ws: WebSocket | null = null;
let wsToken: string | null = null;
const priceListeners = new Set<PriceCallback>();
const hotnessListeners = new Set<HotnessCallback>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let isConnecting = false;

function connect(token: string): void {
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) return;
    isConnecting = true;
    wsToken = token;

    ws = new WebSocket(`${WS_URL}/ws`);

    ws.onopen = () => {
        isConnecting = false;
        reconnectDelay = 1000;
        ws!.send(JSON.stringify({ type: 'auth', token }));
    };

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
        if (wsToken) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                if (wsToken) connect(wsToken);
            }, reconnectDelay);
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        }
    };

    ws.onerror = () => {
        isConnecting = false;
    };
}

function disconnect(): void {
    wsToken = null;
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

export function useRealtimeConnection(): void {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (!isLoggedIn) {
            disconnect();
            return;
        }
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/ws-token`, {
            credentials: 'include',
        })
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    connect(data.token);
                }
            })
            .catch(() => {});

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

export function useStockSubscription(stockCode: string): void {
    const { isLoggedIn } = useAuth();

    useEffect(() => {
        if (!isLoggedIn || !stockCode) return;
        subscribe(stockCode);
        return () => unsubscribe(stockCode);
    }, [isLoggedIn, stockCode]);
}
