'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FolderTree,
    Plus,
    Search,
    RefreshCw,
    Trash2,
    Edit3,
    Eye,
    EyeOff,
    Database,
    Newspaper,
    TrendingUp,
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    AlertCircle,
    Users,
    UserPlus,
} from 'lucide-react';
import {
    fetchDashboard,
    fetchThemeList,
    fetchThemeDetail,
    createTheme,
    updateTheme,
    deleteTheme,
    toggleTheme,
    addStockToTheme,
    removeStockFromTheme,
    triggerCrawl,
    getCrawlStatus,
    refreshCache,
    fetchUserStats,
    ThemeListItem,
    ThemeDetail,
} from '@/lib/api/admin';
import { useAuth } from '@/hooks/useAuth';

type TabType = 'users' | 'data' | 'themes';

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ============================================
// 유저 탭
// ============================================
function UsersTab() {
    const { data: userStats, isLoading } = useQuery({
        queryKey: ['admin-user-stats'],
        queryFn: fetchUserStats,
        refetchInterval: 30000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-[var(--accent-blue)]" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <Users size={20} className="text-rose-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">전체 가입자</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {userStats?.total || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                            <UserPlus size={20} className="text-sky-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">오늘 가입</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {userStats?.today || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Calendar size={20} className="text-violet-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">이번 주</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {userStats?.week || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <TrendingUp size={20} className="text-amber-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">이번 달</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {userStats?.month || 0}
                    </div>
                </div>
            </div>

            {/* Provider 분포 */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">가입 경로</h3>
                <div className="flex gap-4">
                    {[
                        { label: '카카오', key: 'kakao', color: 'bg-yellow-500', bg: 'bg-yellow-500/10' },
                        { label: 'Google', key: 'google', color: 'bg-blue-500', bg: 'bg-blue-500/10' },
                        { label: '자체 가입', key: 'local', color: 'bg-emerald-500', bg: 'bg-emerald-500/10' },
                    ].map((p) => {
                        const count = userStats?.byProvider?.[p.key] || 0;
                        const total = userStats?.total || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                            <div key={p.key} className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-[var(--text-secondary)]">{p.label}</span>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 최근 가입자 */}
            {userStats?.recentUsers && userStats.recentUsers.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">최근 가입자</h3>
                    <div className="space-y-3">
                        {userStats.recentUsers.map((u, i) => (
                            <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border-color)] last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-[var(--text-primary)]">{u.name}</span>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                        u.provider === 'kakao' ? 'bg-yellow-500/10 text-yellow-600' :
                                        u.provider === 'google' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-emerald-500/10 text-emerald-500'
                                    }`}>
                                        {u.provider}
                                    </span>
                                </div>
                                <span className="text-sm text-[var(--text-tertiary)]">{formatDate(u.createdAt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// 데이터 탭
// ============================================
function DataTab() {
    const queryClient = useQueryClient();

    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: fetchDashboard,
        refetchInterval: 30000,
    });

    const { data: crawlStatus } = useQuery({
        queryKey: ['crawl-status'],
        queryFn: getCrawlStatus,
        refetchInterval: 5000,
    });

    const crawlMutation = useMutation({
        mutationFn: triggerCrawl,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crawl-status'] });
        },
    });

    const cacheMutation = useMutation({
        mutationFn: refreshCache,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-[var(--accent-blue)]" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-blue)]/10 flex items-center justify-center">
                            <FolderTree size={20} className="text-[var(--accent-blue)]" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">테마</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {dashboard?.themes.total || 0}
                    </div>
                    <div className="text-[13px] text-[var(--text-tertiary)] mt-1">
                        네이버 {dashboard?.themes.fromNaver || 0} / 커스텀 {dashboard?.themes.custom || 0}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <TrendingUp size={20} className="text-emerald-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">종목</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {dashboard?.stocks.unique || 0}
                    </div>
                    <div className="text-[13px] text-[var(--text-tertiary)] mt-1">
                        캐시 {dashboard?.stocks.cached ? '활성' : '비활성'}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                            <Newspaper size={20} className="text-violet-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">뉴스</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {dashboard?.news.total?.toLocaleString() || 0}
                    </div>
                    <div className="text-[13px] text-[var(--text-tertiary)] mt-1">
                        최근 {formatTime(dashboard?.news.lastCrawled || null)}
                    </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Calendar size={20} className="text-amber-500" />
                        </div>
                        <span className="text-sm text-[var(--text-tertiary)]">일별 기록</span>
                    </div>
                    <div className="text-3xl font-bold text-[var(--text-primary)]">
                        {dashboard?.dailyLeading.days || 0}일
                    </div>
                </div>
            </div>

            {/* 수동 작업 */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">수동 작업</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => crawlMutation.mutate()}
                        disabled={crawlStatus?.isCrawling || crawlMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-blue)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        <RefreshCw size={16} className={crawlStatus?.isCrawling ? 'animate-spin' : ''} />
                        {crawlStatus?.isCrawling ? '크롤링 중...' : '테마 크롤링'}
                    </button>

                    <button
                        onClick={() => cacheMutation.mutate()}
                        disabled={cacheMutation.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        <Database size={16} className={cacheMutation.isPending ? 'animate-spin' : ''} />
                        {cacheMutation.isPending ? '갱신 중...' : '주가 캐시 갱신'}
                    </button>
                </div>

                {crawlMutation.isSuccess && (
                    <p className="text-sm text-emerald-500 mt-3">크롤링이 시작되었습니다.</p>
                )}
                {cacheMutation.isSuccess && (
                    <p className="text-sm text-emerald-500 mt-3">캐시 갱신이 시작되었습니다.</p>
                )}
            </div>

            {/* 마지막 업데이트 */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">마지막 업데이트</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-[var(--border-color)]">
                        <span className="text-[var(--text-tertiary)]">테마 크롤링</span>
                        <span className="text-[var(--text-secondary)]">{formatTime(dashboard?.lastThemeUpdate || null)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-[var(--text-tertiary)]">뉴스 크롤링</span>
                        <span className="text-[var(--text-secondary)]">{formatTime(dashboard?.news.lastCrawled || null)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// 테마 수정 모달
// ============================================
function ThemeEditModal({
    theme,
    onClose,
    onSave,
}: {
    theme: ThemeDetail | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(theme?.name || '');
    const [keywords, setKeywords] = useState(theme?.keywords?.join(', ') || '');
    const [newStockName, setNewStockName] = useState('');
    const [newStockCode, setNewStockCode] = useState('');
    const [error, setError] = useState('');

    const isNew = !theme;

    const saveMutation = useMutation({
        mutationFn: async () => {
            const data = {
                name,
                keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
            };

            if (isNew) {
                return createTheme(data);
            } else {
                return updateTheme(theme._id, data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
            onSave();
        },
        onError: (err: Error) => {
            setError(err.message);
        },
    });

    const addStockMutation = useMutation({
        mutationFn: () => addStockToTheme(theme!._id, { name: newStockName, code: newStockCode }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-theme', theme!._id] });
            setNewStockName('');
            setNewStockCode('');
        },
        onError: (err: Error) => {
            setError(err.message);
        },
    });

    const removeStockMutation = useMutation({
        mutationFn: (stockName: string) => removeStockFromTheme(theme!._id, stockName),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-theme', theme!._id] });
        },
    });

    // 실시간 테마 데이터 조회 (수정 모드일 때)
    const { data: liveTheme } = useQuery({
        queryKey: ['admin-theme', theme?._id],
        queryFn: () => fetchThemeDetail(theme!._id),
        enabled: !!theme?._id,
    });

    const displayTheme = liveTheme || theme;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                        {isNew ? '새 테마 추가' : '테마 수정'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-5 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* 테마명 */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            테마명 *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="예: 트럼프 수혜주"
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        />
                    </div>

                    {/* 키워드 */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            키워드 (쉼표로 구분)
                        </label>
                        <input
                            type="text"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder="예: 트럼프, 미국, 관세"
                            className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        />
                    </div>

                    {/* 종목 관리 (수정 모드에서만) */}
                    {!isNew && displayTheme && (
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                종목 ({displayTheme.stocks?.length || 0}개)
                            </label>

                            {/* 종목 추가 */}
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newStockName}
                                    onChange={(e) => setNewStockName(e.target.value)}
                                    placeholder="종목명"
                                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                />
                                <input
                                    type="text"
                                    value={newStockCode}
                                    onChange={(e) => setNewStockCode(e.target.value)}
                                    placeholder="종목코드"
                                    className="w-28 px-3 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                                />
                                <button
                                    onClick={() => addStockMutation.mutate()}
                                    disabled={!newStockName || addStockMutation.isPending}
                                    className="px-4 py-2 rounded-xl bg-[var(--accent-blue)] text-white text-sm font-medium disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* 종목 목록 */}
                            <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-[var(--border-color)] p-2">
                                {displayTheme.stocks?.length === 0 ? (
                                    <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                                        등록된 종목이 없습니다
                                    </p>
                                ) : (
                                    displayTheme.stocks?.map((stock, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-tertiary)]"
                                        >
                                            <div>
                                                <span className="text-sm text-[var(--text-primary)]">{stock.name}</span>
                                                {stock.code && (
                                                    <span className="text-[13px] text-[var(--text-tertiary)] ml-2">
                                                        ({stock.code})
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeStockMutation.mutate(stock.name)}
                                                disabled={removeStockMutation.isPending}
                                                className="w-6 h-6 rounded flex items-center justify-center text-red-500 hover:bg-red-500/10"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-color)]">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]"
                    >
                        취소
                    </button>
                    <button
                        onClick={() => saveMutation.mutate()}
                        disabled={!name.trim() || saveMutation.isPending}
                        className="px-5 py-2.5 rounded-xl bg-[var(--accent-blue)] text-white text-sm font-medium disabled:opacity-50"
                    >
                        {saveMutation.isPending ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// 테마 관리 탭
// ============================================
function ThemesTab() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'custom' | 'naver'>('all');
    const [page, setPage] = useState(1);
    const [editingTheme, setEditingTheme] = useState<ThemeDetail | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-themes', search, filter, page],
        queryFn: () =>
            fetchThemeList({
                search: search || undefined,
                isCustom: filter === 'custom' ? true : filter === 'naver' ? false : undefined,
                page,
                limit: 20,
            }),
    });

    const toggleMutation = useMutation({
        mutationFn: toggleTheme,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTheme,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-themes'] });
        },
    });

    const handleEdit = async (theme: ThemeListItem) => {
        const detail = await fetchThemeDetail(theme._id);
        setEditingTheme(detail);
    };

    return (
        <div className="space-y-5">
            {/* 검색 & 필터 */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="테마명 검색..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    />
                </div>

                <div className="flex gap-2">
                    {(['all', 'naver', 'custom'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                setFilter(f);
                                setPage(1);
                            }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                filter === f
                                    ? 'bg-[var(--accent-blue)] text-white'
                                    : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                            {f === 'all' ? '전체' : f === 'naver' ? '네이버' : '커스텀'}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} />
                    새 테마
                </button>
            </div>

            {/* 테마 목록 */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="animate-spin text-[var(--accent-blue)]" size={24} />
                </div>
            ) : (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                                <th className="text-left px-4 py-3 text-[13px] font-medium text-[var(--text-tertiary)]">테마명</th>
                                <th className="text-center px-4 py-3 text-[13px] font-medium text-[var(--text-tertiary)]">종목 수</th>
                                <th className="text-center px-4 py-3 text-[13px] font-medium text-[var(--text-tertiary)]">유형</th>
                                <th className="text-center px-4 py-3 text-[13px] font-medium text-[var(--text-tertiary)]">상태</th>
                                <th className="text-right px-4 py-3 text-[13px] font-medium text-[var(--text-tertiary)]">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {data?.themes.map((theme) => (
                                <tr key={theme._id} className="hover:bg-[var(--bg-tertiary)]/50">
                                    <td className="px-4 py-3">
                                        <span className={`font-medium ${theme.isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)] line-through'}`}>
                                            {theme.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-[var(--text-secondary)]">
                                        {theme.stockCount}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-[13px] px-2 py-1 rounded-full ${
                                            theme.isCustom
                                                ? 'bg-violet-500/10 text-violet-500'
                                                : 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                                        }`}>
                                            {theme.isCustom ? '커스텀' : '네이버'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => toggleMutation.mutate(theme._id)}
                                            disabled={toggleMutation.isPending}
                                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                                theme.isActive
                                                    ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--border-color)]'
                                            }`}
                                        >
                                            {theme.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleEdit(theme)}
                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-blue)]"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            {theme.isCustom && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`"${theme.name}" 테마를 삭제하시겠습니까?`)) {
                                                            deleteMutation.mutate(theme._id);
                                                        }
                                                    }}
                                                    disabled={deleteMutation.isPending}
                                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-500"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 페이지네이션 */}
                    {data && data.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
                            <span className="text-sm text-[var(--text-tertiary)]">
                                총 {data.pagination.total}개 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, data.pagination.total)}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--border-color)] disabled:opacity-50"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-sm text-[var(--text-secondary)]">
                                    {page} / {data.pagination.totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page === data.pagination.totalPages}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center border border-[var(--border-color)] disabled:opacity-50"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 수정/추가 모달 */}
            {(editingTheme || isAddingNew) && (
                <ThemeEditModal
                    theme={isAddingNew ? null : editingTheme}
                    onClose={() => {
                        setEditingTheme(null);
                        setIsAddingNew(false);
                    }}
                    onSave={() => {
                        setEditingTheme(null);
                        setIsAddingNew(false);
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// 메인 페이지
// ============================================
export default function AdminPage() {
    const { user, isLoggedIn, isLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('users');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
                <RefreshCw className="animate-spin text-[var(--accent-blue)]" size={24} />
            </div>
        );
    }
    if (!isLoggedIn || user?.provider !== 'local' || user?.name !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
                <div className="text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)] mb-2">접근 권한이 없습니다</p>
                    <p className="text-sm text-[var(--text-tertiary)]">관리자 계정으로 로그인해주세요.</p>
                </div>
            </div>
        );
    }

    const tabs: { key: TabType; label: string }[] = [
        { key: 'users', label: '유저' },
        { key: 'data', label: '데이터' },
        { key: 'themes', label: '테마 관리' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 탭 바 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 py-2">
                    <span className="text-sm font-bold text-[var(--text-primary)] mr-4">어드민</span>
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                                activeTab === tab.key
                                    ? 'bg-[var(--accent-blue)] text-white'
                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 컨텐츠 */}
            <main className="max-w-5xl mx-auto p-4">
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'data' && <DataTab />}
                {activeTab === 'themes' && <ThemesTab />}
            </main>
        </div>
    );
}
