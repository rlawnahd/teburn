/**
 * 텔레그램 알림 모듈
 * 기존 TEBURN의 @teburn_hot_bot과 별도로 운영
 */

import { Telegraf } from 'telegraf';
import { config } from './config.js';

let bot: Telegraf | null = null;

export function initNotifier(): boolean {
  if (!config.telegram.enabled || !config.telegram.botToken) {
    console.log('📱 봇 텔레그램 알림: 비활성화');
    return false;
  }

  try {
    bot = new Telegraf(config.telegram.botToken);
    console.log('📱 봇 텔레그램 알림: 연결 완료');
    return true;
  } catch (e: any) {
    console.warn(`📱 텔레그램 연결 실패: ${e.message}`);
    return false;
  }
}

async function send(text: string): Promise<void> {
  if (!bot || !config.telegram.chatId) return;
  try {
    await bot.telegram.sendMessage(config.telegram.chatId, text, { parse_mode: 'HTML' });
  } catch (e: any) {
    console.warn(`📱 텔레그램 전송 실패: ${e.message}`);
  }
}

// ─── 알림 타입별 포맷 ───────────────────

interface BuyInfo {
  stockName: string;
  stockCode: string;
  price: number;
  qty: number;
  hotnessScore: number;
  grade: string;
  reason: string;
  technicalInfo: string;
}

interface SellInfo {
  stockName: string;
  stockCode: string;
  action: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnlPercent: number;
  pnlKrw: number;
}

interface DailySummary {
  totalTrades: number;
  wins: number;
  losses: number;
  totalPnlKrw: number;
  positions: Array<{ stockName: string; pnlPercent: number }>;
}

export async function notify(type: string, data: any): Promise<void> {
  switch (type) {
    case 'startup':
      await send(
        `🤖 <b>TEBURN 자동매매봇 시작</b>\n\n` +
        `⚙️ 최소 등급: ${config.strategy.minGrade}\n` +
        `💰 1회 투자금: ${config.risk.positionSizeKrw.toLocaleString()}원\n` +
        `📊 최대 포지션: ${config.risk.maxPositions}개\n` +
        `🛑 손절: ${config.risk.stopLossPercent}% | 🎯 익절: ${config.risk.takeProfitPercent}%\n` +
        `🧪 ${config.kis.isMock ? '모의투자' : '실투자'}`
      );
      break;

    case 'buy': {
      const b = data as BuyInfo;
      await send(
        `🟢 <b>매수</b> ${b.stockName} (${b.stockCode})\n\n` +
        `💰 ${b.price.toLocaleString()}원 × ${b.qty}주\n` +
        `🔥 주도주 점수: ${b.hotnessScore}점 (${b.grade}등급)\n` +
        `📊 ${b.technicalInfo}\n` +
        `📝 ${b.reason}`
      );
      break;
    }

    case 'sell': {
      const s = data as SellInfo;
      const emoji = s.pnlKrw >= 0 ? '💚' : '💔';
      await send(
        `🔴 <b>매도</b> ${s.stockName} (${s.stockCode})\n\n` +
        `${s.action}\n` +
        `📈 진입: ${s.entryPrice.toLocaleString()}원\n` +
        `📉 청산: ${s.exitPrice.toLocaleString()}원\n` +
        `${emoji} 손익: ${s.pnlPercent >= 0 ? '+' : ''}${s.pnlPercent.toFixed(2)}% (${s.pnlKrw >= 0 ? '+' : ''}${s.pnlKrw.toLocaleString()}원)`
      );
      break;
    }

    case 'daily_summary': {
      const d = data as DailySummary;
      const winRate = d.totalTrades > 0 ? ((d.wins / d.totalTrades) * 100).toFixed(0) : '0';
      const emoji = d.totalPnlKrw >= 0 ? '📈' : '📉';
      await send(
        `📊 <b>일일 요약</b>\n\n` +
        `${emoji} 총 손익: ${d.totalPnlKrw >= 0 ? '+' : ''}${d.totalPnlKrw.toLocaleString()}원\n` +
        `🎯 승률: ${winRate}% (${d.wins}승 ${d.losses}패 / ${d.totalTrades}건)\n` +
        (d.positions.length > 0
          ? `\n📌 보유 중:\n` + d.positions.map(p =>
              `  • ${p.stockName}: ${p.pnlPercent >= 0 ? '+' : ''}${p.pnlPercent.toFixed(1)}%`
            ).join('\n')
          : '\n📌 보유 종목 없음')
      );
      break;
    }

    case 'error':
      await send(`⚠️ <b>에러</b>\n\n${data.message}`);
      break;

    case 'skip':
      // 스킵은 로그만 (텔레그램 알림 안 보냄)
      break;
  }
}
