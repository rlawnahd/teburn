/**
 * 거래대금 포맷 (만/억/조)
 */
export function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 10000) return `${(billion / 10000).toFixed(1)}조`;
    if (billion >= 1) return `${billion.toFixed(0)}억`;
    return `${(value / 10000).toFixed(0)}만`;
}

/**
 * 거래량 포맷 (만/억)
 */
export function formatVolume(value: number): string {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
    if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
    return value.toLocaleString();
}

/**
 * 상대 시간 포맷 (방금 전, N분 전, ...)
 */
export function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 데이터 날짜 포맷 (3월 18일 14:30)
 */
export function formatDataDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
    })} ${date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}
