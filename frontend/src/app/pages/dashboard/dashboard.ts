import { Component, inject, OnInit, effect, computed, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';

import { AssetCollectionComponent } from '../../components/cards/asset-collection';
import { TotalWealthCard } from '../../components/cards/total-wealth-card';
import { DesktopHeaderComponent } from '../../components/widgets/desktop-header';
import { MobileNavComponent } from '../../components/widgets/mobile-nav';
import { WidgetCollectionComponent } from '../../components/cards/widget-collection';

import { AuthStore } from '../../core/store/auth.store';
import { AssetStore } from '../../core/store/asset.store';
import { MarketStore } from '../../core/store/market.store';
import { RateStore } from '../../core/store/exchange_rate.store';
import { AssetType } from '../../core/models/asset.model';
import { ASSET_CONFIG } from '../../core/config/asset-config';

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

  private readonly RATE_CACHE_DURATION = 30 * 60 * 1000;

  constructor() {
    // 1. Market tracking effect
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

    // 2. Exchange rate update effect
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
          console.log(`[Dashboard] Updating rate for ${currency}...`);
          this.rateStore.loadRate({ fromCurr: currency, toCurr: 'TWD' });
        }
      });
    });
  }

  ngOnInit() {
    this.initThemeVariables();
    // Only load assets if not already loaded (optional optimization)
    this.assetStore.loadAssets();
  }

  // 3. Complex calculation logic
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
        const stockData = prices[asset.symbol!];
        marketPrice = stockData?.price || 0;

        if (marketPrice > 0) {
          marketValue = asset.quantity * marketPrice;
        }
      } else if (asset.asset_type === AssetType.CASH) {
        marketValue = asset.quantity;
      }

      const marketValueTwd = marketValue * exchangeRate;
      const costTwd = asset.current_value * exchangeRate;
      const unrealizedPnl = marketValueTwd - costTwd;
      const returnRate = costTwd > 0 ? (unrealizedPnl / costTwd) * 100 : 0;

      return {
        ...asset,
        marketPrice,
        marketValue,
        marketValueTwd,
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
