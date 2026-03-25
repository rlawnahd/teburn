'use client';

import { useRealtimeConnection } from '@/hooks/useRealtimePrice';

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
    useRealtimeConnection();
    return <>{children}</>;
}
