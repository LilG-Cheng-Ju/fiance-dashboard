import { Component, computed, effect, inject, input, Signal, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, Subscription, of } from 'rxjs';
import { startWith, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { ModalService } from '../../core/services/modal.service';
import { getAssetRgb } from '../../core/config/asset.config';
import { AssetStore } from '../../core/store/asset.store';
import { AssetCreate, AssetType } from '../../core/models/asset.model';
import { RateStore } from '../../core/store/exchange_rate.store';
import { MarketService } from '../../core/services/market.service';
import { getLocalISODate } from '../../core/helpers/date.helper';
import { SettingsStore } from '../../core/store/settings.store';
import { SimpleAssetFormData } from './simple-asset-form';
import { InfoTooltipComponent } from '../widgets/info-tooltip';

interface MarketFormConfig {
  title: string;
  nameExample: string;
}

@Component({
  selector: 'app-market-asset-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InfoTooltipComponent],
  templateUrl: './market-asset-form.html',
  styleUrls: ['./simple-asset-form.scss']
})
export class MarketAssetFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  private assetStore = inject(AssetStore);
  private marketService = inject(MarketService);
  
  public rateStore = inject(RateStore);
  public settingsStore = inject(SettingsStore);

  data = input<SimpleAssetFormData>({ assetType: 'STOCK' });
  assetType: Signal<string> = computed(() => this.data().assetType);
  fundingSources = this.assetStore.cashAssets;
  themeColor = computed(() => getAssetRgb(this.assetType()));

  config = computed(() => this.CONFIG_MAP[this.assetType()] || this.CONFIG_MAP['STOCK']);

  form: FormGroup;
  formValues: Signal<any>;
  referencePrice = signal<number | null>(null);

  private subs = new Subscription();

  currentCurrency = computed(() => this.formValues()?.currency || 'USD');
  selectedSourceId = computed(() => this.formValues()?.source_asset_id || null);
  sourceAmountValue = computed(() => this.formValues()?.source_amount || null);
  totalNativeCostValue = computed(() => this.formValues()?.total_native_cost || 0);

  isCurrencyLocked = computed(() => {
    const type = this.assetType();
    if (type === 'GOLD') return true;
    if (type === 'STOCK') {
      const region = this.formValues()?.region;
      return ['TW', 'US', 'JP', 'FUND_TW'].includes(region);
    }
    return false;
  });

  selectedSourceCurrency = computed(() => {
    const id = this.selectedSourceId();
    if (!id) return null;
    const source = this.fundingSources().find(a => a.id == id);
    return source ? source.currency : null;
  });

  impliedExchangeRate = computed(() => {
    const sourceAmt = this.sourceAmountValue();
    const targetAmt = this.totalNativeCostValue();
    const sourceId = this.selectedSourceId();
    const targetCurr = this.currentCurrency();

    if (!sourceAmt || !targetAmt || !sourceId) return null;

    const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
    if (!sourceAsset || sourceAsset.currency === targetCurr) return null; 

    return sourceAmt / targetAmt;
  });

  private readonly CONFIG_MAP: Record<string, MarketFormConfig> = {
    STOCK: { title: '新增股票 / 基金', nameExample: '台積電' },
    CRYPTO: { title: '新增加密貨幣', nameExample: 'Bitcoin' },
    GOLD: { title: '新增黃金 / 貴金屬', nameExample: '玉山黃金存摺' }
  };

  constructor() {
    const today = getLocalISODate();

    this.form = this.fb.group({
      name: ['', Validators.required],
      symbol: [''],
      region: ['TW'],
      currency: ['TWD', Validators.required],
      gold_unit: ['gram'],
      price: [null, [Validators.min(0)]],
      quantity: [null, [Validators.required, Validators.min(0.000001)]],
      total_native_cost: [null, [Validators.required, Validators.min(0)]],
      source_asset_id: [null], 
      source_amount: [null],
      date: [today],
      include_in_net_worth: [true],
      note: ['']
    });

    this.formValues = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });

    effect(() => {
      const curr = this.currentCurrency();
      const base = this.settingsStore.baseCurrency();
      if (curr && curr !== base) {
        this.rateStore.loadRate({ fromCurr: curr, toCurr: base });
      }
    });

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
  }

  ngOnInit() {
    this.subs.add(
      this.form.get('region')?.valueChanges.subscribe(r => {
        if (r === 'TW' || r === 'FUND_TW') this.form.patchValue({ currency: 'TWD' });
        else if (r === 'US') this.form.patchValue({ currency: 'USD' });
        else if (r === 'JP') this.form.patchValue({ currency: 'JPY' });
      })
    );

    this.subs.add(
      this.form.get('gold_unit')?.valueChanges.subscribe(u => {
        if (u === 'gram') this.form.patchValue({ currency: 'TWD' });
        else if (u === 'oz') this.form.patchValue({ currency: 'USD' });
      })
    );

    this.subs.add(
      this.form.get('price')?.valueChanges.subscribe(p => {
        const q = this.form.get('quantity')?.value;
        if (p !== null && q !== null) {
          this.form.patchValue({ total_native_cost: p * q }, { emitEvent: false });
          this.updateSourceAmountEstimate();
        }
      })
    );

    this.subs.add(
      this.form.get('quantity')?.valueChanges.subscribe(q => {
        const p = this.form.get('price')?.value;
        if (p !== null && q !== null) {
          this.form.patchValue({ total_native_cost: p * q }, { emitEvent: false });
          this.updateSourceAmountEstimate();
        } else if (q !== null && p === null) {
          const t = this.form.get('total_native_cost')?.value;
          if (t !== null && q > 0) {
            this.form.patchValue({ price: t / q }, { emitEvent: false });
            this.updateSourceAmountEstimate();
          }
        }
      })
    );

    this.subs.add(
      this.form.get('total_native_cost')?.valueChanges.subscribe(t => {
        const q = this.form.get('quantity')?.value;
        if (t !== null && q !== null && q > 0) {
          this.form.patchValue({ price: t / q }, { emitEvent: false });
          this.updateSourceAmountEstimate();
        }
      })
    );

    this.subs.add(
      combineLatest([
        this.form.get('symbol')!.valueChanges.pipe(startWith(this.form.get('symbol')!.value)),
        this.form.get('region')!.valueChanges.pipe(startWith(this.form.get('region')!.value))
      ]).pipe(
        debounceTime(500),
        distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1] === curr[1]),
        switchMap(([symbol, region]) => {
          if (this.assetType() === 'STOCK' && symbol && ['TW', 'US', 'JP'].includes(region)) {
            return this.marketService.fetchBatchPrices([{ ticker: symbol, region }]);
          }
          return of(null);
        })
      ).subscribe(res => {
        if (res) {
          const sym = this.form.get('symbol')?.value;
          if (res[sym]) {
            this.referencePrice.set(res[sym].price);
          } else {
            this.referencePrice.set(null);
          }
        } else {
          this.referencePrice.set(null);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private updateSourceAmountEstimate() {
    const sourceId = this.form.get('source_asset_id')?.value;
    const nativeCost = this.form.get('total_native_cost')?.value || 0;
    const targetCurrency = this.form.get('currency')?.value;
    const baseCurrency = this.settingsStore.baseCurrency();

    if (sourceId && nativeCost > 0) {
      const sourceAsset = this.fundingSources().find(a => a.id == sourceId);
      if (sourceAsset) {
        let calculatedSourceAmount = 0;
        if (sourceAsset.currency === targetCurrency) {
            calculatedSourceAmount = nativeCost; 
        } else {
            const targetToBaseKey = `${targetCurrency}-${baseCurrency}`;
            const targetToBaseRate = (targetCurrency === baseCurrency) ? 1.0 : (this.rateStore.rateMap()[targetToBaseKey] || 1.0);
            const valueInBase = nativeCost * targetToBaseRate;

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
          this.form.patchValue({ source_amount: newSourceAmt });
        }
      }
    } else if (!sourceId && this.form.get('source_amount')?.value !== null) {
      this.form.patchValue({ source_amount: null });
    }
  }

  onSourceAssetChange() {
    this.updateSourceAmountEstimate();
  }

  onPriceFocus() {
    const currentVal = this.form.get('price')?.value;
    const ref = this.referencePrice();
    if ((currentVal === null || currentVal === '') && ref) {
      this.form.patchValue({ price: ref });
    }
  }

  close() {
    this.modalService.close();
  }

  submit() {
    if (this.form.invalid) return;

    const val = this.form.value;
    
    let sourceCurrency = null;
    let finalRate = 1.0;
    const nativeCost = val.total_native_cost;

    if (val.source_asset_id) {
        const sourceAsset = this.fundingSources().find(a => a.id == val.source_asset_id);
        sourceCurrency = sourceAsset?.currency || null;

        // [情境 1: 使用資產扣款]
        if (sourceAsset && nativeCost) {
             if (sourceAsset.currency === val.currency) {
                 // 情況 A: 同幣別 (例如 美金存款 -> 美股)
                 // 使用來源資產的平均成本 (作為成本匯率)
                 finalRate = sourceAsset.average_cost || 1.0;
             } else if (val.source_amount) {
                 // 情況 B: 跨幣別 (例如 台幣存款 -> 美股)
                 // 匯率 = 扣款台幣金額 / 美金金額
                 finalRate = val.source_amount / nativeCost;
             }
        }
    } else {
        // [情境 2: 外部資金 / 手動輸入]
        // 如果使用者手動輸入匯率則使用之，否則預設為 1.0 或自動計算。
        finalRate = val.exchange_rate || 1.0;
    }

    const metaData: any = { note: val.note };
    if (this.assetType() === 'STOCK') metaData.region = val.region;
    if (this.assetType() === 'GOLD') metaData.unit = val.gold_unit;

    const payload: AssetCreate = {
      name: val.name,
      asset_type: this.assetType() as AssetType,
      currency: val.currency,
      symbol: val.symbol || null,
      initial_quantity: val.quantity,
      initial_total_cost: val.total_native_cost, 
      source_asset_id: val.source_asset_id,
      source_amount: val.source_amount,
      source_currency: sourceCurrency,
      exchange_rate: finalRate, 
      transaction_time: `${val.date}T00:00:00`,
      include_in_net_worth: val.include_in_net_worth,
      meta_data: metaData
    };

    this.assetStore.addAsset(payload);
    this.close();
  }
}