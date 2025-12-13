
import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Asociacion, AsociacionesResponse, AsociacionesService, SesionesService, Session, SessionsResponse } from '../../../api';
import { ChoreService } from '../../services/chore.service';

export type TypeSelector = 'session' | 'asociacion';
export type AsociacionStatusFilter = 'all' | 'active' | 'inactive';
export type SessionStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selector.component.html',
  styleUrl: './selector.component.scss'
})
export class SelectorComponent implements OnChanges {

  @Input() type: TypeSelector = 'session';
  @Input() asociacionStatus: AsociacionStatusFilter = 'all';
  @Input() sessionStatus: SessionStatusFilter = 'all';

  loading: boolean = true;
  sessionsReady: boolean = false;
  asociacionesReady: boolean = false;

  sessions: Session[] = [];
  sessionsFiltered: Session[] = [];
  asociaciones: Asociacion[] = [];
  asociacionesFiltered: Asociacion[] = [];
  selectedSession: Session | null = null;
  selectedAsociacion: Asociacion | null = null;

  selectedAsociacionId: string = '';
  selectedSessionId: string = '';

  ngOnInit() {
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['asociacionStatus'] && !changes['asociacionStatus'].firstChange) {
      this.applyAsociacionFilter();
      this.syncSelectedAsociacion();
    }
    if (changes['sessionStatus'] && !changes['sessionStatus'].firstChange) {
      this.applySessionFilter();
    }
  }

  loadData() {
    if (this.isAsociacion()) {
      this.selectedAsociacionId = this.cookieService.get('asociacion') || '';
      this.loadDataAsociaciones();
    } else if (this.isSession()) {
      this.selectedSessionId = this.cookieService.get('session') || '';
      this.loadDataSessions();
    }
  }

  async loadDataAsociaciones() {
    this.choreService.sessionSelectedObservable.subscribe((res: Session | null) => {
      if (res !== null) {
        this.choreService.setAsociacionSelected(this.selectedAsociacion);
        this.sessionsService.getSession(res.id!).subscribe(sessionData => {
          this.asociaciones = sessionData.session?.participants || [];
          this.applyAsociacionFilter();
          this.syncSelectedAsociacion();
          this.loading = false;
          this.asociacionesReady = true;
        })
      }
    })
    this.asociacionsService.getAllAsociaciones().subscribe((res: AsociacionesResponse) => {
      if (res.status?.code === '200') {
        this.asociaciones = res.participants || [];
        this.applyAsociacionFilter();
        this.syncSelectedAsociacion();
        this.asociacionesReady = true;
        this.loading = false;
      }
    })
  }

  loadDataSessions() {
    this.sessionsService.getAllSessions().subscribe((res: SessionsResponse) => {
      if (res.status?.code === '200') {
        this.sessions = res.sessions || [];
        this.applySessionFilter();
        if (Boolean(this.selectedSessionId)) {
          this.selectedSession = this.sessions.find(sesion => sesion.id?.toString() === this.selectedSessionId)!;
          this.choreService.setSessionSelected(this.selectedSession);
        }
        this.loading = false;
        this.sessionsReady = true;
      }
    })
  }

  constructor(
    private sessionsService: SesionesService,
    private asociacionsService: AsociacionesService,
    private choreService: ChoreService,
    private cookieService: CookieService
  ) { }

  isAsociacion(): boolean {
    return this.type === 'asociacion';
  }

  isSession(): boolean {
    return this.type === 'session';
  }

  onSelect(item: Session | Asociacion) {
    if (this.isAsociacion()) {
      this.selectedAsociacion = item;
      this.selectedAsociacionId = item.id || '';
      this.choreService.setAsociacionSelected(this.selectedAsociacion);
    } else if (this.isSession()) {
      this.selectedSession = item;
      this.choreService.setSessionSelected(this.selectedSession);
    }
  }

  private applyAsociacionFilter() {
    const matchesStatus = (asociacion: Asociacion) => {
      if (this.asociacionStatus === 'all') return true;
      const isActive = this.isAsociacionActive(asociacion);
      return this.asociacionStatus === 'active' ? isActive : !isActive;
    };
    this.asociacionesFiltered = this.asociaciones.filter(matchesStatus);
  }

  private isAsociacionActive(asociacion: Asociacion): boolean {
    const value = (asociacion as any)?.active;
    if (value === undefined || value === null) return true;
    return value === true || value === 1 || value === '1';
  }

  private syncSelectedAsociacion() {
    if (this.selectedAsociacionId) {
      this.selectedAsociacion = this.asociacionesFiltered.find(asociacion => asociacion.id === this.selectedAsociacionId) || null;
    }
    if (!this.selectedAsociacion) {
      this.selectedAsociacionId = '';
    }
    this.choreService.setAsociacionSelected(this.selectedAsociacion);
  }

  private applySessionFilter() {
    const matchesStatus = (session: Session) => {
      if (this.sessionStatus === 'all') return true;
      const isActive = this.isSessionActive(session);
      return this.sessionStatus === 'active' ? isActive : !isActive;
    };
    this.sessionsFiltered = this.sessions.filter(matchesStatus);
  }

  private isSessionActive(session: Session): boolean {
    const value = (session as any)?.active;
    if (value === undefined || value === null) return true;
    return value === true || value === 1 || value === '1';
  }
}
