import { Component, input, computed, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AssetView, AssetType } from '../../core/models/asset.model';
import { SettingsStore } from '../../core/store/settings.store';
import { getAssetRgb } from '../../core/config/asset.config';

@Component({
  selector: 'app-asset-summary',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './asset-summary.html',
  styleUrls: ['./asset-summary.scss']
})
export class AssetSummaryComponent {
  asset = input.required<AssetView>();
  
  private settingsStore = inject(SettingsStore);

  // Theme color based on asset type
  themeColor = computed(() => getAssetRgb(this.asset().asset_type));

  // Logic: Is this a Cash-like asset? (CASH, PENDING, LIABILITY)
  isCashLike = computed(() => {
    const type = this.asset().asset_type;
    return [AssetType.CASH, AssetType.PENDING, AssetType.LIABILITY, AssetType.CREDIT_CARD].includes(type);
  });

  // Logic: Is this a foreign currency asset?
  isForeign = computed(() => {
    return this.asset().currency !== this.settingsStore.baseCurrency();
  });

  // Logic: Is this a market-traded asset?
  isMarketAsset = computed(() => {
    const type = this.asset().asset_type;
    return [AssetType.STOCK, AssetType.CRYPTO, AssetType.GOLD].includes(type);
  });

  // Logic: Should we show "Holdings"? (Hide for Cash)
  showHoldings = computed(() => !this.isCashLike());

  // Logic: Label for Average Cost
  // If Cash & Foreign -> "Avg. Rate" (平均匯率)
  // If Stock -> "Avg. Cost" (平均成本)
  avgCostLabel = computed(() => {
    if (this.isCashLike()) {
      return this.isForeign() ? '平均匯率' : null; // Local cash doesn't need avg cost
    }
    return '平均成本';
  });

  // Logic: Should we show PnL?
  // Show for Market Assets OR Foreign Cash (FX PnL)
  showPnl = computed(() => {
    if (this.isCashLike()) {
      return this.isForeign(); // Only show PnL for foreign cash (FX gain/loss)
    }
    return true; // Always show PnL for stocks/crypto
  });

  // Logic: Label for Main Value (e.g. "目前市值" vs "待還餘額")
  valueLabel = computed(() => {
    const type = this.asset().asset_type;
    switch (type) {
      case AssetType.LIABILITY:
        return '待還餘額';
      case AssetType.CREDIT_CARD:
        return '待繳金額';
      case AssetType.PENDING:
        return '待結算金額';
      case AssetType.CASH:
        return '目前餘額';
      default:
        return '目前市值';
    }
  });

  // Logic: Market Price Label
  marketPriceLabel = computed(() => {
    if (this.asset().asset_type === AssetType.GOLD) return '目前金價';
    return '目前市價';
  });
}
