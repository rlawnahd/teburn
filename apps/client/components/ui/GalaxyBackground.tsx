'use client';

import { useEffect, useRef } from 'react';

export default function GalaxyBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame: number;
        const resize = () => {
            canvas.width = canvas.offsetWidth * 2;
            canvas.height = canvas.offsetHeight * 2;
            ctx.scale(2, 2);
        };
        resize();
        window.addEventListener('resize', resize);

        interface Star { x: number; y: number; size: number; speed: number; color: [number, number, number]; phase: number; }
        const stars: Star[] = [];
        const w = () => canvas.offsetWidth;
        const h = () => canvas.offsetHeight;

        const colors: [number, number, number][] = [
            [255, 255, 255], [200, 180, 255], [150, 180, 255],
            [255, 200, 255], [180, 150, 255], [220, 220, 255],
        ];

        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * w(),
                y: Math.random() * h(),
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 0.2 + 0.05,
                color: colors[Math.floor(Math.random() * colors.length)],
                phase: Math.random() * Math.PI * 2,
            });
        }

        interface ShootingStar { startX: number; startY: number; endX: number; endY: number; progress: number; speed: number; active: boolean; }
        const shootingStars: ShootingStar[] = [];

        let t = 0;
        const draw = () => {
            t += 0.015;
            ctx.clearRect(0, 0, w(), h());

            for (const star of stars) {
                const twinkle = Math.sin(t * star.speed * 4 + star.phase) * 0.5 + 0.5;
                const alpha = twinkle * 0.8 + 0.15;

                star.x += Math.sin(t * star.speed + star.phase) * 0.08;
                star.y += Math.cos(t * star.speed * 0.5 + star.phase) * 0.05;

                if (star.x < -5) star.x = w() + 5;
                if (star.x > w() + 5) star.x = -5;
                if (star.y < -5) star.y = h() + 5;
                if (star.y > h() + 5) star.y = -5;

                const [r, g, b] = star.color;

                if (star.size > 0.7) {
                    const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
                    glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.2})`);
                    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                    ctx.fillStyle = glow;
                    ctx.fill();
                }

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.fill();
            }

            // 별똥별 (빨간 우상향 슈팅)
            for (const s of shootingStars) {
                if (!s.active) continue;
                s.progress += s.speed;

                if (s.progress > 1) {
                    s.active = false;
                    continue;
                }

                const cx = s.startX + (s.endX - s.startX) * s.progress;
                const cy = s.startY + (s.endY - s.startY) * s.progress;

                // 꼬리
                const tailLen = 25;
                for (let j = 0; j < tailLen; j++) {
                    const tp = j / tailLen;
                    const tailProgress = s.progress - tp * 0.15;
                    if (tailProgress < 0) continue;
                    const tx = s.startX + (s.endX - s.startX) * tailProgress;
                    const ty = s.startY + (s.endY - s.startY) * tailProgress;
                    const tailAlpha = (1 - tp) * (1 - s.progress * 0.5) * 0.6;
                    const tailSize = (1 - tp) * 2;

                    ctx.beginPath();
                    ctx.arc(tx, ty, tailSize, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,${Math.round(100 + tp * 100)},${Math.round(50 + tp * 50)},${tailAlpha})`;
                    ctx.fill();
                }

                // 헤드 글로우
                const headGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8);
                headGlow.addColorStop(0, `rgba(255,200,150,${0.8 * (1 - s.progress)})`);
                headGlow.addColorStop(0.5, `rgba(239,68,68,${0.4 * (1 - s.progress)})`);
                headGlow.addColorStop(1, 'rgba(239,68,68,0)');
                ctx.beginPath();
                ctx.arc(cx, cy, 8, 0, Math.PI * 2);
                ctx.fillStyle = headGlow;
                ctx.fill();

                // 헤드 코어
                ctx.beginPath();
                ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,230,200,${1 - s.progress})`;
                ctx.fill();
            }

            // 10~15초 간격으로 새 별똥별 생성
            if (Math.random() < 0.02) { // ~매 50프레임(약 0.8초)마다 확률적 생성 (별똥별 밀도↑)
                const ww = w();
                const hh = h();
                shootingStars.push({
                    startX: Math.random() * ww * 0.6,
                    startY: Math.random() * hh * 0.5 + hh * 0.1,
                    endX: Math.random() * ww * 0.4 + ww * 0.6,
                    endY: Math.random() * hh * 0.3,
                    progress: 0,
                    speed: 0.004 + Math.random() * 0.003,
                    active: true,
                });
                // 오래된 비활성 별똥별 정리
                while (shootingStars.length > 12) shootingStars.shift();
            }

            frame = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
