import { Component, inject, OnInit, effect, computed } from '@angular/core';
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
import { AssetType } from '../../core/models/asset.model';
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

  private readonly RATE_CACHE_DURATION = 30 * 60 * 1000;

  constructor() {
    effect(() => {
      const assets = this.assetStore.activeAssets();

      if (assets.length === 0) return;

      const symbolsToTrack = assets
        .filter(
          (a) =>
            a.asset_type === AssetType.STOCK ||
            a.asset_type === AssetType.CRYPTO ||
            (a.asset_type === AssetType.GOLD && a.symbol),
        )
        .map((a) => ({
          ticker: a.symbol!,
          region: a.currency === 'USD' ? 'US' : 'TW', 
        }));

      this.marketStore.startTracking(symbolsToTrack);
    });

    effect(() => {
      const assets = this.assetStore.assets();
      const baseCurr = this.settingsStore.baseCurrency();
      if (assets.length === 0) return;

      const timestamps = this.rateStore.rateTimestamps();
      const now = Date.now();

      const foreignCurrencies = new Set(
        assets.map((a) => a.currency).filter((curr) => curr !== baseCurr),
      );

      foreignCurrencies.forEach((currency) => {
        const rateKey = `${currency}-${baseCurr}`;
        const lastUpdate = timestamps[rateKey];
        const isStale = !lastUpdate || now - lastUpdate > this.RATE_CACHE_DURATION;

        if (isStale) {
          this.rateStore.loadRate({ fromCurr: currency, toCurr: baseCurr });
        }
      });
    });
  }

  ngOnInit() {
    this.initThemeVariables();
    this.assetStore.loadAssets();
  }

  readonly assetsWithMarketValue = computed(() => {
    const assets = this.assetStore.activeAssets();
    const prices = this.marketStore.priceMap();
    const rates = this.rateStore.rateMap();
    const baseCurr = this.settingsStore.baseCurrency();
    const showOriginal = this.settingsStore.showOriginalCurrency();

    return assets.map((asset) => {
      let marketPrice = 0;
      let nativeMarketValue = 0;
      let baseMarketValue = 0;
      let unrealizedPnl = 0;
      let returnRate = 0;
      
      const isBaseCurrency = asset.currency === baseCurr;
      const exchangeRate = isBaseCurrency ? 1.0 : (rates[`${asset.currency}-${baseCurr}`] || 1.0);
      
      // 區分是「現金型」還是「市場型」資產
      const isCashLike = asset.asset_type === AssetType.CASH || 
                         asset.asset_type === AssetType.PENDING || 
                         asset.asset_type === AssetType.LIABILITY ||
                         asset.asset_type === AssetType.CREDIT_CARD;

      if (isCashLike) {
        // 💵 【現金型邏輯】：追蹤「本位幣匯差」
        // 你的設計：book_value 是台幣總成本 (e.g. 31000)
        nativeMarketValue = asset.quantity; 
        baseMarketValue = nativeMarketValue * exchangeRate; 

        const costInBase = asset.book_value; 
        unrealizedPnl = baseMarketValue - costInBase; // 賺賠多少台幣匯差
        returnRate = costInBase !== 0 ? (unrealizedPnl / Math.abs(costInBase)) * 100 : 0;

      } else {
        // 📈 【市場型邏輯 (股票/加密貨幣)】：單純追蹤「原幣漲幅」
        // 你的設計：book_value 是原幣總成本 (e.g. 6050)
        if (asset.symbol) {
          const stockData = prices[asset.symbol];
          marketPrice = stockData?.price || 0;
        }

        if (marketPrice > 0) {
          nativeMarketValue = asset.quantity * marketPrice;
        } else {
          nativeMarketValue = asset.book_value; // 沒股價時顯示購買成本
        }
        
        baseMarketValue = nativeMarketValue * exchangeRate;

        const costInNative = asset.book_value; 
        unrealizedPnl = nativeMarketValue - costInNative; // 賺賠多少美元
        returnRate = costInNative !== 0 ? (unrealizedPnl / Math.abs(costInNative)) * 100 : 0;
      }

      // 最終交給小卡的顯示字串與數字 (這點我們剛重構得很棒，不用改)
      const displayCurrency = showOriginal ? asset.currency : baseCurr;
      const displayAmount = showOriginal ? nativeMarketValue : baseMarketValue;

      return {
        ...asset,
        marketPrice,
        nativeMarketValue,
        baseMarketValue,
        displayCurrency,
        displayAmount,
        exchangeRate,
        unrealizedPnl,
        returnRate,
      };
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