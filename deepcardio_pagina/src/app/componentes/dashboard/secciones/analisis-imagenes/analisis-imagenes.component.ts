import { Component, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

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
  selector: 'app-analisis-imagenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analisis-imagenes.component.html',
  styleUrls: ['./analisis-imagenes.component.css']
})
export class AnalisisImagenesComponent implements OnInit, AfterViewInit {
  @ViewChild('anomaliasChart') anomaliasChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('severidadChart') severidadChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tendenciaChart') tendenciaChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('factoresChart') factoresChartCanvas!: ElementRef<HTMLCanvasElement>;

  listaPacientes: Paciente[] = [];
  pacienteSeleccionadoId: number | null = null;
  imagenesCargadas: string[] = [];
  tipoAnalisis: string = 'Anomalías';
  resultadoAnalisis: string | null = null;
  mostrarMensajeAnalisis = false;
  isDragging = false;
  chartsInitialized = false;
  private anomaliasChart!: Chart;
  private severidadChart!: Chart;
  private tendenciaChart!: Chart;
  private factoresChart!: Chart;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarPacientes();
  }

  ngAfterViewInit() {
    if (this.anomaliasChartCanvas && this.severidadChartCanvas && this.tendenciaChartCanvas && this.factoresChartCanvas) {
      this.inicializarGraficos();
    }
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
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  permitirArrastrar(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  soltarImagen(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const fakeEvent = {
        target: { files: event.dataTransfer.files }
      };
      this.cargarImagen(fakeEvent as any);
    }
  }

  cargarImagen(event: any) {
    const files: FileList = event.target.files || event.dataTransfer?.files;
    if (!files) return;

    const maxImages = 5;
    const remainingSlots = maxImages - this.imagenesCargadas.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        if (this.imagenesCargadas.length < maxImages) {
          this.imagenesCargadas.push(imageData);
        }
      };
      reader.readAsDataURL(file);
    });

    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  eliminarImagen(index: number, event: Event) {
    event.stopPropagation();
    this.imagenesCargadas.splice(index, 1);
    if (!this.imagenesCargadas.length) {
      this.resultadoAnalisis = null;
      this.destruirGraficos();
    }
  }

  procesarImagen() {
    if (!this.pacienteSeleccionadoId) {
      alert('Selecciona un paciente antes de analizar la imagen.');
      return;
    }

    if (!this.imagenesCargadas.length) {
      alert('Por favor, sube al menos una imagen antes de procesar.');
      return;
    }

    this.mostrarMensajeAnalisis = true;
    const tiempoEspera = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;

    setTimeout(() => {
      this.resultadoAnalisis = `Análisis para paciente ID ${this.pacienteSeleccionadoId} completo. Posible anomalía detectada en ${this.imagenesCargadas.length} imagen(es).`;
      this.mostrarMensajeAnalisis = false;
      this.actualizarGraficos();
    }, tiempoEspera);
  }

  guardarAnalisis() {
    if (!this.resultadoAnalisis || !this.pacienteSeleccionadoId) {
      alert('Faltan datos para guardar análisis');
      return;
    }

    const nuevoAnalisis: Analisis = {
      tipo: this.tipoAnalisis,
      resultado: this.resultadoAnalisis,
      paciente_id: Number(this.pacienteSeleccionadoId)
    };

    this.http.post<Analisis>('http://localhost:3000/api/analisis', nuevoAnalisis)
      .subscribe({
        next: () => {
          alert('Análisis guardado');
        },
        error: err => {
          console.error('Error al guardar análisis:', err);
          alert('Error al guardar análisis');
        }
      });
  }

  private inicializarGraficos() {
    if (this.anomaliasChartCanvas && this.severidadChartCanvas && this.tendenciaChartCanvas && this.factoresChartCanvas) {
      const ctxAnomalias = this.anomaliasChartCanvas.nativeElement.getContext('2d');
      const ctxSeveridad = this.severidadChartCanvas.nativeElement.getContext('2d');
      const ctxTendencia = this.tendenciaChartCanvas.nativeElement.getContext('2d');
      const ctxFactores = this.factoresChartCanvas.nativeElement.getContext('2d');

      if (ctxAnomalias && ctxSeveridad && ctxTendencia && ctxFactores) {
        this.anomaliasChart = new Chart(ctxAnomalias, {
          type: 'pie',
          data: {
            labels: ['Anomalías', 'Normal'],
            datasets: [{
              data: [0, 0],
              backgroundColor: ['#c71010', '#ffffff'],
              borderColor: ['#a50d0d', '#e0e0e0']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#000000' } }, title: { display: true, text: 'Anomalías Detectadas', color: '#000000' } }
          }
        });

        this.severidadChart = new Chart(ctxSeveridad, {
          type: 'bar',
          data: {
            labels: ['Baja', 'Media', 'Alta'],
            datasets: [{
              label: 'Severidad',
              data: [0, 0, 0],
              backgroundColor: ['#ffffff', '#c71010', '#000000'],
              borderColor: ['#e0e0e0', '#a50d0d', '#000000'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Nivel de Severidad', color: '#000000' } },
            scales: { y: { beginAtZero: true, ticks: { color: '#000000' } }, x: { ticks: { color: '#000000' } } }
          }
        });

        this.tendenciaChart = new Chart(ctxTendencia, {
          type: 'line',
          data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May'],
            datasets: [{
              label: 'Tendencia',
              data: [0, 0, 0, 0, 0],
              borderColor: '#c71010',
              backgroundColor: 'rgba(199, 16, 16, 0.1)',
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Tendencia de Anomalías', color: '#000000' } },
            scales: { y: { beginAtZero: true, ticks: { color: '#000000' } }, x: { ticks: { color: '#000000' } } }
          }
        });

        this.factoresChart = new Chart(ctxFactores, {
          type: 'bar',
          data: {
            labels: ['Edad', 'Hipertensión', 'Fumador', 'Colesterol'],
            datasets: [
              { label: 'Bajo', data: [0, 0, 0, 0], backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: '#e0e0e0' },
              { label: 'Medio', data: [0, 0, 0, 0], backgroundColor: 'rgba(199, 16, 16, 0.5)', borderColor: '#c71010' },
              { label: 'Alto', data: [0, 0, 0, 0], backgroundColor: 'rgba(0, 0, 0, 0.5)', borderColor: '#000000' }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: { legend: { position: 'bottom', labels: { color: '#000000' } }, title: { display: true, text: 'Distribución de Factores de Riesgo', color: '#000000' } },
            scales: {
              y: { beginAtZero: true, ticks: { color: '#000000' }, stacked: true },
              x: { ticks: { color: '#000000' }, stacked: true }
            }
          }
        });

        this.chartsInitialized = true;
      }
    }
  }

  private actualizarGraficos() {
    if (!this.chartsInitialized) {
      this.inicializarGraficos();
    }

    if (this.anomaliasChart && this.severidadChart && this.tendenciaChart && this.factoresChart) {
      this.anomaliasChart.data.datasets[0].data = [70, 30];
      this.anomaliasChart.update();

      this.severidadChart.data.datasets[0].data = [50, 30, 20];
      this.severidadChart.update();

      this.tendenciaChart.data.datasets[0].data = [10, 25, 15, 30, 20];
      this.tendenciaChart.update();

      this.factoresChart.data.datasets[0].data = [20, 30, 10, 25];
      this.factoresChart.data.datasets[1].data = [15, 20, 25, 30];
      this.factoresChart.data.datasets[2].data = [10, 15, 20, 15];
      this.factoresChart.update();
    }
  }

  private destruirGraficos() {
    if (this.anomaliasChart) {
      this.anomaliasChart.data.datasets[0].data = [0, 0];
      this.anomaliasChart.update();
    }
    if (this.severidadChart) {
      this.severidadChart.data.datasets[0].data = [0, 0, 0];
      this.severidadChart.update();
    }
    if (this.tendenciaChart) {
      this.tendenciaChart.data.datasets[0].data = [0, 0, 0, 0, 0];
      this.tendenciaChart.update();
    }
    if (this.factoresChart) {
      this.factoresChart.data.datasets.forEach(dataset => {
        dataset.data = [0, 0, 0, 0];
      });
      this.factoresChart.update();
    }
  }
}