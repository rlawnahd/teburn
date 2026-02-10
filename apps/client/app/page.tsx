'use client';

import { Suspense, useState, useEffect } from 'react';
import HomeContent from '@/components/home/HomeContent';
import LandingPage from '@/components/home/LandingPage';

function HomeLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-tertiary)]">로딩 중...</div>
        </div>
    );
}

export default function HomePage() {
    const [showLanding, setShowLanding] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 세션 중 재방문 시엔 바로 대시보드
        const visited = sessionStorage.getItem('teburn-visited');
        if (!visited) {
            setShowLanding(true);
        }
    }, []);

    const handleEnter = () => {
        sessionStorage.setItem('teburn-visited', '1');
        setShowLanding(false);
    };

    if (!mounted) {
        return <HomeLoading />;
    }

    return (
        <>
            {showLanding && <LandingPage onEnter={handleEnter} />}
            <Suspense fallback={<HomeLoading />}>
                <HomeContent />
            </Suspense>
        </>
    );
}
