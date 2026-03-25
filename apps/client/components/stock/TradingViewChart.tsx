'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ui/ThemeProvider';

interface TradingViewChartProps {
    stockCode: string;
}

export default function TradingViewChart({ stockCode }: TradingViewChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            symbol: `KRX:${stockCode}`,
            width: '100%',
            height: '100%',
            autosize: true,
            interval: 'D',
            timezone: 'Asia/Seoul',
            theme: theme === 'dark' ? 'dark' : 'light',
            style: '1',
            locale: 'kr',
            hide_top_toolbar: false,
            hide_legend: false,
            allow_symbol_change: false,
            save_image: false,
            calendar: false,
            support_host: 'https://www.tradingview.com',
        });

        container.appendChild(script);

        return () => {
            container.innerHTML = '';
        };
    }, [stockCode, theme]);

    return (
        <div className="card overflow-hidden">
            <div className="h-[300px] sm:h-[400px]">
                <div ref={containerRef} className="tradingview-widget-container h-full" />
            </div>
        </div>
    );
}
