import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { getAssetRgb } from '../../core/config/asset.config';
import { SimpleAssetFormComponent, SimpleAssetFormData } from '../forms/simple-asset-form';
import { MarketAssetFormComponent } from '../forms/market-asset-form';
import { AuthStore } from '../../core/store/auth.store';
import { FriendCodePromptComponent } from './friend-code-prompt';

interface AssetOption {
  type: string;
  label: string;
  icon: string;
  rgb: string;
}

const simpleAssets = ['CASH', 'PENDING', 'LIABILITY', 'CREDIT_CARD'];
const marketAssets = ['STOCK', 'CRYPTO', 'GOLD'];

@Component({
  selector: 'app-asset-type-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asset-type-picker.html',
  styleUrls: ['./asset-type-picker.scss'],
})
export class AssetTypePickerComponent {
  private modalService = inject(ModalService);
  public authStore = inject(AuthStore);

  data = input<any>(null);

  options: AssetOption[] = [
    { type: 'CASH', label: '現金 / 存款', icon: 'account_balance_wallet', rgb: getAssetRgb('CASH') },
    { type: 'STOCK', label: '股票 / 基金', icon: 'ssid_chart', rgb: getAssetRgb('STOCK') },
    { type: 'CRYPTO', label: '加密貨幣', icon: 'currency_bitcoin', rgb: getAssetRgb('CRYPTO') },
    { type: 'GOLD', label: '黃金 / 貴金屬', icon: 'diamond', rgb: getAssetRgb('GOLD') },
    { type: 'PENDING', label: '待結算 / 代墊', icon: 'pending_actions', rgb: getAssetRgb('PENDING') },
    { type: 'LIABILITY', label: '貸款 / 負債', icon: 'real_estate_agent', rgb: getAssetRgb('LIABILITY') },
    { type: 'CREDIT_CARD', label: '信用卡', icon: 'credit_card', rgb: getAssetRgb('CREDIT_CARD') },
  ];

  // 定義鎖定的資產類型 (進階功能)
  // CASH, STOCK, LIABILITY 是開放的
  private readonly LOCKED_TYPES = ['CRYPTO', 'GOLD', 'PENDING', 'CREDIT_CARD'];

  isLocked(type: string): boolean {
    if (this.authStore.hasPremiumAccess()) return false;
    return this.LOCKED_TYPES.includes(type);
  }

  close() {
    this.modalService.close();
  }

  openUpgrade() {
    this.modalService.close();
    this.modalService.open(FriendCodePromptComponent);
  }

  selectType(type: string) {
    if (this.isLocked(type)) {
      if(confirm('此為進階資產類型 (加密貨幣、黃金、待結算、信用卡)。\n是否立即輸入序號解鎖？')) {
         this.openUpgrade();
      }
      return;
    }

    this.modalService.close();
    
    if (simpleAssets.includes(type)) {
      this.modalService.open(SimpleAssetFormComponent, { assetType: type } as SimpleAssetFormData);
    } else if (marketAssets.includes(type)) {
      this.modalService.open(MarketAssetFormComponent, { assetType: type } as SimpleAssetFormData);
    }
  }
}