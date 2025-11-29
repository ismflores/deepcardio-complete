import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Paciente {
  id?: number;
  nombre: string;
  edad: number;
  genero: string;
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
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  listaPacientes: Paciente[] = [];
  nuevoPaciente: Paciente = { nombre: '', edad: 0, genero: '' };
  mostrarFormulario = false;
  modoEdicion = false;
  analisisSeleccionado: Analisis[] = [];
  mostrarPopup = false;

  constructor(private http: HttpClient, private router: Router) {}

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

  mostrarFormularioPaciente() {
    this.nuevoPaciente = { nombre: '', edad: 0, genero: '' };
    this.mostrarFormulario = true;
    this.modoEdicion = false;
  }

  validarNombre(nombre: string): boolean {
    const nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{2,}$/;
    return nombreValido.test(nombre.trim());
  }

  guardarPaciente() {
    const { nombre, edad, genero } = this.nuevoPaciente;

    if (!this.validarNombre(nombre)) {
      alert('El nombre debe tener al menos 2 letras y solo contener letras y espacios.');
      return;
    }

    if (!edad || edad <= 1 || edad > 100) {
      alert('La edad debe estar entre 1 y 100 años.');
      return;
    }

    if (!genero || genero === '') {
      alert('Por favor, selecciona un género.');
      return;
    }

    if (this.modoEdicion && this.nuevoPaciente.id) {
      // Actualizar paciente existente
      this.http.put<Paciente>(`http://localhost:3000/api/pacientes/${this.nuevoPaciente.id}`, this.nuevoPaciente)
        .subscribe({
          next: pacienteActualizado => {
            const index = this.listaPacientes.findIndex(p => p.id === pacienteActualizado.id);
            if (index !== -1) this.listaPacientes[index] = pacienteActualizado;
            alert('Paciente actualizado correctamente');
            this.cerrarFormulario();
          },
          error: err => {
            console.error('Error al actualizar paciente:', err);
            alert('Error al actualizar paciente');
          }
        });
    } else {
      // Crear nuevo paciente
      this.http.post<Paciente>('http://localhost:3000/api/pacientes', this.nuevoPaciente)
        .subscribe({
          next: pacienteCreado => {
            this.listaPacientes.push(pacienteCreado);
            alert('Paciente agregado correctamente');
            this.cerrarFormulario();
          },
          error: err => {
            console.error('Error al registrar paciente:', err);
            alert('Error al registrar paciente');
          }
        });
    }
  }

  cerrarFormulario() {
    this.mostrarFormulario = false;
    this.modoEdicion = false;
    this.nuevoPaciente = { nombre: '', edad: 0, genero: '' };
  }

  verHistorialPaciente(paciente: Paciente) {
    if (!paciente.id) {
      alert("El paciente no tiene ID válido.");
      return;
    }

    this.http.get<Analisis[]>(`http://localhost:3000/api/analisis/${paciente.id}`)
      .subscribe({
        next: data => {
          if (data.length > 0) {
            this.analisisSeleccionado = data;
            this.mostrarPopup = true;
          } else {
            alert('No hay análisis para este paciente.');
          }
        },
        error: err => {
          console.error('Error al cargar historial:', err);
          alert('Error al cargar historial');
        }
      });
  }

  actualizarPaciente(paciente: Paciente) {
    this.nuevoPaciente = { ...paciente };
    this.mostrarFormulario = true;
    this.modoEdicion = true;
  }

  eliminarPaciente(id: number | undefined) {
    if (id === undefined) return;
    if (confirm('¿Estás seguro de eliminar este paciente?')) {
      this.http.delete(`http://localhost:3000/api/pacientes/${id}`)
        .subscribe({
          next: () => {
            this.listaPacientes = this.listaPacientes.filter(p => p.id !== id);
            alert('Paciente eliminado correctamente');
          },
          error: err => {
            console.error('Error al eliminar paciente:', err);
            alert('Error al eliminar paciente');
          }
        });
    }
  }

  cerrarPopup() {
    this.mostrarPopup = false;
    this.analisisSeleccionado = [];
  }
}
