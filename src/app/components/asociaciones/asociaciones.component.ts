import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormBuilder } from '@angular/forms';
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
    CommonModule
  ],
  templateUrl: './asociaciones.component.html',
  styleUrl: './asociaciones.component.scss'
})
export class AsociacionesComponent {

  associations: Asociacion[] = [];
  @Input() view: ViewFormat = 'list';
  loading: boolean = true;

  asociacionSelected: Asociacion | null = null;

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

}
