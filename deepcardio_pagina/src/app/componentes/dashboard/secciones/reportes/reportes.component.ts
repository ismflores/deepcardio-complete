import { Component, Input } from '@angular/core';
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
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent {
  @Input() historial: Analisis[] = [];

  generarReporte() {
    if (this.historial.length === 0) {
      alert("No hay análisis en el historial para generar un reporte.");
      return;
    }
    let reporte = "📑 **Reporte Médico**\n\n";
    this.historial.forEach(analisis => {
      reporte += `📅 Fecha: ${analisis.fecha}\n`;
      reporte += `🩺 Tipo de Análisis: ${analisis.tipo}\n`;
      reporte += `👤 Paciente: ${analisis.paciente}\n`;
      reporte += `🔍 Resultado: ${analisis.resultado}\n`;
      reporte += "-----------------------------\n";
    });
    alert(reporte);
  }

  descargarReporte() {
    if (this.historial.length === 0) {
      alert("No hay reportes disponibles para descargar.");
      return;
    }
    let contenido = "Reporte Médico\n\n";
    this.historial.forEach(analisis => {
      contenido += `Fecha: ${analisis.fecha}\n`;
      contenido += `Paciente: ${analisis.paciente}\n`;
      contenido += `Tipo de Análisis: ${analisis.tipo}\n`;
      contenido += `Resultado: ${analisis.resultado}\n\n`;
    });
    const blob = new Blob([contenido], { type: 'text/plain' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'Reporte_Medico.txt';
    enlace.click();
  }
}