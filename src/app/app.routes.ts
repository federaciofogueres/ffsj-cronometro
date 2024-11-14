import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';
import { LoginComponent } from './components/login/login.component';
import { TimerComponent } from './components/timer/timer.component';

export const routes: Routes = [
    { path: '', component: TimerComponent },
    // { path: 'formulario', component: FormularioComponent, canActivate: [AuthGuard] },
    { path: 'admin', component: AdminComponent },
    { path: 'login', component: LoginComponent },
    { path: '**', component: TimerComponent },
    // { path: '**', component: HomeComponent, canActivate: [AuthGuard] },
];
