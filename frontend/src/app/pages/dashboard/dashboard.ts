import { Component, inject, OnInit, effect, computed, untracked } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

import { AssetCollectionComponent } from '../../components/cards/asset-collection';
import { TotalWealthCard } from '../../components/cards/total-wealth-card';
import { DesktopHeaderComponent } from '../../components/widgets/desktop-header';
import { MobileNavComponent } from '../../components/widgets/mobile-nav';
import { WidgetCollectionComponent } from '../../components/cards/widget-collection';
import { ModalService } from '../../core/services/modal.service';
import { AssetTypePickerComponent } from '../../components/modals/asset-type-picker';

import { AuthStore } from '../../core/store/auth.store';
import { AssetStore } from '../../core/store/asset.store';
import { MarketStore } from '../../core/store/market.store';
import { RateStore } from '../../core/store/exchange_rate.store';
import { SettingsStore } from '../../core/store/settings.store';
import { AssetType, AssetView } from '../../core/models/asset.model';
import { AssetPerformanceService } from '../../core/services/asset-performance.service';
import { ASSET_CONFIG } from '../../core/config/asset.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TotalWealthCard,
    AssetCollectionComponent,
    DesktopHeaderComponent,
    MobileNavComponent,
    WidgetCollectionComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
  private document = inject(DOCUMENT);

  readonly assetStore = inject(AssetStore);
  readonly marketStore = inject(MarketStore);
  readonly rateStore = inject(RateStore);
  readonly authStore = inject(AuthStore);
  readonly modalService = inject(ModalService);
  readonly settingsStore = inject(SettingsStore);
  readonly performanceService = inject(AssetPerformanceService);

  private readonly RATE_CACHE_DURATION = 30 * 60 * 1000;

  constructor() {
    // 1. Auto-track stock prices
    effect(() => {
      const assets = this.assetStore.activeAssets();

      if (assets.length === 0) return;

      const currencyRegionMap: Record<string, string> = {
        USD: 'US',
        JPY: 'JP',
        TWD: 'TW',
      };

      const symbolsToTrack = assets
        .filter(
          (a) =>
            a.asset_type === AssetType.STOCK ||
            a.asset_type === AssetType.CRYPTO ||
            (a.asset_type === AssetType.GOLD && a.symbol),
        )
        .map((a) => ({
          ticker: a.symbol!,
          region: a.meta_data?.region || currencyRegionMap[a.currency] || 'TW',
        }));

      this.marketStore.startTracking(symbolsToTrack);
    });

    // 2. Auto-track exchange rates
    effect(() => {
      const assets = this.assetStore.assets();
      const baseCurr = this.settingsStore.baseCurrency();
      if (assets.length === 0) return;
      
      const foreignCurrencies = new Set(
        assets.map((a) => a.currency).filter((curr) => curr !== baseCurr),
      );

      untracked(() => {
        const timestamps = this.rateStore.rateTimestamps();
        const now = Date.now();

        foreignCurrencies.forEach((currency) => {
          const rateKey = `${currency}-${baseCurr}`;
          const lastUpdate = timestamps[rateKey];
          const isStale = !lastUpdate || now - lastUpdate > this.RATE_CACHE_DURATION;

          if (isStale) {
            this.rateStore.loadRate({ fromCurr: currency, toCurr: baseCurr });
          }
        });
      });
    });
  }

  ngOnInit() {
    this.initThemeVariables();
    this.assetStore.loadAssets();
  }

  /**
   * 核心計算邏輯 - "雙軌" 引擎
   * 將原始 Asset 轉換為包含市值與損益的 AssetView。
   */
  readonly assetsWithMarketValue = computed<AssetView[]>(() => {
    const assets = this.assetStore.activeAssets();
    const prices = this.marketStore.priceMap();
    const rates = this.rateStore.rateMap();
    const baseCurr = this.settingsStore.baseCurrency();

    return assets.map((asset) => {
      // --- 步驟 1: 準備匯率 ---
      const isBaseCurrency = asset.currency === baseCurr;
      
      // 匯率: 資產幣別 -> 本位幣 (例如 USD -> TWD)
      const rateToBase = isBaseCurrency ? 1.0 : (rates[`${asset.currency}-${baseCurr}`] || 1.0);

      // --- 步驟 2: 取得市場價格 ---
      let marketPrice = 0;
      if (asset.symbol) {
        marketPrice = prices[asset.symbol]?.price || 0;
      }

      // --- 步驟 3: 委派給 Service 進行計算 ---
      // 注意: 這裡不傳入交易紀錄，因此股票的 'totalPnl' (歷史損益) 會是 undefined。
      // 這是為了 Dashboard 效能的刻意設計。
      return this.performanceService.computePerformance(asset, marketPrice, rateToBase);
    });
  });

  readonly totalWealth = computed(() => {
    return this.assetsWithMarketValue()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => sum + a.baseMarketValue, 0);
  });

  private initThemeVariables() {
    Object.keys(ASSET_CONFIG).forEach((key) => {
      // @ts-ignore
      const config = ASSET_CONFIG[key];
      const type = key.toLowerCase();
      this.setVar(`--theme-${type}-rgb`, config.rgb);
    });
  }

  private setVar(name: string, value: string) {
    this.document.documentElement.style.setProperty(name, value);
  }

  onAddAsset() {
    this.modalService.open(AssetTypePickerComponent);
  }
}
