import { CommonModule } from '@angular/common';
import { Component, DOCUMENT, OnInit, computed, effect, inject } from '@angular/core';

import { AssetCollectionComponent } from './components/cards/asset-collection';
import { TotalWealthCard } from './components/cards/total-wealth-card';
import { ASSET_CONFIG } from './core/config/asset-config';
import { DesktopHeaderComponent } from './components/widgets/desktop-header';
import { MobileNavComponent } from './components/widgets/mobile-nav';
import { WidgetCollectionComponent } from './components/cards/widget-collection';

import { AssetStore } from './core/store/asset.store';
import { MarketStore } from './core/store/market.store';
import { RateStore } from './core/store/exchange_rate.store';
import { AssetType } from './core/models/asset.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TotalWealthCard,
    AssetCollectionComponent,
    DesktopHeaderComponent,
    MobileNavComponent,
    WidgetCollectionComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  private document = inject(DOCUMENT);

  readonly assetStore = inject(AssetStore);
  readonly marketStore = inject(MarketStore);
  readonly rateStore = inject(RateStore);

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
      if (assets.length === 0) return;

      const timestamps = this.rateStore.rateTimestamps();
      const now = Date.now();

      const foreignCurrencies = new Set(
        assets.map((a) => a.currency).filter((curr) => curr !== 'TWD'),
      );

      foreignCurrencies.forEach((currency) => {
        const rateKey = `${currency}-TWD`;
        const lastUpdate = timestamps[rateKey];
        const isStale = !lastUpdate || now - lastUpdate > this.RATE_CACHE_DURATION;

        if (isStale) {
          console.log(`⏳ [App] ${currency} 匯率過期，更新中...`);
          this.rateStore.loadRate({ fromCurr: currency, toCurr: 'TWD' });
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

    return assets.map((asset) => {
      let marketPrice = 0;
      let marketValue = asset.current_value;
      const exchangeRate = rates[`${asset.currency}-TWD`] || 1;
      const isMarketAsset = asset.asset_type !== AssetType.CASH && asset.symbol;

      if (isMarketAsset) {
        // Get stock price from MarketStore, default to 0 if not available
        const stockData = prices[asset.symbol!];
        marketPrice = stockData?.price || 0;

        if (marketPrice > 0) {
          // Market value (original currency) = quantity * market price
          marketValue = asset.quantity * marketPrice;
        }
      }
      // For cash assets
      else if (asset.asset_type === AssetType.CASH) {
        marketValue = asset.quantity; // Cash amount equals market value (original currency)
      }

      // Convert market value to TWD
      const marketValueTwd = marketValue * exchangeRate;

      // Calculate cost in TWD for P&L calculation
      const costTwd = asset.current_value * exchangeRate;

      // Calculate unrealized P&L (market value TWD - cost TWD)
      // Note: asset.current_value is stored as total cost in TWD
      const unrealizedPnl = marketValueTwd - costTwd;

      const returnRate = costTwd > 0 ? (unrealizedPnl / costTwd) * 100 : 0;

      return {
        ...asset,
        marketPrice, // Unit price (original currency)
        marketValue, // Total market value (original currency)
        marketValueTwd, // Total market value (TWD)
        exchangeRate,
        unrealizedPnl,
        returnRate,
      };
    });
  });

  readonly totalWealth = computed(() => {
    return this.assetsWithMarketValue()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => sum + a.marketValueTwd, 0);
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
    console.log('Add Asset clicked');
  }
}
