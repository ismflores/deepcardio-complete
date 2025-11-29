import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  menuOpen = false;
  isScrolled = false;

  constructor(private router: Router) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    // Bloquear scroll cuando el menú está abierto
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  irAIniciarSesion() {
    this.router.navigate(['/IniciarSesion']);
    this.menuOpen = false;
    document.body.style.overflow = ''; // Restaurar scroll
  }

  irAInicio() {
    this.router.navigate(['/Inicio']);
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  irAQueEs() {
    this.router.navigate(['/QueEs']);
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  irAContacto() {
    this.router.navigate(['/Contacto']);
    this.menuOpen = false;
    document.body.style.overflow = '';
  }
}