import React from 'react';

interface TimerDisplayProps {
  seconds: number;
  isActive: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ seconds, isActive }) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={`relative flex items-center justify-center w-64 h-64 rounded-full border-8 transition-colors duration-500 ${isActive ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}>
      <div className="text-center z-10">
        <div className={`text-5xl font-mono font-bold tracking-tighter ${isActive ? 'text-brand-600' : 'text-slate-400'}`}>
          {hrs > 0 && <span>{pad(hrs)}:</span>}
          <span>{pad(mins)}</span>:<span>{pad(secs)}</span>
        </div>
        <div className="text-sm font-semibold uppercase tracking-widest text-slate-400 mt-2">
          {isActive ? 'Focusing...' : 'Paused'}
        </div>
      </div>
      
      {/* Pulse Effect */}
      {isActive && (
        <div className="absolute inset-0 rounded-full border-4 border-brand-200 animate-ping opacity-20"></div>
      )}
    </div>
  );
};