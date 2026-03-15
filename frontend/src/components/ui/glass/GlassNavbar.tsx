import React from 'react';
import { cn } from '@/lib/utils';

interface GlassNavbarProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
}

export function GlassNavbar({ className, children, ...props }: GlassNavbarProps) {
    return (
        <nav
            className={cn(
                "sticky top-0 z-40 w-full",
                "glass border-x-0 border-t-0 rounded-none border-b",
                "bg-white/10 dark:bg-black/10", // Slightly more transparent for navbar
                className
            )}
            {...props}
        >
            <div className="container flex h-16 items-center">
                {children}
            </div>
        </nav>
    );
}
