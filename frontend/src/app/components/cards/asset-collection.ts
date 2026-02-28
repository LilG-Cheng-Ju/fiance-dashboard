import { Component, input, signal, computed, viewChild, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetCard } from '../cards/asset-card';
import { AssetView } from '../../core/models/asset.model';
import { AssetFilterComponent, AssetFilterState } from '../widgets/asset-filter';

@Component({
  selector: 'app-asset-collection',
  standalone: true,
  imports: [CommonModule, AssetCard, AssetFilterComponent],
  templateUrl: './asset-collection.html',
  styleUrls: ['./asset-collection.scss'],
})
export class AssetCollectionComponent {
  assets = input.required<AssetView[]>();

  addAsset = output<void>();

  // Access child component to toggle panel and check state
  filterComponent = viewChild.required(AssetFilterComponent);

  // Current active filter state
  currentFilter = signal<AssetFilterState>({ type: 'ALL', currency: 'ALL' });

  displayedAssets = computed(() => {
    const list = this.assets();
    const filter = this.currentFilter();

    return list.filter(asset => {
      // 1. Filter by Type
      if (filter.type !== 'ALL' && asset.asset_type !== filter.type) {
        return false;
      }
      // 2. Filter by Currency
      if (filter.currency !== 'ALL' && asset.currency !== filter.currency) {
        return false;
      }
      return true;
    });
  });

  onFilterChange(newState: AssetFilterState) {
    this.currentFilter.set(newState);
  }

  openAddAsset() {
    this.addAsset.emit();
  }
}
