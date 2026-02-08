import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { getAssetRgb } from '../../core/config/asset.config';

interface AssetOption {
  type: string;
  label: string;
  icon: string;
  rgb: string;
}

@Component({
  selector: 'app-asset-type-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asset-type-picker.html',
  styleUrls: ['./asset-type-picker.scss'],
})
export class AssetTypePickerComponent {
  private modalService = inject(ModalService);

  options: AssetOption[] = [
    {
      type: 'CASH',
      label: '現金 / 存款',
      icon: 'account_balance_wallet',
      rgb: getAssetRgb('CASH'),
    },
    { type: 'STOCK', label: '股票 / 基金', icon: 'ssid_chart', rgb: getAssetRgb('STOCK') },
    { type: 'CRYPTO', label: '加密貨幣', icon: 'currency_bitcoin', rgb: getAssetRgb('CRYPTO') },
    { type: 'GOLD', label: '黃金 / 貴金屬', icon: 'diamond', rgb: getAssetRgb('GOLD') },
    {
      type: 'PENDING',
      label: '待結算 / 代墊',
      icon: 'pending_actions',
      rgb: getAssetRgb('PENDING'),
    },
    {
      type: 'LIABILITY',
      label: '貸款 / 負債',
      icon: 'real_estate_agent',
      rgb: getAssetRgb('LIABILITY'),
    },
    { type: 'CREDIT_CARD', label: '信用卡', icon: 'credit_card', rgb: getAssetRgb('CREDIT_CARD') },
  ];

  close() {
    this.modalService.close();
  }

  selectType(type: string) {
    console.log('User selected:', type);
    // TODO: 下一步：
    // 1. this.modalService.close(); // 關掉目前的選擇器
    // 2. this.modalService.open(StockFormComponent); // 打開對應的表單
    this.modalService.close();
  }
}
