import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-2000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
        {/* Original Logo Design */}
        <div className="relative">
          <div className="relative w-28 h-28 rounded-full flex items-center justify-center">
            <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ringGradientLoading" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#6B8CFF', stopOpacity: 1}} />
                  <stop offset="25%" style={{stopColor: '#8B7FFF', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: '#B87FFF', stopOpacity: 1}} />
                  <stop offset="62%" style={{stopColor: '#E879D9', stopOpacity: 1}} />
                  <stop offset="75%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
                  <stop offset="87%" style={{stopColor: '#7DD3C0', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#06B6D4', stopOpacity: 1}} />
                </linearGradient>
                
                <linearGradient id="mpTextGradientLoading" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{stopColor: '#10B981', stopOpacity: 1}} />
                  <stop offset="50%" style={{stopColor: '#06B6D4', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 1}} />
                </linearGradient>
                
                <filter id="glowLoading" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Outer Glow */}
              <circle cx="56" cy="56" r="50" fill="none" stroke="url(#ringGradientLoading)" strokeWidth="3.5" opacity="0.3" filter="url(#glowLoading)"/>
              
              {/* Main Gradient Ring */}
              <circle cx="56" cy="56" r="47.5" fill="none" stroke="url(#ringGradientLoading)" strokeWidth="8.5" opacity="0.95"/>
              
              {/* Inner White/Light Circle */}
              <circle cx="56" cy="56" r="40.5" fill="#F0F4FF" opacity="0.98"/>
              
              {/* MP Text */}
              <text x="56" y="74" fontFamily="Georgia, serif" fontSize="45" fontWeight="bold" textAnchor="middle" fill="url(#mpTextGradientLoading)" letterSpacing="-1.5">DP</text>
            </svg>
          </div>
        </div>

        {/* Brand Name with Updated Slogan */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent tracking-wide">
            SznPay
          </h1>
          <p className="text-lg text-white/70 font-light">
            Connecting The Dots In Payments
          </p>
        </div>

        {/* Professional Loading Dots Animation */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-500 animate-bounce"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-500 animate-bounce delay-100"></div>
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-500 animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
};
