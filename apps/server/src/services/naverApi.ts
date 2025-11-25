// apps/server/src/services/naverApi.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface NewsItem {
    title: string;
    link: string;
    press: string; // API는 언론사 정보를 따로 안 줘서 파싱하거나 비워야 함
    summary: string;
    createdAt: string;
}

export const fetchNaverNewsApi = async (query: string = '주식'): Promise<NewsItem[]> => {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('네이버 API 키가 설정되지 않았습니다.');
    }

    try {
        const url = 'https://openapi.naver.com/v1/search/news.json';
        const response = await axios.get(url, {
            params: {
                query: '주식', // 검색어 (예: 주식, 삼성전자)
                display: 20, // 가져올 개수
                start: 1,
                sort: 'date', // 최신순 정렬 (sim: 정확도순)
            },
            headers: {
                'X-Naver-Client-Id': clientId,
                'X-Naver-Client-Secret': clientSecret,
            },
        });

        // 데이터 가공
        return response.data.items.map((item: any) => {
            console.log(item);
            // API 데이터는 HTML 태그(<b> 등)가 포함돼서 옴 -> 제거 필요
            const cleanTitle = item.title
                .replace(/<[^>]*>?/gm, '')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');
            const cleanDesc = item.description
                .replace(/<[^>]*>?/gm, '')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&');

            // 날짜 포맷팅 (Mon, 24 Nov 2025... -> 2025-11-24)
            // 🔥 [수정] 날짜 포맷팅 (UTC -> KST 변환)
            const dateObj = new Date(item.pubDate);

            // 1. UTC 기준 시간에 9시간(밀리초 단위)을 더해줍니다.
            const kstOffset = 9 * 60 * 60 * 1000;
            const kstDate = new Date(dateObj.getTime() + kstOffset);

            // 2. 이제 toISOString()을 자르면 한국 시간이 나옵니다.
            const formattedDate = isNaN(dateObj.getTime())
                ? item.pubDate
                : kstDate.toISOString().slice(0, 16).replace('T', ' ');
            return {
                title: cleanTitle,
                link: item.link, // 원본 뉴스 링크
                press: '네이버뉴스', // API는 언론사를 안 줌 (단점)
                summary: cleanDesc,
                createdAt: formattedDate,
            };
        });
    } catch (error) {
        console.error('❌ Naver API Error:', error);
        return [];
    }
};
