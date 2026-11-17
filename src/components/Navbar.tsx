import React from 'react';
import { User } from '../types';
import { emergencyEngine } from '../services/emergency';
import { ShieldAlert, User as UserIcon, LogOut, Radio } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenProfile, onLogout }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <span className="text-base font-extrabold tracking-tight text-white whitespace-nowrap">
          SOS GUARDIAN
        </span>
      </div>

      {/* Zone 2: System Live Status */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-emerald-400 font-medium">
          <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          <span>Protection Engine Active</span>
        </div>
      </div>

      {/* Zone 3: Actions & Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Emergency Trigger */}
        <button
          onClick={() => emergencyEngine.activateSOS('manual')}
          className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-sm hover:shadow-red-600/25 transition-all whitespace-nowrap cursor-pointer active:scale-95"
        >
          SOS Alert
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="max-w-[120px] truncate">{user.full_name}</span>
            </button>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
