import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  constructor(private router: Router) {}

  // Métodos para navegación si se necesita funcionalidad adicional
  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  // Método para manejar clicks en redes sociales
  openSocialMedia(url: string) {
    // Aquí puedes implementar lógica para abrir redes sociales
    console.log('Abriendo:', url);
    // window.open(url, '_blank');
  }
}