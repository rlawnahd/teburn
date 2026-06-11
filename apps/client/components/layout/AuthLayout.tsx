'use client';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import KakaoAdFit from '@/components/ad/KakaoAdFit';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const { isLoggedIn, isLoading } = useAuth();

    // 로딩 중이거나 비로그인 → 헤더/푸터/광고 숨김 (랜딩 페이지에서 자체 처리)
    if (isLoading || !isLoggedIn) {
        return <>{children}</>;
    }

    return (
        <>
            <Header />
            {children}
            <aside className="hidden xl:block fixed right-4 top-10 z-10">
                <KakaoAdFit adUnit="DAN-wGcNGCgZbNV7h6Oa" width={160} height={600} />
            </aside>
            <div className="xl:hidden flex justify-center py-4">
                <KakaoAdFit adUnit="DAN-2f3e80wfJpcTWx5H" width={320} height={100} />
            </div>
            <Footer />
        </>
    );
}
