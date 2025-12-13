import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TimerService } from '../../services/timer.service';
import { SelectorComponent } from "../selector/selector.component";
import { TimerComponent } from '../timer/timer.component';
import { ChoreService } from '../../services/chore.service';

export type TimerTitleType = 'entrada' | 'salida';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [TimerComponent, SelectorComponent, SelectorComponent],
  templateUrl: './admin-crono.component.html',
  styleUrl: './admin-crono.component.scss'
})
export class AdminCronoComponent {

  timerTitle: TimerTitleType = 'entrada';

  timerEntry = {
    min: 0,
    sec: 0
  }

  timerExit = {
    min: 0,
    sec: 0
  }

  ready: boolean = false;

  loading: boolean = true;

  ngOnInit() {
    this.timerService.setController(true);
    let appHeader = document.querySelector('app-header');
    ///appHeader?.remove();
    appHeader?.setAttribute('style', 'display: flex')
    this.choreService.sessionSelectedObservable.subscribe(session => {
      this.updateReadyState();
    });
    this.choreService.asociacionSelectedObservable.subscribe(asociacion => {
      this.updateReadyState();
    });
    this.loading = false;
  }

  constructor(
    public timerService: TimerService,
    private route: Router,
    private choreService: ChoreService
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
    this.resetTimer();
    this.route.navigateByUrl('validar')
  }

  private updateReadyState() {
    let sessionSelected = false;
    let asociacionSelected = false;
    this.choreService.sessionSelectedObservable.subscribe(s => sessionSelected = !!s?.id).unsubscribe();
    this.choreService.asociacionSelectedObservable.subscribe(a => asociacionSelected = !!a?.id).unsubscribe();
    this.ready = sessionSelected && asociacionSelected;
  }

}
