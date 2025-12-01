import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  showText?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, label, showText = true }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));

  return (
    <div className="w-full">
      {showText && (
        <div className="flex justify-between mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>{label || 'Progress'}</span>
          <span>{current} / {max} XP</span>
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden border border-slate-300">
        <div 
          className="bg-accent-500 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)] relative"
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};