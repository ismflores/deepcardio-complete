import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-ecg',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecg.component.html',
  styleUrls: ['./ecg.component.css']
})
export class EcgComponent implements OnInit {
  listaPacientes: Paciente[] = [];
  pacienteSeleccionadoId: number | null = null;
  resultadoECG: string | null = null;
  nombreArchivo: string = '';
  imagenSeleccionada!: File;
  mostrarMensajeAnalisis = false;

  constructor(private http: HttpClient) {}

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

  onSeleccionarPaciente(event: any) {
    this.pacienteSeleccionadoId = Number(event.target.value);
  }

  seleccionarArchivo() {
    const fileInput = document.getElementById('fileInputECG') as HTMLInputElement;
    fileInput?.click();
  }

  permitirArrastrar(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  soltarImagen(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const fakeEvent = {
        target: { files: event.dataTransfer.files }
      };
      this.seleccionarImagenECG(fakeEvent as any);
    }
  }

  seleccionarImagenECG(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imagenSeleccionada = input.files[0];
      this.nombreArchivo = this.imagenSeleccionada.name;
      this.resultadoECG = null;
    }
  }

  enviarImagenECG(event: Event): void {
    event.preventDefault();
    if (!this.imagenSeleccionada) {
      alert('Por favor, selecciona una imagen antes de enviar.');
      return;
    }
    if (!this.pacienteSeleccionadoId) {
      alert('Por favor, selecciona un paciente.');
      return;
    }

    this.mostrarMensajeAnalisis = true;
    const formData = new FormData();
    formData.append('image', this.imagenSeleccionada);

    this.http.post('http://127.0.0.1:5000/predict', formData).subscribe({
      next: (response: any) => {
        this.mostrarMensajeAnalisis = false;
        if (response.predicted_class && response.confidence !== undefined) {
          this.resultadoECG = `Predicción: ${response.predicted_class} (Confianza: ${response.confidence.toFixed(2)}%)`;
        } else if (response.error) {
          this.resultadoECG = `Error del servidor: ${response.error}`;
        } else {
          this.resultadoECG = 'No se recibió un resultado válido.';
        }
      },
      error: (error) => {
        this.mostrarMensajeAnalisis = false;
        console.error('Error en petición HTTP:', error);
        this.resultadoECG = 'Ocurrió un error al analizar la imagen.';
      }
    });
  }

  guardarClasificacionECG() {
    if (!this.resultadoECG || !this.pacienteSeleccionadoId) {
      alert('Faltan datos para guardar clasificación ECG');
      return;
    }

    const nuevoAnalisis: Analisis = {
      tipo: 'ECG',
      resultado: this.resultadoECG,
      paciente_id: Number(this.pacienteSeleccionadoId)
    };

    this.http.post<Analisis>('http://localhost:3000/api/analisis', nuevoAnalisis)
      .subscribe({
        next: () => {
          alert('Clasificación ECG guardada');
        },
        error: err => {
          console.error('Error al guardar clasificación ECG:', err);
          alert('Error al guardar clasificación ECG');
        }
      });
  }
}