// 장 상태 관련 유틸리티

export type MarketStatus = 'pre_market' | 'regular' | 'post_market' | 'closed';

export interface MarketStatusInfo {
    status: MarketStatus;
    statusText: string;
    isOpen: boolean;
    nextOpenTime?: string;
    closeTime?: string;
}

// 한국 시간대 (UTC+9)
const KST_OFFSET = 9 * 60 * 60 * 1000;

function getKSTDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + KST_OFFSET);
}

function getTimeInMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
}

export function getMarketStatus(): MarketStatusInfo {
    const kstNow = getKSTDate();
    const dayOfWeek = kstNow.getDay(); // 0: 일요일, 6: 토요일
    const timeInMinutes = getTimeInMinutes(kstNow);

    // 주말 체크
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
            status: 'closed',
            statusText: '주말 휴장',
            isOpen: false,
            nextOpenTime: '월요일 09:00',
        };
    }

    // 시간대별 장 상태 (분 단위로 계산)
    const PRE_MARKET_START = 8 * 60 + 30;  // 08:30
    const REGULAR_START = 9 * 60;           // 09:00
    const REGULAR_END = 15 * 60 + 30;       // 15:30
    const POST_MARKET_START = 15 * 60 + 40; // 15:40
    const POST_MARKET_END = 16 * 60;        // 16:00

    if (timeInMinutes < PRE_MARKET_START) {
        return {
            status: 'closed',
            statusText: '장 시작 전',
            isOpen: false,
            nextOpenTime: '08:30',
        };
    }

    if (timeInMinutes >= PRE_MARKET_START && timeInMinutes < REGULAR_START) {
        return {
            status: 'pre_market',
            statusText: '장전 시간외',
            isOpen: true,
            closeTime: '09:00 정규장 시작',
        };
    }

    if (timeInMinutes >= REGULAR_START && timeInMinutes < REGULAR_END) {
        return {
            status: 'regular',
            statusText: '정규장',
            isOpen: true,
            closeTime: '15:30',
        };
    }

    if (timeInMinutes >= REGULAR_END && timeInMinutes < POST_MARKET_START) {
        return {
            status: 'closed',
            statusText: '장 마감 (동시호가)',
            isOpen: false,
            nextOpenTime: '15:40',
        };
    }

    if (timeInMinutes >= POST_MARKET_START && timeInMinutes < POST_MARKET_END) {
        return {
            status: 'post_market',
            statusText: '장후 시간외',
            isOpen: true,
            closeTime: '16:00',
        };
    }

    return {
        status: 'closed',
        statusText: '장 마감',
        isOpen: false,
        nextOpenTime: '내일 08:30',
    };
}

export function formatLastUpdateTime(date: Date | null): string {
    if (!date) return '-';

    const kstNow = getKSTDate();
    const kstDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000) + KST_OFFSET);

    const diffMs = kstNow.getTime() - kstDate.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 10) return '방금 전';
    if (diffSec < 60) return `${diffSec}초 전`;
    if (diffMin < 60) return `${diffMin}분 전`;

    // 1시간 이상이면 시간 표시
    const hours = kstDate.getHours().toString().padStart(2, '0');
    const minutes = kstDate.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}
