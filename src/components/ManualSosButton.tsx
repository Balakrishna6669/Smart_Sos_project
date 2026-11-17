import React from 'react';
import { emergencyEngine } from '../services/emergency';
import { ShieldAlert, AlertCircle } from 'lucide-react';

interface ManualSosButtonProps {
  onActivate?: () => void;
}

export const ManualSosButton: React.FC<ManualSosButtonProps> = ({ onActivate }) => {
  const handleClick = () => {
    emergencyEngine.activateSOS('manual');
    if (onActivate) onActivate();
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Outer pulsating ring container */}
      <div className="relative flex items-center justify-center">
        {/* Glow halo */}
        <div className="absolute w-56 h-56 rounded-full bg-red-600/20 blur-xl animate-pulse" />
        
        {/* Pulsating emergency ring */}
        <div className="absolute w-48 h-48 rounded-full border-2 border-red-500/40 animate-pulse-ring" />

        {/* Large Emergency Button */}
        <button
          onClick={handleClick}
          aria-label="Activate Emergency SOS"
          className="relative z-10 w-44 h-44 rounded-full bg-gradient-to-b from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-extrabold shadow-[0_10px_35px_rgba(220,38,38,0.55)] border-4 border-red-400/30 transition-transform flex flex-col items-center justify-center gap-1 group cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-500/50"
        >
          <ShieldAlert className="w-10 h-10 transition-transform group-hover:scale-110 drop-shadow-md" />
          <span className="text-xl tracking-wider uppercase font-black drop-shadow">
            ACTIVATE SOS
          </span>
          <span className="text-[10px] uppercase font-semibold text-red-200 tracking-wider">
            5s Safety Window
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        <span>Pressing this button starts a 5-second countdown with full cancellation ability.</span>
      </div>
    </div>
  );
};
