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
      console.log('[RoutePulse] Fetching campus datasets from backend...');
      const fetchWithCheck = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch ${url}`);
        }
        return res.json();
      };

      const [dataRes, flagsRes, recsRes, evalRes, trustRes] = await Promise.all([
        fetchWithCheck('/api/data'),
        fetchWithCheck('/api/flags'),
        fetchWithCheck('/api/recommendations'),
        fetchWithCheck('/api/evaluate'),
        fetchWithCheck('/api/model-trust'),
      ]);

      console.log('[RoutePulse] /api/data payload:', dataRes);
      console.log('[RoutePulse] Loaded:', {
        stops: dataRes.stops?.length || 0,
        routes: dataRes.routes?.length || 0,
        vehicles: dataRes.vehicles?.length || 0,
        trips: dataRes.schedule?.length || 0,
      });

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
        error: null,
      });
    } catch (e: any) {
      console.error('[RoutePulse] Fetch error:', e);
      set({ error: e.message || 'Failed to connect to RoutePulse Engine', isLoading: false });
    }
  },

  fetchEvaluation: async (scenario = 'normal') => {
    try {
      const res = await fetch(`/api/evaluate?scenario=${scenario}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const evalRes = await res.json();
      set({ evaluation: evalRes });
    } catch (e: any) {
      console.error('[RoutePulse] Failed to fetch evaluation:', e);
    }
  },

  fetchFlags: async (scenario = 'normal') => {
    try {
      const res = await fetch(`/api/flags?scenario=${scenario}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const flagsRes = await res.json();
      set({ flags: flagsRes.flags || [] });
    } catch (e: any) {
      console.error('[RoutePulse] Failed to fetch flags:', e);
    }
  },

  toggleRecommendation: async (id: string, apply: boolean) => {
    try {
      const res = await fetch('/api/whatif/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, apply }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const evalRes = await res.json();

      const currentActive = get().activeRecommendations;
      const updatedActive = apply
        ? Array.from(new Set([...currentActive, id]))
        : currentActive.filter((item) => item !== id);

      set({
        activeRecommendations: updatedActive,
        evaluation: evalRes,
      });

      get().fetchFlags(get().currentScenario);
      const dataRes = await fetch('/api/data').then((r) => r.json());
      set({ schedule: dataRes.schedule || [] });
    } catch (e: any) {
      console.error('[RoutePulse] Toggle error:', e);
    }
  },

  setScenario: async (scenario: string) => {
    set({ currentScenario: scenario });
    await Promise.all([get().fetchEvaluation(scenario), get().fetchFlags(scenario)]);
  },
}));
