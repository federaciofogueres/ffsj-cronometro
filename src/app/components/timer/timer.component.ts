import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TimerService, TimerStatus } from '../../services/timer.service';

export interface TimerClockModel {
  minutes: string;
  seconds: string;
}

type TimerColorClass = 'good' | 'warning' | 'danger';
type TimerScreenClass = 'full' | 'component';
type FullScreenClass = 'full-screen' | '';
type ContainerClass = 'container' | '';
type PaddingClass = 'p-3' | '';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss']
})
export class TimerComponent {

  timerColorClass: TimerColorClass = 'good';
  fullScreen: FullScreenClass = 'full-screen';
  containerClass: ContainerClass = 'container';
  paddingClass: PaddingClass = 'p-3';

  @Input() timerType: TimerScreenClass = 'component';

  timerScreenClasses = ['container', 'p-3'];

  timerStatus: TimerStatus = {
    name: '',
    status: false,
    value: ''
  }

  timer: TimerClockModel = {
    minutes: '04',
    seconds: '00',
  };

  loading: boolean = true;

  ngOnInit() {
    if (this.timerType === 'component') {
      this.fullScreen = '';
      this.containerClass = 'container';
      this.paddingClass = 'p-3';
    } else {
      this.fullScreen = 'full-screen';
      this.containerClass = '';
      this.paddingClass = '';
    }
    this.loading = false;
  }

  constructor(
    private timerService: TimerService
  ) {
    this.timerService.timer$.subscribe({
      next: (res: any) => {
        this.timer.minutes = res.min.toString().padStart(2, '0');
        this.timer.seconds = res.sec.toString().padStart(2, '0');
        this.timerColorClass = this.checkTimerColorClass();
      }
    });
  }

  checkTimerColorClass(timer: number = parseInt(this.timer.minutes)): TimerColorClass {
    if (timer >= 2) {
      return 'good';
    } else if (timer >= 1) {
      return 'warning';
    } else {
      return 'danger';
    }
  }

}