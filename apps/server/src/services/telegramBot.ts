import { Telegraf } from 'telegraf';
import TelegramSubscriber from '../models/TelegramSubscriber';
import { getTopHotStocks, HotnessScore } from './hotnessService';
import { getMarketStatus } from '../utils/marketStatus';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: Telegraf | null = null;

// 일일 요약 중복 실행 방지
let lastDailySummaryDate = '';

// KST 현재 날짜 문자열 (YYYY-MM-DD)
function getKSTDateString(): string {
    const now = new Date();
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
}

// KST 현재 시/분
function getKSTTime(): { hour: number; minute: number; dayOfWeek: number } {
    const now = new Date();
    const kst = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + 9 * 60 * 60 * 1000);
    return { hour: kst.getHours(), minute: kst.getMinutes(), dayOfWeek: kst.getDay() };
}

// 거래대금 포맷 (억 단위)
function formatTradingValue(value: number): string {
    const billion = value / 100000000;
    if (billion >= 1000) return `${(billion / 1000).toFixed(1)}조`;
    return `${Math.round(billion)}억`;
}

// 가격 포맷 (천 단위 콤마)
function formatPrice(price: number): string {
    return price.toLocaleString('ko-KR');
}

// 등락률 포맷
function formatChangeRate(rate: number): string {
    const arrow = rate >= 0 ? '🔺' : '🔻';
    return `${arrow}${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
}

// S등급 알림 메시지 포맷
function formatSGradeAlert(stock: HotnessScore): string {
    const lines = [
        `🚨 <b>S등급 주도주 발견!</b>`,
        ``,
        `🔥 <b>${stock.stockName}</b> (S등급 / ${stock.totalScore}점)`,
        `   ${formatPrice(stock.currentPrice)}원 ${formatChangeRate(stock.changeRate)}`,
        `   거래대금 ${formatTradingValue(stock.tradingValue)} | 뉴스 ${stock.newsCount}건`,
    ];
    if (stock.themes.length > 0) {
        lines.push(`   테마: ${stock.themes.join(', ')}`);
    }
    return lines.join('\n');
}

// /hot 명령어 TOP 10 포맷
function formatHotStocksList(stocks: HotnessScore[]): string {
    if (stocks.length === 0) {
        return '📊 현재 주도주 데이터가 없습니다. 장 시간에 다시 확인해주세요.';
    }

    const gradeEmoji: Record<string, string> = { S: '🔥', A: '⭐', B: '🟢', C: '🟡', D: '⚪' };

    const lines = [
        `📊 <b>주도주 TOP ${stocks.length}</b>`,
        `━━━━━━━━━━━━━━━━━━`,
    ];

    stocks.forEach((s, i) => {
        const emoji = gradeEmoji[s.grade] || '⚪';
        lines.push(
            `${i + 1}. ${emoji} <b>${s.stockName}</b> [${s.grade}등급 ${s.totalScore}점]`,
            `   ${formatPrice(s.currentPrice)}원 ${formatChangeRate(s.changeRate)}`,
            `   거래대금 ${formatTradingValue(s.tradingValue)}`,
        );
        if (i < stocks.length - 1) lines.push('');
    });

    const market = getMarketStatus();
    lines.push('', `📌 ${market.statusText}`);

    return lines.join('\n');
}

// 일일 요약 메시지 포맷
function formatDailySummary(stocks: HotnessScore[]): string {
    const gradeCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    stocks.forEach(s => { gradeCounts[s.grade]++; });

    const top5 = stocks.slice(0, 5);

    const lines = [
        `📋 <b>오늘의 주도주 일일 요약</b>`,
        `━━━━━━━━━━━━━━━━━━`,
        ``,
        `📊 <b>등급 분포</b>`,
        `   🔥 S등급: ${gradeCounts.S}개  ⭐ A등급: ${gradeCounts.A}개`,
        `   🟢 B등급: ${gradeCounts.B}개  🟡 C등급: ${gradeCounts.C}개`,
        ``,
        `🏆 <b>TOP 5 종목</b>`,
    ];

    top5.forEach((s, i) => {
        const gradeEmoji: Record<string, string> = { S: '🔥', A: '⭐', B: '🟢', C: '🟡', D: '⚪' };
        const emoji = gradeEmoji[s.grade] || '⚪';
        lines.push(
            ``,
            `${i + 1}. ${emoji} <b>${s.stockName}</b> [${s.grade}등급 ${s.totalScore}점]`,
            `   ${formatPrice(s.currentPrice)}원 ${formatChangeRate(s.changeRate)}`,
            `   거래대금 ${formatTradingValue(s.tradingValue)} | 뉴스 ${s.newsCount}건`,
        );
        if (s.themes.length > 0) {
            lines.push(`   테마: ${s.themes.join(', ')}`);
        }
    });

    lines.push('', `📌 내일도 좋은 투자 되세요!`);

    return lines.join('\n');
}

// 안전한 메시지 전송 (403 에러 시 비활성화)
async function safeSendMessage(chatId: number, text: string): Promise<boolean> {
    if (!bot) return false;
    try {
        await bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
        return true;
    } catch (error: any) {
        if (error?.response?.error_code === 403) {
            console.log(`🚫 텔레그램 차단 감지 (chatId: ${chatId}) → 비활성화`);
            await TelegramSubscriber.updateOne({ chatId }, { isActive: false });
        } else {
            console.error(`❌ 텔레그램 메시지 전송 실패 (chatId: ${chatId}):`, error.message);
        }
        return false;
    }
}

// S등급 실시간 알림 체크
async function checkSGradeAlerts(): Promise<void> {
    try {
        const market = getMarketStatus();
        if (market.status !== 'regular') return;

        const stocks = await getTopHotStocks(30);
        const sGradeStocks = stocks.filter(s => s.grade === 'S');
        if (sGradeStocks.length === 0) return;

        const today = getKSTDateString();
        const subscribers = await TelegramSubscriber.find({ isActive: true, alertEnabled: true });

        for (const sub of subscribers) {
            // 날짜 바뀌면 리셋
            if (sub.lastAlertResetDate !== today) {
                sub.lastAlertedStocks = [];
                sub.lastAlertResetDate = today;
            }

            const newStocks = sGradeStocks.filter(s => !sub.lastAlertedStocks.includes(s.stockCode));
            if (newStocks.length === 0) continue;

            for (const stock of newStocks) {
                const sent = await safeSendMessage(sub.chatId, formatSGradeAlert(stock));
                if (sent) {
                    sub.lastAlertedStocks.push(stock.stockCode);
                }
            }

            await sub.save();
        }
    } catch (error) {
        console.error('❌ S등급 알림 체크 실패:', error);
    }
}

// 일일 요약 전송
async function sendDailySummary(): Promise<void> {
    try {
        const stocks = await getTopHotStocks(30);
        if (stocks.length === 0) return;

        const message = formatDailySummary(stocks);
        const subscribers = await TelegramSubscriber.find({ isActive: true, dailySummaryEnabled: true });

        console.log(`📋 일일 요약 전송 시작 (${subscribers.length}명)`);

        for (const sub of subscribers) {
            await safeSendMessage(sub.chatId, message);
        }

        console.log('✅ 일일 요약 전송 완료');
    } catch (error) {
        console.error('❌ 일일 요약 전송 실패:', error);
    }
}

// 일일 요약 스케줄러 체크
function checkDailySummarySchedule(): void {
    const { hour, minute, dayOfWeek } = getKSTTime();
    const today = getKSTDateString();

    // 평일 15:40에 실행 (하루 1회)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour === 15 && minute >= 40 && minute <= 45) {
        if (lastDailySummaryDate !== today) {
            lastDailySummaryDate = today;
            sendDailySummary();
        }
    }
}

// 봇 명령어 등록
function setupCommands(): void {
    if (!bot) return;

    bot.command('start', async (ctx) => {
        const chatId = ctx.chat.id;
        const username = ctx.from?.username || ctx.from?.first_name || '사용자';

        await TelegramSubscriber.findOneAndUpdate(
            { chatId },
            {
                chatId,
                username,
                isActive: true,
                alertEnabled: true,
                dailySummaryEnabled: true,
            },
            { upsert: true, new: true }
        );

        const message = [
            `🎉 <b>환영합니다, ${username}님!</b>`,
            ``,
            `TEBURN 주도주 알림봇이 활성화되었습니다.`,
            ``,
            `📌 <b>제공 서비스</b>`,
            `• 🚨 S등급(70점+) 주도주 실시간 알림`,
            `• 📋 장마감 일일 요약 (평일 15:40)`,
            ``,
            `📌 <b>명령어</b>`,
            `/hot - 주도주 TOP 10 조회`,
            `/stop - 알림 중지`,
            `/help - 도움말`,
        ].join('\n');

        await ctx.reply(message, { parse_mode: 'HTML' });
    });

    bot.command('stop', async (ctx) => {
        const chatId = ctx.chat.id;
        await TelegramSubscriber.updateOne({ chatId }, { isActive: false });
        await ctx.reply('🔕 알림이 중지되었습니다.\n다시 받으시려면 /start 를 입력해주세요.');
    });

    bot.command('hot', async (ctx) => {
        try {
            const stocks = await getTopHotStocks(10);
            const message = formatHotStocksList(stocks);
            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('❌ /hot 명령어 처리 실패:', error);
            await ctx.reply('⚠️ 데이터 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
    });

    bot.command('help', async (ctx) => {
        const message = [
            `📖 <b>TEBURN 주도주 알림봇 도움말</b>`,
            ``,
            `<b>명령어</b>`,
            `/start - 알림 구독 시작`,
            `/stop - 알림 중지`,
            `/hot - 주도주 TOP 10 조회`,
            `/help - 이 도움말`,
            ``,
            `<b>자동 알림</b>`,
            `• 🚨 S등급(70점+) 종목 발견 시 실시간 알림`,
            `• 📋 장마감 후 일일 요약 (평일 15:40)`,
            ``,
            `<b>등급 기준</b>`,
            `🔥 S등급: 70점 이상`,
            `⭐ A등급: 50~69점`,
            `🟢 B등급: 35~49점`,
            `🟡 C등급: 20~34점`,
        ].join('\n');

        await ctx.reply(message, { parse_mode: 'HTML' });
    });
}

// 텔레그램 봇 시작
export async function startTelegramBot(): Promise<void> {
    if (!BOT_TOKEN) {
        console.log('⚠️ TELEGRAM_BOT_TOKEN 미설정 - 텔레그램 봇 비활성화');
        return;
    }

    try {
        bot = new Telegraf(BOT_TOKEN);

        setupCommands();

        // polling 시작
        bot.launch();
        console.log('🤖 텔레그램 봇 시작됨');

        // S등급 알림 스케줄러 (5분마다)
        setInterval(checkSGradeAlerts, 5 * 60 * 1000);
        console.log('⏰ S등급 알림: 5분마다 체크');

        // 일일 요약 스케줄러 (1분마다 시간 체크)
        setInterval(checkDailySummarySchedule, 60 * 1000);
        console.log('⏰ 일일 요약: 평일 15:40 KST');

        // Graceful shutdown
        process.once('SIGINT', () => bot?.stop('SIGINT'));
        process.once('SIGTERM', () => bot?.stop('SIGTERM'));
    } catch (error) {
        console.error('❌ 텔레그램 봇 시작 실패:', error);
    }
}
