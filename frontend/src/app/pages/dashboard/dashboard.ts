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
import { AssetType, AssetView } from '../../core/models/asset.model';
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
    // 1. Auto-track stock prices
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

    // 2. Auto-track exchange rates
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

  /**
   * Core Calculation Logic - The "Dual Track" Engine
   * Transforms raw Assets into AssetViews with computed market values and PnL.
   */
  readonly assetsWithMarketValue = computed<AssetView[]>(() => {
    const assets = this.assetStore.activeAssets();
    const prices = this.marketStore.priceMap();
    const rates = this.rateStore.rateMap();
    const baseCurr = this.settingsStore.baseCurrency();
    const showOriginal = this.settingsStore.showOriginalCurrency();

    return assets.map((asset) => {
      // --- Step 1: Exchange Rate Preparation ---
      const isBaseCurrency = asset.currency === baseCurr;
      
      // Rate: Asset Currency -> Base Currency (e.g., USD -> TWD)
      const rateToBase = isBaseCurrency ? 1.0 : (rates[`${asset.currency}-${baseCurr}`] || 1.0);

      // Rate: Asset Currency -> TWD (Specifically for FX PnL calculation if Base is not TWD)
      // This logic attempts to find a path to TWD to calculate the "True Cost" in TWD.
      let rateToTwd = 1.0;
      if (asset.currency === 'TWD') {
        rateToTwd = 1.0;
      } else {
        const directRate = rates[`${asset.currency}-TWD`];
        if (directRate) {
          rateToTwd = directRate;
        } else if (baseCurr === asset.currency) {
           // If Base is USD and Asset is USD, we might have TWD->USD rate
           const reverseRate = rates[`TWD-${asset.currency}`];
           if (reverseRate) rateToTwd = 1 / reverseRate;
        } else {
           // Fallback: If Base is TWD, then rateToBase IS the rateToTwd
           if (baseCurr === 'TWD') rateToTwd = rateToBase;
           // Fallback: Try to use cached rate if available
           const fallback = rates[`${asset.currency}-TWD`];
           if (fallback) rateToTwd = fallback;
        }
      }

      // --- Step 2: Market Value Calculation ---
      let marketPrice = 0;       // Unit Price (in Native Currency)
      let nativeMarketValue = 0; // Total Value (in Native Currency)
      
      const isCashLike = asset.asset_type === AssetType.CASH || 
                         asset.asset_type === AssetType.PENDING || 
                         asset.asset_type === AssetType.LIABILITY ||
                         asset.asset_type === AssetType.CREDIT_CARD;

      if (isCashLike) {
        // For cash, the value is simply the quantity
        nativeMarketValue = asset.quantity; 
      } else {
        // For stocks/crypto, value = quantity * current market price
        if (asset.symbol) {
          const stockData = prices[asset.symbol];
          marketPrice = stockData?.price || 0;
        }
        // Fallback to book_value if price is not yet available
        nativeMarketValue = marketPrice > 0 ? (asset.quantity * marketPrice) : asset.book_value;
      }

      // Convert to Base Currency for total wealth aggregation
      const baseMarketValue = nativeMarketValue * rateToBase;


      // --- Step 3: PnL & ROI Calculation (Dual Track Logic) ---
      let unrealizedPnl = 0; // In Base Currency
      let returnRate = 0;    // Percentage

      if (isCashLike) {
        // [Track 1: Cash/FX Assets]
        // Logic: Compare current TWD value vs. Historical TWD Cost (book_value)
        
        const costTwd = asset.book_value; // Assuming book_value stores the historical TWD cost
        const currentValueTwd = asset.quantity * rateToTwd;
        
        // Calculate PnL in TWD first
        const pnlTwd = currentValueTwd - costTwd;

        // ROI based on TWD cost
        returnRate = costTwd !== 0 ? (pnlTwd / Math.abs(costTwd)) * 100 : 0;

        // Convert PnL to Base Currency for display
        // Ratio = Rate(Asset->Base) / Rate(Asset->TWD)
        const twdToBaseRatio = rateToTwd !== 0 ? (rateToBase / rateToTwd) : 0;
        unrealizedPnl = pnlTwd * twdToBaseRatio;

      } else {
        // [Track 2: Market Assets (Stocks/Crypto)]
        // Logic: Compare current Native Value vs. Native Cost (book_value)

        const costNative = asset.book_value; // Assuming book_value stores the native cost (e.g., USD)
        const pnlNative = nativeMarketValue - costNative;

        // ROI based on Native Currency
        returnRate = costNative !== 0 ? (pnlNative / Math.abs(costNative)) * 100 : 0;

        // Convert PnL to Base Currency for display
        unrealizedPnl = pnlNative * rateToBase;
      }

      // --- Step 4: Final Object Construction (AssetView) ---
      const displayCurrency = showOriginal ? asset.currency : baseCurr;
      const displayAmount = showOriginal ? nativeMarketValue : baseMarketValue;

      return {
        ...asset,
        marketPrice,
        nativeMarketValue,
        baseMarketValue,
        displayCurrency,
        displayAmount,
        exchangeRate: rateToBase,
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
