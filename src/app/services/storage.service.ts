import { inject, Injectable } from '@angular/core';
import { child, Database, get, ref, update } from '@angular/fire/database';
import { Timer } from './timer.service';

@Injectable({
    providedIn: 'root'
})
export class FirebaseStorageService {

    private _database = inject(Database);

    constructor() { }

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
        await update(dbRef, timer);
    }

}