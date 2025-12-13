import { Injectable } from '@angular/core';
import { Timer } from './timer.service';

type MarkType = 'entry' | 'exit';

interface StoredMark {
    value: string;
    savedAt: number;
}

@Injectable({
    providedIn: 'root'
})
export class TimerMarksService {

    private buildKey(sessionId?: string, associationId?: string, type: MarkType = 'entry'): string {
        const sessionPart = sessionId || 'defaultSession';
        const assocPart = associationId || 'defaultAssociation';
        return `timer-mark:${type}:${sessionPart}:${assocPart}`;
    }

    saveMark(type: MarkType, timer: Timer, sessionId?: string, associationId?: string): StoredMark {
        const value = `${timer.min.toString().padStart(2, '0')}:${timer.sec.toString().padStart(2, '0')}`;
        const mark: StoredMark = {
            value,
            savedAt: Date.now()
        };
        const key = this.buildKey(sessionId, associationId, type);
        try {
            localStorage.setItem(key, JSON.stringify(mark));
        } catch (e) {
            // no bloquear por fallos de almacenamiento
        }
        return mark;
    }

    getMark(type: MarkType, sessionId?: string, associationId?: string): StoredMark | null {
        const key = this.buildKey(sessionId, associationId, type);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.value === 'string') {
                return parsed as StoredMark;
            }
            return null;
        } catch {
            return null;
        }
    }
}
