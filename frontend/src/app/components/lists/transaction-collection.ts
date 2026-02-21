import { Component, input, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../core/models/transaction.model';
import { AssetView, AssetType } from '../../core/models/asset.model';
import { TransactionItemComponent } from './transaction-item';

interface ActionButton {
  label: string;
  icon: string;
  action: string;
  class: 'btn-primary' | 'btn-secondary';
}

@Component({
  selector: 'app-transaction-collection',
  standalone: true,
  imports: [CommonModule, TransactionItemComponent],
  templateUrl: './transaction-collection.html',
  styleUrls: ['./transaction-collection.scss']
})
export class TransactionCollectionComponent {
  asset = input.required<AssetView>();
  transactions = input.required<Transaction[]>();
  loading = input<boolean>(false);

  onAction = output<string>(); // Emits action ID (e.g., 'BUY', 'DEPOSIT')
  onSettle = output<Transaction>();

  // Button Logic Configuration
  buttons = computed<ActionButton[]>(() => {
    const type = this.asset().asset_type;
    
    switch (type) {
      case AssetType.CASH:
        return [
          { label: '存入', icon: 'add', action: 'DEPOSIT', class: 'btn-primary' },
          { label: '提款', icon: 'remove', action: 'WITHDRAW', class: 'btn-secondary' }
        ];
      
      case AssetType.STOCK:
        return [
          { label: '買入', icon: 'add_shopping_cart', action: 'BUY', class: 'btn-primary' },
          { label: '賣出', icon: 'sell', action: 'SELL', class: 'btn-secondary' },
          { label: '領息', icon: 'savings', action: 'DIVIDEND', class: 'btn-secondary' }
        ];

      case AssetType.CRYPTO:
      case AssetType.GOLD:
        return [
          { label: '買入', icon: 'add_shopping_cart', action: 'BUY', class: 'btn-primary' },
          { label: '賣出', icon: 'sell', action: 'SELL', class: 'btn-secondary' }
        ];

      case AssetType.PENDING:
        return [
          { label: '新增款項', icon: 'post_add', action: 'ADD_ITEM', class: 'btn-primary' }
        ];

      case AssetType.CREDIT_CARD:
        return [
          { label: '新增消費', icon: 'credit_card', action: 'ADD_EXPENSE', class: 'btn-primary' },
          { label: '繳卡費', icon: 'payments', action: 'PAY_BILL', class: 'btn-secondary' }
        ];

      case AssetType.LIABILITY:
        return [
          { label: '還款', icon: 'payments', action: 'REPAY', class: 'btn-primary' }
        ];

      default:
        return [];
    }
  });

  handleAction(action: string) {
    this.onAction.emit(action);
  }

  handleSettle(tx: Transaction) {
    this.onSettle.emit(tx);
  }
}
