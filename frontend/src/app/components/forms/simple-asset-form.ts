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
import { SettingsStore } from '../../core/store/settings.store';

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
  public settingsStore = inject(SettingsStore);

  data = input<SimpleAssetFormData>({ assetType: 'CASH' });
  assetType: Signal<string> = computed(() => this.data().assetType);
  pendingDirection = signal<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');
  fundingSources = this.assetStore.cashAssets;
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

  form: FormGroup;
  
  // 🔥 升級：監聽整個 Form 的 valueChanges，保證 100% 響應式
  formValues: Signal<any>;

  currentCurrency = computed(() => this.formValues()?.currency || this.settingsStore.baseCurrency());
  amountValue = computed(() => this.formValues()?.amount || 0);
  rateValue = computed(() => this.formValues()?.exchange_rate || null);
  selectedSourceId = computed(() => this.formValues()?.source_asset_id || null);
  sourceAmountValue = computed(() => this.formValues()?.source_amount || null);

  showExchangeRate = computed(() => {
    return this.currentCurrency() !== this.settingsStore.baseCurrency() && !this.selectedSourceId();
  });

  selectedSourceCurrency = computed(() => {
    const id = this.selectedSourceId();
    if (!id) return null;
    const source = this.fundingSources().find(a => a.id == id);
    return source ? source.currency : null;
  });

  referenceRate = computed(() => {
    const currency = this.currentCurrency();
    const base = this.settingsStore.baseCurrency();
    if (currency === base) return null;
    const key = `${currency}-${base}`;
    return this.rateStore.rateMap()[key] || null;
  });

  estimatedCost = computed(() => {
    const amt = this.amountValue() || 0;
    const rate = this.rateValue() || 1;
    return Math.round(amt * rate);
  });

  // 🔥 隱含匯率修正：現在絕對會即時跳出來！
  impliedExchangeRate = computed(() => {
    const sourceAmt = this.sourceAmountValue();
    const targetAmt = this.amountValue();
    const sourceId = this.selectedSourceId();
    const targetCurr = this.currentCurrency();

    if (!sourceAmt || !targetAmt || !sourceId) return null;

    const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
    
    // 如果同幣別互轉，不顯示隱含匯率
    if (!sourceAsset || sourceAsset.currency === targetCurr) {
        return null; 
    }

    return sourceAmt / targetAmt;
  });

  private readonly CONFIG_MAP: Record<string, FormConfig> = {
    CASH: { title: '新增現金 / 存款', name_example: '玉山銀行', amountLabel: '初始餘額', defaultNetWorth: true, isLiability: false },
    PENDING: { title: '新增待結清款項', name_example: '朋友飯錢', amountLabel: '待結算金額', defaultNetWorth: false, isLiability: false },
    LIABILITY: { title: '新增負債 / 貸款', name_example: '房貸 - 陶朱隱園', amountLabel: '剩餘本金', defaultNetWorth: false, isLiability: true },
    CREDIT_CARD: { title: '新增信用卡', name_example: '玉山星展聯名卡', amountLabel: '當期帳單金額', defaultNetWorth: false, isLiability: true }
  };

  constructor() {
    const today = getLocalISODate();
    const baseCurr = this.settingsStore.baseCurrency();

    this.form = this.fb.group({
      name: ['', Validators.required],
      currency: [baseCurr, Validators.required],
      amount: [null, [Validators.required, Validators.min(0)]],
      exchange_rate: [1.0, [Validators.min(0.000001)]],
      date: [today],
      include_in_net_worth: [true],
      note: [''],
      source_asset_id: [null], 
      source_amount: [null]    
    });

    // 建立表單的全局 Signal
    this.formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });

    // 1. Fetch Target Rates & 清空輸入框
    effect(() => {
      const curr = this.currentCurrency();
      const base = this.settingsStore.baseCurrency();
      if (curr && curr !== base) {
        this.rateStore.loadRate({ fromCurr: curr, toCurr: base });
        // 為了避免無限迴圈，這裡保留 emitEvent: false，因為我們只希望改動 UI 不希望再次觸發計算
        this.form.patchValue({ exchange_rate: null }, { emitEvent: false });
      } else if (curr === base) {
        this.form.patchValue({ exchange_rate: 1.0 }, { emitEvent: false });
      }
    });

    // 2. Fetch Source Rates
    effect(() => {
      const sourceId = this.selectedSourceId();
      const base = this.settingsStore.baseCurrency();
      if (sourceId) {
        const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
        if (sourceAsset && sourceAsset.currency !== base) {
          this.rateStore.loadRate({ fromCurr: sourceAsset.currency, toCurr: base });
        }
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

    // 4. 計算扣款金額 Default Value
    effect(() => {
      const sourceId = this.selectedSourceId();
      const amount = this.amountValue() || 0;
      const targetCurrency = this.currentCurrency();
      const baseCurrency = this.settingsStore.baseCurrency();

      if (sourceId) {
        const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
        if (sourceAsset) {
            let calculatedSourceAmount = 0;
            if (sourceAsset.currency === targetCurrency) {
                calculatedSourceAmount = amount; 
            } else {
                const targetToBaseRate = (targetCurrency === baseCurrency) ? 1.0 : (this.referenceRate() || 1.0);
                const valueInBase = amount * targetToBaseRate;

                if (sourceAsset.currency === baseCurrency) {
                    calculatedSourceAmount = valueInBase;
                } else {
                    const key = `${sourceAsset.currency}-${baseCurrency}`;
                    const sourceToBaseRate = this.rateStore.rateMap()[key] || 1.0; 
                    calculatedSourceAmount = valueInBase / sourceToBaseRate;
                }
            }
            // 🔥 移除 emitEvent: false，讓它觸發 valueChanges，保證隱含匯率一定會顯示！
            // 但因為我們使用 valueChanges 的特性，如果數值沒有變就不會引發無窮迴圈
            const currentSourceAmt = this.form.get('source_amount')?.value;
            const newSourceAmt = Math.round(calculatedSourceAmount);
            if (currentSourceAmt !== newSourceAmt) {
              this.form.patchValue({ source_amount: newSourceAmt });
            }
        }
      } else {
        if (this.form.get('source_amount')?.value !== null) {
          this.form.patchValue({ source_amount: null });
        }
      }
    });
  }

  onRateFocus() {
    const currentVal = this.form.get('exchange_rate')?.value;
    const ref = this.referenceRate();
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
    const baseCurr = this.settingsStore.baseCurrency();
    const isBaseCurrency = val.currency === baseCurr;
    const multiplier = this.config().isLiability ? -1 : 1;

    let finalTotalCost = 0;
    let finalRate = 1.0;
    let sourceCurrency = null;

    if (val.source_asset_id) {
        const sourceAsset = this.fundingSources().find(a => a.id == val.source_asset_id);
        sourceCurrency = sourceAsset?.currency || null;

        if (sourceAsset?.currency === baseCurr) {
            finalTotalCost = val.source_amount;
        } else {
            const sourceToBaseRate = this.rateStore.rateMap()[`${sourceAsset?.currency}-${baseCurr}`] || 1.0;
            finalTotalCost = val.source_amount * sourceToBaseRate;
        }
        finalRate = isBaseCurrency ? 1.0 : (finalTotalCost / val.amount);
    } else {
        finalRate = isBaseCurrency ? 1.0 : (val.exchange_rate || this.referenceRate() || 1.0);
        finalTotalCost = val.amount * finalRate;
    }

    const payload: AssetCreate = {
      name: val.name,
      asset_type: this.assetType() as AssetType,
      currency: val.currency,
      initial_quantity: val.amount * multiplier, // 這裡傳 1000 過去，後端請務必不要亂乘！
      initial_total_cost: finalTotalCost * multiplier,
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