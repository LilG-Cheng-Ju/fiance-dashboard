import { Component, computed, effect, inject, input, viewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Asset, AssetType } from '../../core/models/asset.model';
import { WidgetCardComponent } from './widget-card';
import { AllocationPieComponent } from '../widgets/allocation-pie';
import { WIDGET_REGISTRY } from '../../core/config/widget-config';
import { WidgetStore } from '../../core/store/widget.store';
import { getAssetRgb } from '../../core/config/asset-config';
import { PieChartData } from '../widgets/allocation-pie';

interface AssetWithMarketValue extends Asset {
  marketValue?: number;
  marketValueTwd?: number;
}

@Component({
  selector: 'app-widget-collection',
  standalone: true,
  imports: [CommonModule, WidgetCardComponent, AllocationPieComponent],
  templateUrl: './widget-collection.html',
  styleUrls: ['./widget-collection.scss']
})
export class WidgetCollectionComponent {
  assets = input.required<Asset[]>();
  loading = input<boolean>(false);

  readonly widgetStore = inject(WidgetStore);
  readonly registry = WIDGET_REGISTRY;

toggleBtnRef = viewChild.required<ElementRef>('toggleBtn');
settingsPanelRef = viewChild<ElementRef>('settingsPanel');

  constructor() {
     effect(() => {
         if (this.assets().length > 0) {
             const defaults = this.registry
                .filter(w => w.defaultSelected)
                .map(w => w.id);
             this.widgetStore.initSelection(defaults);
         }
     }, { allowSignalWrites: true });
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

  readonly assetPieData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    
    // Group By Logic
    const grouped = assets.reduce((acc, curr) => {
      // 優先用 marketValueTwd
      const value = curr.marketValueTwd ?? curr.current_value;
      acc[curr.asset_type] = (acc[curr.asset_type] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    // Transform to Chart Data
    return Object.keys(grouped).map(key => {
      const colorRgb = getAssetRgb(key); 
      return {
        name: key,
        value: grouped[key],
        color: colorRgb ? `rgba(${colorRgb}, 1)` : undefined
      };
    });
  });

  readonly twStockData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    return assets
      .filter(a => a.asset_type === AssetType.STOCK && a.currency === 'TWD')
      .map(a => ({
        name: a.name,
        value: a.marketValue ?? a.current_value,
      }));
  });

  readonly usStockData = computed<PieChartData[]>(() => {
    const assets = this.assets() as AssetWithMarketValue[];
    return assets
      .filter(a => a.asset_type === AssetType.STOCK && a.currency === 'USD')
      .map(a => ({
        name: a.name,
        value: a.marketValue ?? a.current_value,
      }));
  });

  readonly widgetStates = computed(() => {
    const currentAssets = this.assets();
    const selectedIds = this.widgetStore.selectedWidgets();

    return this.registry.map(def => {
      const isAvailable = def.isAvailable(currentAssets);
      const isSelected = isAvailable && selectedIds.includes(def.id);
      return { def, isAvailable, isSelected };
    });
  });

  readonly visibleWidgets = computed(() => 
    this.widgetStates().filter(s => s.isSelected)
  );

  toggleWidget(id: any, isAvailable: boolean) {
      if (!isAvailable) return;
      this.widgetStore.toggleWidget(id, isAvailable);
  }
}