import { Injectable } from '@angular/core';

import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';
import { FirebaseStorageService } from './storage.service';

export interface Timer {
    min: number,
    sec: number
}

export interface TimerStatus {
    name: string;
    status: boolean;
    value: string;
}

@Injectable({
    providedIn: 'root'
})
@Injectable()
export class TimerService {

    private timerSubject = new BehaviorSubject<Timer>({ min: 8, sec: 0 });
    timer$ = this.timerSubject.asObservable();

    timers: TimerStatus[] = [];

    timerObject: Timer = {
        min: Boolean(this.cookieService.get('minutes')) ? parseInt(this.cookieService.get('minutes')!) : 8,
        sec: Boolean(this.cookieService.get('seconds')) ? parseInt(this.cookieService.get('seconds')!) : 0,
    }

    timerStatus: boolean = false;

    timerReal: Timer = { min: 8, sec: 0 };

    constructor(
        private firebaseStorageService: FirebaseStorageService,
        private cookieService: CookieService
    ) {
        this.getTimer();
        this.getRealtimeTimer();
    }

    getRealtimeTimer() {
        this.firebaseStorageService.getRealtimeTimer().subscribe((timer: Timer) => {
            this.timerReal = timer;
            this.timerSubject.next(timer);
        });
    }

    async getTimer() {
        try {
            const timer = await this.firebaseStorageService.getTimerValues();
            this.timerReal = timer;
        } catch (error) {
            console.error('Error getting timer values:', error);
        }
    }

    updateContador(timer: Timer = this.timerObject) {
        this.cookieService.set('minutes', timer.min.toString());
        this.cookieService.set('seconds', timer.sec.toString());
        console.log(timer);

        this.firebaseStorageService.updateTimer(timer);
        this.timerSubject.next(timer);
    }

    changeTimer() {
        this.timerStatus = !this.timerStatus;
        if (this.timerStatus) {
            this.startTimer();
        }
    }

    startTimer() {
        this.timerStatus = true;
        let intervalTimer = setInterval(() => {
            if (this.timerStatus) {
                if (this.timerObject.sec > 0) {
                    this.timerObject.sec--;
                } else {
                    this.timerObject.min--;
                    this.timerObject.sec = 59;
                }
                this.updateContador()
            } else {
                clearInterval(intervalTimer);
            }
        }, 1000)
    }

    resetTimer() {
        this.timerObject.min = 8;
        this.timerObject.sec = 0;
        this.updateContador()
    }

    stopTimer() {
        this.timerStatus = false;
    }

    saveTimer(name: string) {
        let timerStatus: TimerStatus = {
            name: name,
            status: false,
            value: `${this.timerObject.min}:${this.timerObject.sec}`
        }
        let timerIndexFound = this.timers.findIndex(timer => timer.name === name);
        if (timerIndexFound !== -1) {
            this.timers[timerIndexFound].value = timerStatus.value;
        } else {
            this.timers.push(timerStatus)
        }
    }

}
