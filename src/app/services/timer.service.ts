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

    private timerSubject = new BehaviorSubject<Timer>({ min: 3, sec: 30 });
    timer$ = this.timerSubject.asObservable();

    timers: TimerStatus[] = [];

    // current running values
    timerObject: Timer = { min: 3, sec: 30 };

    // optional configured initial values (set from admin)
    initialTimer?: Timer;

    timerStatus: boolean = false;
    timerReal: Timer = { min: 3, sec: 30 };

    // prevents immediate realtime overwrite after a local update
    private suppressRealtimeUntil = 0;

    // interval handle for startTimer/stopTimer
    private intervalId: any = null;

    constructor(
        private firebaseStorageService: FirebaseStorageService,
        private cookieService: CookieService
    ) {
        // initialize timerObject from cookies if available, otherwise defaults
        const cookieMin = this.cookieService.get('minutes');
        const cookieSec = this.cookieService.get('seconds');

        const parsedMin = parseInt(cookieMin || '', 10);
        const parsedSec = parseInt(cookieSec || '', 10);

        this.timerObject = {
            min: !isNaN(parsedMin) ? parsedMin : 3,
            sec: !isNaN(parsedSec) ? parsedSec : 30,
        };

        // try load persisted admin initial if present (from cookies)
        this.loadInitialTimerFromCookies();

        // publish starting value
        this.timerSubject.next(this.timerObject);

        // start background sync/listen
        this.getTimer();
        this.getRealtimeTimer();
    }

    private loadInitialTimerFromCookies(): void {
        const initMinRaw = this.cookieService.get('initialMinutes');
        const initSecRaw = this.cookieService.get('initialSeconds');
        const initMin = parseInt(initMinRaw || '', 10);
        const initSec = parseInt(initSecRaw || '', 10);

        if (!isNaN(initMin) && !isNaN(initSec)) {
            this.initialTimer = { min: initMin, sec: initSec };
        } else {
            // no admin initial persisted — keep undefined (reset falls back to cookies/default)
            this.initialTimer = undefined;
        }
    }

    getRealtimeTimer() {
        this.firebaseStorageService.getRealtimeTimer().subscribe((timer: Timer) => {
            // ignore realtime updates that arrive immediately after a local update
            if (Date.now() < this.suppressRealtimeUntil) {
                return;
            }

            this.timerReal = timer;
            this.timerObject = { ...timer };
            this.timerSubject.next(timer);
        });
    }

    async getTimer() {
        try {
            const timer = await this.firebaseStorageService.getTimerValues();
            if (timer) {
                this.timerReal = timer;
                // if there is no active suppression, publish
                if (Date.now() >= this.suppressRealtimeUntil) {
                    this.timerObject = { ...timer };
                    this.timerSubject.next(timer);
                }
            }
        } catch (error) {
            console.error('Error getting timer values:', error);
        }
    }

    updateContador(timer: Timer = this.timerObject) {
        // update internal state
        this.timerObject = { min: timer.min, sec: timer.sec };

        // persist current values
        this.cookieService.set('minutes', timer.min.toString());
        this.cookieService.set('seconds', timer.sec.toString());

        // sync with firebase and notify subscribers
        this.firebaseStorageService.updateTimer(timer);

        // suppress realtime incoming updates for a short window to avoid immediate overwrite
        this.suppressRealtimeUntil = Date.now() + 1500; // 1.5s

        this.timerSubject.next(timer);
    }

    /**
     * Called from admin to set the configured initial timer for resets.
     * Persists the configured initial values and updates current timer state.
     */
    setInitialTimer(timer: Timer) {
        this.initialTimer = { min: timer.min, sec: timer.sec };
        this.cookieService.set('initialMinutes', String(timer.min));
        this.cookieService.set('initialSeconds', String(timer.sec));

        // apply immediately as current timer and suppress realtime briefly
        this.updateContador(this.initialTimer);
    }

    changeTimer() {
        this.timerStatus = !this.timerStatus;
        if (this.timerStatus) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    startTimer() {
        // prevent multiple intervals
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.timerStatus = true;
        this.intervalId = setInterval(() => {
            if (!this.timerStatus) {
                clearInterval(this.intervalId);
                this.intervalId = null;
                return;
            }

            if (this.timerObject.sec > 0) {
                this.timerObject.sec--;
            } else {
                if (this.timerObject.min > 0) {
                    this.timerObject.min--;
                    this.timerObject.sec = 59;
                } else {
                    // reached 0:0 — stop
                    this.stopTimer();
                }
            }

            this.updateContador();
        }, 1000);
    }

    resetTimer() {
        // priority for reset:
        // 1) explicit admin-configured initialTimer
        // 2) cookies initialMinutes / initialSeconds (in case admin persisted them directly)
        // 3) fall back to current persisted minutes / seconds cookies or defaults
        if (this.initialTimer) {
            this.timerObject = { ...this.initialTimer };
        } else {
            const initMinRaw = this.cookieService.get('initialMinutes');
            const initSecRaw = this.cookieService.get('initialSeconds');
            const initMin = parseInt(initMinRaw || '', 10);
            const initSec = parseInt(initSecRaw || '', 10);

            if (!isNaN(initMin) && !isNaN(initSec)) {
                this.timerObject = { min: initMin, sec: initSec };
            } else {
                const cookieMin = this.cookieService.get('minutes');
                const cookieSec = this.cookieService.get('seconds');

                const parsedMin = parseInt(cookieMin || '', 10);
                const parsedSec = parseInt(cookieSec || '', 10);

                this.timerObject = {
                    min: !isNaN(parsedMin) ? parsedMin : 3,
                    sec: !isNaN(parsedSec) ? parsedSec : 30,
                };
            }
        }

        // propagate the reset (cookies/firebase/observers) and suppress realtime briefly
        this.updateContador(this.timerObject);
    }

    stopTimer() {
        this.timerStatus = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    saveTimer(name: string) {
        const timerStatus: TimerStatus = {
            name,
            status: false,
            value: `${this.timerObject.min}:${this.timerObject.sec}`
        };

        const timerIndexFound = this.timers.findIndex(t => t.name === name);
        if (timerIndexFound !== -1) {
            this.timers[timerIndexFound].value = timerStatus.value;
        } else {
            this.timers.push(timerStatus);
        }
    }

}
