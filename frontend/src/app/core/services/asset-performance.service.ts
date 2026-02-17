import { Injectable, inject } from '@angular/core';
import { Asset, AssetType, AssetView } from '../models/asset.model';
import { Transaction } from '../models/transaction.model';
import { SettingsStore } from '../store/settings.store';

@Injectable({
  providedIn: 'root'
})
export class AssetPerformanceService {
  private settingsStore = inject(SettingsStore);

  /**
   * 計算資產的完整績效 (包含市值、損益、報酬率)
   * @param asset 原始資產資料
   * @param marketPrice 目前市場價格 (股票用)
   * @param rateToBase 資產幣別 -> 本位幣的匯率
   * @param transactions (選填) 歷史交易紀錄，如果有提供，就能算出精確的「總損益」
   */
  computePerformance(
    asset: Asset, 
    marketPrice: number, 
    rateToBase: number, 
    transactions?: Transaction[]
  ): AssetView {
    const baseCurr = this.settingsStore.baseCurrency();
    const isBaseCurrency = asset.currency === baseCurr;
    const isCashLike = [AssetType.CASH, AssetType.PENDING, AssetType.LIABILITY, AssetType.CREDIT_CARD].includes(asset.asset_type);

    // --- 1. 計算市值 (Market Value) ---
    let nativeMarketValue = 0;
    
    if (isCashLike) {
      nativeMarketValue = asset.quantity;
    } else {
      // 股票/加密貨幣: 股數 * 市價 (若無市價則用帳面價值)
      nativeMarketValue = marketPrice > 0 ? (asset.quantity * marketPrice) : asset.book_value;
    }

    const baseMarketValue = nativeMarketValue * rateToBase;

    // --- 2. 計算損益 (PnL) ---
    let unrealizedPnl = 0; // 帳面損益 (Price PnL)
    let returnRate = 0;
    let totalPnl: number | undefined = undefined; // 真實損益 (Total PnL)
    let totalReturnRate: number | undefined = undefined;
    let avgExchangeRate: number | undefined = undefined;

    if (isCashLike) {
      // [現金資產特殊邏輯] 美金存款只看匯率差
      // 公式: (目前匯率 - 平均成本匯率) * 持有金額
      const avgRate = asset.average_cost || 1.0;
      
      // 只有外幣才需要算匯差損益
      if (!isBaseCurrency) {
        // 損益 (本位幣) = (當前匯率 - 平均匯率) * 數量
        // 例如: (32 - 30) * 1000 USD = 2000 TWD 獲利
        const pnlInBase = (rateToBase - avgRate) * asset.quantity;
        unrealizedPnl = pnlInBase;
        
        // 報酬率 = (匯差 / 平均匯率)
        returnRate = avgRate !== 0 ? ((rateToBase - avgRate) / avgRate) * 100 : 0;
        
        // [新增] 對於現金資產，平均成本即為平均匯率
        avgExchangeRate = avgRate;
      }
      
      // 現金的 "總損益" 定義跟 "帳面損益" 一樣 (都是匯差)
      totalPnl = unrealizedPnl;
      totalReturnRate = returnRate;

    } else {
      // [股票/加密貨幣邏輯]
      
      // A. 帳面損益 (價差) - 不看歷史，只看 (現價 - 均價)
      // 這是 "原幣" 的賺賠，再換算回本位幣顯示
      const costNative = asset.book_value;
      const pnlNative = nativeMarketValue - costNative;
      
      unrealizedPnl = pnlNative * rateToBase;
      returnRate = costNative !== 0 ? (pnlNative / Math.abs(costNative)) * 100 : 0;

      // B. 真實損益 (總損益) - 需要歷史紀錄
      // 只有當我們有交易紀錄時，才能算出當初每一筆買入時的 "真實本位幣成本"
      if (transactions && transactions.length > 0) {
        const totalBaseCost = this.calculateTotalBaseCost(transactions, !isBaseCurrency);
        
        // 只有當 totalBaseCost 有效 (非 null) 時才計算總損益
        if (totalBaseCost !== null) {
            // 真實損益 = 目前市值 (本位幣) - 歷史總成本 (本位幣)
            totalPnl = baseMarketValue - totalBaseCost;
            
            totalReturnRate = totalBaseCost !== 0 
              ? (totalPnl / Math.abs(totalBaseCost)) * 100 
              : (totalPnl > 0 ? Infinity : 0);
              
            // C. 計算成本匯率 (加權平均)
            // 公式: 總本位幣成本 / 總原幣成本
            if (asset.book_value > 0.000001) {
                avgExchangeRate = totalBaseCost / asset.book_value;
            }
        }
      }
    }

    // --- 3. 顯示設定 ---
    const showOriginal = this.settingsStore.showOriginalCurrency();
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
      totalPnl,        // 只有在有 transactions 時才會有值
      totalReturnRate,
      avgExchangeRate  // [New]
    };
  }

  /**
   * 從交易紀錄計算 "歷史總本位幣成本" (Total Base Cost)
   * 這是最核心的會計邏輯
   */
  private calculateTotalBaseCost(transactions: Transaction[], isForeign: boolean): number | null {
    let currentBaseCost = 0;
    
    // 我們只需要加總 "買入" 或 "初始" 的成本
    // 賣出的部分，通常會用 "加權平均" 扣除，但為了簡化，
    // 我們可以假設 total_base_cost = sum(amount * exchange_rate) for all history?
    // 不行，賣出時必須扣掉對應比例的成本。
    
    // 簡單版演算法 (Inventory Model Replay):
    // 重新跑一次歷史，維護一個 "目前持有的總成本"
    
    let currentQty = 0;

    // 必須按時間排序 (舊 -> 新)
    // 注意: 這裡假設傳進來的 transactions 已經是倒序或亂序，我們需要正序
    const sortedTxs = [...transactions].sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    for (const tx of sortedTxs) {
      // 買入 / 入金 / 初始
      if (tx.quantity_change > 0) {
        // [邏輯更新] 檢測 "無效成本" (例如配股或舊資料)
        // 如果是外幣資產，且交易匯率為 1.0 (預設值) 且無來源金額，
        // 代表這筆資產沒有正確的本位幣成本紀錄。
        // 我們回傳 null 以停止計算總損益，避免顯示誤導性的數據。
        if (isForeign && Math.abs(tx.exchange_rate - 1.0) < 0.0001 && !tx.source_amount) {
            return null;
        }

        // 該筆交易的本位幣成本 = 原幣金額 * 當下匯率
        // 注意: BUY 的 amount 通常是負數 (流出)，所以要取絕對值
        const txCostBase = Math.abs(tx.amount) * tx.exchange_rate;
        
        currentBaseCost += txCostBase;
        currentQty += tx.quantity_change;
      }
      // 賣出 / 出金
      else if (tx.quantity_change < 0) {
        // 賣出時，依照比例減少成本 (加權平均法)
        if (currentQty > 0) {
          const ratio = Math.abs(tx.quantity_change) / currentQty;
          const costRemoved = currentBaseCost * ratio;
          
          currentBaseCost -= costRemoved;
          currentQty += tx.quantity_change; // 加上負數 = 減少
        }
      }
    }

    return currentBaseCost;
  }
}
