import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Analisis {
  id?: number;
  fecha?: string;
  tipo: string;
  resultado: string;
  paciente_id?: number;
  paciente?: string;
}

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css']
})
export class HistorialComponent implements OnInit {
  historial: Analisis[] = [];
  analisisSeleccionado: Analisis | null = null;
  mostrarPopup = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarHistorial();
  }

  cargarHistorial() {
    this.http.get<Analisis[]>('http://localhost:3000/api/analisis')
      .subscribe({
        next: data => {
          this.historial = data;
        },
        error: err => console.error('Error al cargar historial:', err)
      });
  }

  mostrarDetalles(analisis: Analisis) {
    this.analisisSeleccionado = analisis;
    this.mostrarPopup = true;
  }

  cerrarPopup() {
    this.mostrarPopup = false;
    this.analisisSeleccionado = null;
  }
}