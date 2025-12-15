import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'neo';
}

export function GlassCard({ children, className, variant = 'default', ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-black/5 dark:border-white/10 shadow-sm dark:shadow-glass backdrop-blur-md transition-all duration-300",
                // Default: White Glass (Light) vs Black Glass (Dark)
                variant === 'default' && "bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10",
                // Neo: Gradient
                variant === 'neo' && "bg-gradient-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-transparent border-t-white/50 dark:border-t-white/20",
                className
            )}
            {...props}
        >
            {/* Glossy reflection effect */}
            <div className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-40 dark:opacity-10 blur-md group-hover:animate-shimmer" />
            {children}
        </div>
    );
}
