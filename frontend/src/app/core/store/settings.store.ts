import {
  patchState,
  signalStore,
  watchState,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';

// 1. Define the shape of our settings
export interface AppSettings {
  baseCurrency: string;           // e.g., 'TWD', 'USD'
  showOriginalCurrency: boolean;  // Show USD for US stocks, or force convert to TWD
  privacyMode: boolean;           // Hide sensitive amounts (****)
  theme: 'light' | 'dark';        // UI Theme
  autoFillExchangeRate: boolean;  // Auto-fill reference rate in forms
  widgetsCollapsed: boolean;      // Collapse the widget collection section
  trendChartCollapsed: boolean;   // Collapse the trend chart (mobile only)
}

// 2. Default fallback values
const defaultSettings: AppSettings = {
  baseCurrency: 'TWD',
  showOriginalCurrency: true,
  privacyMode: false,
  theme: 'light',
  autoFillExchangeRate: true,
  widgetsCollapsed: false,
  trendChartCollapsed: false,
};

const STORAGE_KEY = 'app_settings';

export const SettingsStore = signalStore(
  { providedIn: 'root' },

  // Initialize with default state
  withState<AppSettings>(defaultSettings),

  // 3. Methods to update the state
  withMethods((store) => ({
    
    // Update one or multiple settings at once
    updateSettings(partialSettings: Partial<AppSettings>) {
      patchState(store, partialSettings);
    },

    // A handy helper specifically for toggling privacy mode from anywhere (e.g., Dashboard header)
    togglePrivacyMode() {
      patchState(store, (state) => ({ privacyMode: !state.privacyMode }));
    },

    // Toggle widget collection collapse state
    toggleWidgetsCollapsed() {
      patchState(store, (state) => ({ widgetsCollapsed: !state.widgetsCollapsed }));
    },

    // Toggle trend chart collapse state
    toggleTrendChartCollapsed() {
      patchState(store, (state) => ({ trendChartCollapsed: !state.trendChartCollapsed }));
    }

  })),

  // 4. Persistence Logic (LocalStorage)
  withHooks({
    onInit(store) {
      // Step A: When the app starts, read from local storage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge defaults with saved settings (in case we add new properties later)
          patchState(store, { ...defaultSettings, ...parsed });
          console.log('[SettingsStore] Loaded from local storage');
        } catch (error) {
          console.error('[SettingsStore] Failed to parse local storage settings', error);
        }
      }

      // Step B: Watch for any changes in the store and save back to local storage
      watchState(store, (state) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      });
    },
  })
);