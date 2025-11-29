import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class RegistroComponent {
  registroForm: FormGroup;
  apiUrl = 'http://localhost:3000/register';

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, this.sanitizarInput()]],
      apellidoPaterno: ['', [Validators.required, this.sanitizarInput()]],
      apellidoMaterno: ['', [this.sanitizarInput()]], // Ahora no es obligatorio
      correo: ['', [Validators.required, Validators.email, this.sanitizarInput()]],
      confirmarCorreo: ['', [Validators.required, Validators.email, this.sanitizarInput()]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordValidator(), this.sanitizarInput()]]
    }, { validators: this.correoMatchValidator });
  }

  /** 🔥 Valida que la contraseña tenga al menos 8 caracteres, números y signos */
  passwordValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value;
      if (!value) return null;
      
      const hasMinLength = value.length >= 8;
      const hasNumbers = /[0-9]/.test(value);
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
      
      const isValid = hasMinLength && hasNumbers && hasSpecialChars;
      return isValid ? null : { invalidPassword: true };
    };
  }

  /** 🔥 Valida que los correos coincidan */
  correoMatchValidator(form: AbstractControl) {
    const correo = form.get('correo');
    const confirmarCorreo = form.get('confirmarCorreo');
    
    if (!correo || !confirmarCorreo) return null;
    
    if (confirmarCorreo.value !== '' && correo.value !== confirmarCorreo.value) {
      confirmarCorreo.setErrors({ correoNoCoincide: true });
    } else {
      const errors = confirmarCorreo.errors;
      if (errors && errors['correoNoCoincide']) {
        delete errors['correoNoCoincide'];
        if (Object.keys(errors).length === 0) {
          confirmarCorreo.setErrors(null);
        } else {
          confirmarCorreo.setErrors(errors);
        }
      }
    }
    
    return null;
  }

  /** 🔥 Evita caracteres peligrosos usados en inyecciones SQL */
  sanitizarInput(): ValidatorFn {
    return (control: AbstractControl) => {
      const forbidden = /['";\-]/.test(control.value); // Bloquea caracteres peligrosos
      return forbidden ? { invalidInput: true } : null;
    };
  }

  /** 🔥 Mostrar errores en los campos */
  getErrorMessage(field: string): string {
    const control = this.registroForm.get(field);
    
    if (control?.hasError('required')) return 'Este campo es obligatorio.';
    if (control?.hasError('email')) return 'Por favor, introduce un correo válido.';
    if (control?.hasError('minlength')) return 'La contraseña debe tener al menos 8 caracteres.';
    if (control?.hasError('invalidPassword')) return 'La contraseña debe tener al menos 8 caracteres, incluir números y caracteres especiales.';
    if (control?.hasError('correoNoCoincide')) return 'Los correos electrónicos no coinciden.';
    if (control?.hasError('invalidInput')) return 'Caracteres no permitidos detectados.';
    return '';
  }

  /** 🚀 Enviar datos al backend */
  onSubmit() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    
    const userData = this.registroForm.value;
    console.log('📩 Enviando datos al backend:', userData);
    this.http.post(this.apiUrl, userData).subscribe({
      next: (response) => {
        console.log('✅ Usuario registrado:', response);
        alert('Registro exitoso');
      },
      error: (error) => {
        console.error('❌ Error en el registro:', error);
        alert('Error al registrar usuario');
      }
    });
  }

  /** 🚀 Bloquear caracteres peligrosos al escribir */
  validarCaracteres(event: KeyboardEvent) {
    const char = event.key;
    if (/['";\-]/.test(char)) {
      event.preventDefault();
    }
  }

  /** 🚀 Evitar pegado en los inputs */
  evitarPegado(event: ClipboardEvent) {
    event.preventDefault();
  }
}