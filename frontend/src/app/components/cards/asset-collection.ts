import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssetCard } from '../cards/asset-card'; // 引入你的小卡
import { Asset, AssetType } from '../../core/models/asset.model';

// 定義這個 Collection 預期接收的資料格式
// (這是 App 算好傳進來的，包含了市價跟損益)
export interface AssetViewModel extends Asset {
  marketPrice: number;     // 現價
  marketValueTwd: number;  // 台幣市值
  unrealizedPnl: number;   // 未實現損益
  returnRate: number | string; // 報酬率
}

@Component({
  selector: 'app-asset-collection',
  standalone: true,
  imports: [CommonModule, AssetCard], // 只引入必要的模組
  templateUrl: './asset-collection.html',
  styleUrls: ['./asset-collection.scss']
})
export class AssetCollectionComponent {
  // --- Inputs / Outputs ---
  
  // 1. 接收外部算好的完整資料
  assets = input.required<AssetViewModel[]>();

  // 2. 刪除事件往外丟
  deleteAsset = output<number>();

  // --- 內部邏輯 (Logic) ---

  // 3. 篩選狀態 (預設顯示全部)
  // 這裡用 Signal，未來你可以把這控制權交給另一個 FilterComponent
  filterType = signal<'ALL' | AssetType>('ALL');

  // 4. 計算屬性：根據 Filter 算出「現在該顯示誰」
  displayedAssets = computed(() => {
    const list = this.assets();
    const type = this.filterType();

    if (type === 'ALL') return list;
    
    // 簡單的過濾邏輯
    return list.filter(a => a.asset_type === type);
  });

  // --- Methods ---

  // 切換篩選器 (給 HTML 用的)
  setFilter(type: string) {
    this.filterType.set(type as 'ALL' | AssetType);
  }

  // 轉發刪除事件
  onDelete(id: number) {
    this.deleteAsset.emit(id);
  }
}