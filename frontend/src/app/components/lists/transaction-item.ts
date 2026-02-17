import { Component, input, output, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Transaction } from '../../core/models/transaction.model';
import { AssetType } from '../../core/models/asset.model';

@Component({
  selector: 'app-transaction-item',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  template: `
    <div class="tx-item">
      <!-- Date Column -->
      <div class="tx-date">
        <span class="day">{{ transaction().transaction_date | date:'dd' }}</span>
        <span class="month">{{ transaction().transaction_date | date:'MMM' }}</span>
      </div>
      
      <!-- Details Column -->
      <div class="tx-details">
        <div class="tx-type">{{ transaction().transaction_type }}</div>
        <div class="tx-note">{{ transaction().note || '-' }}</div>
      </div>

      <!-- Amount Column -->
      <div class="tx-amounts">
        <!-- Main Amount -->
        <span class="main-amt" 
              [class.inflow]="transaction().amount > 0" 
              [class.outflow]="transaction().amount < 0">
          {{ transaction().amount > 0 ? '+' : '' }}{{ transaction().amount | number }} 
          <span class="currency">{{ currency() }}</span>
        </span>
        
        <!-- Dual Track: Source Amount (e.g. Cost in TWD) -->
        @if (transaction().source_amount) {
          <span class="sub-amt">
            {{ transaction().source_amount | number }} {{ transaction().source_currency }}
          </span>
        }
      </div>

      <!-- Actions (e.g. Settle for Pending) -->
      @if (showSettleBtn()) {
        <button class="icon-btn settle-btn" (click)="onSettle.emit(transaction())" title="結清此款項">
          <span class="material-symbols-rounded">check_circle</span>
        </button>
      }
    </div>
  `,
  styles: [`
    .tx-item {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-slate-100);
      transition: background 0.2s;

      &:hover { background-color: var(--color-slate-50); }

      .tx-date {
        display: flex; flex-direction: column; align-items: center; margin-right: 16px; min-width: 40px;
        .day { font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1; }
        .month { font-size: 0.7rem; color: var(--text-sub); text-transform: uppercase; }
      }

      .tx-details {
        flex: 1;
        .tx-type { font-size: 0.9rem; font-weight: 600; color: var(--text-main); margin-bottom: 2px; }
        .tx-note { font-size: 0.8rem; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
      }

      .tx-amounts {
        text-align: right;
        margin-right: 12px;
        .main-amt { 
          font-size: 0.95rem; font-weight: 600; display: block; 
          &.inflow { color: #10b981; } 
          &.outflow { color: var(--text-main); } 
          .currency { font-size: 0.7em; color: var(--text-sub); font-weight: normal; }
        }
        .sub-amt { font-size: 0.75rem; color: var(--text-sub); display: block; margin-top: 2px; }
      }

      .settle-btn {
        border: none; background: transparent; cursor: pointer; color: var(--color-slate-200);
        &:hover { color: #10b981; }
      }
    }
  `]
})
export class TransactionItemComponent {
  transaction = input.required<Transaction>();
  currency = input.required<string>();
  assetType = input.required<AssetType>();

  onSettle = output<Transaction>();

  showSettleBtn = computed(() => {
    return this.assetType() === AssetType.PENDING && this.transaction().amount !== 0;
  });
}
