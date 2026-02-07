import { patchState, signalStore, withMethods, withState, withHooks } from '@ngrx/signals';
import { effect, inject } from '@angular/core';
import { WidgetType } from '../config/widget.config'; // 請確認路徑

type WidgetState = {
  selectedWidgets: WidgetType[];
  isSettingsOpen: boolean;
};

const STORAGE_KEY = 'mywealth_widgets_v1';

const initialState: WidgetState = {
  selectedWidgets: [],
  isSettingsOpen: false,
};

export const WidgetStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    toggleWidget(id: WidgetType, isAvailable: boolean) {
      if (!isAvailable) {
        patchState(store, (state) => ({
          selectedWidgets: state.selectedWidgets.filter((w) => w !== id),
        }));
        return;
      }

      const current = store.selectedWidgets();
      const isSelected = current.includes(id);

      const newSelection = isSelected ? current.filter((w) => w !== id) : [...current, id];

      patchState(store, { selectedWidgets: newSelection });
    },

    toggleSettings() {
      patchState(store, (state) => ({ isSettingsOpen: !state.isSettingsOpen }));
    },

    closeSettings() {
      patchState(store, { isSettingsOpen: false });
    },

    initSelection(defaultIds: WidgetType[]) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          patchState(store, { selectedWidgets: parsed });
        } catch {
          patchState(store, { selectedWidgets: defaultIds });
        }
      } else {
        patchState(store, { selectedWidgets: defaultIds });
      }
    },
  })),

  withHooks({
    onInit(store) {
      effect(() => {
        const selected = store.selectedWidgets();
        if (selected.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
        }
      });
    },
  }),
);
