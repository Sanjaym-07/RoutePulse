import React from 'react';
import { Sparkles, X, ChevronRight } from 'lucide-react';

interface TourProps {
  step: number;
  onNext: () => void;
  onSkip: () => void;
}

export const FirstRunTour: React.FC<TourProps> = ({ step, onNext, onSkip }) => {
  const steps = [
    {
      title: 'Welcome to RoutePulse',
      desc: 'The colored lines on the map are campus bus routes, and the dots are transit stops. Green dots have seats available, while red dots are too full.',
      highlight: 'map',
    },
    {
      title: 'What if Scenarios',
      desc: 'Use the "What if..." chips at the top to simulate rain, traffic bottlenecks, or broken-down buses. RoutePulse recalculates schedules immediately.',
      highlight: 'what-if',
    },
    {
      title: 'Step 1: Problems We Expect Today',
      desc: 'The Problems panel lists every trip where buses will be over capacity or connections fail, with plain-language explanations.',
      highlight: 'problems',
    },
    {
      title: 'Step 3: Fix Bottlenecks',
      desc: 'The Fix panel offers clear schedule adjustments (like swapping larger buses or adding relief trips) that cut overcrowding with zero safety breaches.',
      highlight: 'suggestions',
    },
    {
      title: 'Step 4: Proof of Improvement',
      desc: 'The Proof panel shows measurable Before vs After outcomes, verifying that every constraint was strictly satisfied.',
      highlight: 'results',
    },
  ];

  const current = steps[step];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-[1px]" onClick={onSkip} />

      {/* Modal Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-focus)',
          boxShadow: 'var(--shadow-lg)',
        }}
        className="relative z-10 w-96 rounded-xl border p-4.5 pointer-events-auto flex flex-col gap-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles size={14} />
            <span>Campus Tour ({step + 1} of 5)</span>
          </div>

          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <h3 className="text-sm font-bold text-white">{current.title}</h3>
        <p className="text-xs text-gray-300 leading-relaxed">{current.desc}</p>

        <div className="flex items-center justify-between pt-2 border-t border-gray-800">
          <button
            onClick={onSkip}
            className="text-xs text-gray-400 hover:text-white cursor-pointer px-2 py-1"
          >
            Skip
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors shadow-sm"
          >
            <span>{step === 4 ? 'Finish' : 'Next'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
