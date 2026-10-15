import { create } from 'zustand';
import { Stop, Route, Vehicle, TripSchedule, AnomalyFlag, Recommendation, EvaluationResult, ModelTrustReport } from '../types';

interface AppState {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Passenger mode vs Operator mode
  isPassengerMode: boolean;
  togglePassengerMode: () => void;

  // Active panel on left rail ('overview' | 'forecast' | 'flags' | 'recommendations' | 'modelTrust' | null)
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;

  // Drawer detail on right
  selectedStop: Stop | null;
  selectedTrip: TripSchedule | null;
  setSelectedStop: (s: Stop | null) => void;
  setSelectedTrip: (t: TripSchedule | null) => void;

  // Simulation Time Scrubber (seconds from midnight: default 08:30:00 = 30600)
  simTimeSeconds: number;
  isPlaying: boolean;
  playbackSpeed: number;
  setSimTimeSeconds: (sec: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;

  // Campus Data & Engine State
  stops: Stop[];
  routes: Route[];
  vehicles: Vehicle[];
  schedule: TripSchedule[];
  baselineSchedule: TripSchedule[];
  flags: AnomalyFlag[];
  recommendations: Recommendation[];
  activeRecommendations: string[];
  evaluation: EvaluationResult | null;
  modelTrust: ModelTrustReport | null;
  currentScenario: string;
  serviceStatuses: Record<string, string>;

  // Loading & Error States
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchData: () => Promise<void>;
  fetchEvaluation: (scenario?: string) => Promise<void>;
  fetchFlags: (scenario?: string) => Promise<void>;
  toggleRecommendation: (id: string, apply: boolean) => Promise<void>;
  setScenario: (scen: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isDark: true,
  toggleTheme: () => set((s) => ({ isDark: !s.isDark })),

  isPassengerMode: false,
  togglePassengerMode: () => set((s) => ({ isPassengerMode: !s.isPassengerMode })),

  activePanel: 'overview',
  setActivePanel: (panel) => set({ activePanel: panel }),

  selectedStop: null,
  selectedTrip: null,
  setSelectedStop: (s) => set({ selectedStop: s, selectedTrip: null }),
  setSelectedTrip: (t) => set({ selectedTrip: t, selectedStop: null }),

  simTimeSeconds: 30600, // 08:30:00
  isPlaying: false,
  playbackSpeed: 1,
  setSimTimeSeconds: (sec) => set({ simTimeSeconds: sec }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  stops: [],
  routes: [],
  vehicles: [],
  schedule: [],
  baselineSchedule: [],
  flags: [],
  recommendations: [],
  activeRecommendations: [],
  evaluation: null,
  modelTrust: null,
  currentScenario: 'normal',
  serviceStatuses: { open_meteo: 'LIVE', osrm: 'LIVE', nominatim: 'LIVE' },

  isLoading: false,
  error: null,

  fetchData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [dataRes, flagsRes, recsRes, evalRes, trustRes] = await Promise.all([
        fetch('/api/data').then((r) => r.json()),
        fetch('/api/flags').then((r) => r.json()),
        fetch('/api/recommendations').then((r) => r.json()),
        fetch('/api/evaluate').then((r) => r.json()),
        fetch('/api/model-trust').then((r) => r.json()),
      ]);

      set({
        stops: dataRes.stops || [],
        routes: dataRes.routes || [],
        vehicles: dataRes.vehicles || [],
        schedule: dataRes.schedule || [],
        baselineSchedule: dataRes.baseline_schedule || [],
        serviceStatuses: dataRes.services_status || {},
        flags: flagsRes.flags || [],
        recommendations: recsRes.recommendations || [],
        activeRecommendations: recsRes.active_ids || [],
        evaluation: evalRes,
        modelTrust: trustRes,
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message || 'Failed to connect to RoutePulse Engine', isLoading: false });
    }
  },

  fetchEvaluation: async (scenario = 'normal') => {
    try {
      const evalRes = await fetch(`/api/evaluate?scenario=${scenario}`).then((r) => r.json());
      set({ evaluation: evalRes });
    } catch (e) {}
  },

  fetchFlags: async (scenario = 'normal') => {
    try {
      const flagsRes = await fetch(`/api/flags?scenario=${scenario}`).then((r) => r.json());
      set({ flags: flagsRes.flags || [] });
    } catch (e) {}
  },

  toggleRecommendation: async (id: string, apply: boolean) => {
    try {
      const res = await fetch('/api/whatif/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, apply }),
      }).then((r) => r.json());

      // Update active recommendations locally and refresh evaluation
      const currentActive = get().activeRecommendations;
      const updatedActive = apply
        ? Array.from(new Set([...currentActive, id]))
        : currentActive.filter((item) => item !== id);

      set({
        activeRecommendations: updatedActive,
        evaluation: res,
      });

      // Also refresh schedule & flags
      get().fetchFlags(get().currentScenario);
      const dataRes = await fetch('/api/data').then((r) => r.json());
      set({ schedule: dataRes.schedule || [] });
    } catch (e) {}
  },

  setScenario: async (scenario: string) => {
    set({ currentScenario: scenario });
    await Promise.all([get().fetchEvaluation(scenario), get().fetchFlags(scenario)]);
  },
}));
