import { Component, input, signal, effect, untracked } from '@angular/core';
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

  totalAmountDisplay = signal(0);

  constructor() {
    effect(() => {
      const target = this.totalAmount();
      const start = untracked(() => this.totalAmountDisplay());

      if (target !== start) {
        this.animateValue(start, target, 800);
      }
    });
  }

  private animateValue(start: number, end: number, duration: number) {
    const startTime = performance.now();

    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
}
