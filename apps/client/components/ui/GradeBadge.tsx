type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

const GRADE_STYLES: Record<Grade, { bg: string; text: string }> = {
    S: { bg: 'bg-[var(--grade-s)]', text: 'text-white' },
    A: { bg: 'bg-[var(--grade-a)]', text: 'text-white' },
    B: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]' },
    C: { bg: 'bg-[var(--accent)]/20', text: 'text-[var(--accent)]' },
    D: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-tertiary)]' },
};

export default function GradeBadge({ grade }: { grade: Grade | string }) {
    const style = GRADE_STYLES[grade as Grade] || GRADE_STYLES.D;
    const isS = grade === 'S';
    return (
        <span
            className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold leading-none rounded-sm min-w-[18px] text-center ${style.bg} ${style.text} flex-shrink-0${isS ? ' shadow-[0_0_6px_rgba(242,54,69,0.3)]' : ''}`}
        >
            {grade}
        </span>
    );
}

export function getGradeColor(grade: string): string {
    switch (grade) {
        case 'S': return 'var(--grade-s)';
        case 'A': return 'var(--grade-a)';
        case 'B': return 'var(--text-tertiary)';
        case 'C': return 'var(--accent)';
        case 'D': return 'var(--fall-color)';
        default: return 'var(--text-tertiary)';
    }
}
