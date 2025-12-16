'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { NewsItem } from '@/lib/api/news';

interface AnalyzedNewsUpdate {
    link: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    aiReason: string;
    stocks: string[];
    themes: string[];
    score: number;
}

export function useRealtimeNews(initialNews: NewsItem[] = []) {
    const [news, setNews] = useState<NewsItem[]>(initialNews);
    const [isConnected, setIsConnected] = useState(false);

    // 초기 데이터가 변경되면 상태 업데이트
    useEffect(() => {
        if (initialNews.length > 0) {
            setNews(initialNews);
        }
    }, [initialNews]);

    // 새 뉴스 추가 핸들러
    const handleNewNews = useCallback((newNews: NewsItem[]) => {
        console.log('📰 실시간 뉴스 수신:', newNews.length, '개');
        setNews((prev) => {
            // 중복 제거 (link 기준)
            const existingLinks = new Set(prev.map((n) => n.link));
            const uniqueNewNews = newNews.filter((n) => !existingLinks.has(n.link));

            if (uniqueNewNews.length === 0) return prev;

            // 새 뉴스를 맨 앞에 추가
            return [...uniqueNewNews, ...prev];
        });
    }, []);

    // AI 분석 완료 핸들러
    const handleNewsAnalyzed = useCallback((update: AnalyzedNewsUpdate) => {
        console.log('🤖 AI 분석 완료:', update.link.substring(0, 50));
        setNews((prev) =>
            prev.map((item) =>
                item.link === update.link
                    ? {
                          ...item,
                          sentiment: update.sentiment,
                          aiReason: update.aiReason,
                          stocks: update.stocks,
                          themes: update.themes,
                          score: update.score,
                          isDetailed: true, // AI 분석 완료되면 상세로 표시
                      }
                    : item
            )
        );
    }, []);

    useEffect(() => {
        const socket = getSocket();

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // 새 뉴스 이벤트 리스너
        socket.on('newNews', handleNewNews);

        // AI 분석 완료 이벤트 리스너
        socket.on('newsAnalyzed', handleNewsAnalyzed);

        // 초기 연결 상태 확인
        setIsConnected(socket.connected);

        return () => {
            socket.off('newNews', handleNewNews);
            socket.off('newsAnalyzed', handleNewsAnalyzed);
            // 컴포넌트 언마운트 시 연결 해제하지 않음 (다른 페이지에서도 사용할 수 있음)
        };
    }, [handleNewNews, handleNewsAnalyzed]);

    return {
        news,
        isConnected,
        disconnect: disconnectSocket,
    };
}
