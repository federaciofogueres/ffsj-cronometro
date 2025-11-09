// ...existing code...
import { inject, Injectable } from '@angular/core';
import { child, Database, get, onValue, ref, update } from '@angular/fire/database';
import { serverTimestamp } from 'firebase/database';

import { Observable, Subject } from 'rxjs';
import { Timer } from './timer.service';

@Injectable({
    providedIn: 'root'
})
export class FirebaseStorageService {

    private _database = inject(Database);

    constructor(
    ) { }

    getRealtimeTimer(): Observable<Timer> {
        const timerSubject = new Subject<Timer>();
        const dbRef = ref(this._database, 'timer');
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                timerSubject.next(snapshot.val() as Timer);
            } else {
                console.error('No data available');
            }
        });
        return timerSubject.asObservable();
    }

    async getTimerValues() {
        const dbRef = ref(this._database);
        const snapshot = await get(child(dbRef, 'timer'));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log("No data available");
            return null;
        }
    }

    async getTimer(): Promise<{ min: number, sec: number } | null> {
        const timerValues = await this.getTimerValues();
        if (timerValues) {
            return {
                min: timerValues.min,
                sec: timerValues.sec
            };
        } else {
            return null;
        }
    }

    async updateTimer(timer: Timer): Promise<void> {
        const dbRef = ref(this._database, 'timer');
        // Use server timestamp for updatedAt to avoid relying on client clocks.
        const payload: any = { ...timer, updatedAt: serverTimestamp() };
        await update(dbRef, payload);
    }

}