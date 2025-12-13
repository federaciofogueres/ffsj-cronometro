import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Asociacion } from '../../../api';

export interface AsociacionOrderData {
  asociaciones: Asociacion[];
}

export interface AsociacionOrderResult {
  action: 'save' | 'cancel';
  asociaciones?: Asociacion[];
}

@Component({
  selector: 'app-asociacion-order-dialog',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatDialogModule],
  templateUrl: './asociacion-order-dialog.component.html',
  styleUrl: './asociacion-order-dialog.component.scss'
})
export class AsociacionOrderDialogComponent {

  asociaciones: Asociacion[] = [];

  constructor(
    private dialogRef: MatDialogRef<AsociacionOrderDialogComponent, AsociacionOrderResult>,
    @Inject(MAT_DIALOG_DATA) public data: AsociacionOrderData
  ) {
    this.asociaciones = [...(data.asociaciones || [])];
  }

  drop(event: CdkDragDrop<Asociacion[]>) {
    moveItemInArray(this.asociaciones, event.previousIndex, event.currentIndex);
  }

  cancel() {
    this.dialogRef.close({ action: 'cancel' });
  }

  save() {
    const ordered = this.asociaciones.map((a, idx) => ({ ...a, order: idx + 1 }));
    this.dialogRef.close({ action: 'save', asociaciones: ordered });
  }
}
