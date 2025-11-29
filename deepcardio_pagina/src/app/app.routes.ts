import { Routes } from '@angular/router';
import { ContenidoComponent } from './componentes/contenido/contenido.component';
import { Error404Component } from './componentes/error404/error404.component';
import { LoginComponent } from './componentes/login/login.component';
import { RegistroComponent } from './componentes/registro/registro.component';
import { QueesComponent } from './componentes/quees/quees.component';
import { DashboardComponent } from './componentes/dashboard/dashboard.component';
import { AuthGuard } from './auth.guard';
import { ContactoComponent } from './componentes/contacto/contacto.component';
import { ReportesComponent } from './componentes/dashboard/secciones/reportes/reportes.component';
import { HistorialComponent } from './componentes/dashboard/secciones/historial/historial.component';
import { AnalisisImagenesComponent } from './componentes/dashboard/secciones/analisis-imagenes/analisis-imagenes.component';
import { EcgComponent } from './componentes/dashboard/secciones/ecg/ecg.component';
import { PacientesComponent } from './componentes/dashboard/secciones/pacientes/pacientes.component';
import { CalculoEyeccionComponent } from './componentes/dashboard/secciones/calculo-eyeccion/calculo-eyeccion.component';

export const routes: Routes = [
  { path: '', redirectTo: '/Inicio', pathMatch: 'full' },
  { path: 'Inicio', component: ContenidoComponent },
  { path: 'QueEs', component: QueesComponent },
  { path: 'IniciarSesion', component: LoginComponent },
  { path: 'Registrarse', component: RegistroComponent },
  { path: 'Contacto', component: ContactoComponent },
  {
    path: 'Dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'pacientes', pathMatch: 'full' },
      { path: 'pacientes', component: PacientesComponent },
      { path: 'ecg', component: EcgComponent },
      { path: 'calculo-eyeccion', component: CalculoEyeccionComponent },
      { path: 'analisis-imagenes', component: AnalisisImagenesComponent },
      { path: 'historial', component: HistorialComponent },
      { path: 'reportes', component: ReportesComponent }
    ]
  },
  { path: '**', component: Error404Component }
];