import { Component, computed, input, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { SettingsStore } from '../../core/store/settings.store';
import { AssetStore } from '../../core/store/asset.store';
import { RateStore } from '../../core/store/exchange_rate.store';
import { MarketStore } from '../../core/store/market.store';
import { AssetType, AssetView } from '../../core/models/asset.model';

@Component({
  selector: 'app-total-wealth-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './total-wealth-card.html',
  styleUrls: ['./total-wealth-card.scss'],
})
export class TotalWealthCard {
  assets = input.required<AssetView[]>();

  settingsStore = inject(SettingsStore);
  assetStore = inject(AssetStore);
  rateStore = inject(RateStore);
  marketStore = inject(MarketStore);

  baseCurrency = this.settingsStore.baseCurrency;
  privacyMode = this.settingsStore.privacyMode;
  
  isRefreshing = signal(false);
  lastUpdated = signal(new Date());

  totalAmountDisplay = signal(0);

  constructor() {
    effect(() => {
      const target = this.netWorth();
      const start = untracked(() => this.totalAmountDisplay());

      if (Math.abs(target - start) > 1) {
        this.animateValue(start, target, 800);
      } else {
        this.totalAmountDisplay.set(target); 
      }
    });
  }

  netWorth = computed(() => {
    return this.assets()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => sum + (a.baseMarketValue || 0), 0);
  });

  totalCost = computed(() => {
    return this.assets()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => {
        const mv = Number(a.baseMarketValue || 0);
        const roi = Number(a.returnRate || 0);

        if (mv === 0) return sum;
        
        const cost = mv / (1 + roi / 100);
        return sum + cost;
      }, 0);
  });


  totalPnl = computed(() => {
    return this.netWorth() - this.totalCost();
  });

  totalRoi = computed(() => {
    const cost = this.totalCost();
    const pnl = this.totalPnl();
    if (cost === 0) return 0;
    return (pnl / Math.abs(cost)) * 100;
  });

  netPending = computed(() => {
    return this.assets()
      .filter((a) => a.asset_type === AssetType.PENDING) 
      .reduce((sum, a) => sum + (a.baseMarketValue || 0), 0);
  });

  private animateValue(start: number, end: number, duration: number) {
    const startTime = performance.now();

    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease Out Quart
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      const current = start + (end - start) * easeProgress;
      this.totalAmountDisplay.set(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        this.totalAmountDisplay.set(end);
      }
    };

    requestAnimationFrame(frame);
  }

  async onRefresh() {
    if (this.isRefreshing()) return;
    this.isRefreshing.set(true);
    
    try {
      await this.assetStore.loadAssets();
      this.marketStore.refreshPrices();

      const foreignCurrencies = this.rateStore.foreignCurrencies();
      const base = this.settingsStore.baseCurrency();
      
      foreignCurrencies.forEach(curr => {
        this.rateStore.loadRate({ fromCurr: curr, toCurr: base, force: true });
      });

      setTimeout(() => {
        this.lastUpdated.set(new Date());
        this.isRefreshing.set(false);
      }, 800);

    } catch (error) {
      console.error('Refresh failed', error);
      this.isRefreshing.set(false);
    }
  }
}