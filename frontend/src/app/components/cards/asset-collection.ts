import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetCard } from '../cards/asset-card';
import { AssetView, AssetType } from '../../core/models/asset.model';

@Component({
  selector: 'app-asset-collection',
  standalone: true,
  imports: [CommonModule, AssetCard],
  templateUrl: './asset-collection.html',
  styleUrls: ['./asset-collection.scss'],
})
export class AssetCollectionComponent {
  assets = input.required<AssetView[]>();

  filterType = signal<'ALL' | AssetType>('ALL');

  displayedAssets = computed(() => {
    const list = this.assets();
    const type = this.filterType();

    if (type === 'ALL') return list;

    return list.filter((a) => a.asset_type === type);
  });

  setFilter(type: string) {
    this.filterType.set(type as 'ALL' | AssetType);
  }
}
