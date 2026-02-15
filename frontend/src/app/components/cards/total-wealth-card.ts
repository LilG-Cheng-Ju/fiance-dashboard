import { Component, computed, input, inject, signal, effect, untracked } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { SettingsStore } from '../../core/store/settings.store';
import { AssetStore } from '../../core/store/asset.store';
import { RateStore } from '../../core/store/exchange_rate.store';
import { MarketStore } from '../../core/store/market.store';
import { AssetType } from '../../core/models/asset.model';

@Component({
  selector: 'app-total-wealth-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './total-wealth-card.html',
  styleUrls: ['./total-wealth-card.scss'],
})
export class TotalWealthCard {
  // 接收 Dashboard 算好的資料
  assets = input.required<any[]>();

  settingsStore = inject(SettingsStore);
  assetStore = inject(AssetStore);
  rateStore = inject(RateStore);
  marketStore = inject(MarketStore);

  baseCurrency = this.settingsStore.baseCurrency;
  privacyMode = this.settingsStore.privacyMode;
  
  isRefreshing = signal(false);
  lastUpdated = signal(new Date());

  // 動畫顯示用的數字
  totalAmountDisplay = signal(0);

  constructor() {
    // 監聽 netWorth 的變化，並觸發數字滾動動畫
    effect(() => {
      const target = this.netWorth();
      const start = untracked(() => this.totalAmountDisplay());

      // 只有當數值真的改變時才跑動畫
      if (Math.abs(target - start) > 1) {
        this.animateValue(start, target, 800);
      } else {
        // 初始化或微小變動直接設定
        this.totalAmountDisplay.set(target); 
      }
    });
  }

  // --- 計算邏輯 ---

  // 1. 總資產淨值 (包含動畫目標值)
  netWorth = computed(() => {
    return this.assets()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => sum + (a.baseMarketValue || 0), 0);
  });

  // 2. 總未實現損益 (加總 Dashboard 算好的 Base PnL)
  totalPnl = computed(() => {
    return this.assets()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => sum + (a.unrealizedPnl || 0), 0);
  });

  // 3. 總成本 (為了算總 ROI)
  totalCost = computed(() => {
    return this.assets()
      .filter((a) => a.include_in_net_worth)
      .reduce((sum, a) => {
        // 成本 = 市值 - 損益
        return sum + ((a.baseMarketValue || 0) - (a.unrealizedPnl || 0));
      }, 0);
  });

  // 4. 總報酬率 (ROI)
  totalRoi = computed(() => {
    const cost = this.totalCost();
    const pnl = this.totalPnl();
    if (cost === 0) return 0;
    return (pnl / Math.abs(cost)) * 100;
  });

  // 5. 待結清淨額
  netPending = computed(() => {
    return this.assets()
      .filter((a) => a.asset_type === AssetType.PENDING) 
      .reduce((sum, a) => sum + (a.baseMarketValue || 0), 0);
  });

  // --- 動畫邏輯 (經典版) ---
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

  // --- 重新整理 ---
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