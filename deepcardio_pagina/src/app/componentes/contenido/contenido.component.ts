import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contenido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contenido.component.html',
  styleUrls: ['./contenido.component.css']
})
export class ContenidoComponent {
  email: string = '';
  mensaje: string = '';
  tipoMensaje: 'exito' | 'error' | '' = '';

  constructor(private router: Router) {}

  // Navegación
  irAIniciarSesion() {
    this.router.navigate(['/IniciarSesion']);
  }

  irARegistrarse() {
    this.router.navigate(['/Registrarse']);
  }

  irAQuees() {
    this.router.navigate(['/QueEs']);
  }

  // Validación de email
  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Manejo del formulario
  handleNotify() {
    if (this.email && this.validateEmail(this.email)) {
      this.mensaje = `Gracias! Te notificaremos cuando lancemos nuevas funciones a ${this.email}`;
      this.tipoMensaje = 'exito';
      this.email = '';

      // Limpia el mensaje después de 5 segundos
      setTimeout(() => {
        this.mensaje = '';
        this.tipoMensaje = '';
      }, 5000);
    } else {
      this.mensaje = 'Por favor ingresa un email válido';
      this.tipoMensaje = 'error';

      setTimeout(() => {
        this.mensaje = '';
        this.tipoMensaje = '';
      }, 5000);
    }
  }
}