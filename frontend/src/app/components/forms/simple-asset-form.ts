import { Component, computed, effect, inject, input, Signal, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

import { ModalService } from '../../core/services/modal.service';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetStore } from '../../core/store/asset.store';
import { AssetCreate } from '../../core/models/asset.model';
import { RateStore } from '../../core/store/exchange_rate.store';
import { AssetType } from '../../core/models/asset.model';
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

  // --- 1. Inputs (Renamed from type to assetType) ---
  data = input<SimpleAssetFormData>({ assetType: 'CASH' });
  assetType: Signal<string> = computed(() => this.data().assetType);

  pendingDirection = signal<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');

  // --- 2. Computed State ---
  
  // Calculate RGB string dynamically based on assetType
  // Example result: "16, 185, 129" (No hardcoding here!)
  themeColor = computed(() => getAssetRgb(this.assetType()));

  // Determine Form UI Config based on assetType
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
      } ;
    } 
    return cfg;
  });

  // --- 3. Form & Logic ---
  form: FormGroup;
  
  // Signals for form values (Reactive)
  currentCurrency: Signal<string>;
  amountValue: Signal<number>;
  rateValue: Signal<number | null>;
  // Signal to decide whether to show exchange rate inputs
  showExchangeRate: Signal<boolean>;

  referenceRate = computed(() => {
    const currency = this.currentCurrency();
    if (currency === 'TWD') return null;
    
    const key = `${currency}-TWD`;
    const rate = this.rateStore.rateMap()[key];
    
    return rate ? rate : null;
  });

  estimatedCost = computed(() => {
    const amt = this.amountValue() || 0;
    const rate = this.rateValue() || 1;
    return amt * rate;
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

    // Initialize Form
    this.form = this.fb.group({
      name: ['', Validators.required],
      currency: ['TWD', Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      exchange_rate: [1.0, [Validators.required, Validators.min(0.000001)]],
      date: [today], // YYYY-MM-DD
      include_in_net_worth: [true],
      note: ['']
    });

    // Convert form value changes to Signal
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

    this.showExchangeRate = computed(() => this.currentCurrency() !== 'TWD');

    // Fetch Exchange Rate when currency changes
    effect(() => {
      const curr = this.currentCurrency();
      if (curr && curr !== 'TWD') {
        // Trigger API call via Store
        this.rateStore.loadRate({ fromCurr: curr, toCurr: 'TWD' });
        
        // Reset manual input to show placeholder
        this.form.patchValue({ exchange_rate: null }, { emitEvent: false });
      }
    });

    // Reset Rate to 1.0 when currency is TWD
    effect(() => {
      if (this.currentCurrency() === 'TWD') {
        this.form.patchValue({ exchange_rate: 1.0 }, { emitEvent: false });
      }
    });

    // Sync Config Defaults
    effect(() => {
      const cfg = this.config();
      const control = this.form.get('include_in_net_worth');

      if (control && control.pristine) {
        this.form.patchValue({ include_in_net_worth: cfg.defaultNetWorth }, { emitEvent: false });
      }
    });
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
    // Use user input rate OR reference rate OR 1.0
    const finalRate = isBaseCurrency ? 1.0 : (val.exchange_rate || this.referenceRate() || 1.0);
    const multiplier = this.config().isLiability ? -1 : 1;

    const payload: AssetCreate = {
      name: val.name,
      asset_type: this.assetType() as AssetType,
      currency: val.currency,
      
      initial_quantity: val.amount * multiplier,
      initial_total_cost: val.amount * finalRate * multiplier,
      
      transaction_time: `${val.date}T00:00:00`,
      
      include_in_net_worth: val.include_in_net_worth,
      meta_data: { note: val.note }
    };

    this.assetStore.addAsset(payload);
    this.close();
  }
}