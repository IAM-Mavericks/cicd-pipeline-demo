import React from 'react';
import { useOffline } from '../context/OfflineContext';
import { WifiOff, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineIndicator: React.FC = () => {
    const { isOffline, queueSize } = useOffline();

    return (
        <AnimatePresence>
            {isOffline && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-orange-500/90 text-white rounded-full shadow-lg backdrop-blur-sm border border-white/20"
                >
                    <WifiOff size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Unstoppable Mode</span>
                    {queueSize > 0 && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/30">
                            <Zap size={14} className="fill-current" />
                            <span className="text-xs">{queueSize} Queued</span>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineIndicator;
