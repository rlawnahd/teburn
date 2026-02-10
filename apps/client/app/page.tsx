'use client';

import { Suspense, useState, useSyncExternalStore } from 'react';
import HomeContent from '@/components/home/HomeContent';
import LandingPage from '@/components/home/LandingPage';

const subscribe = () => () => {};
function useMounted() {
    return useSyncExternalStore(subscribe, () => true, () => false);
}

function HomeLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-tertiary)]">로딩 중...</div>
        </div>
    );
}

export default function HomePage() {
    const mounted = useMounted();
    const [showLanding, setShowLanding] = useState(() => {
        if (typeof window === 'undefined') return false;
        return !sessionStorage.getItem('teburn-visited');
    });

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
