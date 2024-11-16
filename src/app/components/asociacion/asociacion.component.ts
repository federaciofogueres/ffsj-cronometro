import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { Asociacion, AsociacionesService, InlineResponse200 } from '../../../api';
import { CensoService } from '../../services/censo.service';
import { ResponseAsociaciones } from '../../services/external-api/external-api';

export type Action = 'Crear' | 'Editar';

@Component({
  selector: 'app-asociacion',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    CommonModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './asociacion.component.html',
  styleUrl: './asociacion.component.scss'
})
export class AsociacionComponent {
  @Input() association!: Asociacion;
  @Output() onBack: EventEmitter<void> = new EventEmitter();

  public newAssociationForm!: FormGroup;
  loading: boolean = true;
  action: Action = 'Crear';

  asociaciones: any[] = [];

  ngOnInit() {
    this.loadData();
  }

  constructor(
    private fb: FormBuilder,
    private associationService: AsociacionesService,
    private censoService: CensoService,
    private router: Router
  ) { }

  async loadData() {
    if (!Boolean(this.association)) {
      console.log('No existe')
      this.association = {
        id: '',
        title: '',
        email: ''
      }
      this.action = 'Crear'
    } else {
      this.action = 'Editar';
    }
    await this.loadAsociaciones();
    this.loadForm();
  }

  loadAsociaciones() {
    return new Promise((resolve, reject) => {
      this.censoService.asociacionesGet().subscribe({
        next: (res: ResponseAsociaciones) => {
          this.asociaciones = res.asociaciones!.filter(asociacion => asociacion['tipo_asociacion'] === 2);
          resolve(true);
        }
      })
    })
  }

  loadForm() {
    this.newAssociationForm = this.fb.group({
      id: new FormControl(this.association.id, []),
      email: new FormControl(this.association.email, [Validators.required, Validators.email]),
      title: new FormControl(this.association.title, []),
      asociacion: new FormControl('', [Validators.required])
    });
    if (this.action === 'Editar') {
      this.newAssociationForm.controls['asociacion'].disable();
    }
    this.loading = false;
  }

  asociacionSelected(event: any) {
    this.newAssociationForm.controls['id'].setValue(event.value.id);
    this.newAssociationForm.controls['title'].setValue(event.value.nombre);
    if(this.action === 'Editar') {
      this.associationService.getAsociacion(event.value.id).subscribe((res: any) => {
        if (res.status?.code === '200') {
          this.newAssociationForm.controls['email'].setValue(res['session']?.email);
        }
      })
    } else {
      this.newAssociationForm.controls['email'].setValue(event.value.email);
      this.newAssociationForm.controls['title'].disable();
    }
  }

  processAction() {
    if (this.newAssociationForm.valid) {
      let association: Asociacion = {
        id: this.newAssociationForm.controls['id'].value,
        email: this.newAssociationForm.controls['email'].value,
        title: this.newAssociationForm.controls['title'].value
      }
      console.log(this.newAssociationForm, association);
      if (this.action === 'Crear') {
        this.createAssociation(association);
      } else if (this.action === 'Editar') {
        this.updateAssociation(association);
      }
    } else {
      console.log('Error en el form -> ', this.newAssociationForm)
    }
  }

  createAssociation(association: Asociacion): void {
    association.id = association.id?.toString();
    this.associationService.createAsociacion(association).subscribe((res: InlineResponse200) => {
      console.log(res)
      if (res.status?.code === '200') {
        this.back();
      } else {
        console.log('Error');
      }
    });
  }

  updateAssociation(association: Asociacion): void {
    console.log('Update not implemented. -> ', association);
    this.associationService.putAsociacion(association.id!, association).subscribe((res: InlineResponse200) => {
      if (res.status?.code === '200') {
        this.back();
      } else {
        console.log('Error');
      }
    })
  }

  deleteAssociation(id: string): void {
    this.associationService.deleteAsociacion(id).subscribe((res: InlineResponse200) => {
      if (res.status?.code === '200') {
        this.back();
      } else {
        console.log('Error');
      }
    })
  }

  back() {
    this.onBack.emit();
  }
}
