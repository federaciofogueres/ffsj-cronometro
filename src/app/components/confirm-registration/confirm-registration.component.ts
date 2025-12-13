import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FfsjAlertService } from 'ffsj-web-components';
import { Asociacion, EmailItem, InlineResponse200, Session, SettingsService } from '../../../api';
import { ChoreService } from '../../services/chore.service';
import { TimerService, TimerStatus } from '../../services/timer.service';
import { TimerMarksService } from '../../services/timer-marks.service';
import { SignerComponent } from '../signer/signer.component';

@Component({
  selector: 'app-confirm-registration',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    SignerComponent
  ],
  templateUrl: './confirm-registration.component.html',
  styleUrl: './confirm-registration.component.scss'
})
export class ConfirmRegistrationComponent {

  @ViewChild(SignerComponent) signer?: SignerComponent;

  emailStatus = '';
  alertMessage = '';
  sending = false;

  calculatedSize = {
    width: 0,
    height: 0,
  }

  entryTimer: TimerStatus = {
    name: 'entryTimer',
    status: false,
    value: ''
  }

  exitTimer: TimerStatus = {
    name: 'exitTimer',
    status: false,
    value: ''
  }
  timers: TimerStatus[] = [];

  session: Session | null = null;
  asociacion: Asociacion | null = null;

  public registryForm!: FormGroup;

  ngOnInit() {
    this.choreService.sessionSelectedObservable.subscribe((res: Session | null) => {
      if (res !== null) {
        this.session = res;
        this.loadMarks();
      }
    })
    this.choreService.asociacionSelectedObservable.subscribe((res: Asociacion | null) => {
      if (res !== null) {
        this.asociacion = res;
        this.registryForm.controls['email'].setValue(this.asociacion.email);
        this.loadMarks();
      }
    })
  }

  constructor(
    private timerService: TimerService,
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private choreService: ChoreService,
    private alertService: FfsjAlertService,
    private router: Router,
    private timerMarksService: TimerMarksService
  ) {
    this.calculatedSize.width = window.innerWidth - 32;
    this.calculatedSize.height = window.innerHeight * 0.3;
    this.loadMarks();
    this.loadForm();
  }

  loadForm() {
    this.registryForm = this.fb.group({
      email: new FormControl('', [Validators.required, Validators.email]),
      entryTimer: new FormControl(this.entryTimer.value, Validators.required),
      exitTimer: new FormControl(this.exitTimer.value, Validators.required),
      sign: new FormControl('', Validators.required)
    });
  }

  sendEmail() {
    this.saveCanvas();
    if (this.registryForm.valid) {
      this.emailStatus = 'sending';
      this.alertMessage = `Enviando email a ${this.registryForm.controls['email'].value}`
      let body: EmailItem = {
        subject: 'Envío de resultados FFSJ',
        content: `
          <h1>XXXVII Certamen Artístico Fogueres de Sant Joan</h1>
          <h3>Sesión: ${this.session?.session_title}</h3>
          <h3>Asociación participante: ${this.asociacion?.title}</h3>
          <p>¡Hola! Este es un coreo automático generado por nuestro asistente virtual. El tiempo <strong>RESTANTE</strong> registrado por tu asociación han sido los siguientes:</p>
          <div style="display: flex;">
              <h3>Tiempo de entrada restante ${this.registryForm.controls['entryTimer'].value}</h3>
          </div>
          <div style="display: flex;">
              <h3>Tiempo de salida restante ${this.registryForm.controls['exitTimer'].value}</h3>
          </div>
  
          <h3>Un responsable de vuestra asociación ha firmado en la aplicación web constatando estar de acuerdo con los tiempos registrados. Aquí tenéis, como archivo adjunto, la firma.</h3>
  
          <h3>Nos vemos en la próxima! :)</h3>
        `,
        destine: this.registryForm.controls['email'].value,
        dataSesion: 'asd',
        sign: this.registryForm.controls['sign'].value
      }
      this.settingsService.sendEmail(body).subscribe((res: InlineResponse200) => {
        if (res.status?.code === '200') {
        this.emailStatus = 'sentOK';
        this.alertMessage = '¡Email enviado!';
        this.alertService.success(this.alertMessage);
        this.router.navigateByUrl('admin-crono');
      } else {
          this.emailStatus = 'sentKO';
          this.alertMessage = 'No se pudo enviar el email.';
          this.alertService.danger(this.alertMessage);
        }
      }, () => {
        this.emailStatus = 'sentKO';
        this.alertMessage = 'No se pudo enviar el email.';
        this.alertService.danger(this.alertMessage);
      })
    } else {
      this.emailStatus = 'sentKO';
      this.alertMessage = 'Hay datos que no han sido rellenados. Rellénalos!';
      this.alertService.warning(this.alertMessage);
    }
  }

  saveCanvas() {
    const dataCanvas = this.signer?.toDataURL() || '';
    this.registryForm.controls['sign'].setValue("<img src='" + dataCanvas + "' alt='from canvas'/>");
  }

  private loadMarks(): void {
    const entry = this.timerMarksService.getMark('entry', this.session?.id?.toString(), this.asociacion?.id?.toString());
    const exit = this.timerMarksService.getMark('exit', this.session?.id?.toString(), this.asociacion?.id?.toString());
    if (entry) {
      this.entryTimer.value = entry.value;
      if (this.registryForm) {
        this.registryForm.controls['entryTimer'].setValue(entry.value);
      }
    }
    if (exit) {
      this.exitTimer.value = exit.value;
      if (this.registryForm) {
        this.registryForm.controls['exitTimer'].setValue(exit.value);
      }
    }
  }
}
