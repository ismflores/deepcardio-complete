import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface Paciente {
  id?: number;
  nombre: string;
  edad: number;
  genero: string;
  historial?: Analisis[];
}

interface Analisis {
  id?: number;
  fecha?: string;
  tipo: string;
  resultado: string;
  paciente_id?: number;
  paciente?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  imports: [RouterOutlet]
})
export class DashboardComponent implements OnInit {
  seccionActiva = 'pacientes';
  listaPacientes: Paciente[] = [];
  pacienteSeleccionadoId: number | null = null;
  historial: Analisis[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.cargarPacientes();
  }

  cargarPacientes() {
    this.http.get<Paciente[]>('http://localhost:3000/api/pacientes')
      .subscribe({
        next: data => this.listaPacientes = data,
        error: err => console.error('Error al cargar pacientes:', err)
      });
  }

  seleccionarSeccion(seccion: string) {
    this.seccionActiva = seccion;
    this.router.navigate([`/Dashboard/${seccion}`]);
  }

  seleccionarPaciente(id: number) {
    this.pacienteSeleccionadoId = id;
    this.cargarHistorial(id);
  }

  cargarHistorial(pacienteId: number) {
    this.historial = [];
    this.http.get<Analisis[]>(`http://localhost:3000/api/analisis/${pacienteId}`)
      .subscribe({
        next: data => {
          console.log('Datos recibidos del backend:', data);
          this.historial = data;
        },
        error: err => console.error('Error al cargar historial:', err)
      });
  }

  logout() {
    localStorage.removeItem('user');
    this.router.navigate(['/IniciarSesion']);
  }
}