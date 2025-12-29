import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// 타입 정의
export interface ETFInfo {
  symbol: string;
  name: string;
  korName: string;
  issuer: string;
  yieldRate: number;
  expenseRatio: number;
  aum: string;
  strategy: string;
  underlying: string;
  currentPrice?: number;
  changePercent?: number;
  nextExDate: string | null;
  nextPayDate: string | null;
  nextAmount: number | null;
  lastAmount: number | null;
}

export interface DividendRecord {
  exDate: string;
  payDate: string;
  amount: number;
  status: 'confirmed' | 'estimated';
}

export interface ETFDetail extends ETFInfo {
  description?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  dividends: DividendRecord[];
  yearlyTotal: number;
  nextDividend: DividendRecord | null;
}

export interface CalendarEvent {
  symbol: string;
  korName: string;
  type: 'exDate' | 'payDate';
  date: string;
  amount: number;
  status: string;
}

// ETF 목록 조회
export async function fetchETFList(): Promise<ETFInfo[]> {
  const res = await axios.get<ETFInfo[]>(`${API_URL}/etf`);
  return res.data;
}

// ETF 상세 조회
export async function fetchETFDetail(symbol: string): Promise<ETFDetail> {
  const res = await axios.get<ETFDetail>(`${API_URL}/etf/${symbol}`);
  return res.data;
}

// 배당 캘린더 조회
export async function fetchDividendCalendar(): Promise<CalendarEvent[]> {
  const res = await axios.get<CalendarEvent[]>(`${API_URL}/etf/calendar`);
  return res.data;
}

// 특정 ETF 배당 히스토리 조회
export async function fetchETFDividends(
  symbol: string,
  year?: number
): Promise<DividendRecord[]> {
  const params = year ? { year } : {};
  const res = await axios.get<DividendRecord[]>(`${API_URL}/etf/${symbol}/dividends`, {
    params,
  });
  return res.data;
}
