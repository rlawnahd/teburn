export function Skeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`bg-[var(--bg-tertiary)] animate-shimmer ${className}`}
            style={{
                backgroundImage: 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--border-color) 50%, var(--bg-tertiary) 100%)',
                backgroundSize: '200% 100%',
            }}
        />
    );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-[var(--border-color)]">
            <Skeleton className="w-5 h-4 rounded-sm" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="h-2.5 w-16 rounded-sm" />
            </div>
            {Array.from({ length: cols - 2 }).map((_, i) => (
                <Skeleton key={i} className="w-12 h-4 rounded-sm flex-shrink-0" />
            ))}
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="card p-3 space-y-2.5">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-14 rounded-sm" />
            </div>
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-[3px] w-full rounded-sm" />
            <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-color)]">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
        </div>
    );
}

export function SkeletonKpi() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[var(--border-color)] border border-[var(--border-color)] rounded overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-[var(--bg-primary)] px-3 py-2.5 flex flex-col items-center gap-1">
                    <Skeleton className="h-5 w-10 rounded-sm" />
                    <Skeleton className="h-3 w-12 rounded-sm" />
                </div>
            ))}
        </div>
    );
}
