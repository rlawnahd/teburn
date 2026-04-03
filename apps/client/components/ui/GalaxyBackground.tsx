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

            frame = requestAnimationFrame(draw);
        };
        draw();

        return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
