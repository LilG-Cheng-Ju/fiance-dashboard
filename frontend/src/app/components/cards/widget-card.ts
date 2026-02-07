import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-widget-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './widget-card.html',
  styleUrls: ['./widget-card.scss'],
})
export class WidgetCardComponent {
  title = input.required<string>();
  loading = input<boolean>(false);
  error = input<string | null>(null);
}
