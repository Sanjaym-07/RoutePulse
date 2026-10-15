import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const TimeScrubber: React.FC = () => {
  const { simTimeSeconds, setSimTimeSeconds, isPlaying, setIsPlaying, playbackSpeed, setPlaybackSpeed } =
    useAppStore();

  // Playback timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimTimeSeconds(
          simTimeSeconds + 60 * playbackSpeed > 72000 // up to 20:00:00
            ? 25200 // loop back to 07:00:00
            : simTimeSeconds + 60 * playbackSpeed
        );
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simTimeSeconds, playbackSpeed, setSimTimeSeconds]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
      }}
      className="fixed bottom-4 left-24 right-4 z-40 rounded-xl border px-4 py-2.5 flex items-center gap-4"
    >
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
        </button>

        <button
          onClick={() => setSimTimeSeconds(30600)} // Reset to 08:30 morning peak
          title="Reset to 08:30 Peak"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
        >
          <RotateCcw size={15} />
        </button>

        <button
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 5 : playbackSpeed === 5 ? 15 : 1)}
          className="text-xs font-mono font-semibold text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800 cursor-pointer"
        >
          {playbackSpeed}x
        </button>
      </div>

      {/* Time Display */}
      <div className="text-sm font-mono font-bold text-white tabular-nums min-w-[75px]">
        {formatTime(simTimeSeconds)}
      </div>

      {/* Slider Scrubber (07:00:00 = 25200 to 20:00:00 = 72000) */}
      <div className="flex-1 flex flex-col gap-1">
        <input
          type="range"
          min={25200}
          max={72000}
          step={60}
          value={simTimeSeconds}
          onChange={(e) => setSimTimeSeconds(Number(e.target.value))}
          className="w-full accent-blue-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
          <span>07:00 (Depot Out)</span>
          <span className="text-amber-500 font-semibold">08:30 (Morning Peak)</span>
          <span>12:00 (Lunch)</span>
          <span className="text-amber-500 font-semibold">17:00 (Evening Rush)</span>
          <span>20:00 (Depot In)</span>
        </div>
      </div>
    </div>
  );
};
