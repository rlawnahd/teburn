import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

export interface CrawledNews {
    title: string;
    link: string;
    press: string;
    summary: string;
    createdAt: string;
}

// 본문 정제 함수
const cleanText = (text: string): string => {
    return text
        .replace(/\n/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\[.*?\]/g, '')
        .trim();
};

const fetchNewsContent = async (url: string): Promise<string> => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                Referer: 'https://finance.naver.com/',
            },
            timeout: 3000,
        });

        // 1. 일단 EUC-KR로 디코딩
        let html = iconv.decode(response.data, 'EUC-KR');

        // 2. JS 리다이렉트 감지 (finance.naver.com → n.news.naver.com)
        const redirectMatch = html.match(/top\.location\.href='([^']+)'/);
        if (redirectMatch) {
            const redirectUrl = redirectMatch[1];
            // 리다이렉트된 URL로 다시 요청
            const redirectResponse = await axios.get(redirectUrl, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 3000,
            });
            html = redirectResponse.data;
        } else if (html.includes('charset="utf-8"') || html.includes('charset="UTF-8"')) {
            // UTF-8 인코딩인 경우
            html = iconv.decode(response.data, 'utf-8');
        }

        const $ = cheerio.load(html);
        let content = '';

        // 선택자 우선순위 (n.news.naver.com용 #dic_area 추가)
        if ($('#dic_area').length) content = $('#dic_area').text();
        else if ($('.newsct_article').length) content = $('.newsct_article').text();
        else if ($('.articleCont').length) content = $('.articleCont').text();
        else if ($('#newsEndContents').length) content = $('#newsEndContents').text();
        else if ($('#content').length) {
            const text = $('#content').text();
            if (text.length > 50) content = text;
        }

        return content ? cleanText(content) : '';
    } catch (error) {
        // 상세 페이지 에러는 로그만 찍고 넘어감 (전체 로직 방해 X)
        // console.warn(`⚠️ 상세 본문 스킵: ${url}`);
        return '';
    }
};

export const crawlNaverFinanceNews = async (): Promise<CrawledNews[]> => {
    try {
        console.log('🕷️ 네이버 금융 뉴스 리스트 접근 중...');
        const url = 'https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258';

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 5000,
        });

        const html = iconv.decode(response.data, 'EUC-KR');
        const $ = cheerio.load(html);

        const initialList: CrawledNews[] = [];

        $('.articleSubject').each((_, element) => {
            const $subject = $(element);
            const $link = $subject.find('a');
            const title = $link.attr('title') || $link.text().trim();
            const link = 'https://finance.naver.com' + $link.attr('href');

            const $summary = $subject.next('.articleSummary');
            const press = $summary.find('.press').text().trim();
            const wdate = $summary.find('.wdate').text().trim();
            const summaryPreview = $summary.clone().children().remove().end().text().trim(); // 리스트에 있는 짧은 요약

            if (title && link) {
                initialList.push({
                    title,
                    link,
                    press,
                    summary: summaryPreview, // 기본값으로 짧은 요약 넣어둠
                    createdAt: wdate,
                });
            }
        });

        // 🚨 안전 장치: 최신 5개만 상세 조회 (속도 향상 & 차단 방지)
        const targetNews = initialList.slice(0, 5);
        const remainingNews = initialList.slice(5); // 나머지는 그냥 짧은 요약 그대로 씀

        console.log(`🔍 상위 ${targetNews.length}개 뉴스 상세 수집 시작...`);

        const detailedNews = await Promise.all(
            targetNews.map(async (news) => {
                const fullBody = await fetchNewsContent(news.link);
                return {
                    ...news,
                    // 본문을 가져왔으면 그걸 쓰고, 실패했으면(빈문자열) 원래 있던 짧은 요약 사용
                    summary: fullBody && fullBody.length > 30 ? fullBody.substring(0, 300) + '...' : news.summary,
                };
            })
        );

        console.log('✅ 크롤링 완료');

        // 상세 조회한 5개 + 나머지 뉴스 합쳐서 반환
        return [...detailedNews, ...remainingNews];
    } catch (error) {
        console.error('❌ Crawling CRITICAL Error:', error);
        // 에러 나면 빈 배열 대신 에러를 던져서 프론트가 알게 함
        throw error;
    }
};
