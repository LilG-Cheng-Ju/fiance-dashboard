import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainerComponent } from './components/modals/modal-container';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ModalContainerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  private swUpdate = inject(SwUpdate);

  ngOnInit() {
    if (this.swUpdate.isEnabled) {
      
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          const confirmUpdate = confirm('發現新版本！ 是否立即更新？');
          
          if (confirmUpdate) {
            document.location.reload();
          }
        });
    }
  }
}
