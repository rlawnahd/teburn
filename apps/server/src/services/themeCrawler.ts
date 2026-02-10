// apps/server/src/services/themeCrawler.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import Theme, { IThemeStock } from '../models/Theme';

interface CrawledTheme {
    name: string;
    naverCode: string;
}

interface CrawledThemeStock {
    name: string;
    code: string;
}

// 네이버 금융 테마 목록 크롤링
export const crawlThemeList = async (): Promise<CrawledTheme[]> => {
    try {
        console.log('🕷️ 네이버 테마 목록 크롤링 시작...');
        const themes: CrawledTheme[] = [];

        // 테마 목록은 여러 페이지에 걸쳐 있을 수 있음
        for (let page = 1; page <= 3; page++) {
            const url = `https://finance.naver.com/sise/theme.naver?&page=${page}`;

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 10000,
            });

            const html = iconv.decode(response.data, 'EUC-KR');
            const $ = cheerio.load(html);

            // 테마 목록 파싱
            $('table.type_1 tbody tr').each((_, row) => {
                const $row = $(row);
                const $link = $row.find('td:first-child a');

                if ($link.length > 0) {
                    const name = $link.text().trim();
                    const href = $link.attr('href') || '';
                    // no=XXX 추출
                    const codeMatch = href.match(/no=(\d+)/);

                    if (name && codeMatch) {
                        themes.push({
                            name,
                            naverCode: codeMatch[1],
                        });
                    }
                }
            });
        }

        console.log(`✅ ${themes.length}개 테마 목록 크롤링 완료`);
        return themes;
    } catch (error) {
        console.error('❌ 테마 목록 크롤링 실패:', error);
        throw error;
    }
};

// 특정 테마의 종목 목록 크롤링
export const crawlThemeStocks = async (naverCode: string): Promise<CrawledThemeStock[]> => {
    try {
        const url = `https://finance.naver.com/sise/sise_group_detail.naver?type=theme&no=${naverCode}`;

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
        });

        const html = iconv.decode(response.data, 'EUC-KR');
        const $ = cheerio.load(html);

        const stocks: CrawledThemeStock[] = [];

        // 종목 테이블 파싱
        $('table.type_5 tbody tr').each((_, row) => {
            const $row = $(row);
            const $link = $row.find('td:nth-child(1) a');

            if ($link.length > 0) {
                const name = $link.text().trim();
                const href = $link.attr('href') || '';
                // code=XXXXXX 추출
                const codeMatch = href.match(/code=(\d+)/);

                if (name && codeMatch) {
                    stocks.push({
                        name,
                        code: codeMatch[1],
                    });
                }
            }
        });

        return stocks;
    } catch (error) {
        console.error(`❌ 테마 종목 크롤링 실패 (code: ${naverCode}):`, error);
        return [];
    }
};

// 전체 테마 데이터 업데이트
export const updateAllThemes = async (): Promise<void> => {
    try {
        console.log('🔄 전체 테마 데이터 업데이트 시작...');
        const startTime = Date.now();

        // 1. 테마 목록 크롤링
        const themeList = await crawlThemeList();

        // 2. 각 테마별 종목 크롤링 (순차 처리 - 너무 빠르면 차단됨)
        let updated = 0;
        let created = 0;

        for (const theme of themeList) {
            try {
                // 종목 크롤링
                const stocks = await crawlThemeStocks(theme.naverCode);

                if (stocks.length === 0) {
                    continue;
                }

                // DB 업데이트 (upsert) - name으로 찾기 (unique 인덱스)
                const result = await Theme.findOneAndUpdate(
                    { name: theme.name },
                    {
                        name: theme.name,
                        naverCode: theme.naverCode,
                        stocks: stocks,
                        isCustom: false,
                        isActive: true,
                        lastCrawledAt: new Date(),
                    },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

                if (result.createdAt.getTime() === result.updatedAt.getTime()) {
                    created++;
                } else {
                    updated++;
                }

                // 요청 간 딜레이 (차단 방지)
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
                console.error(`⚠️ 테마 처리 실패: ${theme.name}`, err);
            }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ 테마 업데이트 완료: ${created}개 생성, ${updated}개 업데이트 (${elapsed}초)`);
    } catch (error) {
        console.error('❌ 전체 테마 업데이트 실패:', error);
        throw error;
    }
};

// 1일 1회 자동 업데이트 스케줄러
let updateTimer: NodeJS.Timeout | null = null;

export const startThemeUpdateScheduler = (): void => {
    // 24시간마다 업데이트
    const INTERVAL = 24 * 60 * 60 * 1000;

    const runUpdate = async () => {
        try {
            await updateAllThemes();
        } catch (error) {
            console.error('❌ 스케줄 테마 업데이트 실패:', error);
        }
    };

    // 서버 시작 5분 후 첫 업데이트 (서버 안정화 후)
    setTimeout(async () => {
        await runUpdate();
        // 이후 24시간마다
        updateTimer = setInterval(runUpdate, INTERVAL);
    }, 5 * 60 * 1000);

    console.log('⏰ 테마 자동 업데이트 스케줄러 시작 (24시간 주기)');
};

export const stopThemeUpdateScheduler = (): void => {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
};
