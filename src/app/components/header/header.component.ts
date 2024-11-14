import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from 'ffsj-web-components';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    CommonModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  sidenavOpen = false;

  constructor(private router: Router, protected authService: AuthService) { }

  openNav() {
    this.sidenavOpen = true;
  }

  closeNav() {
    this.sidenavOpen = false;
  }

  navigateTo(route: string) {
    this.router.navigateByUrl(route);
    this.closeNav();
  }
}