'use client';

import { X } from 'lucide-react';
import { getLoginUrl } from '@/lib/api/auth';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-6 w-[360px] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">로그인</h2>
                    <button onClick={onClose} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <X size={18} />
                    </button>
                </div>

                <p className="text-base text-[var(--text-secondary)] mb-6">
                    로그인하면 실시간 시세와 주도주 점수를 확인할 수 있어요.
                </p>

                <div className="space-y-3">
                    <a
                        href={getLoginUrl('kakao')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium"
                        style={{ backgroundColor: '#FEE500', color: '#000000' }}
                    >
                        카카오로 시작하기
                    </a>

                    <a
                        href={getLoginUrl('google')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                    >
                        Google로 시작하기
                    </a>
                </div>
            </div>
        </div>
    );
}
