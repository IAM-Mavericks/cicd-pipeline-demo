import React from 'react';
import { cn } from '@/lib/utils';

interface GlassOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

export function GlassOverlay({ className, children, ...props }: GlassOverlayProps) {
    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center",
                "bg-black/20 backdrop-blur-[4px]",
                className
            )}
            {...props}
        >
            <div className="glass p-6 max-w-lg w-full m-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {children}
            </div>
        </div>
    );
}
