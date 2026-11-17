import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Eye,
  Mic,
  Users,
  History,
  ShieldCheck,
  Settings,
  Code2,
  MapPin,
  Box
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'manual'
  | 'maps'
  | 'spatial'
  | 'gesture'
  | 'voice'
  | 'contacts'
  | 'history'
  | 'setup'
  | 'settings'
  | 'docs';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  contactCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, contactCount }) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Main Dashboard', icon: LayoutDashboard },
    { id: 'manual' as NavTab, label: 'Manual SOS Trigger', icon: ShieldAlert, highlight: true },
    { id: 'maps' as NavTab, label: 'Google Maps Radar', icon: MapPin },
    { id: 'spatial' as NavTab, label: '3D Spatial Dispatch', icon: Box },
    { id: 'gesture' as NavTab, label: 'AI Gesture Vision', icon: Eye },
    { id: 'voice' as NavTab, label: 'Voice SOS Detection', icon: Mic },
    { id: 'contacts' as NavTab, label: 'Emergency Contacts', icon: Users, badge: contactCount },
    { id: 'history' as NavTab, label: 'SOS Event History', icon: History },
    { id: 'setup' as NavTab, label: 'Protection Setup', icon: ShieldCheck },
    { id: 'settings' as NavTab, label: 'Settings & DLT Guide', icon: Settings },
    { id: 'docs' as NavTab, label: 'Python & Architecture', icon: Code2 },
  ];

  return (
    <aside className="w-64 shrink-0 bg-slate-950 border-r border-slate-800 p-4 hidden md:flex flex-col justify-between min-h-[calc(100vh-57px)]">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-red-400'
                      : 'text-slate-400'
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>

              {typeof item.badge === 'number' && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-red-800 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Footer info */}
      <div className="pt-4 border-t border-slate-800/80 px-2 text-[11px] text-slate-500">
        <div className="flex justify-between items-center mb-1">
          <span>Core Provider:</span>
          <span className="text-slate-400 font-medium">MSG91 Flow API</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Engine DB:</span>
          <span className="text-slate-400 font-mono">SQLite (WAL)</span>
        </div>
      </div>
    </aside>
  );
};
