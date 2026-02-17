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
    const baseAsset = this.data().asset;
    const txs = this.transactionStore.transactions();

    // 如果還沒有交易紀錄，直接回傳基礎資產 (來自 Dashboard)
    if (txs.length === 0) {
      return baseAsset;
    }

    // 如果有交易紀錄，重新計算以取得真實總損益 & 平均匯率
    // 我們沿用 dashboard 的市價/匯率以保持一致性
    return this.performanceService.computePerformance(
      baseAsset, 
      baseAsset.marketPrice, 
      baseAsset.exchangeRate, 
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
    console.log('Action triggered:', action, 'for asset:', this.asset().name);
    // 下一步：這裡會根據 action (例如 'BUY', 'DEPOSIT') 打開對應的 TransactionForm
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
