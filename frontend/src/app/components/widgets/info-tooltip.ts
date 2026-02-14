import { Component, ElementRef, HostListener, inject, input, signal, computed, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

export type TooltipPlacement = 'top' | 'bottom' | 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

@Component({
  selector: 'app-info-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-tooltip.html',
  styleUrls: ['./info-tooltip.scss']
})
export class InfoTooltipComponent {
  text = input.required<string>();
  placement = input<TooltipPlacement>('top');
  mobilePlacement = input<TooltipPlacement | undefined>(undefined);
  
  isOpen = signal(false);
  isMobile = signal(false);
  
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private isTouch = false;

  activePlacement = computed(() => {
    const mobilePlace = this.mobilePlacement();
    if (this.isMobile() && mobilePlace) {
      return mobilePlace;
    }
    return this.placement();
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile.set(window.innerWidth <= 768);
    }
  }

  onTouchStart() {
    this.isTouch = true;
  }

  onMouseEnter() {
    if (!this.isTouch) {
      this.isOpen.set(true);
    }
  }

  onMouseLeave() {
    if (!this.isTouch) {
      this.isOpen.set(false);
    }
  }

  onClick(event: Event) {
    event.stopPropagation();
    
    if (this.isTouch) {
      this.isOpen.update(v => !v);
    } else {
      this.isOpen.set(true);
    }
  }

  @HostListener('document:touchstart', ['$event'])
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.isTouch = false;
    }
  }
}