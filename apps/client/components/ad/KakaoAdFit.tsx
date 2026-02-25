'use client';

import { useEffect, useRef } from 'react';

interface KakaoAdFitProps {
    adUnit: string;
    width: number;
    height: number;
    className?: string;
}

export default function KakaoAdFit({ adUnit, width, height, className }: KakaoAdFitProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        const container = containerRef.current;

        const ins = document.createElement('ins');
        ins.className = 'kakao_ad_area';
        ins.style.display = 'none';
        ins.setAttribute('data-ad-unit', adUnit);
        ins.setAttribute('data-ad-width', String(width));
        ins.setAttribute('data-ad-height', String(height));

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
        script.async = true;

        if (container) {
            container.appendChild(ins);
            container.appendChild(script);
        }

        return () => {
            if (container) {
                container.innerHTML = '';
            }
            loadedRef.current = false;
        };
    }, [adUnit, width, height]);

    return <div ref={containerRef} className={className} />;
}
