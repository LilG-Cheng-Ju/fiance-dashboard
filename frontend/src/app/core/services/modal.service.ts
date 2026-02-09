import { Injectable, signal, Type, computed } from '@angular/core';

export interface ModalState {
  id: string;
  component: Type<any>;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private stackSignal = signal<ModalState[]>([]);

  readonly stack = this.stackSignal.asReadonly();

  readonly isOpen = computed(() => this.stackSignal().length > 0);

  open(component: Type<any>, data?: any) {
    const newModal: ModalState = {
      id: crypto.randomUUID(),
      component,
      data,
    };

    this.stackSignal.update((stack) => [...stack, newModal]);

    document.body.style.overflow = 'hidden';
  }

  close() {
    this.stackSignal.update((stack) => {
      if (stack.length === 0) return stack;
      return stack.slice(0, -1);
    });

    if (this.stackSignal().length === 0) {
      document.body.style.overflow = '';
    }
  }

  closeAll() {
    this.stackSignal.set([]);
    document.body.style.overflow = '';
  }
}
