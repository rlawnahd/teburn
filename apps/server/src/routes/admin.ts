import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Theme from '../models/Theme';
import News from '../models/News';
import DailyLeadingTheme from '../models/DailyLeadingTheme';
import StockVolumeHistory from '../models/StockVolumeHistory';
import { updateAllThemes } from '../services/themeCrawler';
import { themePriceCache } from '../services/themePriceCache';
import { saveTodayVolumeHistory } from '../services/volumeSurgeService';
import { getHotStocksCache } from '../services/hotnessService';
import { getConnectedClientCount, getGlobalSubscriptionCount } from '../services/wsServer';
import { getKisConnectionStatus, getKisSubscriptionCount } from '../services/kisWebSocket';
import { getMarketStatus } from '../utils/marketStatus';
import HotnessHistory from '../models/HotnessHistory';

const router = Router();
const KST_OFFSET = 9 * 60 * 60 * 1000;

function getKSTDayStart(daysAgo = 0): Date {
    const kstNow = new Date(Date.now() + KST_OFFSET);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth();
    const day = kstNow.getUTCDate() - daysAgo;
    return new Date(Date.UTC(year, month, day) - KST_OFFSET);
}

async function requireAdmin(req: AuthRequest, res: Response, next: any) {
    if (!req.user || req.user.provider !== 'local' || req.user.providerId !== 'admin') {
        return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    next();
}

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// 시스템 상태 모니터링
// ============================================
router.get('/system-status', async (req: AuthRequest, res: Response) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Price cache status
        const cacheStatus = themePriceCache.getAllThemePrices();

        // Hot stocks cache
        const hotStocks = getHotStocksCache();
        const gradeDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };
        hotStocks.forEach(s => {
            if (gradeDistribution[s.grade as keyof typeof gradeDistribution] !== undefined) {
                gradeDistribution[s.grade as keyof typeof gradeDistribution]++;
            }
        });

        // Data freshness
        const [latestNews, latestTheme, todayVolume, todayLeading] = await Promise.all([
            News.findOne().sort({ crawledAt: -1 }).select('crawledAt').lean(),
            Theme.findOne().sort({ lastCrawledAt: -1 }).select('lastCrawledAt').lean(),
            StockVolumeHistory.countDocuments({ date: { $gte: todayStart } }),
            DailyLeadingTheme.findOne({ date: { $gte: todayStart } }).lean(),
        ]);

        // DB document counts
        const [newsCount, themeCount, volumeCount, hotnessCount, userCount] = await Promise.all([
            News.countDocuments(),
            Theme.countDocuments({ isActive: true }),
            StockVolumeHistory.countDocuments(),
            HotnessHistory.countDocuments(),
            User.countDocuments(),
        ]);

        // Market status
        const marketStatus = getMarketStatus();

        // WebSocket & KIS status
        const wsClients = getConnectedClientCount();
        const wsGlobalSubs = getGlobalSubscriptionCount();
        const kisConnected = getKisConnectionStatus();
        const kisSubs = getKisSubscriptionCount();

        res.json({
            market: {
                status: marketStatus.status,
                isHoliday: (marketStatus as any).isHoliday || false,
            },
            realtime: {
                wsClients,
                wsGlobalSubs,
                kisConnected,
                kisSubs,
                kisMaxSubs: 40,
            },
            hotStocks: {
                total: hotStocks.length,
                grades: gradeDistribution,
            },
            priceCache: {
                themes: cacheStatus.themes.length,
                stocks: cacheStatus.cachedStockCount,
                lastUpdate: cacheStatus.lastUpdateTime || null,
            },
            freshness: {
                lastNews: (latestNews as any)?.crawledAt || null,
                lastThemeCrawl: (latestTheme as any)?.lastCrawledAt || null,
                todayVolumeSnapshots: todayVolume,
                todayLeadingSaved: !!todayLeading,
            },
            db: {
                news: newsCount,
                themes: themeCount,
                volumeHistory: volumeCount,
                hotnessHistory: hotnessCount,
                users: userCount,
            },
        });
    } catch (err) {
        console.error('시스템 상태 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러' });
    }
});

// ============================================
// 대시보드 - 데이터 현황
// ============================================
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
    try {
        const [
            themeCount,
            customThemeCount,
            newsCount,
            dailyLeadingCount,
            volumeHistoryCount,
        ] = await Promise.all([
            Theme.countDocuments({ isActive: true }),
            Theme.countDocuments({ isCustom: true, isActive: true }),
            News.countDocuments(),
            DailyLeadingTheme.countDocuments(),
            StockVolumeHistory.countDocuments(),
        ]);

        // 캐시 상태
        const cacheStatus = themePriceCache.getAllThemePrices();

        // 최근 뉴스
        const recentNews = await News.find()
            .sort({ crawledAt: -1 })
            .limit(1)
            .select('crawledAt');

        // 최근 테마 업데이트
        const recentTheme = await Theme.find()
            .sort({ lastCrawledAt: -1 })
            .limit(1)
            .select('lastCrawledAt');

        res.json({
            themes: {
                total: themeCount,
                custom: customThemeCount,
                fromNaver: themeCount - customThemeCount,
            },
            stocks: {
                unique: cacheStatus.cachedStockCount,
                cached: cacheStatus.themes.length > 0,
            },
            news: {
                total: newsCount,
                lastCrawled: recentNews[0]?.crawledAt || null,
            },
            dailyLeading: {
                days: dailyLeadingCount,
            },
            volumeHistory: {
                records: volumeHistoryCount,
            },
            lastThemeUpdate: recentTheme[0]?.lastCrawledAt || null,
        });
    } catch (error) {
        console.error('❌ 대시보드 조회 실패:', error);
        res.status(500).json({ error: '대시보드 조회 실패' });
    }
});

// ============================================
// 유저 통계
// ============================================
router.get('/users/stats', async (req: AuthRequest, res: Response) => {
    try {
        const todayStart = getKSTDayStart(0);
        const last7DaysStart = getKSTDayStart(6);
        const last30DaysStart = getKSTDayStart(29);
        const trend14DaysStart = getKSTDayStart(13);
        const userFilter = { $nor: [{ provider: 'local', providerId: 'admin' }] };

        const [
            totalUsers,
            todaySignups,
            weekSignups,
            monthSignups,
            activeToday,
            activeWeek,
            activeMonth,
            providerStats,
            trendRows,
        ] = await Promise.all([
            User.countDocuments(userFilter),
            User.countDocuments({ ...userFilter, createdAt: { $gte: todayStart } }),
            User.countDocuments({ ...userFilter, createdAt: { $gte: last7DaysStart } }),
            User.countDocuments({ ...userFilter, createdAt: { $gte: last30DaysStart } }),
            User.countDocuments({ ...userFilter, lastSeenAt: { $gte: todayStart } }),
            User.countDocuments({ ...userFilter, lastSeenAt: { $gte: last7DaysStart } }),
            User.countDocuments({ ...userFilter, lastSeenAt: { $gte: last30DaysStart } }),
            User.aggregate([
                { $match: userFilter },
                { $group: { _id: '$provider', count: { $sum: 1 } } },
            ]),
            User.aggregate([
                { $match: { ...userFilter, createdAt: { $gte: trend14DaysStart } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt',
                                timezone: 'Asia/Seoul',
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        const trendMap = new Map<string, number>(trendRows.map((row: any) => [row._id, row.count]));
        const signupTrend14d = Array.from({ length: 14 }, (_, index) => {
            const start = getKSTDayStart(13 - index);
            const label = new Date(start.getTime() + KST_OFFSET).toISOString().split('T')[0];
            return {
                date: label,
                count: trendMap.get(label) || 0,
            };
        });

        const recentUsers = await User.find(userFilter)
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name provider createdAt lastSeenAt')
            .lean();

        res.json({
            total: totalUsers,
            today: todaySignups,
            week: weekSignups,
            month: monthSignups,
            activeUsers: {
                today: activeToday,
                week: activeWeek,
                month: activeMonth,
                monthlyRate: totalUsers > 0 ? Math.round((activeMonth / totalUsers) * 100) : 0,
            },
            byProvider: Object.fromEntries(providerStats.map((p: any) => [p._id, p.count])),
            signupTrend14d,
            recentUsers: recentUsers.map((u: any) => ({
                name: u.name,
                provider: u.provider,
                createdAt: u.createdAt,
                lastSeenAt: u.lastSeenAt || null,
            })),
        });
    } catch (err) {
        console.error('유저 통계 에러:', err);
        res.status(500).json({ success: false, message: '서버 에러' });
    }
});

// ============================================
// 테마 목록 조회 (어드민용)
// ============================================
router.get('/themes', async (req: AuthRequest, res: Response) => {
    try {
        const { search, isCustom, isActive, page = 1, limit = 50 } = req.query;

        const filter: any = {};

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (isCustom !== undefined) {
            filter.isCustom = isCustom === 'true';
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [themes, total] = await Promise.all([
            Theme.find(filter)
                .sort({ isCustom: -1, name: 1 })
                .skip(skip)
                .limit(Number(limit))
                .select('name naverCode stocks isCustom isActive lastCrawledAt createdAt'),
            Theme.countDocuments(filter),
        ]);

        res.json({
            themes: themes.map(t => ({
                _id: t._id,
                name: t.name,
                naverCode: t.naverCode,
                stockCount: t.stocks?.length || 0,
                isCustom: t.isCustom,
                isActive: t.isActive,
                lastCrawledAt: t.lastCrawledAt,
                createdAt: t.createdAt,
            })),
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('❌ 테마 목록 조회 실패:', error);
        res.status(500).json({ error: '테마 목록 조회 실패' });
    }
});

// ============================================
// 테마 상세 조회
// ============================================
router.get('/themes/:id', async (req: AuthRequest, res: Response) => {
    try {
        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }
        res.json(theme);
    } catch (error) {
        console.error('❌ 테마 상세 조회 실패:', error);
        res.status(500).json({ error: '테마 상세 조회 실패' });
    }
});

// ============================================
// 커스텀 테마 생성
// ============================================
router.post('/themes', async (req: AuthRequest, res: Response) => {
    try {
        const { name, stocks, keywords } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: '테마명은 필수입니다' });
        }

        // 중복 체크
        const existing = await Theme.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json({ error: '이미 존재하는 테마명입니다' });
        }

        const theme = await Theme.create({
            name: name.trim(),
            naverCode: '',
            stocks: (stocks || []).map((s: any) => ({
                name: s.name,
                code: s.code || '',
            })),
            keywords: keywords || [],
            isCustom: true,
            isActive: true,
        });

        console.log(`✅ 커스텀 테마 생성: ${theme.name}`);
        res.status(201).json(theme);
    } catch (error) {
        console.error('❌ 테마 생성 실패:', error);
        res.status(500).json({ error: '테마 생성 실패' });
    }
});

// ============================================
// 테마 수정
// ============================================
router.put('/themes/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { name, stocks, keywords, isActive } = req.body;

        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }

        // 이름 변경 시 중복 체크
        if (name && name !== theme.name) {
            const existing = await Theme.findOne({ name: name.trim() });
            if (existing) {
                return res.status(400).json({ error: '이미 존재하는 테마명입니다' });
            }
            theme.name = name.trim();
        }

        if (stocks !== undefined) {
            theme.stocks = stocks.map((s: any) => ({
                name: s.name,
                code: s.code || '',
            }));
        }

        if (keywords !== undefined) {
            theme.keywords = keywords;
        }

        if (isActive !== undefined) {
            theme.isActive = isActive;
        }

        await theme.save();
        console.log(`✅ 테마 수정: ${theme.name}`);
        res.json(theme);
    } catch (error) {
        console.error('❌ 테마 수정 실패:', error);
        res.status(500).json({ error: '테마 수정 실패' });
    }
});

// ============================================
// 테마 삭제 (커스텀만 가능)
// ============================================
router.delete('/themes/:id', async (req: AuthRequest, res: Response) => {
    try {
        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }

        if (!theme.isCustom) {
            return res.status(400).json({
                error: '네이버 테마는 삭제할 수 없습니다. 비활성화를 사용하세요.'
            });
        }

        await theme.deleteOne();
        console.log(`🗑️ 커스텀 테마 삭제: ${theme.name}`);
        res.json({ message: '테마가 삭제되었습니다' });
    } catch (error) {
        console.error('❌ 테마 삭제 실패:', error);
        res.status(500).json({ error: '테마 삭제 실패' });
    }
});

// ============================================
// 테마 활성화/비활성화 토글
// ============================================
router.patch('/themes/:id/toggle', async (req: AuthRequest, res: Response) => {
    try {
        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }

        theme.isActive = !theme.isActive;
        await theme.save();

        console.log(`🔄 테마 ${theme.isActive ? '활성화' : '비활성화'}: ${theme.name}`);
        res.json({ isActive: theme.isActive });
    } catch (error) {
        console.error('❌ 테마 토글 실패:', error);
        res.status(500).json({ error: '테마 토글 실패' });
    }
});

// ============================================
// 테마에 종목 추가
// ============================================
router.post('/themes/:id/stocks', async (req: AuthRequest, res: Response) => {
    try {
        const { name, code } = req.body;

        if (!name) {
            return res.status(400).json({ error: '종목명은 필수입니다' });
        }

        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }

        // 중복 체크
        const exists = theme.stocks?.some(s => s.name === name || (code && s.code === code));
        if (exists) {
            return res.status(400).json({ error: '이미 존재하는 종목입니다' });
        }

        theme.stocks = theme.stocks || [];
        theme.stocks.push({ name, code: code || '' });
        await theme.save();

        console.log(`➕ 종목 추가: ${theme.name} - ${name}`);
        res.json(theme);
    } catch (error) {
        console.error('❌ 종목 추가 실패:', error);
        res.status(500).json({ error: '종목 추가 실패' });
    }
});

// ============================================
// 테마에서 종목 삭제
// ============================================
router.delete('/themes/:id/stocks/:stockName', async (req: AuthRequest, res: Response) => {
    try {
        const theme = await Theme.findById(req.params.id);
        if (!theme) {
            return res.status(404).json({ error: '테마를 찾을 수 없습니다' });
        }

        const stockName = decodeURIComponent(req.params.stockName);
        const originalLength = theme.stocks?.length || 0;
        theme.stocks = (theme.stocks || []).filter(s => s.name !== stockName);

        if (theme.stocks.length === originalLength) {
            return res.status(404).json({ error: '종목을 찾을 수 없습니다' });
        }

        await theme.save();
        console.log(`➖ 종목 삭제: ${theme.name} - ${stockName}`);
        res.json(theme);
    } catch (error) {
        console.error('❌ 종목 삭제 실패:', error);
        res.status(500).json({ error: '종목 삭제 실패' });
    }
});

// ============================================
// 수동 크롤링 실행
// ============================================
let isCrawling = false;

router.post('/crawl/themes', async (req: AuthRequest, res: Response) => {
    try {
        if (isCrawling) {
            return res.status(400).json({ error: '이미 크롤링이 진행 중입니다' });
        }

        isCrawling = true;
        res.json({ message: '크롤링이 시작되었습니다. 완료까지 약 1분 소요됩니다.' });

        // 비동기로 크롤링 실행
        updateAllThemes()
            .then(() => {
                console.log('✅ 수동 크롤링 완료');
            })
            .catch((err) => {
                console.error('❌ 수동 크롤링 실패:', err);
            })
            .finally(() => {
                isCrawling = false;
            });
    } catch (error) {
        isCrawling = false;
        console.error('❌ 크롤링 시작 실패:', error);
        res.status(500).json({ error: '크롤링 시작 실패' });
    }
});

// 크롤링 상태 확인
router.get('/crawl/status', (req: AuthRequest, res: Response) => {
    res.json({ isCrawling });
});

// ============================================
// 주가 캐시 수동 갱신
// ============================================
router.post('/cache/refresh', async (req: AuthRequest, res: Response) => {
    try {
        res.json({ message: '캐시 갱신이 시작되었습니다.' });

        // 비동기로 실행
        themePriceCache.updateAllPrices()
            .then(() => {
                console.log('✅ 수동 캐시 갱신 완료');
            })
            .catch((err) => {
                console.error('❌ 수동 캐시 갱신 실패:', err);
            });
    } catch (error) {
        console.error('❌ 캐시 갱신 시작 실패:', error);
        res.status(500).json({ error: '캐시 갱신 시작 실패' });
    }
});

// ============================================
// 거래량 히스토리 수동 저장
// ============================================
let isCollectingVolume = false;

router.post('/collect/volume', async (req: AuthRequest, res: Response) => {
    try {
        if (isCollectingVolume) {
            return res.status(400).json({ error: '이미 거래량 수집이 진행 중입니다' });
        }

        // 캐시가 비어있으면 먼저 캐시 갱신 필요
        const stats = themePriceCache.getStats();
        if (stats.stockCount === 0) {
            return res.status(400).json({
                error: '주가 캐시가 비어있습니다. 먼저 캐시 갱신을 실행하세요.',
                hint: 'POST /api/admin/cache/refresh 를 먼저 호출하세요.'
            });
        }

        isCollectingVolume = true;
        res.json({ message: '거래량 히스토리 저장이 시작되었습니다.' });

        // 비동기로 실행
        saveTodayVolumeHistory()
            .then((count) => {
                console.log(`✅ 수동 거래량 히스토리 저장 완료: ${count}개`);
            })
            .catch((err) => {
                console.error('❌ 수동 거래량 히스토리 저장 실패:', err);
            })
            .finally(() => {
                isCollectingVolume = false;
            });
    } catch (error) {
        isCollectingVolume = false;
        console.error('❌ 거래량 수집 시작 실패:', error);
        res.status(500).json({ error: '거래량 수집 시작 실패' });
    }
});

// 수집 상태 확인
router.get('/collect/status', (req: AuthRequest, res: Response) => {
    res.json({
        isCollectingVolume,
    });
});

export default router;
