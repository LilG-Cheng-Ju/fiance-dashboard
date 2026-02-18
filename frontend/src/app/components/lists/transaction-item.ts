import { Component, input, output, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Transaction } from '../../core/models/transaction.model';
import { AssetType, TransactionType } from '../../core/models/asset.model';

@Component({
  selector: 'app-transaction-item',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './transaction-item.html',
  styleUrls: ['./transaction-item.scss']
})
export class TransactionItemComponent {
  transaction = input.required<Transaction>();
  currency = input.required<string>();
  assetType = input.required<AssetType>();

  onSettle = output<Transaction>();

  // Logic: Is this a market-traded asset? (Stock, Crypto, Gold)
  isMarketAsset = computed(() => {
    const type = this.assetType();
    return [AssetType.STOCK, AssetType.CRYPTO, AssetType.GOLD].includes(type);
  });

  // Logic: Show settle button only for Pending items with non-zero amount
  showSettleBtn = computed(() => {
    return this.assetType() === AssetType.PENDING && this.transaction().amount !== 0;
  });

  // Helper: Readable Label for Transaction Type
  typeLabel = computed(() => {
    const type = this.transaction().transaction_type;
    switch (type) {
      case TransactionType.BUY: return '買入';
      case TransactionType.SELL: return '賣出';
      case TransactionType.DEPOSIT: return '入金';
      case TransactionType.WITHDRAW: return '出金';
      case TransactionType.DIVIDEND: return '股息'; // Assuming you add DIVIDEND later
      case TransactionType.INITIAL: return '初始';
      case TransactionType.TRANSFER_IN: return '轉入';
      case TransactionType.TRANSFER_OUT: return '轉出';
      default: return type;
    }
  });

  // Helper: CSS Class for Type Badge
  typeClass = computed(() => {
    const type = this.transaction().transaction_type;
    switch (type) {
      case TransactionType.BUY: return 'type-buy';
      case TransactionType.SELL: return 'type-sell';
      case TransactionType.DEPOSIT: return 'type-deposit';
      case TransactionType.WITHDRAW: return 'type-withdraw';
      default: return '';
    }
  });
}
