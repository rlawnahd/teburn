'use client';

import { useState } from 'react';

const ACCENT = {
    blue: '#3B82F6',
    cyan: '#06B6D4',
    green: '#22C55E',
    red: '#EF4444',
    yellow: '#EAB308',
    purple: '#A855F7',
    orange: '#F97316',
};

interface StepItem {
    label: string;
    desc: string;
    time: string;
}

interface Step {
    id: string;
    title: string;
    subtitle: string;
    color: string;
    items: StepItem[];
}

const steps: Step[] = [
    {
        id: 'teburn',
        title: '① TEBURN 서버',
        subtitle: '데이터 수집 & 분석 (기존 시스템)',
        color: ACCENT.cyan,
        items: [
            { label: '테마/종목 크롤링', desc: '네이버 금융에서 테마 목록, 구성 종목 수집 (1일 1회)', time: '매일 1회' },
            { label: '실시간 시세', desc: 'KIS Open API로 종목별 현재가, 거래대금, 등락률 조회', time: '5분마다' },
            { label: '뉴스 크롤링', desc: '네이버 증권 뉴스 수집 → 테마/종목 매칭', time: '10초마다' },
            { label: '주도주 점수 산출', desc: '거래대금(25) + 등락률(25) + 거래량급증(20) + 뉴스(15) + 집중도(15) = 100점', time: '5분마다' },
        ],
    },
    {
        id: 'signal',
        title: '② 시그널 수신',
        subtitle: '봇이 TEBURN API 호출',
        color: ACCENT.blue,
        items: [
            { label: 'GET /api/leading/hot', desc: 'TEBURN 서버에서 주도주 점수 TOP 종목 리스트 수신', time: '5분마다' },
            { label: '등급 필터링', desc: 'S등급(70점+) 종목만 매매 후보로 선별', time: '' },
            { label: '기본 필터', desc: '등락률 4~25%, 거래대금 100억+ 조건 체크', time: '' },
        ],
    },
    {
        id: 'filter',
        title: '③ 기술적 검증',
        subtitle: '시그널 2차 필터링',
        color: ACCENT.purple,
        items: [
            { label: '일봉 차트 조회', desc: 'KIS API로 해당 종목의 최근 60일 일봉 데이터 조회', time: '' },
            { label: 'RSI 체크', desc: 'RSI > 75 (과매수) → 진입 보류. 이미 너무 올라서 물릴 위험', time: '' },
            { label: '이동평균선 체크', desc: 'MA5 > MA20 (상승추세) 확인. 하락추세면 진입 보류', time: '' },
        ],
    },
    {
        id: 'trade',
        title: '④ 매매 실행',
        subtitle: 'KIS Open API 주문',
        color: ACCENT.green,
        items: [
            { label: '매수 수량 계산', desc: '설정된 투자금(50만원) ÷ 현재가 = 매수 수량 산출', time: '' },
            { label: '시장가 매수', desc: 'KIS API (TTTC0802U) 호출 → 시장가 매수 주문 체결', time: '' },
            { label: '포지션 등록', desc: '진입가, 수량, 매수사유를 메모리에 기록. 모니터링 대상에 추가', time: '' },
        ],
    },
    {
        id: 'risk',
        title: '⑤ 리스크 관리',
        subtitle: '보유 포지션 모니터링',
        color: ACCENT.orange,
        items: [
            { label: '손절 -3%', desc: '현재가가 진입가 대비 -3% 이하 → 즉시 시장가 매도', time: '5분마다 체크' },
            { label: '익절 +7%', desc: '현재가가 진입가 대비 +7% 이상 → 즉시 시장가 매도', time: '5분마다 체크' },
            { label: '일일 손실 한도', desc: '당일 실현 손실이 10만원 도달 → 신규 매매 중단', time: '' },
            { label: '장 마감 청산 (선택)', desc: '15:10에 보유 전종목 매도. 오버나잇 리스크 제거', time: '15:10' },
        ],
    },
    {
        id: 'notify',
        title: '⑥ 알림 & 기록',
        subtitle: '텔레그램 + 로그',
        color: ACCENT.yellow,
        items: [
            { label: '매수 알림', desc: '종목명, 가격, 수량, 주도주 점수, 매수 사유 알림', time: '' },
            { label: '매도 알림', desc: '청산 사유(손절/익절), 손익금액, 수익률 알림', time: '' },
            { label: '일일 요약', desc: '장 마감 후 총 손익, 승률, 보유 포지션 현황 알림', time: '15:40' },
        ],
    },
];

const timelineData = [
    { time: '08:00', event: '봇 시작, KIS 토큰 발급, 기존 잔고 동기화', color: 'var(--text-tertiary)' },
    { time: '09:00', event: '장 개시 (봇은 아직 대기)', color: 'var(--text-tertiary)' },
    { time: '09:05', event: '매매 시작 — 시초가 변동 5분 회피 후 첫 사이클', color: ACCENT.green },
    { time: '09:05~', event: '5분마다: TEBURN 시그널 조회 → 필터 → 매수 판단', color: ACCENT.blue },
    { time: '09:05~', event: '5분마다: 보유 포지션 손절/익절 체크', color: ACCENT.orange },
    { time: '15:10', event: '(선택) 전량 청산 — 오버나잇 리스크 제거', color: ACCENT.red },
    { time: '15:15', event: '매매 종료 — 장외시간 대기 모드', color: 'var(--text-tertiary)' },
    { time: '15:40', event: '일일 요약 알림 발송', color: ACCENT.yellow },
];

const cycleSteps = [
    '1. 보유 포지션 현재가 조회 → 손절/익절 조건 체크 → 해당 시 자동 매도',
    '2. TEBURN /api/leading/hot 호출 → S등급 주도주 수신',
    '3. 이미 보유 중인 종목 제외, 포지션 한도(3개) 체크',
    '4. 후보 종목별 KIS 일봉 조회 → RSI/MA 기술적 필터 적용',
    '5. 필터 통과 종목 → 실시간가 확인 → 시장가 매수 주문',
    '6. 텔레그램 매수/매도 알림 발송',
];

const infraReasons = [
    { title: '같은 프로젝트', desc: '기존 TEBURN 서버와 같은 Railway 프로젝트에 서비스 추가만 하면 됨' },
    { title: '내부 네트워크', desc: 'server ↔ bot 간 Railway 내부 통신으로 빠르고 안정적' },
    { title: '24시간 실행', desc: 'Cron이 아닌 상시 프로세스로 실행 가능 (Worker 서비스)' },
    { title: '월 $2~3', desc: '봇은 5분에 한번 API 호출하는 수준이라 리소스 거의 안 씀' },
];

type TabType = 'flow' | 'infra' | 'timeline';

export default function BotArchitecturePage() {
    const [activeStep, setActiveStep] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('flow');

    const tabs: { key: TabType; label: string }[] = [
        { key: 'flow', label: '매매 로직' },
        { key: 'infra', label: '배포 구조' },
        { key: 'timeline', label: '하루 타임라인' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-secondary)]">
            {/* 탭 */}
            <div className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="max-w-[960px] mx-auto px-3">
                    <div className="flex items-center gap-2 py-2 border-b border-transparent">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)] pr-3 border-r border-[var(--border-color)]">
                            봇 아키텍처
                        </span>
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`relative px-3 py-2 text-[14px] font-medium transition-colors ${
                                    activeTab === tab.key
                                        ? 'text-[var(--text-primary)]'
                                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                                }`}
                            >
                                {tab.label}
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="max-w-[960px] mx-auto p-3">
                {/* 매매 로직 */}
                {activeTab === 'flow' && (
                    <div className="space-y-4">
                        {/* 플로우 다이어그램 */}
                        <div className="flex items-center justify-center gap-1.5 flex-wrap py-4">
                            {steps.map((step, i) => (
                                <div key={step.id} className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                                        className="px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all"
                                        style={{
                                            border: `1.5px solid ${activeStep === step.id ? step.color : 'var(--border-color)'}`,
                                            background: activeStep === step.id ? `${step.color}15` : 'var(--bg-primary)',
                                            color: activeStep === step.id ? step.color : 'var(--text-tertiary)',
                                        }}
                                    >
                                        {step.title}
                                    </button>
                                    {i < steps.length - 1 && (
                                        <span className="text-[var(--text-tertiary)] text-base">→</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* 스텝 카드 */}
                        {steps.map((step) => {
                            const isActive = activeStep === null || activeStep === step.id;
                            return (
                                <div
                                    key={step.id}
                                    onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                                    className="rounded-xl p-5 cursor-pointer transition-all duration-300"
                                    style={{
                                        background: 'var(--bg-primary)',
                                        border: `1px solid ${activeStep === step.id ? step.color : 'var(--border-color)'}`,
                                        opacity: isActive ? 1 : 0.4,
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-[18px] font-bold" style={{ color: step.color }}>
                                                {step.title}
                                            </h3>
                                            <p className="text-[14px] text-[var(--text-tertiary)] mt-1">{step.subtitle}</p>
                                        </div>
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: step.color, boxShadow: `0 0 12px ${step.color}` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {step.items.map((item, i) => (
                                            <div
                                                key={i}
                                                className="rounded-lg p-3.5"
                                                style={{
                                                    background: `${step.color}08`,
                                                    border: `1px solid ${step.color}20`,
                                                }}
                                            >
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                                                        {item.label}
                                                    </span>
                                                    {item.time && (
                                                        <span
                                                            className="text-[11px] font-medium px-2 py-0.5 rounded"
                                                            style={{ color: step.color, background: `${step.color}15` }}
                                                        >
                                                            {item.time}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 배포 구조 */}
                {activeTab === 'infra' && (
                    <div className="space-y-4 pt-3">
                        {/* Railway */}
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
                            <div className="flex items-center gap-2.5 mb-5">
                                <span className="text-xl">🚂</span>
                                <div>
                                    <h3 className="text-[18px] font-bold text-[var(--text-primary)]">Railway 프로젝트</h3>
                                    <p className="text-[13px] text-[var(--text-tertiary)]">같은 프로젝트 안에 서비스 추가</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    {
                                        color: ACCENT.cyan,
                                        badge: '서비스 1 (기존)',
                                        title: '📡 server',
                                        lines: ['Express API 서버', '주도주 점수 산출', '뉴스/테마 크롤링', 'KIS 시세 조회'],
                                        tag: ':4000',
                                    },
                                    {
                                        color: ACCENT.green,
                                        badge: '서비스 2 (신규) 🆕',
                                        title: '🤖 bot',
                                        lines: ['자동매매 봇', '시그널 수신 & 필터', 'KIS 매수/매도', '포지션 관리'],
                                        tag: '백그라운드 워커',
                                    },
                                    {
                                        color: ACCENT.purple,
                                        badge: '데이터베이스',
                                        title: '🗄️ MongoDB',
                                        lines: ['테마/종목 데이터', '뉴스 저장', '주가 캐시', '(봇 거래내역 추가 가능)'],
                                        tag: '공유',
                                    },
                                ].map((svc, i) => (
                                    <div
                                        key={i}
                                        className="rounded-xl p-5"
                                        style={{ background: `${svc.color}10`, border: `1px solid ${svc.color}30` }}
                                    >
                                        <div className="text-[13px] font-semibold mb-1" style={{ color: svc.color }}>
                                            {svc.badge}
                                        </div>
                                        <div className="text-[17px] font-bold text-[var(--text-primary)] mb-2">{svc.title}</div>
                                        <div className="text-[13px] text-[var(--text-tertiary)] leading-relaxed space-y-0.5">
                                            {svc.lines.map((line, j) => (
                                                <div key={j}>{line}</div>
                                            ))}
                                        </div>
                                        <div
                                            className="inline-block mt-3 text-[12px] font-medium px-2.5 py-1 rounded-md"
                                            style={{ color: svc.color, background: `${svc.color}15` }}
                                        >
                                            {svc.tag}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* 내부 통신 */}
                            <div
                                className="mt-5 p-4 rounded-lg"
                                style={{ background: `${ACCENT.blue}08`, border: `1px solid ${ACCENT.blue}20` }}
                            >
                                <div className="text-[13px] font-semibold mb-2" style={{ color: ACCENT.blue }}>
                                    🔗 내부 통신
                                </div>
                                <div className="text-[13px] text-[var(--text-tertiary)] leading-loose space-y-1">
                                    <div>
                                        <code className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[12px]" style={{ color: ACCENT.cyan }}>bot</code>
                                        {' → '}
                                        <code className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[12px]" style={{ color: ACCENT.cyan }}>server.railway.internal:4000/api/leading/hot</code>
                                        {' — Railway 내부 네트워크로 빠르게 통신'}
                                    </div>
                                    <div>
                                        <code className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[12px]" style={{ color: ACCENT.green }}>bot</code>
                                        {' → '}
                                        <code className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[12px]" style={{ color: ACCENT.green }}>openapi.koreainvestment.com</code>
                                        {' — KIS API로 실시간 주문'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vercel */}
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                            <div className="flex items-center gap-2.5 mb-3">
                                <span className="text-lg">▲</span>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[var(--text-primary)]">Vercel (기존)</h3>
                                    <p className="text-[13px] text-[var(--text-tertiary)]">Next.js 프론트엔드 — 봇과 직접 관련 없음</p>
                                </div>
                            </div>
                            <p className="text-[14px] text-[var(--text-tertiary)]">
                                teburn.com 웹사이트는 Vercel에서 그대로 운영. 봇은 서버(Railway)와만 통신하므로 프론트엔드 변경 불필요.
                                나중에 대시보드를 추가하고 싶다면 클라이언트에 봇 상태 조회 페이지를 추가할 수 있음.
                            </p>
                        </div>

                        {/* Why Railway */}
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
                            <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-3">💡 왜 Railway인가?</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {infraReasons.map((item, i) => (
                                    <div key={i} className="p-3.5 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                        <div className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{item.title}</div>
                                        <div className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">{item.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 타임라인 */}
                {activeTab === 'timeline' && (
                    <div className="space-y-4 pt-3">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6">
                            <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">봇의 하루</h3>
                            <p className="text-[14px] text-[var(--text-tertiary)] mb-6">장 운영일(평일) 기준 봇이 하는 일</p>

                            <div className="relative pl-7">
                                {/* 세로 라인 */}
                                <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-[var(--border-color)]" />

                                {timelineData.map((item, i) => (
                                    <div key={i} className="flex gap-4 mb-5 relative">
                                        <div
                                            className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full border-2 border-[var(--bg-primary)]"
                                            style={{ background: item.color, boxShadow: `0 0 8px ${item.color}40` }}
                                        />
                                        <div className="min-w-[52px]">
                                            <span className="font-mono text-sm font-semibold" style={{ color: item.color }}>
                                                {item.time}
                                            </span>
                                        </div>
                                        <span className="text-sm text-[var(--text-primary)] leading-relaxed">{item.event}</span>
                                    </div>
                                ))}
                            </div>

                            {/* 사이클 상세 */}
                            <div
                                className="mt-6 p-5 rounded-xl"
                                style={{ background: `${ACCENT.blue}08`, border: `1px solid ${ACCENT.blue}20` }}
                            >
                                <div className="text-sm font-semibold mb-3" style={{ color: ACCENT.blue }}>
                                    🔄 5분마다 반복되는 매매 사이클 상세
                                </div>
                                <div className="space-y-0">
                                    {cycleSteps.map((text, i) => (
                                        <div
                                            key={i}
                                            className="text-[14px] text-[var(--text-tertiary)] py-1.5"
                                            style={{ borderBottom: i < cycleSteps.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                                        >
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
