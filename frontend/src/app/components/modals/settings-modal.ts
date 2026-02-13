import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ModalService } from '../../core/services/modal.service';
import { SettingsStore } from '../../core/store/settings.store';
import { RateStore } from '../../core/store/exchange_rate.store';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings-modal.html',
  styleUrls: ['./settings-modal.scss']
})
export class SettingsModalComponent {
  private fb = inject(FormBuilder);
  private modalService = inject(ModalService);
  
  public settingsStore = inject(SettingsStore);
  public rateStore = inject(RateStore);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      baseCurrency: [this.settingsStore.baseCurrency()],
      showOriginalCurrency: [this.settingsStore.showOriginalCurrency()],
      autoFillExchangeRate: [this.settingsStore.autoFillExchangeRate()]
    });

    this.form.valueChanges.subscribe(values => {
      this.settingsStore.updateSettings(values);
    });
  }

  close() {
    this.modalService.close();
  }
}