'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    // useState로 감싸서 싱글톤처럼 유지
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1분 동안은 데이터가 신선하다고 판단 (재요청 안 함)
                        retry: 1, // 실패시 1번만 재시도
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* 개발모드에서 쿼리 상태를 볼 수 있는 도구 */}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
