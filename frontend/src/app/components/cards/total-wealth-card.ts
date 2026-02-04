import { Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-total-wealth-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './total-wealth-card.html',
  styleUrl: './total-wealth-card.scss',
})
export class TotalWealthCard {
  totalAmount = input.required<number>();
  dayChange = 12500; 
  dayChangePercentage = 0.85;
  loading = input<boolean>(false);
}
