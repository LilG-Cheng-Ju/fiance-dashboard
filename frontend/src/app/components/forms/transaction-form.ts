import { Component, computed, effect, inject, input, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

import { ModalService } from '../../core/services/modal.service';
import { AssetStore } from '../../core/store/asset.store';
import { RateStore } from '../../core/store/exchange_rate.store';
import { SettingsStore } from '../../core/store/settings.store';
import { TransactionStore } from '../../core/store/transaction.store';
import { TransactionService } from '../../core/services/transaction.service';
import { AssetView, AssetType, TransactionType } from '../../core/models/asset.model';
import { TransactionCreate } from '../../core/models/transaction.model';
import { getLocalISODate } from '../../core/helpers/date.helper';

export interface TransactionFormData {
  asset: AssetView;
  action: string; // 'BUY', 'SELL', 'DEPOSIT', 'WITHDRAW', 'REPAY', 'DIVIDEND'
}

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-form.html',
  styleUrls: ['./transaction-form.scss']
})
export class TransactionFormComponent {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private assetStore = inject(AssetStore);
  private transactionStore = inject(TransactionStore);
  private transactionService = inject(TransactionService);
  public rateStore = inject(RateStore);
  public settingsStore = inject(SettingsStore);

  data = input.required<TransactionFormData>();
  
  asset = computed(() => this.data().asset);
  action = computed(() => this.data().action);
  
  pendingDirection = signal<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');

  // Funding Sources (Cash Assets)
  fundingSources = this.assetStore.cashAssets;

  // Logic: Is this a "Positive" action (Green) or "Negative" action (Red)?
  isPositiveAction = computed(() => {
    return ['BUY', 'DEPOSIT', 'REPAY', 'DIVIDEND'].includes(this.action());
  });

  // Logic: Is this a Market Asset (Stock/Crypto/Gold)?
  isMarketAsset = computed(() => {
    const type = this.asset().asset_type;
    return [AssetType.STOCK, AssetType.CRYPTO, AssetType.GOLD].includes(type);
  });

  // Logic: Title & Labels
  uiConfig = computed(() => {
    const act = this.action();
    const name = this.asset().name;
    
    switch (act) {
      case 'BUY': return { title: `買入 - ${name}`, label: '買入總金額', btn: '確認買入' };
      case 'SELL': return { title: `賣出 - ${name}`, label: '賣出總金額', btn: '確認賣出' };
      case 'DEPOSIT': return { title: `存入 - ${name}`, label: '存入金額', btn: '確認存入' };
      case 'WITHDRAW': return { title: `提款 - ${name}`, label: '提款金額', btn: '確認提款' };
      case 'REPAY': return { title: `還款 - ${name}`, label: '還款金額', btn: '確認還款' };
      case 'DIVIDEND': return { title: `領息 - ${name}`, label: '領取金額', btn: '確認領息' };
      
      case 'ADD_ITEM': 
        const isPayable = this.pendingDirection() === 'PAYABLE';
        return { title: isPayable ? '新增應付帳款' : '新增應收帳款', label: '金額', btn: '確認新增' };

      default: return { title: '新增交易', label: '金額', btn: '送出' };
    }
  });

  form: FormGroup;
  formValues: Signal<any>;

  // Computed Values for UI
  currentCurrency = computed(() => this.asset().currency);
  selectedSourceId = computed(() => this.formValues()?.source_asset_id || null);
  selectedSourceCurrency = computed(() => {
    const id = this.selectedSourceId();
    if (!id) return null;
    return this.fundingSources().find(a => a.id == id)?.currency;
  });
  
  // Validation: Max Quantity for Sell
  maxSellQty = computed(() => this.action() === 'SELL' ? this.asset().quantity : null);

  constructor() {
    const today = getLocalISODate();

    this.form = this.fb.group({
      date: [today, Validators.required],
      price: [null], // Unit Price
      quantity: [null], // Qty
      amount: [null, [Validators.required, Validators.min(0)]], // Total Amount
      source_asset_id: [null],
      source_amount: [null],
      note: ['']
    });

    this.formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });

    // Effect: Triangular Calculation (Price * Qty = Amount)
    effect(() => {
      if (!this.isMarketAsset()) return;
      
      // Read from signal (formValues) to ensure effect tracks changes
      const vals = this.formValues();
      const p = vals.price;
      const q = vals.quantity;
      
      // Only auto-calc amount if both P and Q are present and user isn't editing amount directly
      // (Simplified logic: if P and Q change, update Amount)
      if (p && q) {
        const calcAmount = parseFloat((p * q).toFixed(2));
        if (this.form.get('amount')?.value !== calcAmount) {
          this.form.patchValue({ amount: calcAmount }, { emitEvent: false });
          this.updateSourceAmountEstimate();
        }
      }
    });

    // Effect: Cross-Currency Calculation
    effect(() => {
      this.updateSourceAmountEstimate();
    });
  }

  // Helper: Update Source Amount based on Exchange Rate
  private updateSourceAmountEstimate() {
    const sourceId = this.selectedSourceId();
    const amount = this.form.get('amount')?.value || 0;
    const targetCurrency = this.currentCurrency();
    const baseCurrency = this.settingsStore.baseCurrency();

    if (sourceId && amount > 0) {
      const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
      if (sourceAsset) {
        let calculatedSourceAmount = 0;
        
        if (sourceAsset.currency === targetCurrency) {
            calculatedSourceAmount = amount; 
        } else {
            // Cross-currency logic (same as MarketAssetForm)
            const targetToBaseKey = `${targetCurrency}-${baseCurrency}`;
            const targetToBaseRate = (targetCurrency === baseCurrency) ? 1.0 : (this.rateStore.rateMap()[targetToBaseKey] || 1.0);
            const valueInBase = amount * targetToBaseRate;

            if (sourceAsset.currency === baseCurrency) {
                calculatedSourceAmount = valueInBase;
            } else {
                const sourceToBaseKey = `${sourceAsset.currency}-${baseCurrency}`;
                const sourceToBaseRate = this.rateStore.rateMap()[sourceToBaseKey] || 1.0; 
                calculatedSourceAmount = valueInBase / sourceToBaseRate;
            }
        }
        
        const currentSourceAmt = this.form.get('source_amount')?.value;
        const newSourceAmt = Math.round(calculatedSourceAmount);
        
        if (currentSourceAmt !== newSourceAmt) {
          this.form.patchValue({ source_amount: newSourceAmt }, { emitEvent: false });
        }
      }
    } else if (!sourceId) {
       this.form.patchValue({ source_amount: null }, { emitEvent: false });
    }
  }

  // Triangular Calc: Update Price when Amount changes
  onAmountChange() {
    if (!this.isMarketAsset()) {
        this.updateSourceAmountEstimate();
        return;
    }
    
    const amt = this.form.get('amount')?.value;
    const qty = this.form.get('quantity')?.value;
    
    if (amt && qty && qty > 0) {
      const p = amt / qty;
      this.form.patchValue({ price: p }, { emitEvent: false });
    }
    this.updateSourceAmountEstimate();
  }

  close() {
    this.modalService.close();
  }

  setPendingDirection(dir: 'RECEIVABLE' | 'PAYABLE') {
    this.pendingDirection.set(dir);
  }

  submit() {
    if (this.form.invalid) return;

    const val = this.form.value;
    const act = this.action();
    
    // 1. Determine Sign & Map to Backend Enum
    let amountSign = 1;
    let qtySign = 1;
    let backendType: TransactionType;

    switch (act) {
      case 'BUY':
        amountSign = -1; // Cost (Outflow)
        qtySign = 1;     // Asset Increase
        backendType = TransactionType.BUY;
        break;
      case 'SELL':
        amountSign = 1;  // Proceeds (Inflow)
        qtySign = -1;    // Asset Decrease
        backendType = TransactionType.SELL;
        break;
      case 'DEPOSIT':
      case 'DIVIDEND':
        amountSign = 1;
        qtySign = 1;
        backendType = act === 'DIVIDEND' ? TransactionType.DIVIDEND : TransactionType.DEPOSIT;
        break;
      case 'WITHDRAW':
        amountSign = -1;
        qtySign = -1;
        backendType = TransactionType.WITHDRAW;
        break;
      case 'REPAY':
        // Repay Liability: Add positive funds to reduce negative balance (e.g. -1000 + 100 = -900)
        amountSign = 1; 
        qtySign = 1;
        backendType = TransactionType.DEPOSIT; // Map REPAY to DEPOSIT for backend
        break;
      
      case 'ADD_ITEM':
        if (this.pendingDirection() === 'RECEIVABLE') {
          amountSign = 1; qtySign = 1; backendType = TransactionType.DEPOSIT;
        } else {
          amountSign = -1; qtySign = -1; backendType = TransactionType.WITHDRAW;
        }
        break;

      default:
        amountSign = 1;
        qtySign = 1;
        backendType = TransactionType.ADJUSTMENT;
    }

    // [Logic Update] Determine the final "Cost Basis" (Amount)
    // If a funding source is selected and currencies match (e.g. TWD -> TWD),
    // we use the "Source Amount" (Actual Deducted) as the transaction amount.
    // This allows users to include fees in the cost basis (e.g. 520) 
    // while keeping the Unit Price at market value (e.g. 510).
    let finalAmount = val.amount;
    if (val.source_asset_id && val.source_amount) {
        const sourceAsset = this.fundingSources().find(a => a.id == val.source_asset_id);
        if (sourceAsset && sourceAsset.currency === this.asset().currency) {
            finalAmount = val.source_amount;
        }
    }

    // [Feature] Auto-generate note if empty and source is selected
    let finalNote = val.note;
    if (!finalNote && val.source_asset_id) {
        const sourceName = this.fundingSources().find(a => a.id == val.source_asset_id)?.name;
        if (sourceName) {
            finalNote = this.isPositiveAction() ? `扣款: ${sourceName}` : `入帳: ${sourceName}`;
        }
    }

    // 2. Prepare Payload with strict typing
    const payload: TransactionCreate = {
      asset_id: this.asset().id,
      transaction_type: backendType, 
      amount: finalAmount * amountSign, // Use the adjusted amount
      quantity_change: (val.quantity || 0) * qtySign,
      price_at_transaction: val.price,
      transaction_date: `${val.date}T00:00:00`,
      note: finalNote,
      
      // Funding Source
      source_asset_id: val.source_asset_id,
      source_amount: val.source_amount,
      source_currency: val.source_asset_id ? 
        this.fundingSources().find(a => a.id == val.source_asset_id)?.currency : undefined
    };

    // 3. Calculate Exchange Rate
    // If source_amount exists, rate = source_amount / amount
    // Note: If we overrode finalAmount with source_amount, rate will be 1.0, which is correct.
    if (val.source_amount && finalAmount) {
        payload.exchange_rate = val.source_amount / finalAmount;
    } else {
        payload.exchange_rate = 1.0;
    }

    this.transactionService.createTransaction(payload).subscribe({
      next: () => {
        // Refresh asset to show new balance
        this.assetStore.loadAssets();
        // Refresh transaction list in the background modal
        this.transactionStore.loadTransactionsByAsset({ assetId: this.asset().id });
        
        this.close();
      },
      error: (err) => console.error(err)
    });
  }
}
