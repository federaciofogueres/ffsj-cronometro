import { TestBed } from '@angular/core/testing';
import { TimerMarksService } from './timer-marks.service';

describe('TimerMarksService', () => {
    let service: TimerMarksService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimerMarksService);
        localStorage.clear();
    });

    it('should persist and retrieve entry mark by context', () => {
        service.saveMark('entry', { min: 2, sec: 15 }, 'session-1', 'assoc-1');
        const stored = service.getMark('entry', 'session-1', 'assoc-1');
        expect(stored?.value).toBe('02:15');
    });

    it('should not collide marks with different contexts', () => {
        service.saveMark('entry', { min: 1, sec: 5 }, 'A', 'B');
        service.saveMark('entry', { min: 0, sec: 45 }, 'A', 'C');

        const first = service.getMark('entry', 'A', 'B');
        const second = service.getMark('entry', 'A', 'C');

        expect(first?.value).toBe('01:05');
        expect(second?.value).toBe('00:45');
    });
});
