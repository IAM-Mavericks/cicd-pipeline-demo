import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "glass p-6 text-foreground shadow-lg transition-all duration-300 hover:shadow-xl",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
