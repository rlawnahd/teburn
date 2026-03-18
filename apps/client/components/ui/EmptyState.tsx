import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
            <Icon size={28} className="mb-3 opacity-30" />
            <p className="text-[13px] font-medium">{title}</p>
            {description && (
                <p className="text-[12px] mt-1 opacity-70">{description}</p>
            )}
        </div>
    );
}
