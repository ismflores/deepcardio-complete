import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-quees',
  standalone: true,
  imports: [],
  templateUrl: './quees.component.html',
  styleUrl: './quees.component.css'
})
export class QueesComponent {
  constructor(private router: Router){}
  
  
  irAIniciarSesion() {
    this.router.navigate(['/IniciarSesion']);
  }

  irARegistrarse(){
    this.router.navigate(['/Registrarse']);
  }

  irALogin(){
    this.router.navigate(['/IniciarSesion']);

  }
}
