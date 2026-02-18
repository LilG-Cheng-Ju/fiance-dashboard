import { Component, input, inject, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ModalService } from '../../core/services/modal.service';
import { AssetDetailModalComponent } from '../modals/asset-detail-modal';
import { AssetView } from '../../core/models/asset.model';

@Component({
  selector: 'app-asset-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './asset-card.html',
  styleUrls: ['./asset-card.scss'],
  host: {
    '(click)': 'openDetail()',
    '[style.cursor]': '"pointer"'
  }
})
export class AssetCard {
  asset = input.required<AssetView>(); 
  marketPrice = computed(() => this.asset().marketPrice);
  
  displayCurrency = computed(() => this.asset().displayCurrency);
  displayAmount = computed(() => this.asset().displayAmount);
  
  pnl = computed(() => this.asset().unrealizedPnl || 0);

  roi = computed(() => this.asset().returnRate || 0);
  
  exchangeRate = computed(() => this.asset().exchangeRate || 1);

  private modalService = inject(ModalService);

  openDetail() {
    this.modalService.open(AssetDetailModalComponent, {
      asset: this.asset()
    });
  }
}
