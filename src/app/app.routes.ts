import { Routes } from '@angular/router';
import { AdminComponent } from './components/admin/admin.component';

export const routes: Routes = [
    // { path: '', component: HomeComponent, canActivate: [AuthGuard] },
    // { path: 'formulario', component: FormularioComponent, canActivate: [AuthGuard] },
    { path: 'admin', component: AdminComponent },
    { path: '**', component: AdminComponent },
    // { path: 'login', component: LoginComponent },
    // { path: '**', component: HomeComponent, canActivate: [AuthGuard] },
];
