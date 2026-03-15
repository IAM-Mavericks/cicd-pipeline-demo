import React from 'react';
import { GlassCard } from '@/components/ui/glass/GlassCard';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassNavbar } from '@/components/ui/glass/GlassNavbar';
import { GlassOverlay } from '@/components/ui/glass/GlassOverlay';

export default function GlassDemo() {
    const [showOverlay, setShowOverlay] = React.useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900">
            <GlassNavbar>
                <span className="font-bold text-xl">SznPay Glass UI</span>
                <div className="ml-auto flex gap-4">
                    <GlassButton variant="accent">Login</GlassButton>
                </div>
            </GlassNavbar>

            <div className="container py-10 space-y-8">
                <GlassCard>
                    <h2 className="text-2xl font-bold mb-4">Glass Card Title</h2>
                    <p className="mb-6 opacity-90">
                        This is a demonstration of the glass card component. It features the standard
                        iOS-style frosted glass effect with 10px blur and high saturation.
                    </p>
                    <div className="flex gap-4">
                        <GlassButton onClick={() => setShowOverlay(true)}>
                            Open Overlay
                        </GlassButton>
                        <GlassButton variant="accent">
                            Accent Button
                        </GlassButton>
                    </div>
                </GlassCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard>
                        <h3 className="font-semibold mb-2">Feature One</h3>
                        <p className="text-sm">Content for feature one goes here.</p>
                    </GlassCard>
                    <GlassCard>
                        <h3 className="font-semibold mb-2">Feature Two</h3>
                        <p className="text-sm">Content for feature two goes here.</p>
                    </GlassCard>
                </div>
            </div>

            {showOverlay && (
                <GlassOverlay>
                    <h2 className="text-xl font-bold mb-4">Glass Modal</h2>
                    <p className="mb-6">
                        This is a modal overlay using the glass effect. The background is dimmed
                        and blurred separately.
                    </p>
                    <div className="flex justify-end gap-2">
                        <GlassButton onClick={() => setShowOverlay(false)}>
                            Close
                        </GlassButton>
                    </div>
                </GlassOverlay>
            )}
        </div>
    );
}
