'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface HeroBannerProps {
  userName: string;
}

export function HeroBanner({ userName }: HeroBannerProps) {
  const [baghdadTime, setBaghdadTime] = useState<string>('16:17:15');
  const [baghdadDate, setBaghdadDate] = useState<string>('Tuesday, October 20, 2026');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      try {
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Baghdad',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });

        const dateFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Baghdad',
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        setBaghdadTime(timeFormatter.format(now));
        setBaghdadDate(dateFormatter.format(now));
      } catch {
        setBaghdadTime(now.toLocaleTimeString());
        setBaghdadDate('Tuesday, October 20, 2026');
      }
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-xs mb-6 bg-slate-900 min-h-[175px]">
      {/* Background Airplane Sky Image with Soft Ambient Gradient Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/images/airplane_banner.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent sm:via-white/70" />

      {/* Content Container */}
      <div className="relative z-10 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Greeting & Status Note */}
        <div className="max-w-xl">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {getGreeting()},
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {userName || 'Hersh Ahmed'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Here&apos;s the current IT systems status for Gashtyar today.
          </p>
        </div>

        {/* Right Side: Floating Frosted Date & Live Baghdad Clock Card */}
        <div className="shrink-0 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:px-5 sm:py-3.5 border border-white/90 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0077C8] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {baghdadDate}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Baghdad time (UTC+03:00)
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-4">
            <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-none">
              {baghdadTime}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
