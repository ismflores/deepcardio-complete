import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contacto.component.html',
  styleUrls: ['./contacto.component.css']
})
export class ContactoComponent {
  contactoForm: FormGroup;
  enviando = false;
  mensajeExito = '';
  mensajeError = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), this.validateName]],
      email: ['', [Validators.required, Validators.email, this.validateEmail]],
      telefono: ['', [this.validatePhoneNumber]],
      mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      metodoContacto: ['email', Validators.required]
    });
  }

  // Validador personalizado para nombre
  validateName(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;
    
    const valid = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(value);
    return valid ? null : { invalidName: true };
  }

  // Validador personalizado para email
  validateEmail(control: AbstractControl) {
    const value = control.value;
    if (!value) return null;
    
    const valid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value);
    return valid ? null : { invalidEmail: true };
  }

  // Validador personalizado para teléfono
  validatePhoneNumber(control: AbstractControl) {
    const value = control.value;
    if (!value) return null; // Opcional
    
    const valid = /^[0-9]{10}$/.test(value);
    return valid ? null : { invalidPhone: true };
  }

  getErrorMessage(campo: string): string {
    const control = this.contactoForm.get(campo);
    if (!control || !control.errors) return '';
    
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) {
      if (campo === 'nombre') return 'Mínimo 3 caracteres.';
      if (campo === 'mensaje') return 'Mínimo 10 caracteres.';
    }
    if (control.hasError('maxlength')) return 'Máximo 500 caracteres.';
    if (control.hasError('email') || control.hasError('invalidEmail')) return 'Ingrese un correo válido.';
    if (control.hasError('invalidName')) return 'Solo letras y espacios.';
    if (control.hasError('invalidPhone') || control.hasError('pattern')) return 'Ingrese 10 dígitos.';
    
    return '';
  }

  enviarFormulario() {
    if (this.contactoForm.invalid) {
      this.contactoForm.markAllAsTouched();
      return;
    }

    this.enviando = true;
    this.mensajeExito = '';
    this.mensajeError = '';

    const datos = this.contactoForm.value;
    console.log('📩 Datos del formulario:', {
      nombre: datos.nombre,
      email: datos.email,
      telefono: datos.telefono || 'No proporcionado',
      metodoContacto: datos.metodoContacto,
      mensaje: datos.mensaje
    });

    // Simulación de envío a API
    setTimeout(() => {
      this.mensajeExito = '¡Mensaje enviado correctamente! Nos pondremos en contacto pronto.';
      this.contactoForm.reset({ metodoContacto: 'email' });
      this.enviando = false;
    }, 1500);

    // Para implementación real:
    /*
    this.http.post('https://tu-api.com/contacto', datos).subscribe({
      next: () => {
        this.mensajeExito = '¡Mensaje enviado correctamente!';
        this.contactoForm.reset({ metodoContacto: 'email' });
      },
      error: () => {
        this.mensajeError = 'Hubo un problema al enviar el mensaje. Intente de nuevo.';
      },
      complete: () => {
        this.enviando = false;
      }
    });
    */
  }
}