import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TimerService } from '../../services/timer.service';
import { TimerComponent } from '../timer/timer.component';

export type TimerTitleType = 'entrada' | 'salida';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [TimerComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {

  timerTitle: TimerTitleType = 'entrada';

  timerEntry = {
    min: 0,
    sec: 0
  }

  timerExit = {
    min: 0,
    sec: 0
  }

  loading: boolean = true;

  ngOnInit() {
    let appHeader = document.querySelector('app-header');
    ///appHeader?.remove();
    appHeader?.setAttribute('style', 'display: flex')
    this.loading = false;
  }

  constructor(
    public timerService: TimerService,
    private route: Router
  ) {

  }

  resetTimer() {
    this.timerService.resetTimer();
  }

  changeTimer() {
    this.saveTimer();
    this.resetTimer();
    if (this.timerTitle === 'entrada') {
      this.timerTitle = 'salida';
    } else {
      this.timerTitle = 'entrada';
    }
  }

  saveTimer() {
    if (this.timerTitle === 'entrada') {
      this.timerService.saveTimer('entryTime');
    } else {
      this.timerService.saveTimer('exitTime');
    }
  }

  goToConfirmation() {
    this.saveTimer();
    this.route.navigateByUrl('validar')
  }

}
