'use client';

import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINK = "block py-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors";

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-8 px-4">
            <div className="max-w-screen-xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    {/* 좌측: 로고 + 설명 */}
                    <div className="space-y-2">
                        <Image
                            src="/teburn-text-logo.svg"
                            alt="TEBURN"
                            width={80}
                            height={20}
                        />
                        <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed max-w-[320px]">
                            실시간 주도주 분석 서비스. 거래대금, 등락률, 거래량, 뉴스, 테마 집중도를 종합 분석합니다.
                        </p>
                    </div>

                    {/* 우측: 링크 그룹 */}
                    <div className="flex gap-10">
                        <div className="space-y-1">
                            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">서비스</span>
                            <div>
                                <Link href="/about" className={FOOTER_LINK}>서비스 소개</Link>
                                <Link href="/guide" className={FOOTER_LINK}>이용 가이드</Link>
                                <Link href="/faq" className={FOOTER_LINK}>FAQ</Link>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">법적 고지</span>
                            <div>
                                <Link href="/terms" className={FOOTER_LINK}>이용약관</Link>
                                <Link href="/privacy" className={FOOTER_LINK}>개인정보처리방침</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 면책 조항 + 저작권 */}
                <div className="mt-8 pt-4 border-t border-[var(--border-color)] space-y-2">
                    <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                        TEBURN에서 제공하는 정보는 투자 참고용이며, 특정 종목의 매수·매도를 추천하지 않습니다.
                        투자에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
                    </p>
                    <span className="text-[12px] text-[var(--text-disabled)]">
                        &copy; {new Date().getFullYear()} TEBURN. All rights reserved.
                    </span>
                </div>
            </div>
        </footer>
    );
}
