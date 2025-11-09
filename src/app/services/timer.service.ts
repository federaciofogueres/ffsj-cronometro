import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject } from 'rxjs';
import { FirebaseStorageService } from './storage.service';

export interface Timer {
    min: number;
    sec: number;
    updatedAt?: number; // ms epoch
    running?: boolean;
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

    // seguimiento de recepción realtime para watchdog
    private realtimeLastReceivedAt = 0;
    private realtimeStaleMs = 15000; // si no llega update en este tiempo, seguir tickeando localmente

    // identifier para este cliente (reduce conflictos) y flag para permitir escrituras a Firebase
    private clientId: string = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    private writeEnabled: boolean = false; // por defecto listeners NO escriben

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

        // cargar initial si existe en localStorage (preferible) o cookies
        try {
            const stored = localStorage.getItem('initialTimer');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed.min === 'number' && typeof parsed.sec === 'number') {
                    this.initialTimer = { min: parsed.min, sec: parsed.sec, updatedAt: parsed.updatedAt || Date.now(), running: false };
                }
            }
        } catch (e) {
            // ignore parse errors
        }

        if (!this.initialTimer) {
            const initMin = parseInt(this.cookieService.get('initialMinutes') || '', 10);
            const initSec = parseInt(this.cookieService.get('initialSeconds') || '', 10);
            if (!isNaN(initMin) && !isNaN(initSec)) {
                this.initialTimer = { min: initMin, sec: initSec, updatedAt: Date.now(), running: false };
            }
        }

        this.timerSubject.next({ ...this.timerObject });

        // escuchar Firebase realtime y watchdog opcional
        this.getRealtimeTimer();
        this.startRealtimeWatchdog();
        // one-shot inicial
        this.getTimer();
    }

    // Permite marcar este cliente como controlador (admin). Llamar desde AdminCronoComponent.ngOnInit:
    // this.timerService.setController(true);
    setController(enabled: boolean): void {
        this.writeEnabled = enabled;
    }

    private getRealtimeTimer(): void {
        this.firebaseStorageService.getRealtimeTimer().subscribe((remote: any) => {
            if (!remote) return;

            const now = Date.now();
            this.realtimeLastReceivedAt = now;

            // evitar aplicar updates inmediatamente después de nuestros writes locales
            if (now < this.suppressRealtimeUntil) return;

            const remoteTs = remote.updatedAt ?? 0;
            const remoteIsNewer = remoteTs > this.localLastUpdatedAt;

            // aplicar remoto si es más reciente o si indica running (para que listeners arranquen)
            if (remoteIsNewer || !!remote.running) {
                this.timerReal = { min: remote.min, sec: remote.sec, updatedAt: remoteTs, running: !!remote.running };
                this.timerObject = { ...this.timerReal };
                this.localLastUpdatedAt = Math.max(this.localLastUpdatedAt, remoteTs);

                // publicar a subscriptores (UI)
                this.timerSubject.next({ ...this.timerObject });

                // persistir en cookies
                this.cookieService.set('minutes', String(this.timerObject.min));
                this.cookieService.set('seconds', String(this.timerObject.sec));
            }

            // sincronizar estado de ejecución local con remoto (remote.running manda)
            if (remote.running) {
                if (!this.timerStatus) {
                    this.timerStatus = true;
                    this.startTickerLoop();
                }
            } else {
                if (this.timerStatus) {
                    this.timerStatus = false;
                    this.clearTickerLoop();
                }
            }
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
     * Actualiza estado local, cookies y opcionalmente escribe a Firebase con timestamp.
     * Marca suppressRealtimeUntil para evitar aplicar el evento realtime inmediato.
     * options.write: si true fuerza escritura; por defecto solo escribe si this.writeEnabled === true
     */
    updateContador(timer: Timer = this.timerObject, options: { write?: boolean } = {}): void {
        const now = Date.now();
        this.timerObject = { min: timer.min, sec: timer.sec, updatedAt: now, running: !!timer.running };
        this.localLastUpdatedAt = now;

        this.cookieService.set('minutes', String(this.timerObject.min));
        this.cookieService.set('seconds', String(this.timerObject.sec));

        const shouldWrite = options.write === true ? true : (options.write === false ? false : this.writeEnabled);

        if (shouldWrite) {
            try {
                // agregar quien escribe puede ayudar a debug / resolver conflictos en server
                const payload: any = { ...this.timerObject, clientId: this.clientId };
                this.firebaseStorageService.updateTimer(payload);
            } catch (e) {
                console.warn('updateContador firebase write failed', e);
            }
            this.suppressRealtimeUntil = now + 1500; // evitar sobrescrituras inmediatas
            this.lastSyncTs = now;
        }

        this.timerSubject.next({ ...this.timerObject });
    }

    setInitialTimer(timer: Timer): void {
        this.initialTimer = { min: timer.min, sec: timer.sec, updatedAt: Date.now(), running: false };

        // persistir en cookies para compatibilidad
        this.cookieService.set('initialMinutes', String(timer.min));
        this.cookieService.set('initialSeconds', String(timer.sec));

        // persistir también en localStorage (JSON) para que clients que no pasen por Admin lo lean
        try {
            localStorage.setItem('initialTimer', JSON.stringify({ min: timer.min, sec: timer.sec, updatedAt: Date.now() }));
        } catch (e) {
            // si localStorage falla, no bloqueamos
        }

        // aplicar inmediatamente como estado actual y escribir si corresponde
        this.updateContador({ min: timer.min, sec: timer.sec, running: false }, { write: true });
    }

    changeTimer(): void {
        this.timerStatus = !this.timerStatus;
        if (this.timerStatus) {
            this.startTickerLoop();
            // informar a firebase de que está arrancado (solo si controlador)
            this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: true }, { write: true });
        } else {
            // parar y sincronizar estado (solo si controlador)
            this.clearTickerLoop();
            this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: false }, { write: true });
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
                    // sincronizar parada (solo controlador debería escribir)
                    this.updateContador({ min: 0, sec: 0, running: false }, { write: true });
                    return;
                }
            }

            // publicar tick local inmediatamente (UI)
            this.timerSubject.next({ min: this.timerObject.min, sec: this.timerObject.sec, updatedAt: this.localLastUpdatedAt, running: true });

            // throttle escritura a firebase: sólo si writeEnabled
            const now = Date.now();
            if ((now - this.lastSyncTs >= this.syncIntervalMs) && this.writeEnabled) {
                this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: true }, { write: true });
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

    /**
     * resetTimer ahora acepta opcionalmente un Timer para preestablecer sin entrar en Admin UI.
     * Si se pasa timerParam se aplica y (si controller) se escribe; si no, usa initial/cookies/default.
     */
    resetTimer(timerParam?: Timer): void {
        if (timerParam) {
            this.timerObject = { min: timerParam.min, sec: timerParam.sec, updatedAt: Date.now(), running: false };
        } else {
            // 1) memoria (setInitialTimer)
            if (this.initialTimer) {
                this.timerObject = { min: this.initialTimer.min, sec: this.initialTimer.sec, updatedAt: Date.now(), running: false };
            } else {
                // 2) localStorage
                let got = false;
                try {
                    const stored = localStorage.getItem('initialTimer');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed && typeof parsed.min === 'number' && typeof parsed.sec === 'number') {
                            this.timerObject = { min: parsed.min, sec: parsed.sec, updatedAt: Date.now(), running: false };
                            got = true;
                        }
                    }
                } catch (e) {
                    // ignore parse errors
                }

                if (!got) {
                    // 3) cookies initialMinutes/initialSeconds
                    const initMinRaw = this.cookieService.get('initialMinutes');
                    const initSecRaw = this.cookieService.get('initialSeconds');
                    const initMin = parseInt(initMinRaw || '', 10);
                    const initSec = parseInt(initSecRaw || '', 10);
                    if (!isNaN(initMin) && !isNaN(initSec)) {
                        this.timerObject = { min: initMin, sec: initSec, updatedAt: Date.now(), running: false };
                    } else {
                        // 4) fallback cookies minutes/seconds or defaults
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
            }
        }

        // publicar y sincronizar de inmediato (solo si controller)
        this.timerSubject.next({ ...this.timerObject });
        this.updateContador({ ...this.timerObject }, { write: true });
    }

    stopTimer(): void {
        this.clearTickerLoop();
        // sincronizar al parar (solo controller)
        this.updateContador({ min: this.timerObject.min, sec: this.timerObject.sec, running: false }, { write: true });
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

    // Watchdog para mantener ticking en listeners si el remoto indicó running recientemente
    private startRealtimeWatchdog(): void {
        setInterval(() => {
            const now = Date.now();
            // si ya estamos tickeando local no hacemos nada
            if (this.timerStatus) return;

            // si el último remoto indicaba running y llegó recientemente, arrancamos loop local
            if (this.timerReal.running && (now - this.realtimeLastReceivedAt) < this.realtimeStaleMs) {
                this.timerStatus = true;
                this.startTickerLoop();
            }
        }, 5000);
    }
}