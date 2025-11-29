import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './componentes/navbar/navbar.component';
import { FooterComponent } from "./componentes/footer/footer.component";
import { ContenidoComponent } from './componentes/contenido/contenido.component';
import { Error404Component } from './componentes/error404/error404.component';
import { CommonModule } from '@angular/common';  // ✅ Importar CommonModule

@Component({
  selector: 'app-root', 
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, ContenidoComponent, Error404Component],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'deepcardio';
  showContenido = true;
  ocultarNavbar = false;

  constructor(private router: Router) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showContenido = !event.url.includes( '/error404'); // Ocultar contenido si estamos en error404
        this.ocultarNavbar = event.url.includes('/Dashboard'); // Ocultar Navbar solo en Dashboard
      }
    });
  }

}
