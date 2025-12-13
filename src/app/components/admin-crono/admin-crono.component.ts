import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TimerService } from '../../services/timer.service';
import { SelectorComponent } from "../selector/selector.component";
import { TimerComponent } from '../timer/timer.component';
import { ChoreService } from '../../services/chore.service';
import { Asociacion, Session } from '../../../api';

export type TimerTitleType = 'entrada' | 'salida';
export type TimerMode = 'none' | 'simple' | 'entry_exit';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, TimerComponent, SelectorComponent, SelectorComponent],
  templateUrl: './admin-crono.component.html',
  styleUrl: './admin-crono.component.scss'
})
export class AdminCronoComponent {

  timerTitle: TimerTitleType = 'entrada';

  timerEntry = {
    min: 0,
    sec: 0
  }

  timerExit = {
    min: 0,
    sec: 0
  }

  ready: boolean = false;

  loading: boolean = true;
  timerMode: TimerMode = 'entry_exit';
  sendActive: boolean = true;
  currentAsociacion: Asociacion | null = null;
  currentSession: Session | null = null;
  showTimesTable: boolean = false;

  sessionTimes: Record<string, SessionTimeEntry[]> = {};

  ngOnInit() {
    this.timerService.setController(true);
    let appHeader = document.querySelector('app-header');
    ///appHeader?.remove();
    appHeader?.setAttribute('style', 'display: flex')
    this.loadStoredTimes();
    this.choreService.sessionSelectedObservable.subscribe(session => {
      this.currentSession = session;
      this.timerMode = (session as any)?.timerMode || 'entry_exit';
      this.sendActive = this.parseBooleanFlag((session as any)?.sendActive, true);
      if (this.timerMode !== 'entry_exit') {
        this.timerTitle = 'entrada';
      }
      this.ensureSessionTimes();
      this.updateReadyState();
    });
    this.choreService.asociacionSelectedObservable.subscribe(asociacion => {
      this.currentAsociacion = asociacion;
      this.updateReadyState();
    });
    this.loading = false;
  }

  constructor(
    public timerService: TimerService,
    private route: Router,
    private choreService: ChoreService
  ) {

  }

  resetTimer() {
    this.timerService.resetTimer();
  }

  changeTimer() {
    if (this.timerMode === 'entry_exit') {
      this.saveTimer();
      this.resetTimer();
      if (this.timerTitle === 'entrada') {
        this.timerTitle = 'salida';
      } else {
        this.timerTitle = 'entrada';
      }
    }
  }

  saveTimer() {
    if (this.timerMode === 'none') return;
    if (this.timerMode === 'simple' || this.timerTitle === 'entrada') {
      this.timerService.saveTimer('entryTime');
    } else {
      this.timerService.saveTimer('exitTime');
    }
  }

  goToConfirmation() {
    if (this.timerMode !== 'none') {
      this.saveTimer();
      this.resetTimer();
    }
    this.route.navigateByUrl('validar')
  }

  saveCurrentTimerForAssociation() {
    if (!this.currentAsociacion || !this.ready || this.timerMode === 'none') return;
    const timerString = this.timerService.formatTimer();
    const existingTimers = this.currentAsociacion.registeredTimers || [];
    const hasTimerAlready = existingTimers.includes(timerString);
    const updatedTimers = hasTimerAlready ? existingTimers : [...existingTimers, timerString];
    const updated: Asociacion = {
      ...this.currentAsociacion,
      registeredTimers: updatedTimers
    };
    this.currentAsociacion = updated;
    this.choreService.setAsociacionSelected(updated);
    this.addSessionTimeEntry(timerString);
    this.resetTimer();
  }

  toggleTimesTable() {
    this.showTimesTable = !this.showTimesTable;
  }

  private updateReadyState() {
    let sessionSelected = false;
    let asociacionSelected = false;
    this.choreService.sessionSelectedObservable.subscribe(s => sessionSelected = !!s?.id).unsubscribe();
    this.choreService.asociacionSelectedObservable.subscribe(a => asociacionSelected = !!a?.id).unsubscribe();
    this.ready = sessionSelected && asociacionSelected;
  }

  get showTimer(): boolean {
    return this.timerMode !== 'none';
  }

  get isEntryExit(): boolean {
    return this.timerMode === 'entry_exit';
  }

  get isSimple(): boolean {
    return this.timerMode === 'simple';
  }

  private parseBooleanFlag(value: any, defaultValue: boolean = true): boolean {
    if (value === undefined || value === null) return defaultValue;
    return value === true || value === 1 || value === '1';
  }

  get currentSessionId(): string | null {
    return this.currentSession?.id || null;
  }

  private ensureSessionTimes() {
    const id = this.currentSessionId;
    if (!id) return;
    if (!this.sessionTimes[id]) {
      this.sessionTimes[id] = [];
    }
  }

  private addSessionTimeEntry(time: string) {
    const sessionId = this.currentSessionId;
    if (!sessionId || !this.currentAsociacion) return;
    const entry: SessionTimeEntry = {
      associationId: this.currentAsociacion.id || '',
      associationTitle: this.currentAsociacion.title,
      time,
      savedAt: Date.now(),
      timerMode: this.timerMode
    };
    this.ensureSessionTimes();
    const existingIndex = this.sessionTimes[sessionId].findIndex(e => e.associationId === entry.associationId && e.time === entry.time);
    if (existingIndex !== -1) {
      this.sessionTimes[sessionId][existingIndex] = entry;
    } else {
      this.sessionTimes[sessionId].push(entry);
    }
    this.persistStoredTimes();
  }

  private loadStoredTimes() {
    try {
      const raw = localStorage.getItem('ffsj-session-times');
      if (raw) {
        this.sessionTimes = JSON.parse(raw);
      }
    } catch {
      this.sessionTimes = {};
    }
  }

  private persistStoredTimes() {
    try {
      localStorage.setItem('ffsj-session-times', JSON.stringify(this.sessionTimes));
    } catch {
      // ignore storage errors
    }
  }
}

interface SessionTimeEntry {
  associationId: string;
  associationTitle?: string;
  time: string;
  savedAt: number;
  timerMode: TimerMode;
}
