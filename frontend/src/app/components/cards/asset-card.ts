import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { AssetData } from '../../core/services/asset.service';

@Component({
  selector: 'app-asset-card',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './asset-card.html',
  styleUrl: './asset-card.scss',
})
export class AssetCard {
  asset = input.required<AssetData>();
}
