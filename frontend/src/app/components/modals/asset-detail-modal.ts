import { Component, inject, input, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { TransactionStore } from '../../core/store/transaction.store';
import { AssetStore } from '../../core/store/asset.store';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetView } from '../../core/models/asset.model';

@Component({
  selector: 'app-asset-detail-modal',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './asset-detail-modal.html',
  styleUrls: ['./asset-detail-modal.scss']
})
export class AssetDetailModalComponent implements OnInit, OnDestroy {
  // Input: The full asset object (including computed PnL from Dashboard)
  data = input.required<{ asset: AssetView }>();
  asset = computed(() => this.data().asset);

  private modalService = inject(ModalService);
  public transactionStore = inject(TransactionStore);
  private assetStore = inject(AssetStore);

  // Get theme color based on asset type
  themeColor = computed(() => getAssetRgb(this.asset().asset_type));

  ngOnInit() {
    // Load transactions when modal opens
    if (this.asset().id) {
      this.transactionStore.loadTransactionsByAsset({ assetId: this.asset().id });
    }
  }

  ngOnDestroy() {
    // Clear store state when closing to avoid flashing old data next time
    this.transactionStore.clearState();
  }

  close() {
    this.modalService.close();
  }

  onAddTransaction() {
    console.log('Open Transaction Form for:', this.asset().name);
    // TODO: Implement TransactionFormComponent
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
