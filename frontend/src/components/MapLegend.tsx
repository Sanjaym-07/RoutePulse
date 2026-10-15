import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const MapLegend: React.FC = () => {
  const { routes } = useAppStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}
      className="fixed bottom-24 left-20 z-30 rounded-xl border p-2.5 flex flex-col gap-2 max-w-[210px] text-xs tour-map-legend select-none"
    >
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between cursor-pointer text-gray-300 font-semibold"
      >
        <span className="flex items-center gap-1.5 text-[11px]">
          <Layers size={13} className="text-blue-400" />
          <span>Map Legend</span>
        </span>
        {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-2 pt-1 border-t border-gray-800 text-[11px]">
          {/* Stop Crowding */}
          <div>
            <span className="text-[10px] text-gray-400 font-semibold block mb-1">Stop Crowding</span>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-gray-300">Comfortable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
                <span className="text-gray-300">Getting full</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
                <span className="text-gray-300">Too full (over capacity)</span>
              </div>
            </div>
          </div>

          {/* Routes */}
          <div>
            <span className="text-[10px] text-gray-400 font-semibold block mb-1">Campus Lines</span>
            <div className="flex flex-col gap-1">
              {routes.map((r) => (
                <div key={r.route_id} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-1 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-gray-300 truncate">{r.route_name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
