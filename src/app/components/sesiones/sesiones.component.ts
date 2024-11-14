import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SesionesService, Session, SessionsResponse } from '../../../api';
import { SesionComponent } from '../sesion/sesion.component';

export type ViewFormat = 'list' | 'component';
@Component({
  selector: 'app-sesiones',
  standalone: true,
  imports: [
    SesionComponent,
    CommonModule,
    MatIconModule
  ],
  templateUrl: './sesiones.component.html',
  styleUrl: './sesiones.component.scss'
})
export class SesionesComponent {
  sessions: Session[] = [];
  @Input() view: ViewFormat = 'list';
  loading: boolean = true;

  sessionSelected: Session | null = null;

  constructor(
    private sessionService: SesionesService,
  ) { }

  ngOnInit(): void {
    this.loadAssociations();
  }

  loadAssociations(): void {
    this.sessionService.getAllSessions().subscribe((sessions: SessionsResponse) => {
      if (sessions.status?.code === '200') {
        this.sessions = sessions.sessions!;
        this.loading = false;
      }
    });
  }

  changeView(session?: Session) {
    if (this.view === 'component') {
      this.loadAssociations();
      this.view = 'list';
    } else if (this.view === 'list') {
      this.viewAssociation(session!)
      this.view = 'component'
    }
  }

  viewAssociation(session: Session): void {
    this.sessionSelected = session;
  }

}
