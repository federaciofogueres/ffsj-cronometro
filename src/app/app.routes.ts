import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { ConfirmRegistrationComponent } from './components/confirm-registration/confirm-registration.component';
import { LoginComponent } from './components/login/login.component';
import { TimerComponent } from './components/timer/timer.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: TimerComponent },
    { path: 'validar', component: ConfirmRegistrationComponent, canActivate: [AuthGuard] },
    { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginComponent },
    { path: '**', component: TimerComponent },
];
