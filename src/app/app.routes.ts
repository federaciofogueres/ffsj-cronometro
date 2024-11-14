import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { AsociacionesComponent } from './components/asociaciones/asociaciones.component';
import { ConfirmRegistrationComponent } from './components/confirm-registration/confirm-registration.component';
import { LoginComponent } from './components/login/login.component';
import { SesionesComponent } from './components/sesiones/sesiones.component';
import { TimerFullscreenComponent } from './components/timer-fullscreen/timer-fullscreen.component';
import { TimerComponent } from './components/timer/timer.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: TimerFullscreenComponent },
    { path: 'sesiones', component: SesionesComponent },
    { path: 'asociaciones', component: AsociacionesComponent },
    { path: 'timer', component: TimerFullscreenComponent },
    { path: 'validar', component: ConfirmRegistrationComponent, canActivate: [AuthGuard] },
    { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginComponent },
    { path: '**', component: TimerComponent },
];
