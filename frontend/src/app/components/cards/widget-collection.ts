import {
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Asset, AssetType } from '../../core/models/asset.model';
import { WidgetCardComponent } from './widget-card';
import { AllocationPieComponent } from '../widgets/allocation-pie';
import { WIDGET_REGISTRY } from '../../core/config/widget.config';
import { WidgetStore } from '../../core/store/widget.store';
import { getAssetRgb } from '../../core/config/asset.config';
import { SettingsStore } from '../../core/store/settings.store';
import { PieChartData } from '../widgets/allocation-pie';

// Define the correct interface matching Dashboard output
interface AssetWithMarketValue extends Asset {
  baseMarketValue: number;   // Converted to Base Currency (e.g., TWD)
  nativeMarketValue: number; // Original Currency Value (e.g., USD)
}

@Component({
  selector: 'app-widget-collection',
  standalone: true,
  imports: [CommonModule, WidgetCardComponent, AllocationPieComponent],
  templateUrl: './widget-collection.html',
  styleUrls: ['./widget-collection.scss'],
})
export class WidgetCollectionComponent {
  assets = input.required<Asset[]>();
  loading = input<boolean>(false);

  readonly widgetStore = inject(WidgetStore);
  readonly settingsStore = inject(SettingsStore);
  readonly registry = WIDGET_REGISTRY;

  toggleBtnRef = viewChild.required<ElementRef>('toggleBtn');
  settingsPanelRef = viewChild<ElementRef>('settingsPanel');

  constructor() {
    effect(
      () => {
        if (this.assets().length > 0) {
          const defaults = this.registry.filter((w) => w.defaultSelected).map((w) => w.id);
          this.widgetStore.initSelection(defaults);
        }
      },
      { allowSignalWrites: true },
    );
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.widgetStore.isSettingsOpen()) return;

    const target = event.target as Node;
    const clickedInsidePanel = this.settingsPanelRef()?.nativeElement.contains(target);
    const clickedOnButton = this.toggleBtnRef().nativeElement.contains(target);

    if (!clickedInsidePanel && !clickedOnButton) {
      this.widgetStore.closeSettings();
    }
  }

  // 1. Asset Allocation (Main Pie Chart)
  readonly assetPieData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    const EXCLUDED_TYPES = [AssetType.CREDIT_CARD, AssetType.LIABILITY, AssetType.PENDING];

    // Group By Asset Type
    const grouped = assets
      .filter(a => a.include_in_net_worth && !EXCLUDED_TYPES.includes(a.asset_type))
      .reduce(
        (acc, curr) => {
          // FIX: Use 'baseMarketValue' (TWD) to ensure apple-to-apple comparison
          // If baseMarketValue is missing (edge case), fallback to 0 to safeguard chart
          const value = curr.baseMarketValue || 0;
          
          if (value > 0) {
            acc[curr.asset_type] = (acc[curr.asset_type] || 0) + value;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

    // Transform to Chart Data
    return Object.keys(grouped).map((key) => {
      const colorRgb = getAssetRgb(key);
      return {
        name: key,
        value: grouped[key],
        color: colorRgb ? `rgba(${colorRgb}, 1)` : undefined,
      };
    });
  });

  // 2. TW Stock Breakdown (Optional Widget)
  readonly twStockData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    return assets
      .filter((a) => a.asset_type === AssetType.STOCK && a.currency === 'TWD')
      .map((a) => ({
        name: a.name,
        // For specific breakdown, we can use native value (since it is all TWD)
        value: a.nativeMarketValue || 0,
      }));
  });

  // 3. US Stock Breakdown (Optional Widget)
  readonly usStockData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    return assets
      .filter((a) => a.asset_type === AssetType.STOCK && a.currency === 'USD')
      .map((a) => ({
        name: a.name,
        // For US stocks, we usually want to see USD distribution
        value: a.nativeMarketValue || 0,
      }));
  });

  readonly widgetStates = computed(() => {
    const currentAssets = this.assets();
    const selectedIds = this.widgetStore.selectedWidgets();

    return this.registry.map((def) => {
      const isAvailable = def.isAvailable(currentAssets);
      const isSelected = isAvailable && selectedIds.includes(def.id);
      return { def, isAvailable, isSelected };
    });
  });

  readonly visibleWidgets = computed(() => this.widgetStates().filter((s) => s.isSelected));

  toggleWidget(id: any, isAvailable: boolean) {
    if (!isAvailable) return;
    this.widgetStore.toggleWidget(id, isAvailable);
  }
}