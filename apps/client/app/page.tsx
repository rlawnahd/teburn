import { Suspense } from 'react';
import HomeContent from '@/components/home/HomeContent';

export const dynamic = 'force-dynamic';

function HomeLoading() {
    return (
        <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
            <div className="text-[13px] text-[var(--text-tertiary)]">로딩 중...</div>
        </div>
    );
}

export default function HomePage() {
    return (
        <Suspense fallback={<HomeLoading />}>
            <HomeContent />
        </Suspense>
    );
}
