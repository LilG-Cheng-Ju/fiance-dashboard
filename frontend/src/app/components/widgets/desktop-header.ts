import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-desktop-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './desktop-header.html',
  styleUrls: ['./desktop-header.scss'],
})
export class DesktopHeaderComponent {
  readonly addAsset = output<void>();

  onAddClick() {
    this.addAsset.emit();
  }
}
