import { Injectable, OnDestroy } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TimerStoreService, TimerState } from './timer-store.service';
import { FirebaseStorageService } from './storage.service';
import { TimerMarksService } from './timer-marks.service';
import { ChoreService } from './chore.service';

export interface Timer {
    min: number;
    sec: number;
    updatedAt?: number; // ms epoch
    running?: boolean;
    durationMs?: number;
    remainingMs?: number;
    status?: string;
    controllerId?: string;
    clientId?: string;
}

export interface TimerStatus {
    name: string;
    status: boolean;
    value: string;
}

@Injectable({
    providedIn: 'root'
})
export class TimerService implements OnDestroy {

    private timerSubject = new BehaviorSubject<Timer>({ min: 3, sec: 30, updatedAt: Date.now(), running: false });
    timer$ = this.timerSubject.asObservable();

    timers: TimerStatus[] = [];

    initialTimer?: Timer;
    timerStatus: boolean = false; // usado por UI/admin

    // sincronización throttled
    private syncIntervalMs = 5000;
    private lastSyncTs = 0;
    private realtimeLastReceivedAt = 0;
    private realtimeStaleMs = 15000;
    private suppressRealtimeUntil = 0;

    private stateSub?: Subscription;
    private realtimeSub?: Subscription;

    // identifier para este cliente
    private clientId: string = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    private writeEnabled: boolean = false; // por defecto listeners NO escriben

    constructor(
        private firebaseStorageService: FirebaseStorageService,
        private cookieService: CookieService,
        private timerStore: TimerStoreService,
        private timerMarks: TimerMarksService,
        private choreService: ChoreService
    ) {
        this.bootstrapInitialTimer();
        this.stateSub = this.timerStore.state$.subscribe(state => this.handleStateChange(state));
        this.listenRealtime();
        this.getTimer();
    }

    ngOnDestroy(): void {
        this.stateSub?.unsubscribe();
        this.realtimeSub?.unsubscribe();
    }

    // Permite marcar este cliente como controlador (admin). Llamar desde AdminCronoComponent.ngOnInit:
    // this.timerService.setController(true);
    setController(enabled: boolean): void {
        this.writeEnabled = enabled;
    }

    changeTimer(): void {
        if (!this.timerStatus) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    startTimer(): void {
        this.timerStore.start(this.clientId);
        this.timerStatus = true;
        this.pushToRemote(this.timerStore.snapshot, true);
    }

    stopTimer(): void {
        this.timerStore.pause(this.clientId);
        this.timerStatus = false;
        this.pushToRemote(this.timerStore.snapshot, true);
    }

    resetTimer(timerParam?: Timer): void {
        if (timerParam) {
            this.setInitialTimer(timerParam);
        }
        this.timerStore.reset(this.clientId);
        this.timerStatus = false;
        this.pushToRemote(this.timerStore.snapshot, true);
    }

    setInitialTimer(timer: Timer): void {
        this.initialTimer = { min: timer.min, sec: timer.sec, updatedAt: Date.now(), running: false };
        this.cookieService.set('initialMinutes', String(timer.min));
        this.cookieService.set('initialSeconds', String(timer.sec));
        try {
            localStorage.setItem('initialTimer', JSON.stringify({ min: timer.min, sec: timer.sec, updatedAt: Date.now() }));
        } catch (e) {
            // ignore storage errors
        }
        const durationMs = (timer.min * 60 + timer.sec) * 1000;
        this.timerStore.setDuration(durationMs, this.clientId);
    }

    saveTimer(name: 'entryTime' | 'exitTime'): void {
        const { sessionId, associationId } = this.getCurrentContext();
        const timer = this.timerSubject.getValue();
        const mark = this.timerMarks.saveMark(name === 'entryTime' ? 'entry' : 'exit', timer, sessionId, associationId);

        const timerStatus: TimerStatus = {
            name,
            status: false,
            value: mark.value
        };
        const idx = this.timers.findIndex(t => t.name === name);
        if (idx !== -1) this.timers[idx] = timerStatus;
        else this.timers.push(timerStatus);
    }

    private handleStateChange(state: TimerState): void {
        this.timerStatus = state.status === 'running';
        const min = Math.floor(state.remainingMs / 60000);
        const sec = Math.floor((state.remainingMs % 60000) / 1000);
        this.timerSubject.next({
            min,
            sec,
            updatedAt: state.updatedAt,
            running: state.status === 'running',
            durationMs: state.durationMs,
            remainingMs: state.remainingMs,
            status: state.status,
            controllerId: state.controllerId
        });

        // persistir en cookies para compatibilidad
        this.cookieService.set('minutes', String(min));
        this.cookieService.set('seconds', String(sec));

        // escritura periódica a Firebase si somos controlador
        const now = Date.now();
        if (this.writeEnabled && state.status === 'running' && (now - this.lastSyncTs >= this.syncIntervalMs)) {
            this.pushToRemote(state, false);
            this.lastSyncTs = now;
        }
    }

    private listenRealtime(): void {
        this.realtimeSub = this.firebaseStorageService.getRealtimeTimer().subscribe((remote: any) => {
            if (!remote) return;
            const now = Date.now();
            this.realtimeLastReceivedAt = now;
            if (now < this.suppressRealtimeUntil) return;

            const remainingMs = remote.remainingMs ?? ((remote.min ?? 0) * 60000 + (remote.sec ?? 0) * 1000);
            const durationMs = remote.durationMs ?? this.timerStore.snapshot.durationMs;
            const status = (remote.status as any) ?? (remote.running ? 'running' : 'idle');
            const updatedAt = remote.updatedAt ?? 0;

            this.timerStore.applyRemote({
                durationMs,
                remainingMs,
                status,
                updatedAt,
                controllerId: remote.clientId
            });
        });
    }

    private async getTimer(): Promise<void> {
        try {
            const remote = await this.firebaseStorageService.getTimerValues();
            if (!remote) return;
            const remainingMs = remote.remainingMs ?? ((remote.min ?? 0) * 60000 + (remote.sec ?? 0) * 1000);
            const durationMs = remote.durationMs ?? this.timerStore.snapshot.durationMs;
            const status = (remote.status as any) ?? (remote.running ? 'running' : 'idle');
            const updatedAt = remote.updatedAt ?? Date.now();

            this.timerStore.applyRemote({
                durationMs,
                remainingMs,
                status,
                updatedAt,
                controllerId: remote.clientId
            });
        } catch (e) {
            console.error('getTimer error', e);
        }
    }

    private pushToRemote(state: TimerState, force: boolean): void {
        if (!this.writeEnabled && !force) return;
        const now = Date.now();
        this.suppressRealtimeUntil = now + 1500;
        const min = Math.floor(state.remainingMs / 60000);
        const sec = Math.floor((state.remainingMs % 60000) / 1000);

        const payload: Timer = {
            min,
            sec,
            updatedAt: state.updatedAt,
            running: state.status === 'running',
            durationMs: state.durationMs,
            remainingMs: state.remainingMs,
            status: state.status,
            controllerId: state.controllerId,
            clientId: this.clientId
        };
        try {
            this.firebaseStorageService.updateTimer(payload);
        } catch (e) {
            console.warn('pushToRemote firebase write failed', e);
        }
    }

    private bootstrapInitialTimer(): void {
        let min = 3;
        let sec = 30;
        // memoria previa
        try {
            const stored = localStorage.getItem('initialTimer');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed.min === 'number' && typeof parsed.sec === 'number') {
                    min = parsed.min;
                    sec = parsed.sec;
                    this.initialTimer = { min, sec, updatedAt: parsed.updatedAt || Date.now(), running: false };
                }
            }
        } catch { /* ignore */ }

        if (!this.initialTimer) {
            const initMin = parseInt(this.cookieService.get('initialMinutes') || '', 10);
            const initSec = parseInt(this.cookieService.get('initialSeconds') || '', 10);
            if (!isNaN(initMin) && !isNaN(initSec)) {
                min = initMin;
                sec = initSec;
                this.initialTimer = { min, sec, updatedAt: Date.now(), running: false };
            } else {
                const cookieMin = parseInt(this.cookieService.get('minutes') || '', 10);
                const cookieSec = parseInt(this.cookieService.get('seconds') || '', 10);
                if (!isNaN(cookieMin)) min = cookieMin;
                if (!isNaN(cookieSec)) sec = cookieSec;
            }
        }

        const durationMs = (min * 60 + sec) * 1000;
        this.timerStore.setDuration(durationMs, this.clientId);
    }

    private getCurrentContext(): { sessionId?: string; associationId?: string } {
        let sessionId: string | undefined;
        let associationId: string | undefined;
        this.choreService.sessionSelectedObservable.subscribe(s => sessionId = s?.id?.toString() || undefined).unsubscribe();
        this.choreService.asociacionSelectedObservable.subscribe(a => associationId = a?.id?.toString() || undefined).unsubscribe();
        return { sessionId, associationId };
    }
}
