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

  // Core Calculation Logic - The "Dual Track" Engine
  readonly assetsWithMarketValue = computed(() => {
    const assets = this.assetStore.activeAssets();
    const prices = this.marketStore.priceMap();
    const rates = this.rateStore.rateMap();
    const baseCurr = this.settingsStore.baseCurrency();
    const showOriginal = this.settingsStore.showOriginalCurrency();

    return assets.map((asset) => {
      // --- A. Rate Preparation ---
      const isBaseCurrency = asset.currency === baseCurr;
      
      // 1. Rate: Asset -> Base Currency (For Display)
      // If asset is USD, Base is TWD, we need 32.
      // If asset is TWD, Base is TWD, we need 1.
      const rateToBase = isBaseCurrency ? 1.0 : (rates[`${asset.currency}-${baseCurr}`] || 1.0);

      // 2. Rate: Asset -> TWD (For Cash ROI Calculation - The "Home" Rate)
      // Even if Base is USD, we need the TWD rate to calculate FX PnL against the TWD book_value.
      let rateToTwd = 1.0;
      if (asset.currency === 'TWD') {
        rateToTwd = 1.0;
      } else {
        // Try direct look up: e.g. "USD-TWD"
        const directRate = rates[`${asset.currency}-TWD`];
        if (directRate) {
          rateToTwd = directRate;
        } else if (baseCurr === asset.currency) {
           // If Base is USD, Asset is USD, we need USD->TWD. 
           // We might have TWD->USD (0.031) in the store if TWD assets exist.
           const reverseRate = rates[`TWD-${asset.currency}`];
           if (reverseRate) rateToTwd = 1 / reverseRate;
        } else {
           // Fallback: If Base is TWD, then rateToBase IS the rateToTwd
           if (baseCurr === 'TWD') rateToTwd = rateToBase;
           // If Base is USD, and we have USD-TWD stored? 
           // (This part relies on what's available in store, assuming USD-TWD is usually available)
           const fallback = rates[`${asset.currency}-TWD`];
           if (fallback) rateToTwd = fallback;
        }
      }

      // --- B. Market Value Calculation ---
      let marketPrice = 0;       // Unit Price (Native)
      let nativeMarketValue = 0; // Total Value (Native)
      
      const isCashLike = asset.asset_type === AssetType.CASH || 
                         asset.asset_type === AssetType.PENDING || 
                         asset.asset_type === AssetType.LIABILITY ||
                         asset.asset_type === AssetType.CREDIT_CARD;

      if (isCashLike) {
        nativeMarketValue = asset.quantity; 
      } else {
        // Stock/Crypto Logic
        if (asset.symbol) {
          const stockData = prices[asset.symbol];
          marketPrice = stockData?.price || 0;
        }
        nativeMarketValue = marketPrice > 0 ? (asset.quantity * marketPrice) : asset.book_value;
      }

      // Calculate Base Market Value (For Total Wealth Card)
      const baseMarketValue = nativeMarketValue * rateToBase;


      // --- C. PnL & ROI Calculation (Dual Track Logic) ---
      let unrealizedPnl = 0; // Will be converted to Base Currency
      let returnRate = 0;    // Percentage

      if (isCashLike) {
        // [Track 1: Cash/FX]
        // Concept: ROI = (Current TWD Value - TWD Cost) / TWD Cost
        // book_value = TWD Cost (Historical)
        
        const costTwd = asset.book_value; 
        const currentValueTwd = asset.quantity * rateToTwd;
        
        // 1. Calculate PnL in TWD first (The "True" PnL)
        const pnlTwd = currentValueTwd - costTwd;

        // 2. Calculate ROI (Based on TWD)
        returnRate = costTwd !== 0 ? (pnlTwd / Math.abs(costTwd)) * 100 : 0;

        // 3. Convert PnL to Base Currency for Display
        // If Base is TWD: pnlTwd * 1
        // If Base is USD: pnlTwd * (rate TWD->USD) ... which is (1 / rateToTwd) * rateToBase?
        // Simpler: pnlTwd * (rateToBase / rateToTwd)
        // Example: PnL=3200TWD. Base=USD. RateToTwd=32. RateToBase=1. => 3200 * (1/32) = 100 USD.
        const twdToBaseRatio = rateToTwd !== 0 ? (rateToBase / rateToTwd) : 0;
        unrealizedPnl = pnlTwd * twdToBaseRatio;

      } else {
        // [Track 2: Stock/Crypto]
        // Concept: ROI = (Current Native Value - Native Cost) / Native Cost
        // book_value = Native Cost (e.g., USD Cost for US Stock)

        const costNative = asset.book_value;
        const pnlNative = nativeMarketValue - costNative;

        // 1. Calculate ROI (Based on Native Currency)
        returnRate = costNative !== 0 ? (pnlNative / Math.abs(costNative)) * 100 : 0;

        // 2. Convert PnL to Base Currency for Display
        unrealizedPnl = pnlNative * rateToBase;
      }

      // --- D. Display Formatting ---
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
        unrealizedPnl, // Correctly converted to Base Currency
        returnRate,    // Correctly calculated based on specific track (TWD or Native)
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