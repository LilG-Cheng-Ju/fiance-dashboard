import { Component, inject, input, OnInit, computed, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../core/services/modal.service';
import { TransactionStore } from '../../core/store/transaction.store';
import { AssetStore } from '../../core/store/asset.store';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetView } from '../../core/models/asset.model';
import { AssetSummaryComponent } from '../widgets/asset-summary';
import { AssetPerformanceService } from '../../core/services/asset-performance.service';
import { TransactionCollectionComponent } from '../lists/transaction-collection';
import { TransactionFormComponent, TransactionFormData } from '../forms/transaction-form';
import { SettleModalComponent } from './settle-modal';

@Component({
  selector: 'app-asset-detail-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AssetSummaryComponent, TransactionCollectionComponent],
  templateUrl: './asset-detail-modal.html',
  styleUrls: ['./asset-detail-modal.scss']
})
export class AssetDetailModalComponent implements OnInit, OnDestroy {
  data = input.required<{ asset: AssetView }>();
  
  private modalService = inject(ModalService);
  public transactionStore = inject(TransactionStore);
  private assetStore = inject(AssetStore);
  private performanceService = inject(AssetPerformanceService);

  isEditingName = signal(false);
  nameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  asset = computed(() => {
    const initialView = this.data().asset;
    const id = initialView.id;
    const currentAsset = this.assetStore.activeAssets().find(a => a.id === id) || initialView;
    const marketPrice = initialView.marketPrice;
    const exchangeRate = initialView.exchangeRate;
    const txs = this.transactionStore.transactions();

    return this.performanceService.computePerformance(
      currentAsset, 
      marketPrice, 
      exchangeRate, 
      txs
    );
  });

  themeColor = computed(() => getAssetRgb(this.asset().asset_type));

  ngOnInit() {
    if (this.data().asset.id) {
      this.transactionStore.loadTransactionsByAsset({ assetId: this.data().asset.id });
    }
  }

  ngOnDestroy() {
    this.transactionStore.clearState();
  }

  close() {
    this.modalService.close();
  }

  startEditName() {
    this.nameControl.setValue(this.asset().name);
    this.isEditingName.set(true);
  }

  saveName() {
    if (this.nameControl.invalid) return;
    
    const newName = this.nameControl.value.trim();
    if (newName === this.asset().name) {
      this.isEditingName.set(false);
      return;
    }

    this.assetStore.updateAsset({ 
      id: this.asset().id, 
      data: { name: newName } 
    });
    this.isEditingName.set(false);
  }

  cancelEditName() {
    this.isEditingName.set(false);
  }

  onToggleNetWorth(event: Event) {
    const input = event.target as HTMLInputElement;
    const isChecked = input.checked;
    
    this.assetStore.updateAsset({ 
      id: this.asset().id, 
      data: { include_in_net_worth: isChecked } 
    });
  }

  onTransactionAction(action: string) {
    if (action === 'DIVIDEND') {
      alert('Feature coming soon');
      return;
    }
    this.modalService.open(TransactionFormComponent, {
      asset: this.asset(),
      action: action
    } as TransactionFormData);
  }

  onSettleTransaction(tx: any) {
    this.modalService.open(SettleModalComponent, {
      asset: this.asset(),
      transaction: tx
    });
  }

  onDeleteAsset() {
    const confirmed = confirm(`Are you sure you want to delete ${this.asset().name}?`);
    if (confirmed) {
      this.assetStore.deleteAsset(this.asset().id);
      this.close();
    }
  }
}
