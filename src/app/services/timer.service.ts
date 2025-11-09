import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';
import { FirebaseStorageService } from './storage.service';

export interface Timer {
    min: number;
    sec: number;
    updatedAt?: number; // ms epoch
    running?: boolean; // opcional: si el timer está activo
}

export interface TimerStatus {
    name: string;
    status: boolean;
    value: string;
}

@Injectable({
    providedIn: 'root'
})
export class TimerService {

    private timerSubject = new BehaviorSubject<Timer>({ min: 3, sec: 30, updatedAt: Date.now(), running: false });
    timer$ = this.timerSubject.asObservable();

    timers: TimerStatus[] = [];

    // estado local
    timerObject: Timer = { min: 3, sec: 30, updatedAt: Date.now(), running: false };
    initialTimer?: Timer;
    timerStatus: boolean = false; // usado por UI/admin
    timerReal: Timer = { min: 3, sec: 30, updatedAt: Date.now(), running: false };

    private intervalId: any = null;

    // sincronización throttled
    private syncIntervalMs = 5000;
    private lastSyncTs = 0;

    // evita sobrescrituras inmediatas de realtime después de un write local
    private suppressRealtimeUntil = 0;

    // último timestamp local aplicado; sólo aplicamos remotos más recientes
    private localLastUpdatedAt = Date.now();

    constructor(
        private firebaseStorageService: FirebaseStorageService,
        private cookieService: CookieService
    ) {
        // cargar desde cookies
        const cookieMin = parseInt(this.cookieService.get('minutes') || '', 10);
        const cookieSec = parseInt(this.cookieService.get('seconds') || '', 10);
        this.timerObject = {
            min: !isNaN(cookieMin) ? cookieMin : 3,
            sec: !isNaN(cookieSec) ? cookieSec : 30,
            updatedAt: Date.now(),
            running: false
        };

        // cargar initial si existe
        const initMin = parseInt(this.cookieService.get('initialMinutes') || '', 10);
        const initSec = parseInt(this.cookieService.get('initialSeconds') || '', 10);
        if (!isNaN(initMin) && !isNaN(initSec)) {
            this.initialTimer = { min: initMin, sec: initSec, updatedAt: Date.now(), running: false };
        }

        this.timerSubject.next({ ...this.timerObject });

        // escuchar Firebase realtime
        this.getRealtimeTimer();
        // one-shot inicial
        this.getTimer();
    }

    private getRealtimeTimer(): void {
        this.firebaseStorageService.getRealtimeTimer().subscribe((remote: any) => {
            if (!remote) return;

            // evitar aplicar updates inmediatamente después de nuestros writes locales
            if (Date.now() < this.suppressRealtimeUntil) return;

            const remoteTs = remote.updatedAt ?? 0;
            // si remoto no es más reciente, ignorar
            if (remoteTs <= this.localLastUpdatedAt) return;

            // aplicar remoto
            this.timerReal = { min: remote.min, sec: remote.sec, updatedAt: remoteTs, running: !!remote.running };
            this.timerObject = { ...this.timerReal };
            this.localLastUpdatedAt = remoteTs;

            // publicar a subscriptores (UI)
            this.timerSubject.next({ ...this.timerObject });

            // sincronizar estado de ejecución local con remoto:
            if (remote.running) {
                // arrancar ticking local (si no estaba)
                if (!this.timerStatus) {
                    this.timerStatus = true;
                    this.startTickerLoop();
                }
            } else {
                // parar ticking local
                if (this.timerStatus) {
                    this.timerStatus = false;
                    this.clearTickerLoop();
                }
            }

            // persistir en cookies para reloads
            this.cookieService.set('minutes', String(this.timerObject.min));
            this.cookieService.set('seconds', String(this.timerObject.sec));
        });
    }

    private async getTimer(): Promise<void> {
        try {
            const remote = await this.firebaseStorageService.getTimerValues();
            if (!remote) return;
            const remoteTs = remote.updatedAt ?? 0;
            if (remoteTs > this.localLastUpdatedAt) {
                this.timerObject = { min: remote.min, sec: remote.sec, updatedAt: remoteTs, running: !!remote.running };
                this.localLastUpdatedAt = remoteTs;
                this.timerSubject.next({ ...this.timerObject });
            }
        } catch (e) {
            console.error('getTimer error', e);
        }
    }

    /**
     * Actualiza estado local, cookies y escribe a Firebase con timestamp.
     * Esta función marca suppressRealtimeUntil para evitar aplicar el evento realtime inmediato.
     */
    updateContador(timer: Timer = this.timerObject): void {
        const now = Date.now();
        this.timerObject = { min: timer.min, sec: timer.sec, updatedAt: now, running: !!timer.running };
        this.localLastUpdatedAt = now;

        this.cookieService.set('minutes', String(this.timerObject.min));
        this.cookieService.set('seconds', String(this.timerObject.sec));

        // escribir a Firebase (incluye updatedAt y running)
        try {
            this.firebaseStorageService.updateTimer({ ...this.timerObject });
        } catch (e) {
            console.warn('updateContador firebase write failed', e);
        }

        this.suppressRealtimeUntil = now + 1500; // evitar sobrescrituras inmediatas
        this.lastSyncTs = now;
        this.timerSubject.next({ ...this.timerObject });
    }

    setInitialTimer(timer: Timer): void {
        this.initialTimer = { min: timer.min, sec: timer.sec, updatedAt: Date.now(), running: false };
        this.cookieService.set('initialMinutes', String(timer.min));
        this.cookieService.set('initialSeconds', String(timer.sec));
        // aplicar inmediatamente como estado actual
        this.updateContador({ ...this.initialTimer });
    }

    changeTimer(): void {
        this.timerStatus = !this.timerStatus;
        if (this.timerStatus) {
            this.startTickerLoop();
            // informar a firebase de que está arrancado (sin esperar throttle)
            this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: true });
        } else {
            // parar y sincronizar estado
            this.clearTickerLoop();
            this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: false });
        }
    }

    // Inicia solo el loop local; usado por changeTimer y por al aplicar remoto si remote.running === true
    private startTickerLoop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.timerStatus = true;

        this.intervalId = setInterval(() => {
            if (!this.timerStatus) {
                this.clearTickerLoop();
                return;
            }

            // decrementar localmente
            if (this.timerObject.sec > 0) {
                this.timerObject.sec--;
            } else {
                if (this.timerObject.min > 0) {
                    this.timerObject.min--;
                    this.timerObject.sec = 59;
                } else {
                    // llegó a 0:0
                    this.timerStatus = false;
                    this.clearTickerLoop();
                    // sincronizar parada
                    this.updateContador({ min: 0, sec: 0, running: false });
                    return;
                }
            }

            // publicar tick local inmediatamente
            this.timerSubject.next({ min: this.timerObject.min, sec: this.timerObject.sec, updatedAt: this.localLastUpdatedAt, running: true });

            // throttle escritura a firebase
            const now = Date.now();
            if (now - this.lastSyncTs >= this.syncIntervalMs) {
                this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: true });
            }
        }, 1000);
    }

    private clearTickerLoop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.timerStatus = false;
    }

    resetTimer(): void {
        // prioridad: initialTimer > cookies initialMinutes/initialSeconds > cookies minutes/seconds > default
        if (this.initialTimer) {
            this.timerObject = { min: this.initialTimer.min, sec: this.initialTimer.sec, updatedAt: Date.now(), running: false };
        } else {
            const initMinRaw = this.cookieService.get('initialMinutes');
            const initSecRaw = this.cookieService.get('initialSeconds');
            const initMin = parseInt(initMinRaw || '', 10);
            const initSec = parseInt(initSecRaw || '', 10);
            if (!isNaN(initMin) && !isNaN(initSec)) {
                this.timerObject = { min: initMin, sec: initSec, updatedAt: Date.now(), running: false };
            } else {
                const cookieMin = parseInt(this.cookieService.get('minutes') || '', 10);
                const cookieSec = parseInt(this.cookieService.get('seconds') || '', 10);
                this.timerObject = {
                    min: !isNaN(cookieMin) ? cookieMin : 3,
                    sec: !isNaN(cookieSec) ? cookieSec : 30,
                    updatedAt: Date.now(),
                    running: false
                };
            }
        }

        // publicar y sincronizar de inmediato
        this.timerSubject.next({ ...this.timerObject });
        this.updateContador({ ...this.timerObject });
    }

    stopTimer(): void {
        this.clearTickerLoop();
        // sincronizar al parar
        this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: false });
    }

    saveTimer(name: string): void {
        const timerStatus: TimerStatus = {
            name,
            status: false,
            value: `${this.timerObject.min}:${this.timerObject.sec}`
        };
        const idx = this.timers.findIndex(t => t.name === name);
        if (idx !== -1) this.timers[idx].value = timerStatus.value;
        else this.timers.push(timerStatus);
    }
}