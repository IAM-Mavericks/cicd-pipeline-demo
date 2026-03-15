import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'accent';
}

export function GlassButton({ className, variant = 'default', children, ...props }: GlassButtonProps) {
    return (
        <button
            className={cn(
                "glass px-6 py-3 font-medium transition-all duration-300",
                "hover:bg-white/25 dark:hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                variant === 'accent' && "bg-primary/20 hover:bg-primary/30 text-primary-foreground",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
