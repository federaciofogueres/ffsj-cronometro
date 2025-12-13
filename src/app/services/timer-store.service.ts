import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';

export type TimerStatus = 'idle' | 'running' | 'finished';

export interface TimerState {
    durationMs: number;
    remainingMs: number;
    status: TimerStatus;
    updatedAt: number;
    controllerId?: string;
}

const DEFAULT_DURATION_MS = (3 * 60 + 30) * 1000; // 3:30

@Injectable({
    providedIn: 'root'
})
export class TimerStoreService implements OnDestroy {

    private stateSubject = new BehaviorSubject<TimerState>({
        durationMs: DEFAULT_DURATION_MS,
        remainingMs: DEFAULT_DURATION_MS,
        status: 'idle',
        updatedAt: Date.now()
    });
    state$ = this.stateSubject.asObservable();

    private tickerSub?: Subscription;

    /** último instante aplicado; evita retrocesos al aplicar remotos */
    private lastAppliedTs = Date.now();

    get snapshot(): TimerState {
        return this.stateSubject.getValue();
    }

    setDuration(durationMs: number, controllerId?: string): void {
        const safeDuration = Math.max(0, durationMs);
        this.stopTicker();
        const nextState: TimerState = {
            durationMs: safeDuration,
            remainingMs: safeDuration,
            status: 'idle',
            updatedAt: Date.now(),
            controllerId
        };
        this.lastAppliedTs = nextState.updatedAt;
        this.stateSubject.next(nextState);
    }

    reset(controllerId?: string): void {
        const { durationMs } = this.snapshot;
        this.stopTicker();
        const now = Date.now();
        this.lastAppliedTs = now;
        this.stateSubject.next({
            durationMs,
            remainingMs: durationMs,
            status: 'idle',
            updatedAt: now,
            controllerId
        });
    }

    start(controllerId?: string): void {
        if (this.snapshot.status === 'running') return;
        this.stopTicker();
        const now = Date.now();
        this.lastAppliedTs = now;
        this.stateSubject.next({
            ...this.snapshot,
            status: 'running',
            updatedAt: now,
            controllerId
        });
        this.tickerSub = interval(1000).subscribe(() => this.handleTick(controllerId));
    }

    pause(controllerId?: string): void {
        if (this.snapshot.status !== 'running') return;
        this.stopTicker();
        const now = Date.now();
        this.lastAppliedTs = now;
        this.stateSubject.next({
            ...this.snapshot,
            status: 'idle',
            updatedAt: now,
            controllerId
        });
    }

    /** aplica un estado remoto sólo si es más nuevo que el último aplicado */
    applyRemote(state: Partial<TimerState>): void {
        const remoteTs = state.updatedAt ?? 0;
        if (remoteTs <= this.lastAppliedTs) return;

        this.stopTicker();
        const next: TimerState = {
            durationMs: state.durationMs ?? this.snapshot.durationMs,
            remainingMs: state.remainingMs ?? this.snapshot.remainingMs,
            status: state.status ?? this.snapshot.status,
            updatedAt: remoteTs,
            controllerId: state.controllerId ?? this.snapshot.controllerId
        };
        this.lastAppliedTs = remoteTs;
        this.stateSubject.next(next);

        if (next.status === 'running') {
            this.start(next.controllerId);
        }
    }

    private handleTick(controllerId?: string): void {
        const remaining = Math.max(0, this.snapshot.remainingMs - 1000);
        const now = Date.now();
        const status: TimerStatus = remaining === 0 ? 'finished' : 'running';

        this.lastAppliedTs = now;
        this.stateSubject.next({
            ...this.snapshot,
            remainingMs: remaining,
            status,
            updatedAt: now,
            controllerId
        });

        if (status === 'finished') {
            this.stopTicker();
        }
    }

    private stopTicker(): void {
        if (this.tickerSub) {
            this.tickerSub.unsubscribe();
            this.tickerSub = undefined;
        }
    }

    ngOnDestroy(): void {
        this.stopTicker();
    }
}
