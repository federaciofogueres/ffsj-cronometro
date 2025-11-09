import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Asociacion, AsociacionesResponse, AsociacionesService } from '../../../api';
import { AsociacionComponent } from '../asociacion/asociacion.component';

export type ViewFormat = 'list' | 'component';

@Component({
  selector: 'app-asociaciones',
  standalone: true,
  imports: [
    AsociacionComponent,
    MatIconModule,
    CommonModule,
    FormsModule
  ],
  templateUrl: './asociaciones.component.html',
  styleUrl: './asociaciones.component.scss'
})
export class AsociacionesComponent {

  associations: Asociacion[] = [];
  @Input() view: ViewFormat = 'list';
  loading: boolean = true;

  asociacionSelected: Asociacion | null = null;

  // filtro y paginación
  filterText: string = '';
  pageSize: number = 10;
  currentPage: number = 1;

  constructor(
    private associationService: AsociacionesService,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loadAssociations();
  }

  loadAssociations(): void {
    this.associationService.getAllAsociaciones().subscribe((associations: AsociacionesResponse) => {
      this.associations = associations.participants!.sort((a, b) => {
        if (!a.title || !b.title) return 0;
        return a.title.localeCompare(b.title);
      });
      this.resetPagination();
      this.loading = false;
    });
  }

  changeView(association?: Asociacion) {
    if (this.view === 'component') {
      this.loadAssociations();
      this.view = 'list';
    } else if (this.view === 'list') {
      this.viewAssociation(association!)
      this.view = 'component'
    }
  }

  viewAssociation(association: Asociacion): void {
    this.asociacionSelected = association;
  }

  // filtro computado
  get filteredAssociations(): Asociacion[] {
    const q = (this.filterText || '').trim().toLowerCase();
    if (!q) return this.associations;
    return this.associations.filter(a => (a.title || '').toLowerCase().includes(q));
  }

  // paginación computada
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredAssociations.length / this.pageSize));
  }

  get pagedAssociations(): Asociacion[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredAssociations.slice(start, start + this.pageSize);
  }

  onFilterChange(): void {
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

}
