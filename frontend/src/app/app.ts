import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalContainerComponent } from './components/modals/modal-container';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ModalContainerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {}
