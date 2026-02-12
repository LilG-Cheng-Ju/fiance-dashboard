import { Component, computed, effect, inject, input, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

import { ModalService } from '../../core/services/modal.service';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetStore } from '../../core/store/asset.store';
import { AssetCreate, AssetType } from '../../core/models/asset.model';
import { RateStore } from '../../core/store/exchange_rate.store';
import { getLocalISODate } from '../../core/helpers/date.helper';

interface FormConfig {
  title: string;
  name_example: string;
  amountLabel: string;
  defaultNetWorth: boolean;
  isLiability: boolean;
}

export interface SimpleAssetFormData {
  assetType: string;
}

@Component({
  selector: 'app-simple-asset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './simple-asset-form.html',
  styleUrls: ['./simple-asset-form.scss']
})
export class SimpleAssetFormComponent {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private assetStore = inject(AssetStore);
  public rateStore = inject(RateStore);

  // --- Inputs ---
  data = input<SimpleAssetFormData>({ assetType: 'CASH' });
  assetType: Signal<string> = computed(() => this.data().assetType);

  pendingDirection = signal<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');

  // --- Data Source ---
  fundingSources = this.assetStore.cashAssets;

  // --- Computed State ---
  themeColor = computed(() => getAssetRgb(this.assetType()));

  config = computed(() => {
    const assetType = this.assetType();
    let cfg = this.CONFIG_MAP[assetType] || this.CONFIG_MAP['CASH'];

    if (assetType === 'PENDING') {
      const isPayable = this.pendingDirection() === 'PAYABLE';
      return {
        ...cfg,
        amountLabel: isPayable ? '待支付金額' : '待收款金額',
        isLiability: isPayable,
        name_example: isPayable ? '水電費' : '客戶尾款'
      };
    }
    return cfg;
  });

  // --- Form & Logic ---
  form: FormGroup;
  
  // Form Signals
  currentCurrency: Signal<string>;
  amountValue: Signal<number>;
  rateValue: Signal<number | null>;
  showExchangeRate: Signal<boolean>;
  selectedSourceId: Signal<number | null>;

  referenceRate = computed(() => {
    const currency = this.currentCurrency();
    if (currency === 'TWD') return null;
    const key = `${currency}-TWD`;
    return this.rateStore.rateMap()[key] || null;
  });

  // Basic estimation (Display only)
  estimatedCost = computed(() => {
    const amt = this.amountValue() || 0;
    const rate = this.rateValue() || 1;
    // 🔥 Update: Round to integer directly
    return Math.round(amt * rate);
  });

  private readonly CONFIG_MAP: Record<string, FormConfig> = {
    CASH: { 
      title: '新增現金 / 存款', 
      name_example: '玉山銀行',
      amountLabel: '初始餘額', 
      defaultNetWorth: true, 
      isLiability: false 
    },
    PENDING: { 
      title: '新增待結清款項', 
      name_example: '朋友飯錢',
      amountLabel: '待結算金額', 
      defaultNetWorth: false, 
      isLiability: false 
    },
    LIABILITY: { 
      title: '新增負債 / 貸款',
      name_example: '房貸 - 陶朱隱園',
      amountLabel: '剩餘本金', 
      defaultNetWorth: false, 
      isLiability: true 
    },
    CREDIT_CARD: { 
      title: '新增信用卡',
      name_example: '玉山星展聯名卡',
      amountLabel: '當期帳單金額', 
      defaultNetWorth: false, 
      isLiability: true 
    }
  };

  constructor() {
    const today = getLocalISODate();

    this.form = this.fb.group({
      name: ['', Validators.required],
      currency: ['TWD', Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      exchange_rate: [1.0, [Validators.required, Validators.min(0.000001)]],
      date: [today],
      include_in_net_worth: [true],
      note: [''],
      source_asset_id: [null], 
      source_amount: [null]    
    });

    // --- Signals ---
    this.currentCurrency = toSignal(
      this.form.get('currency')!.valueChanges.pipe(startWith('TWD')), 
      { initialValue: 'TWD' }
    );

    this.amountValue = toSignal(
      this.form.get('amount')!.valueChanges.pipe(startWith(0)), 
      { initialValue: 0 }
    );

    this.rateValue = toSignal(
      this.form.get('exchange_rate')!.valueChanges.pipe(startWith(null)), 
      { initialValue: null }
    );

    this.selectedSourceId = toSignal(
      this.form.get('source_asset_id')!.valueChanges.pipe(startWith(null)),
      { initialValue: null }
    );

    this.showExchangeRate = computed(() => this.currentCurrency() !== 'TWD');

    // --- Effects ---

    // 1. Fetch Exchange Rate
    effect(() => {
      const curr = this.currentCurrency();
      if (curr && curr !== 'TWD') {
        this.rateStore.loadRate({ fromCurr: curr, toCurr: 'TWD' });
        this.form.patchValue({ exchange_rate: null }, { emitEvent: false });
      }
    });

    // 2. Reset Rate
    effect(() => {
      if (this.currentCurrency() === 'TWD') {
        this.form.patchValue({ exchange_rate: 1.0 }, { emitEvent: false });
      }
    });

    // 3. Sync Defaults
    effect(() => {
      const cfg = this.config();
      const control = this.form.get('include_in_net_worth');
      if (control && control.pristine) {
        this.form.patchValue({ include_in_net_worth: cfg.defaultNetWorth }, { emitEvent: false });
      }
    });

    // 4. Auto-calculate Source Amount
    effect(() => {
      const sourceId = this.selectedSourceId();
      const amount = this.amountValue() || 0;
      const rate = this.rateValue() || 1;
      const targetCurrency = this.currentCurrency();

      if (sourceId) {
        const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
        
        if (sourceAsset) {
            let calculatedSourceAmount = 0;
            
            if (sourceAsset.currency === targetCurrency) {
                calculatedSourceAmount = amount;
            } else {
                calculatedSourceAmount = amount * rate;
            }

            // 🔥 Update: Round to integer (Math.round)
            calculatedSourceAmount = Math.round(calculatedSourceAmount);

            this.form.patchValue({ source_amount: calculatedSourceAmount }, { emitEvent: false });
        }
      } else {
        this.form.patchValue({ source_amount: null }, { emitEvent: false });
      }
    });
  }

  // UX Logic: Auto-fill reference rate on focus
  onRateFocus() {
    const currentVal = this.form.get('exchange_rate')?.value;
    const ref = this.referenceRate();
    
    // Only auto-fill if empty AND reference exists
    if ((currentVal === null || currentVal === '') && ref) {
      this.form.patchValue({ exchange_rate: ref });
    }
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
    const isBaseCurrency = val.currency === 'TWD';
    const finalRate = isBaseCurrency ? 1.0 : (val.exchange_rate || this.referenceRate() || 1.0);
    const multiplier = this.config().isLiability ? -1 : 1;

    let sourceCurrency = null;
    if (val.source_asset_id) {
        const sourceAsset = this.fundingSources().find(a => a.id == val.source_asset_id);
        sourceCurrency = sourceAsset?.currency || null;
    }

    const payload: AssetCreate = {
      name: val.name,
      asset_type: this.assetType() as AssetType,
      currency: val.currency,
      
      initial_quantity: val.amount * multiplier,
      initial_total_cost: val.amount * finalRate * multiplier,
      
      source_asset_id: val.source_asset_id,
      source_amount: val.source_amount,
      source_currency: sourceCurrency,
      exchange_rate: finalRate,

      transaction_time: `${val.date}T00:00:00`,
      include_in_net_worth: val.include_in_net_worth,
      meta_data: { note: val.note }
    };

    this.assetStore.addAsset(payload);
    this.close();
  }
}