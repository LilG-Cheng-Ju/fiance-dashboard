import { Component, inject, input, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { TransactionStore } from '../../core/store/transaction.store';
import { AssetStore } from '../../core/store/asset.store';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetView } from '../../core/models/asset.model';
import { AssetSummaryComponent } from '../widgets/asset-summary';
import { AssetPerformanceService } from '../../core/services/asset-performance.service';
import { TransactionCollectionComponent } from '../lists/transaction-collection';
import { TransactionFormComponent, TransactionFormData } from '../forms/transaction-form';

@Component({
  selector: 'app-asset-detail-modal',
  standalone: true,
  imports: [CommonModule, AssetSummaryComponent, TransactionCollectionComponent],
  templateUrl: './asset-detail-modal.html',
  styleUrls: ['./asset-detail-modal.scss']
})
export class AssetDetailModalComponent implements OnInit, OnDestroy {
  // 輸入: 完整的資產物件 (包含從 Dashboard 計算的損益)
  data = input.required<{ asset: AssetView }>();
  
  private modalService = inject(ModalService);
  public transactionStore = inject(TransactionStore);
  private assetStore = inject(AssetStore);
  private performanceService = inject(AssetPerformanceService);

  // [修正] 使用 computed 代替 effect+signal 以避免無限迴圈。
  // 這會自動將基礎資產資料與交易歷史合併 (若有)。
  asset = computed(() => {
    const initialView = this.data().asset;
    const id = initialView.id;
    
    // 1. 嘗試從 Store 取得最新的資產狀態 (Asset)，如果找不到則使用傳入的快照 (AssetView)
    // 注意：Store 裡的 Asset 沒有 marketPrice/exchangeRate
    const currentAsset = this.assetStore.activeAssets().find(a => a.id === id) || initialView;
    
    // 2. 沿用 Dashboard 傳入的市場數據 (因為 Store 裡沒有這些即時數據)
    const marketPrice = initialView.marketPrice;
    const exchangeRate = initialView.exchangeRate;
    
    const txs = this.transactionStore.transactions();

    // 3. 重新計算績效 (這會回傳一個完整的 AssetView)
    // 即使沒有交易紀錄 (txs 為空)，我們也透過這個函式將 Asset 升級為 AssetView
    return this.performanceService.computePerformance(
      currentAsset, 
      marketPrice, 
      exchangeRate, 
      txs
    );
  });

  // 根據資產類型取得主題色
  themeColor = computed(() => getAssetRgb(this.asset().asset_type));

  ngOnInit() {
    // 開啟 Modal 時載入交易紀錄
    // [修正] 直接使用 this.data().asset.id。
    // 因為 this.asset() signal 是在 effect 中更新，可能還沒執行。
    if (this.data().asset.id) {
      this.transactionStore.loadTransactionsByAsset({ assetId: this.data().asset.id });
    }
  }

  ngOnDestroy() {
    // Clear store state when closing to avoid flashing old data next time
    this.transactionStore.clearState();
  }

  close() {
    this.modalService.close();
  }

  onTransactionAction(action: string) {
    // [Feature Flag] Dividend logic is complex (requires destination account), disabled for now.
    if (action === 'DIVIDEND') {
      alert('領息功能即將推出 (Coming Soon)');
      return;
    }

    // Open Transaction Form
    this.modalService.open(TransactionFormComponent, {
      asset: this.asset(),
      action: action
    } as TransactionFormData);
  }

  // Delete Asset Logic
  onDeleteAsset() {
    const confirmed = confirm(`Are you sure you want to delete ${this.asset().name}?\nThis action cannot be undone and will delete all associated transaction records.`);
    if (confirmed) {
      this.assetStore.deleteAsset(this.asset().id);
      this.close();
    }
  }
}
