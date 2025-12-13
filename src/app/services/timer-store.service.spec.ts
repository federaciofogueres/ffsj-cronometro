import { TestBed } from '@angular/core/testing';
import { fakeAsync, tick } from '@angular/core/testing';
import { TimerStoreService } from './timer-store.service';

describe('TimerStoreService', () => {
    let service: TimerStoreService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(TimerStoreService);
    });

    it('should start and decrease remaining time each second', fakeAsync(() => {
        service.setDuration(10_000);
        service.start('test');

        tick(1000);
        expect(service.snapshot.remainingMs).toBe(9000);

        tick(9000);
        expect(service.snapshot.remainingMs).toBe(0);
        expect(service.snapshot.status).toBe('finished');
    }));

    it('should pause and keep remaining time', fakeAsync(() => {
        service.setDuration(5000);
        service.start('test');
        tick(2000);
        service.pause('test');
        const remainingAfterPause = service.snapshot.remainingMs;

        tick(3000);
        expect(service.snapshot.remainingMs).toBe(remainingAfterPause);
        expect(service.snapshot.status).toBe('idle');
    }));

    it('should reset to initial duration', fakeAsync(() => {
        service.setDuration(8000);
        service.start('test');
        tick(3000);
        service.reset('test');

        expect(service.snapshot.remainingMs).toBe(8000);
        expect(service.snapshot.status).toBe('idle');
    }));
});
