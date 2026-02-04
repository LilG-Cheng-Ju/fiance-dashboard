import { Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Asset } from '../../core/models/asset.model';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './asset-card.html',
  styleUrl: './asset-card.scss',
})
export class AssetCard {
  asset = input.required<Asset>();
  marketPrice = input<number>(0);

  displayValue = input<number | null>(null);
  pnl = input<number>(0);
  roi = input<number | string>(0);

  delete = output<number>();

  onDelete() {
    this.delete.emit(this.asset().id);
  }
}
