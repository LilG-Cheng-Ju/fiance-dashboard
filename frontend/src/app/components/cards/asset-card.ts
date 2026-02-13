import { Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-asset-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './asset-card.html',
  styleUrls: ['./asset-card.scss'],
})
export class AssetCard {
  asset = input.required<any>(); 
  marketPrice = input<number>(0);
  
  displayCurrency = input<string>('TWD');
  displayAmount = input<number>(0);
  
  pnl = input<number>(0);
  roi = input<number | string>(0);
  exchangeRate = input<number>(1);

  delete = output<number>();

  onDelete() {
    this.delete.emit(this.asset().id);
  }
}