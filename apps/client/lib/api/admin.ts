const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface UserStats {
    total: number;
    today: number;
    week: number;
    month: number;
    byProvider: Record<string, number>;
    recentUsers: { name: string; provider: string; createdAt: string }[];
}

export const fetchUserStats = async (): Promise<UserStats> => {
    const res = await fetch(`${API_BASE}/admin/users/stats`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user stats');
    return res.json();
};

// 시스템 상태 모니터링
export interface SystemStatus {
    market: { status: string; isHoliday: boolean };
    realtime: { wsClients: number; wsGlobalSubs: number; kisConnected: boolean; kisSubs: number; kisMaxSubs: number };
    hotStocks: { total: number; grades: Record<string, number> };
    priceCache: { themes: number; stocks: number; lastUpdate: string | null };
    freshness: { lastNews: string | null; lastThemeCrawl: string | null; todayVolumeSnapshots: number; todayLeadingSaved: boolean };
    db: { news: number; themes: number; volumeHistory: number; hotnessHistory: number; users: number };
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/admin/system-status`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
}

// 대시보드 데이터
export interface DashboardData {
    themes: {
        total: number;
        custom: number;
        fromNaver: number;
    };
    stocks: {
        unique: number;
        cached: boolean;
    };
    news: {
        total: number;
        lastCrawled: string | null;
    };
    history: {
        records: number;
    };
    dailyLeading: {
        days: number;
    };
    lastThemeUpdate: string | null;
}

export async function fetchDashboard(): Promise<DashboardData> {
    const res = await fetch(`${API_BASE}/admin/dashboard`, { credentials: 'include' });
    if (!res.ok) throw new Error('대시보드 조회 실패');
    return res.json();
}

// 테마 목록
export interface ThemeListItem {
    _id: string;
    name: string;
    naverCode: string;
    stockCount: number;
    isCustom: boolean;
    isActive: boolean;
    lastCrawledAt: string | null;
    createdAt: string;
}

export interface ThemeListResponse {
    themes: ThemeListItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export async function fetchThemeList(params?: {
    search?: string;
    isCustom?: boolean;
    isActive?: boolean;
    page?: number;
    limit?: number;
}): Promise<ThemeListResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.isCustom !== undefined) query.set('isCustom', String(params.isCustom));
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/admin/themes?${query}`, { credentials: 'include' });
    if (!res.ok) throw new Error('테마 목록 조회 실패');
    return res.json();
}

// 테마 상세
export interface ThemeStock {
    name: string;
    code: string;
}

export interface ThemeDetail {
    _id: string;
    name: string;
    naverCode: string;
    stocks: ThemeStock[];
    keywords: string[];
    isCustom: boolean;
    isActive: boolean;
    lastCrawledAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export async function fetchThemeDetail(id: string): Promise<ThemeDetail> {
    const res = await fetch(`${API_BASE}/admin/themes/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('테마 상세 조회 실패');
    return res.json();
}

// 테마 생성
export async function createTheme(data: {
    name: string;
    stocks?: ThemeStock[];
    keywords?: string[];
}): Promise<ThemeDetail> {
    const res = await fetch(`${API_BASE}/admin/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '테마 생성 실패');
    }
    return res.json();
}

// 테마 수정
export async function updateTheme(id: string, data: {
    name?: string;
    stocks?: ThemeStock[];
    keywords?: string[];
    isActive?: boolean;
}): Promise<ThemeDetail> {
    const res = await fetch(`${API_BASE}/admin/themes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '테마 수정 실패');
    }
    return res.json();
}

// 테마 삭제
export async function deleteTheme(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/themes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '테마 삭제 실패');
    }
}

// 테마 활성화/비활성화 토글
export async function toggleTheme(id: string): Promise<{ isActive: boolean }> {
    const res = await fetch(`${API_BASE}/admin/themes/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
    });
    if (!res.ok) throw new Error('테마 토글 실패');
    return res.json();
}

// 테마에 종목 추가
export async function addStockToTheme(themeId: string, stock: ThemeStock): Promise<ThemeDetail> {
    const res = await fetch(`${API_BASE}/admin/themes/${themeId}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(stock),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '종목 추가 실패');
    }
    return res.json();
}

// 테마에서 종목 삭제
export async function removeStockFromTheme(themeId: string, stockName: string): Promise<ThemeDetail> {
    const res = await fetch(`${API_BASE}/admin/themes/${themeId}/stocks/${encodeURIComponent(stockName)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '종목 삭제 실패');
    }
    return res.json();
}

// 수동 크롤링 실행
export async function triggerCrawl(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/crawl/themes`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '크롤링 시작 실패');
    }
    return res.json();
}

// 크롤링 상태 확인
export async function getCrawlStatus(): Promise<{ isCrawling: boolean }> {
    const res = await fetch(`${API_BASE}/admin/crawl/status`, { credentials: 'include' });
    if (!res.ok) throw new Error('크롤링 상태 조회 실패');
    return res.json();
}

// 캐시 갱신
export async function refreshCache(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/admin/cache/refresh`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!res.ok) throw new Error('캐시 갱신 실패');
    return res.json();
}
