import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../core/services/modal.service';
import { AssetStore } from '../../core/store/asset.store';
import { TransactionService } from '../../core/services/transaction.service';
import { TransactionStore } from '../../core/store/transaction.store';
import { Transaction, TransactionCreate } from '../../core/models/transaction.model';
import { AssetView, TransactionType } from '../../core/models/asset.model';
import { getLocalISODate } from '../../core/helpers/date.helper';
import { InfoTooltipComponent } from '../widgets/info-tooltip';

@Component({
  selector: 'app-settle-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoTooltipComponent],
  templateUrl: './settle-modal.html',
  styleUrls: ['./settle-modal.scss']
})
export class SettleModalComponent {
  data = input.required<{ transaction: Transaction; asset: AssetView }>();

  private modalService = inject(ModalService);
  private assetStore = inject(AssetStore);
  private transactionService = inject(TransactionService);
  private transactionStore = inject(TransactionStore);

  selectedTargetId = signal<number | null>(null);
  isSubmitting = signal(false);

  tx = computed(() => this.data().transaction);
  pendingAsset = computed(() => this.data().asset);
  
  availableTargets = computed(() => {
    const currency = this.pendingAsset().currency;
    return this.assetStore.cashAssets().filter(a => a.currency === currency);
  });

  direction = computed(() => {
    return this.tx().amount > 0 ? 'INFLOW' : 'OUTFLOW';
  });

  actionLabel = computed(() => {
    const action = this.direction() === 'INFLOW' ? '去向' : '來源';
    return `資金${action}`;
  });

  close() {
    this.modalService.close();
  }

  confirm() {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const targetId = this.selectedTargetId();
    const originalTx = this.tx();

    if (targetId) {
      this.createCashFlowTransaction(targetId, originalTx).subscribe({
        next: () => {
          this.deletePendingTransaction(originalTx.id);
        },
        error: (err) => {
          console.error('Failed to create cash flow', err);
          this.isSubmitting.set(false);
          alert('結清失敗，請稍後再試');
        }
      });
    } else {
      this.deletePendingTransaction(originalTx.id);
    }
  }

  private createCashFlowTransaction(targetAssetId: number, pendingTx: Transaction) {
    const isInflow = this.direction() === 'INFLOW';
    const amount = Math.abs(pendingTx.amount);
    
    const note = `結清: ${this.pendingAsset().name} ${pendingTx.note ? '- ' + pendingTx.note : ''}`;

    const payload: TransactionCreate = {
      asset_id: targetAssetId,
      transaction_type: isInflow ? TransactionType.DEPOSIT : TransactionType.WITHDRAW,
      amount: isInflow ? amount : -amount,
      transaction_date: `${getLocalISODate()}T00:00:00`,
      note: note,
      exchange_rate: 1.0
    };

    return this.transactionService.createTransaction(payload);
  }

  private deletePendingTransaction(txId: number) {
    this.transactionService.deleteTransaction(txId).subscribe({
      next: () => {
        this.assetStore.loadAssets();
        this.transactionStore.loadTransactionsByAsset({ assetId: this.pendingAsset().id });
        this.close();
      },
      error: (err) => {
        console.error('Failed to delete pending tx', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
