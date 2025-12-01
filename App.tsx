import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  BarChart2, 
  Award, 
  Clock, 
  Sparkles,
  ChevronRight,
  Flame
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

import { Session, UserStats, Achievement, AppView, GeminiFeedback } from './types';
import { 
  INITIAL_STATS, 
  ACHIEVEMENTS_DATA, 
  XP_PER_MINUTE, 
  calculateNextLevelXP 
} from './constants';
import { getSessionFeedback } from './services/geminiService';
import { Button } from './components/Button';
import { ProgressBar } from './components/ProgressBar';
import { TimerDisplay } from './components/TimerDisplay';

// Hook for LocalStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

const App: React.FC = () => {
  // --- State ---
  const [stats, setStats] = useLocalStorage<UserStats>('qf_stats', INITIAL_STATS);
  const [sessions, setSessions] = useLocalStorage<Session[]>('qf_sessions', []);
  const [achievements, setAchievements] = useLocalStorage<Achievement[]>('qf_achievements', 
    ACHIEVEMENTS_DATA.map(a => ({ ...a, unlocked: false }))
  );
  
  const [currentView, setCurrentView] = useState<AppView>(AppView.TIMER);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [subject, setSubject] = useState('');
  
  // Modal/Feedback States
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [geminiFeedback, setGeminiFeedback] = useState<GeminiFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Refs for timer accuracy
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // --- Timer Logic ---
  useEffect(() => {
    if (timerActive) {
      startTimeRef.current = Date.now() - (timerSeconds * 1000);
      intervalRef.current = window.setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerActive]);

  // --- Handlers ---
  const handleStart = () => {
    if (!subject.trim()) {
      alert("Please enter a subject quest before starting!");
      return;
    }
    setTimerActive(true);
    setGeminiFeedback(null);
  };

  const handlePause = () => {
    setTimerActive(false);
  };

  const handleStop = async () => {
    setTimerActive(false);
    
    if (timerSeconds < 60) {
      if (confirm("Session is less than 1 minute. Discard it?")) {
        setTimerSeconds(0);
        return;
      }
    }

    const durationMinutes = Math.ceil(timerSeconds / 60); // Round up for generous XP
    const xpEarned = durationMinutes * XP_PER_MINUTE;
    const newTotalMinutes = stats.totalStudyMinutes + durationMinutes;
    
    // Create Session
    const newSession: Session = {
      id: crypto.randomUUID(),
      startTime: Date.now() - (timerSeconds * 1000),
      endTime: Date.now(),
      durationMinutes,
      subject,
      xpEarned
    };

    // Calculate Streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = stats.lastStudyDate ? stats.lastStudyDate.split('T')[0] : null;
    let newStreak = stats.streakDays;
    
    if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastDate === yesterdayStr) {
            newStreak += 1;
        } else {
            newStreak = 1; // Reset or start new
        }
    }

    // XP & Level Logic
    let newXP = stats.currentXP + xpEarned;
    let newLevel = stats.level;
    let newNextLevelXP = stats.nextLevelXP;
    let didLevelUp = false;

    // Simple level up loop (in case of massive XP gain)
    while (newXP >= newNextLevelXP) {
      newXP -= newNextLevelXP;
      newLevel++;
      newNextLevelXP = calculateNextLevelXP(newLevel);
      didLevelUp = true;
    }

    // Update Stats
    const updatedStats: UserStats = {
      level: newLevel,
      currentXP: newXP,
      nextLevelXP: newNextLevelXP,
      totalStudyMinutes: newTotalMinutes,
      streakDays: newStreak,
      lastStudyDate: new Date().toISOString()
    };
    
    setStats(updatedStats);
    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);

    // Check Achievements
    const updatedAchievements = achievements.map(ach => {
      if (!ach.unlocked && ach.condition && ach.condition(updatedStats, updatedSessions)) {
        // Just unlocked
        return { ...ach, unlocked: true };
      }
      return ach;
    });
    setAchievements(updatedAchievements);

    // Trigger Visuals
    if (didLevelUp) {
      setShowLevelUp(true);
    }

    // Fetch AI Motivation
    setLoadingFeedback(true);
    // Reset timer immediately for UI responsiveness
    setTimerSeconds(0);
    setSubject('');

    try {
      const feedback = await getSessionFeedback(durationMinutes, subject, newLevel);
      if (feedback) setGeminiFeedback(feedback);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeedback(false);
    }
  };

  // --- Render Helpers ---

  const renderTimerView = () => (
    <div className="flex flex-col items-center justify-center space-y-8 animate-float">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
        <label className="block text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
          Current Quest (Subject)
        </label>
        <input 
          type="text" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Calculus II, React Hooks, History Essay..."
          disabled={timerActive}
          className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none transition-all text-lg font-medium"
        />
      </div>

      <TimerDisplay seconds={timerSeconds} isActive={timerActive} />

      <div className="flex gap-4">
        {!timerActive ? (
          <Button onClick={handleStart} variant="primary" size="lg" className="w-40 rounded-full">
            <Play className="w-6 h-6 mr-2 fill-current" /> Start
          </Button>
        ) : (
          <Button onClick={handlePause} variant="secondary" size="lg" className="w-40 rounded-full">
            <Pause className="w-6 h-6 mr-2 fill-current" /> Pause
          </Button>
        )}
        <Button 
          onClick={handleStop} 
          variant="danger" 
          size="lg" 
          disabled={timerSeconds === 0}
          className="w-40 rounded-full"
        >
          <Square className="w-6 h-6 mr-2 fill-current" /> Finish
        </Button>
      </div>

      {loadingFeedback && (
        <div className="mt-4 p-4 bg-brand-50 text-brand-800 rounded-lg flex items-center animate-pulse">
           <Sparkles className="w-5 h-5 mr-2" /> 
           The Quest Master is reviewing your session...
        </div>
      )}

      {geminiFeedback && !loadingFeedback && (
        <div className="mt-4 max-w-lg p-6 bg-gradient-to-br from-brand-900 to-slate-900 text-white rounded-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Sparkles className="w-24 h-24" />
          </div>
          <h3 className="text-xl font-bold font-pixel mb-2 text-accent-500">
            {geminiFeedback.type === 'victory' ? 'Victory!' : 'Quest Update'}
          </h3>
          <p className="text-lg leading-relaxed font-light italic">
            "{geminiFeedback.message}"
          </p>
        </div>
      )}
    </div>
  );

  const renderStatsView = () => {
    // Prepare chart data (Last 7 days)
    const last7Days = Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    const chartData = last7Days.map(date => {
      const dayMinutes = sessions
        .filter(s => new Date(s.startTime).toISOString().split('T')[0] === date)
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);
      return {
        name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: dayMinutes
      };
    });

    return (
      <div className="space-y-6 w-full max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-6 font-pixel">Quest Log</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase">Total Time</p>
              <p className="text-2xl font-bold text-slate-800">{Math.floor(stats.totalStudyMinutes / 60)}h {stats.totalStudyMinutes % 60}m</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-lg mr-4">
              <Flame className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase">Streak</p>
              <p className="text-2xl font-bold text-slate-800">{stats.streakDays} Days</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg mr-4">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase">Total XP</p>
              <p className="text-2xl font-bold text-slate-800">{stats.currentXP + (stats.level > 1 ? (calculateNextLevelXP(stats.level-1) * (stats.level-1)) : 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-80">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: '#f0f9ff'}} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.minutes > 0 ? '#0ea5e9' : '#e2e8f0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-700 mb-4">Recent Sessions</h3>
           <div className="space-y-3">
             {sessions.slice(0, 5).map(session => (
               <div key={session.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0">
                 <div>
                   <p className="font-semibold text-slate-800">{session.subject}</p>
                   <p className="text-xs text-slate-400">{new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-brand-600">{session.durationMinutes} min</p>
                   <p className="text-xs text-accent-500 font-bold">+{session.xpEarned} XP</p>
                 </div>
               </div>
             ))}
             {sessions.length === 0 && <p className="text-slate-400 text-center py-4">No quests completed yet.</p>}
           </div>
        </div>
      </div>
    );
  };

  const renderAchievementsView = () => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-6 font-pixel">Hall of Fame</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((ach) => (
          <div 
            key={ach.id}
            className={`p-6 rounded-xl border-2 transition-all duration-300 relative overflow-hidden group ${ach.unlocked 
              ? 'bg-white border-accent-500 shadow-md transform hover:-translate-y-1' 
              : 'bg-slate-50 border-slate-200 opacity-75 grayscale'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-4xl filter drop-shadow-sm">{ach.icon}</span>
              {ach.unlocked && <Award className="text-accent-500 w-6 h-6" />}
            </div>
            <h3 className={`font-bold text-lg mb-1 ${ach.unlocked ? 'text-slate-800' : 'text-slate-500'}`}>{ach.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{ach.description}</p>
            
            {ach.unlocked && (
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView(AppView.TIMER)}>
            <div className="bg-brand-600 p-2 rounded-lg">
               <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold font-pixel tracking-tighter text-brand-900 hidden md:block">QuestFocus</h1>
          </div>
          
          <div className="flex-1 max-w-md mx-4 md:mx-8">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-bold text-slate-700">Lvl {stats.level}</span>
              <span className="text-slate-500">{stats.currentXP} / {stats.nextLevelXP} XP</span>
            </div>
            <ProgressBar current={stats.currentXP} max={stats.nextLevelXP} showText={false} />
          </div>

          <nav className="flex space-x-1 md:space-x-2">
            <button 
              onClick={() => setCurrentView(AppView.TIMER)}
              className={`p-2 rounded-lg transition-colors ${currentView === AppView.TIMER ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Clock className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentView(AppView.STATS)}
              className={`p-2 rounded-lg transition-colors ${currentView === AppView.STATS ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentView(AppView.ACHIEVEMENTS)}
              className={`p-2 rounded-lg transition-colors ${currentView === AppView.ACHIEVEMENTS ? 'bg-brand-50 text-brand-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Award className="w-5 h-5" />
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-slate-50 p-4 md:p-8 flex justify-center">
        {currentView === AppView.TIMER && renderTimerView()}
        {currentView === AppView.STATS && renderStatsView()}
        {currentView === AppView.ACHIEVEMENTS && renderAchievementsView()}
      </main>

      {/* Level Up Modal */}
      {showLevelUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-brand-900 to-slate-900 p-1 rounded-2xl w-full max-w-sm shadow-2xl animate-bounce">
            <div className="bg-slate-900 rounded-xl p-8 text-center border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/20 to-transparent animate-pulse"></div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-accent-400 font-pixel mb-2">
                  LEVEL UP!
                </h2>
                <p className="text-slate-300 mb-6">You are now Level <span className="text-white font-bold text-xl">{stats.level}</span></p>
                <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                   <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-accent-400 font-bold">+ {stats.level * 10}%</div>
                      <div className="text-slate-400">Focus Power</div>
                   </div>
                   <div className="bg-white/5 p-3 rounded-lg">
                      <div className="text-brand-400 font-bold">Unlocked</div>
                      <div className="text-slate-400">New Rank</div>
                   </div>
                </div>
                <Button onClick={() => setShowLevelUp(false)} variant="primary" className="w-full py-3 text-lg bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-500 hover:to-accent-500 border-none">
                  Continue Quest
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;