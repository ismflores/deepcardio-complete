import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ValidatorFn, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  apiUrl = 'http://localhost:3000/login';
  showPassword = false;
  errorMessage = '';
  isLoading = false;

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.sanitizarInput()]],
      password: ['', [Validators.required, Validators.minLength(8), this.sanitizarInput()]]
    });
  }

  /** Evita caracteres peligrosos usados en inyecciones SQL */
  sanitizarInput(): ValidatorFn {
    return (control: AbstractControl) => {
      const forbidden = /['";#\-/*]/.test(control.value);
      return forbidden ? { invalidInput: true } : null;
    };
  }

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) return 'Este campo es obligatorio.';
    if (control?.hasError('email')) return 'Por favor, introduce un correo válido.';
    if (control?.hasError('minlength')) return 'La contraseña debe tener al menos 8 caracteres.';
    if (control?.hasError('invalidInput')) return 'Caracteres no permitidos detectados.';
    return '';
  }

  /** Enviar datos al backend */
  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    this.http.post(this.apiUrl, { correo: email, password }).subscribe({
      next: (response: any) => {
        console.log('✅ Login exitoso:', response);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.router.navigate(['/Dashboard']);
        
        // Enviar log a Splunk
        this.enviarLogSplunk({
          accion: "login_exitoso",
          usuario: email,
          fecha: new Date(),
        });
      },
      error: (error) => {
        console.error('❌ Error en login:', error);
        this.errorMessage = 'Credenciales incorrectas o usuario no encontrado.';
        this.isLoading = false;
        
        // Enviar log de error a Splunk
        this.enviarLogSplunk({
          accion: "login_fallido",
          usuario: email,
          error: error.message,
          fecha: new Date(),
        }, "warning");
      }
    });
  }

  enviarLogSplunk(evento: any, nivel: string = "info") {
    const backendUrl = "http://localhost:3000/logs";
    this.http.post(backendUrl, { evento, nivel }).subscribe({
      next: () => console.log("✅ Log enviado al backend para Splunk"),
      error: (error) => console.error("❌ Error enviando log al backend:", error)
    });
  }

  evitarPegado(event: ClipboardEvent) {
    event.preventDefault();
  }

  validarCaracteres(event: KeyboardEvent) {
    const char = event.key;
    if (/['";#\-/*]/.test(char)) {
      event.preventDefault();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}