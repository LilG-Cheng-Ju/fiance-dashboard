import { Component, input, signal, computed, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetCard } from '../cards/asset-card';
import { AssetView, AssetType } from '../../core/models/asset.model';
import { ModalService } from '../../core/services/modal.service';
import { AssetTypePickerComponent } from '../modals/asset-type-picker';
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

  private modalService = inject(ModalService);

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
    this.modalService.open(AssetTypePickerComponent);
  }
}
