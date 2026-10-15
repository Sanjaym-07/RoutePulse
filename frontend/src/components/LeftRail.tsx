import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const LeftRail: React.FC = () => {
  const { activePanel, setActivePanel, flags, recommendations } = useAppStore();

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'forecast', icon: TrendingUp, label: 'ML Forecast' },
    {
      id: 'flags',
      icon: AlertTriangle,
      label: 'Anomalies & Conflicts',
      badge: flags.length,
      badgeColor: flags.some((f) => f.severity === 'CRITICAL') ? 'bg-red-500' : 'bg-amber-500',
    },
    {
      id: 'recommendations',
      icon: Sparkles,
      label: 'Optimizer Actions',
      badge: recommendations.length,
      badgeColor: 'bg-blue-500',
    },
    { id: 'modelTrust', icon: ShieldCheck, label: 'Model Trust Evidence' },
  ];

  return (
    <aside
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
      }}
      className="fixed left-4 top-4 bottom-4 w-14 rounded-xl border z-50 flex flex-col items-center py-4 justify-between"
    >
      {/* Brand Logo / Icon */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md text-base">
          RP
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col items-center gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(isActive ? null : item.id)}
                title={item.label}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon size={19} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 text-[9px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operator Report Download */}
      <div className="flex flex-col items-center gap-2">
        <a
          href="/api/report/markdown"
          download="RoutePulse_Report.md"
          title="Download Operator Assessment Report"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
        >
          <FileText size={18} />
        </a>
      </div>
    </aside>
  );
};
