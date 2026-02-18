import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Asset, AssetType } from '../../core/models/asset.model';

export interface AssetFilterState {
  type: AssetType | 'ALL';
  currency: string | 'ALL';
}

@Component({
  selector: 'app-asset-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asset-filter.html',
  styleUrls: ['./asset-filter.scss']
})
export class AssetFilterComponent {
  assets = input.required<Asset[]>();
  filterChange = output<AssetFilterState>();

  // State
  isPanelOpen = signal(false);
  activeFilter = signal<AssetFilterState>({ type: 'ALL', currency: 'ALL' });
  pendingFilter = signal<AssetFilterState>({ type: 'ALL', currency: 'ALL' });

  // Computed Options
  availableTypes = computed(() => {
    // Static list of all types supported by the system
    return [
      { label: '全部', value: 'ALL' },
      { label: '現金 / 存款', value: AssetType.CASH },
      { label: '股票 / 基金', value: AssetType.STOCK },
      { label: '加密貨幣', value: AssetType.CRYPTO },
      { label: '黃金', value: AssetType.GOLD },
      { label: '待結算', value: AssetType.PENDING },
      { label: '負債', value: AssetType.LIABILITY },
      { label: '信用卡', value: AssetType.CREDIT_CARD },
    ];
  });

  availableCurrencies = computed(() => {
    const list = this.assets();
    const currencies = new Set(list.map(a => a.currency));
    return ['ALL', ...Array.from(currencies).sort()];
  });

  // Actions
  toggle() {
    if (!this.isPanelOpen()) {
      // Open: Sync pending with active (Reset changes)
      this.pendingFilter.set({ ...this.activeFilter() });
    }
    this.isPanelOpen.update(v => !v);
  }

  setPendingType(type: string) {
    this.pendingFilter.update(s => ({ ...s, type: type as AssetType | 'ALL' }));
  }

  setPendingCurrency(currency: string) {
    this.pendingFilter.update(s => ({ ...s, currency }));
  }

  applyFilter() {
    const newFilter = this.pendingFilter();
    this.activeFilter.set(newFilter);
    this.filterChange.emit(newFilter);
    this.isPanelOpen.set(false);
  }

  cancel() {
    this.isPanelOpen.set(false);
  }
  
  // Helper to check if filter is active (to highlight the icon)
  isActive = computed(() => {
    const f = this.activeFilter();
    return f.type !== 'ALL' || f.currency !== 'ALL';
  });
}
