import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  @Input() seccionActiva: string = 'pacientes';
  @Output() seccionCambio = new EventEmitter<string>();
  @Output() logoutEvent = new EventEmitter<void>();

  seleccionarSeccion(seccion: string) {
    this.seccionCambio.emit(seccion);
  }

  logout() {
    this.logoutEvent.emit();
  }
}
