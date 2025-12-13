import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Asociacion, AsociacionesResponse, AsociacionesService, SesionesService, Session } from '../../../api';
import { ChoreService } from '../../services/chore.service';

export interface AsociacionCheck {
  id: string;
  title: string;
  checked: boolean;
  active?: boolean;
}
@Component({
  selector: 'app-participantes',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    FormsModule
  ],
  templateUrl: './participantes.component.html',
  styleUrl: './participantes.component.scss'
})
export class ParticipantesComponent {

  @Output() asociacionChecked: EventEmitter<Asociacion> = new EventEmitter<{}>;

  asociaciones: Asociacion[] = [];
  asociacionesShow: AsociacionCheck[] = [];
  loading: boolean = true;

  @Input() session: Session = {};

  // filtro y paginación
  filterText: string = '';
  pageSize: number = 10;
  currentPage: number = 1;
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  constructor(
    private asociacionesService: AsociacionesService,
    private sessionService: SesionesService,
    private choreService: ChoreService
  ) { }

  ngOnInit() {
    this.loadAsociacionesData();
  }

  loadAsociacionesFromSession() {
    this.choreService.asociacionesSelectedsObservable.subscribe((asociaciones: Asociacion[]) => {
      if (asociaciones.length > 0) {
        this.asociacionesShow.map((asociacionShow: AsociacionCheck) => {
          const index = asociaciones.findIndex(asoc => asoc.id === asociacionShow.id);
          if (index !== -1) {
            asociacionShow.checked = true;
          }
        })
        // ordenar para mostrar primero los checked = true
        this.sortAsociacionesShow();
      }
      this.loading = false;
    })
  }

  loadAsociacionesData() {
    this.asociacionesService.getAllAsociaciones().subscribe((asociaciones: AsociacionesResponse) => {
      if (asociaciones.status?.code === '200') {
        this.asociaciones = asociaciones.participants!.sort((a, b) => {
          if (!a.title || !b.title) return 0;
          return a.title.localeCompare(b.title);
        });
        asociaciones.participants?.map(asociacion => {
          const isActive = this.isAsociacionActive(asociacion);
          this.asociacionesShow.push({ id: asociacion.id!, title: asociacion.title!, checked: false, active: isActive });
        })
        // se suscribe y marcará checked; la ordenación final se realiza en loadAsociacionesFromSession()
        this.loadAsociacionesFromSession();
        this.resetPagination();
      }
    })
  }

  /**
   * Ordena asociacionesShow para que los elementos con checked === true aparezcan primero.
   * Dentro de cada grupo mantiene orden por title.
   */
  private sortAsociacionesShow(): void {
    this.asociacionesShow.sort((a, b) => {
      if (a.checked === b.checked) {
        return (a.title || '').localeCompare(b.title || '');
      }
      return a.checked ? -1 : 1;
    });
  }

  checkAsociacion(asociacion: AsociacionCheck) {
    asociacion.checked = !asociacion.checked;
    const asociacionFind = this.asociaciones.find(asociacionData => asociacion.id === asociacionData.id);
    this.choreService.addAsociacionesSelected(asociacionFind!)
  }

  // filtro computado sobre asociacionesShow
  get filteredAsociacionesShow(): AsociacionCheck[] {
    const q = (this.filterText || '').trim().toLowerCase();
    const matchesSearch = (a: AsociacionCheck) => !q || (a.title || '').toLowerCase().includes(q);
    const matchesStatus = (a: AsociacionCheck) => {
      if (this.statusFilter === 'all') return true;
      const isActive = this.isActiveFlag(a.active);
      return this.statusFilter === 'active' ? isActive : !isActive;
    };
    return this.asociacionesShow.filter(a => matchesSearch(a) && matchesStatus(a));
  }

  // paginación computada
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAsociacionesShow.length / this.pageSize));
  }

  get pagedAsociaciones(): AsociacionCheck[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAsociacionesShow.slice(start, start + this.pageSize);
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  private isAsociacionActive(asociacion: Asociacion): boolean {
    const value = (asociacion as any)?.active;
    if (value === undefined || value === null) return true;
    return value === true || value === 1 || value === '1';
  }

  private isActiveFlag(active?: boolean | number | string): boolean {
    if (active === undefined || active === null) return true;
    return active === true || active === 1 || active === '1';
  }

}
