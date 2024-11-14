import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { TimerComponent } from '../timer/timer.component';

@Component({
  selector: 'app-timer-fullscreen',
  standalone: true,
  imports: [
    TimerComponent
  ],
  templateUrl: './timer-fullscreen.component.html',
  styleUrl: './timer-fullscreen.component.scss'
})
export class TimerFullscreenComponent {
  loading: boolean = true;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      let appHeader = document.querySelector('app-header');
      let appFooter = document.querySelector('app-footer');
      appHeader?.remove();
      appFooter?.remove();
      this.loading = false;
    }
  }
}
