import { CommonModule } from '@angular/common';
import { Component, DOCUMENT, OnInit, computed, effect, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AssetCard } from './components/cards/asset-card';
import { TotalWealthCard } from './components/cards/total-wealth-card';
import { AllocationPieComponent } from './components/widgets/allocation-pie';
import { ASSET_CONFIG } from './core/config/asset-config';
import * as AssetActions from './core/store/asset/asset.actions';
import { selectAssetLoading, selectAssets } from './core/store/asset/asset.selectors';
import * as MarketActions from './core/store/market/market.actions';
import { selectPrices } from './core/store/market/market.selectors';
import * as RateActions from './core/store/exchange_rate/exchange_rate.actions';
import { selectRateMap, selectRateTimestamps } from './core/store/exchange_rate/exchange_rate.selectors';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AllocationPieComponent, TotalWealthCard, AssetCard],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private store = inject(Store);
  private document = inject(DOCUMENT);

  assets = this.store.selectSignal(selectAssets);
  isLoading = this.store.selectSignal(selectAssetLoading);
  priceMap = this.store.selectSignal(selectPrices);
  rateMap = this.store.selectSignal(selectRateMap);
  rateTimestamps = this.store.selectSignal(selectRateTimestamps);

  private readonly RATE_CACHE_DURATION = 30 * 60 * 1000;

  constructor() {
    effect(() => {
      const assets = this.assets();

      if (assets.length === 0) return;

      const symbolsToTrack = assets
        .filter(a => a.asset_type === 'STOCK')
        .map(a => ({ 
          ticker: a.symbol, 
          region: a.currency === 'USD' ? 'US' : 'TW'}));

      if (symbolsToTrack.length > 0) {
        this.store.dispatch(MarketActions.startTracking({ symbols: symbolsToTrack }));
      }
    });

    effect(() => {
      const assets = this.assets();
      if (assets.length === 0) return;

      const timestamps = this.rateTimestamps();
      const now = Date.now();

      const foreignCurrencies = new Set(
        assets
          .map(a => a.currency)
          .filter(curr => curr !== 'TWD')
      );

      foreignCurrencies.forEach(currency => {
        const rateKey = `${currency}-TWD`;
        
        const lastBackendUpdate = timestamps[rateKey];

        const isStale = !lastBackendUpdate || (now - lastBackendUpdate > this.RATE_CACHE_DURATION);

        if (isStale) {
          console.log(`⏳ [Rate] ${currency} 過期或未存在，發送更新請求...`);
          this.store.dispatch(RateActions.loadRate({ 
            fromCurr: currency, 
            toCurr: 'TWD' 
          }));
        } else {
          console.log(`✅ [Rate] ${currency} 使用快取資料`);
        }
      });
    });
  }

  ngOnInit() {
    this.initThemeVariables();
    this.store.dispatch(AssetActions.loadAssets());
  }

  enrichedAssets = computed(() => {
    const assets = this.assets();
    const prices = this.priceMap();

    return assets.map(asset => {
      if (asset.asset_type === 'STOCK' && prices[asset.symbol]) {
        const marketData = prices[asset.symbol];
        return {
          ...asset,
          // 算出總價值 (目前是原幣，尚未乘匯率)
          current_value: marketData.price * asset.quantity,
          unit_price: marketData.price // 順便把單價塞進去顯示
        };
      }
      return asset;
    });
  });

  totalWealth = computed(() => {
    const assets = this.enrichedAssets();
    const rates = this.rateMap();

    return assets.reduce((sum, asset) => {
      let finalValue = asset.current_value;

      if (asset.currency !== 'TWD') {
        const rateKey = `${asset.currency}-TWD`;
        const exchangeRate = rates[rateKey];

        if (exchangeRate) {
          finalValue = asset.current_value * exchangeRate;
        } else {
          finalValue = 0; 
        }
      }

      return sum + finalValue;
    }, 0);
  });

  hasTwStock = computed(() => 
    this.enrichedAssets().some(a => a.asset_type === 'STOCK' && a.currency === 'TWD')
  );

  hasUsStock = computed(() => 
    this.enrichedAssets().some(a => a.asset_type === 'STOCK' && a.currency === 'USD')
  );

  private initThemeVariables() {
    Object.keys(ASSET_CONFIG).forEach(key => {
      // @ts-ignore
      const config = ASSET_CONFIG[key];
      const type = key.toLowerCase();
      
      this.setVar(`--theme-${type}-rgb`, config.rgb);
    });
  }

  private setVar(name: string, value: string) {
    this.document.documentElement.style.setProperty(name, value);
  }
}
