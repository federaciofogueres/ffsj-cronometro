import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimerService } from '../../services/timer.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {

  // propiedades vinculadas al editor
  initialMin: number = 3;
  initialSec: number = 30;

  constructor(private timerService: TimerService) { }

  /**
   * Establece el valor inicial del timer en toda la app.
   * Usa setInitialTimer para que resetTimer utilice este valor.
   */
  setInitialTimer(): void {
    const min = Math.max(0, Number(this.initialMin) || 0);
    const sec = Math.min(59, Math.max(0, Number(this.initialSec) || 0));

    // llama al método específico que guarda initialTimer y persiste las claves 'initialMinutes'/'initialSeconds'
    this.timerService.setInitialTimer({ min, sec });

    // opcional: aplicar inmediatamente la configuración como timer actual:
    // this.timerService.resetTimer();
  }

}
