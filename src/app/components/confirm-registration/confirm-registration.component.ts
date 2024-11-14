import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FfsjAlertService } from 'ffsj-web-components';
import { Asociacion, EmailItem, InlineResponse200, Session, SettingsService } from '../../../api';
import { ChoreService } from '../../services/chore.service';
import { TimerService, TimerStatus } from '../../services/timer.service';
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

  emailStatus = '';
  alertMessage = '';

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
      }
    })
    this.choreService.asociacionSelectedObservable.subscribe((res: Asociacion | null) => {
      if (res !== null) {
        this.asociacion = res;
        this.registryForm.controls['email'].setValue(this.asociacion.email);
      }
    })
  }

  constructor(
    private timerService: TimerService,
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private choreService: ChoreService,
    private alertService: FfsjAlertService,
    private router: Router
  ) {
    this.calculatedSize.width = window.innerWidth - 32;
    this.calculatedSize.height = window.innerHeight * 0.3;
    for (let timer of this.timerService.timers) {
      if (timer.name === 'entryTime') {
        this.entryTimer = timer;
      } else if (timer.name === 'exitTime') {
        this.exitTimer = timer;
      }
    }
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
          <h1>XXXVI Certamen Artístico Fogueres de Sant Joan</h1>
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
          this.router.navigateByUrl('admin');
        } else {
          this.emailStatus = 'sentKO';
          this.alertMessage = 'No se pudo enviar el email.';
          this.alertService.danger(this.alertMessage);
        }
      })
    } else {
      this.emailStatus = 'sentKO';
      this.alertMessage = 'Hay datos que no han sido rellenados. Rellénalos!';
      this.alertService.warning(this.alertMessage);
    }
  }

  saveCanvas() {
    var canvas = document.getElementsByTagName('app-signer').item(0)?.children[0] as HTMLCanvasElement
    var dataCanvas = canvas.toDataURL("image/png");
    this.registryForm.controls['sign'].setValue("<img src='" + dataCanvas + "' alt='from canvas'/>");
  }
}
