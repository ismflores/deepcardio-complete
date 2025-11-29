import { Component, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';

// --- DECLARACIÓN DE VARIABLES GLOBALES ---
declare var cornerstone: any;
declare var cornerstoneWADOImageLoader: any;
declare var cornerstoneTools: any;
declare var dicomParser: any;
declare var Hammer: any;

// Interfaces
interface DicomMetadata {
  patientName: string;
  studyDate: string;
  modality: string;
  slices: number;
}

interface RVEFResult {
  rvef_prediction: number;
  num_cycles: number;
  filename: string;
  image_data?: string;
  contours?: any[];
  cycle_details?: {
    cycle_number: number;
    rvef: number;
    edv: number;
    esv: number;
  }[];
}

@Component({
  selector: 'app-calculo-eyeccion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculo-eyeccion.component.html',
  styleUrls: ['./calculo-eyeccion.component.css']
})
export class CalculoEyeccionComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rvefChart') rvefChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('archivoRvef') archivoRvef!: ElementRef<HTMLInputElement>;
  @ViewChild('dicomViewer') dicomViewer!: ElementRef;

  // --- ESTADOS DE CARGA PARA LOS SCRIPTS ---
  scriptsCargados = false;
  errorAlCargarScripts = false;

  imagenSeleccionadaRVEF!: File;
  nombreArchivoRVEF: string = '';
  dicomMetadata: DicomMetadata | null = null;
  rvefResults: RVEFResult | null = null;
  rvefChart!: Chart;

  isDragging = false;
  analysisInProgress = false;
  mostrarMensajeAnalisis = false;
  showAdvancedMetrics = false;

  imagenCargada = false;
  windowWidth = 256;
  windowWidthMin = 1;
  windowWidthMax = 5000;
  windowCenter = 128;
  windowCenterMin = -1000;
  windowCenterMax = 1000;

  // Nuevas propiedades para navegación entre frames
  currentImageId: string = '';
  currentImageIndex: number = 0;
  totalImages: number = 0;
  imageIds: string[] = [];
  isPlaying: boolean = false;
  playbackInterval: any = null;
  playbackSpeed: number = 200; // ms entre frames

  private readonly scripts = [
    '/assets/hammer.min.js',
    '/assets/dicomParser.min.js',
    '/assets/cornerstone.min.js',
    '/assets/cornerstoneWADOImageLoader.bundle.min.js',
    '/assets/cornerstoneTools.min.js'
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarScripts().then(() => {
      console.log('Todos los scripts de Cornerstone cargados exitosamente.');
      this.configurarCornerstone();
      this.scriptsCargados = true;
    })
    .catch(error => {
      console.error(error);
      this.errorAlCargarScripts = true;
    });
  }

  private cargarScripts(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cargarScriptEnOrden = (index: number) => {
        if (index >= this.scripts.length) {
          return resolve();
        }
        const script = document.createElement('script');
        script.src = this.scripts[index];
        script.onload = () => cargarScriptEnOrden(index + 1);
        script.onerror = (error) => reject(`Error cargando el script: ${this.scripts[index]}`);
        document.head.appendChild(script);
      };
      cargarScriptEnOrden(0);
    });
  }

  private configurarCornerstone(): void {
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneTools.external.cornerstone = cornerstone;
    cornerstoneTools.external.Hammer = Hammer;
    const config = {
      maxWebWorkers: navigator.hardwareConcurrency || 1,
      startWebWorkersOnDemand: true,
      webWorkerPath: '/assets/cornerstoneWADOImageLoaderWebWorker.min.js',
      taskConfiguration: {
        'decodeTask': {
          initializeCodecsOnStartup: false,
          usePDFJS: false,
          strict: false,
        }
      }
    };
    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
  }

  ngAfterViewInit() {
    if (this.scriptsCargados) {
      cornerstoneTools.init();
    }
  }

  seleccionarArchivo() {
    const fileInput = document.getElementById('fileInputRVEF') as HTMLInputElement;
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
    if (event.dataTransfer?.files?.length) {
      const fakeEvent = { target: { files: event.dataTransfer.files } };
      this.seleccionarImagenRVEF(fakeEvent as any);
    }
  }

  async seleccionarImagenRVEF(event: Event): Promise<void> {
    if (!this.scriptsCargados) {
      alert("Las herramientas de visualización aún se están cargando...");
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    // Convertimos el FileList a un Array de archivos
    const files = Array.from(input.files);

    if (files.some(file => !file.name.toLowerCase().endsWith('.dcm'))) {
      alert('Por favor selecciona únicamente archivos DICOM (.dcm)');
      return;
    }

    // Guardamos el primer archivo solo para el análisis (si aún lo necesitas)
    this.imagenSeleccionadaRVEF = files[0];
    // Mostramos cuántos archivos se cargaron
    this.nombreArchivoRVEF = `${files.length} archivos cargados`;

    this.rvefResults = null;
    this.imagenCargada = false;

    // ¡Enviamos el array completo de archivos al visor!
    this.cargarSerieDicomConCornerstone(files);

    // El análisis FEVI probablemente solo funcione con un archivo específico,
    // así que lo dejamos como estaba, usando el primero de la lista.
    await this.enviarImagenRVEF(new Event('submit'));
  }

  // Renombramos la función para mayor claridad y la reescribimos
  private async cargarSerieDicomConCornerstone(files: File[]) {
    if (!this.dicomViewer || !this.dicomViewer.nativeElement) {
      console.error("El elemento del visor DICOM no está disponible.");
      return;
    }

    this.stopPlayback();
    const element = this.dicomViewer.nativeElement;
    cornerstone.enable(element);

    // Generamos un imageId para CADA archivo y los guardamos en un array
    const imageIds = files.map(file => cornerstoneWADOImageLoader.wadouri.fileManager.add(file));

    this.imageIds = imageIds;
    this.totalImages = imageIds.length;

    if (this.totalImages > 0) {
      console.log(`Serie de ${this.totalImages} imágenes cargada.`);
      this.imagenCargada = true;

      // Configuramos el stack en Cornerstone Tools con nuestro array de imageIds
      cornerstoneTools.addStackStateManager(element, ['stack']);
      cornerstoneTools.addToolState(element, 'stack', {
        currentImageIdIndex: 0,
        imageIds: this.imageIds
      });

      // Mostramos la primera imagen de la serie
      await this.mostrarImagen(this.imageIds[0], element);
      this.habilitarHerramientasCornerstone(element);

      // Habilitamos la navegación con la rueda del ratón (scroll), ¡muy útil para volúmenes!
      cornerstoneTools.addToolForElement(element, cornerstoneTools.StackScrollMouseWheelTool);
      cornerstoneTools.setToolActiveForElement(element, 'StackScrollMouseWheelTool', {});

    } else {
      console.error("No se cargaron imágenes en la serie.");
      this.imagenCargada = false;
    }
  }

  private async mostrarImagen(imageId: string, element: HTMLElement): Promise<void> {
    try {
      const image = await cornerstone.loadImage(imageId);
      const viewport = cornerstone.getDefaultViewportForImage(element, image);

      this.windowWidth = viewport.voi.windowWidth!;
      this.windowCenter = viewport.voi.windowCenter!;

      cornerstone.displayImage(element, image, viewport);
      this.currentImageId = imageId;

      // --- AÑADE ESTA LÍNEA AQUÍ ---
      // Fuerza a Cornerstone a ajustar el canvas al nuevo tamaño del contenedor
      cornerstone.resize(element, true);

      // Actualizar información de la imagen en el overlay si es necesario
      this.actualizarOverlayInfo(image);
    } catch (error) {
      console.error('Error al mostrar la imagen:', error);
      throw error;
    }
  }

  private actualizarOverlayInfo(image: any) {
    // Aquí puedes extraer y mostrar información DICOM relevante
    // Por ejemplo: paciente, estudio, etc.
  }

  private habilitarHerramientasCornerstone(element: HTMLElement) {
    cornerstoneTools.clearToolState(element, 'Wwwc');
    cornerstoneTools.clearToolState(element, 'Zoom');
    cornerstoneTools.clearToolState(element, 'Pan');

    cornerstoneTools.addToolForElement(element, cornerstoneTools.WwwcTool);
    cornerstoneTools.setToolActiveForElement(element, 'Wwwc', { mouseButtonMask: 1 });

    cornerstoneTools.addToolForElement(element, cornerstoneTools.ZoomTool);
    cornerstoneTools.setToolActiveForElement(element, 'Zoom', { mouseButtonMask: 2 });

    cornerstoneTools.addToolForElement(element, cornerstoneTools.PanTool);
    cornerstoneTools.setToolActiveForElement(element, 'Pan', { mouseButtonMask: 4 });
  }

  // Métodos para navegación entre frames
  nextImage(): void {
    if (this.currentImageIndex < this.totalImages - 1) {
      this.currentImageIndex++;
      cornerstoneTools.scrollToIndex(this.dicomViewer.nativeElement, this.currentImageIndex);
    }
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      cornerstoneTools.scrollToIndex(this.dicomViewer.nativeElement, this.currentImageIndex);
    }
  }

  togglePlayback(): void {
    if (this.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  startPlayback(): void {
    if (this.totalImages <= 1) return;

    const element = this.dicomViewer.nativeElement;

    // Escucha el evento para actualizar el índice visual
    element.addEventListener('cornerstonenewimage', (e: any) => {
      this.currentImageIndex = e.detail.newImageIdIndex;
    });

    this.isPlaying = true;
    this.playbackInterval = setInterval(() => {
      let newIndex = this.currentImageIndex + 1;
      if (newIndex >= this.totalImages) {
        newIndex = 0; // Vuelve al inicio
      }
      // Usa la función de cornerstoneTools para asegurar la actualización
      cornerstoneTools.scrollToIndex(element, newIndex);
    }, this.playbackSpeed);
  }

  stopPlayback(): void {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  changePlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  public actualizarViewport(): void {
    const element = this.dicomViewer.nativeElement;
    const viewport = cornerstone.getViewport(element);
    if (viewport) {
      viewport.voi.windowWidth = Number(this.windowWidth);
      viewport.voi.windowCenter = Number(this.windowCenter);
      cornerstone.setViewport(element, viewport);
    }
  }

  ngOnDestroy() {
    // Detener reproducción al destruir el componente
    this.stopPlayback();

    if (this.dicomViewer && this.dicomViewer.nativeElement) {
      try {
        cornerstone.disable(this.dicomViewer.nativeElement);
      } catch (e) { /* Ignorar error si el elemento ya no existe */ }
    }
  }

  async enviarImagenRVEF(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.imagenSeleccionadaRVEF) return;

    this.analysisInProgress = true;
    this.mostrarMensajeAnalisis = true;

    try {
      const formData = new FormData();
      formData.append('dicom', this.imagenSeleccionadaRVEF);

      const response = await this.http.post<RVEFResult>('http://127.0.0.1:5051/predict_rvef', formData).toPromise();

      if (response) {
        this.rvefResults = response;
        this.actualizarGrafica();
      }
    } catch (error) {
      console.error('Error en análisis RVEF:', error);
    } finally {
      this.analysisInProgress = false;
      this.mostrarMensajeAnalisis = false;
    }
  }

  getConfidenceLevel(rvef: number): string {
    if (rvef > 55) return 'Alta confianza';
    if (rvef > 45) return 'Moderada confianza';
    return 'Baja confianza';
  }

  toggleAdvancedMetrics(): void {
    this.showAdvancedMetrics = !this.showAdvancedMetrics;
  }

  private actualizarGrafica() {
    if (!this.rvefChartCanvas || !this.rvefResults?.cycle_details) return;
    const canvas = this.rvefChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.rvefChart) this.rvefChart.destroy();

    this.rvefChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.rvefResults.cycle_details.map(c => `Ciclo ${c.cycle_number}`),
        datasets: [{
          label: 'RVEF por ciclo',
          data: this.rvefResults.cycle_details.map(c => c.rvef),
          borderColor: '#c71010',
          backgroundColor: 'rgba(199, 16, 16, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      }
    });
  }
}