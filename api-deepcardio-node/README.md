# API DeepCardio

Este proyecto es una API backend desarrollada con Node.js y Express para la gestión de usuarios, pacientes, análisis cardiológicos y reportes médicos. Además, integra autenticación JWT y registro de eventos en Splunk.

## Tecnologías principales

- Node.js
- Express
- JWT para autenticación
- Neon (PostgreSQL serverless)
- Splunk para logging
- dotenv para variables de entorno
- CORS para permitir solicitudes cross-origin

## Configuración inicial

1. Clonar el repositorio.
2. Ejecutar `npm install` para instalar dependencias.
3. Crear un archivo `.env` con las siguientes variables (ejemplo):


## ESTRUCTURA A MANTENER EN EL .env 

```

DATABASE_URL=postgresql://neondb_owner:npg_dMzZji1Ra0EF@ep-sweet-hall-a8ehw8ug-pooler.eastus2.azure.neon.tech/neondb?sslmode=require
JWT_SECRET='supersecreto123'



PGUSER=neondb_owner
PGHOST=ep-sweet-hall-a8ehw8ug-pooler.eastus2.azure.neon.tech
PGDATABASE=neondb
PGPASSWORD=npg_dMzZji1Ra0EF
PGPORT=5432
SSL_MODE=require


SPLUNK_TOKEN=eb70d327-ec19-47e4-9cbc-35f7e39c8c1e
SPLUNK_URL=https://prd-p-qm22n.splunkcloud.com:8088
```

## DATABASE SCHEMA
```
CREATE SCHEMA "public";
CREATE TABLE "analisis" (
	"id" serial PRIMARY KEY,
	"paciente_id" integer,
	"tipo" varchar(50) NOT NULL,
	"resultado" text NOT NULL,
	"fecha" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "imagenes" (
	"id" serial PRIMARY KEY,
	"analisis_id" integer,
	"url" text NOT NULL
);
CREATE TABLE "pacientes" (
	"id" serial PRIMARY KEY,
	"nombre" varchar(100) NOT NULL,
	"edad" integer NOT NULL,
	"genero" varchar(20) NOT NULL
);
CREATE TABLE "reportes" (
	"id" serial PRIMARY KEY,
	"paciente_id" integer,
	"contenido" text NOT NULL,
	"fecha" timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"nombre" varchar(100),
	"apellido_paterno" varchar(100),
	"apellido_materno" varchar(100),
	"correo" varchar(100) CONSTRAINT "users_correo_key" UNIQUE,
	"password" varchar(100)
);
ALTER TABLE "analisis" ADD CONSTRAINT "analisis_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE;
ALTER TABLE "imagenes" ADD CONSTRAINT "imagenes_analisis_id_fkey" FOREIGN KEY ("analisis_id") REFERENCES "analisis"("id") ON DELETE CASCADE;
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE CASCADE;
CREATE UNIQUE INDEX "analisis_pkey" ON "analisis" ("id");
CREATE UNIQUE INDEX "imagenes_pkey" ON "imagenes" ("id");
CREATE UNIQUE INDEX "pacientes_pkey" ON "pacientes" ("id");
CREATE UNIQUE INDEX "reportes_pkey" ON "reportes" ("id");
CREATE UNIQUE INDEX "users_correo_key" ON "users" ("correo");
CREATE UNIQUE INDEX "users_pkey" ON "users" ("id");


```



## Uso

Para iniciar el servidor:

```bash
node server.js
```

Por defecto, el servidor correrá en `http://localhost:3000`.

## Endpoints principales

### Autenticación

- **POST /register**

  Registra un nuevo usuario.

  **Body esperado:**

  ```json
  {
    "nombre": "Nombre",
    "apellidoPaterno": "Apellido Paterno",
    "apellidoMaterno": "Apellido Materno",
    "correo": "correo@ejemplo.com",
    "password": "contraseña"
  }
  ```

  **Respuesta:** Datos del usuario creado y token JWT.

- **POST /login**

  Inicia sesión con correo y contraseña.

  **Body esperado:**

  ```json
  {
    "correo": "correo@ejemplo.com",
    "password": "contraseña"
  }
  ```

  **Respuesta:** Datos del usuario y token JWT.

### Pacientes

- **POST /api/pacientes**

  Registra un nuevo paciente.

  **Body esperado:**

  ```json
  {
    "nombre": "Nombre",
    "edad": 30,
    "genero": "M"
  }
  ```

- **GET /api/pacientes**

  Obtiene todos los pacientes.

- **PUT /api/pacientes/:id**

  Actualiza datos de un paciente por ID.

- **DELETE /api/pacientes/:id**

  Elimina paciente por ID.

### Análisis cardiológicos

- **POST /api/analisis**

  Guarda un análisis (ECG o imagen).

  **Body esperado:**

  ```json
  {
    "paciente_id": 1,
    "tipo": "ECG",
    "resultado": "Normal"
  }
  ```

- **GET /api/analisis/:pacienteId**

  Obtiene historial de análisis por paciente.

### Reportes médicos

- **POST /api/reportes**

  Guarda un reporte médico.

  **Body esperado:**

  ```json
  {
    "paciente_id": 1,
    "contenido": "Reporte médico detallado..."
  }
  ```

- **GET /api/reportes/:pacienteId**

  Obtiene reportes médicos por paciente.

### Logs

- **POST /logs**

  Recibe logs desde el frontend y los envía a Splunk.

## Seguridad

- Autenticación con JWT. El token debe enviarse en el header `Authorization: Bearer <token>`.
- Variables sensibles se configuran vía `.env`.

## Detalles adicionales

- La conexión a la base de datos utiliza la librería `@neondatabase/serverless` para una conexión serverless segura con PostgreSQL.
- Se utiliza Splunk para registro y monitoreo de eventos importantes en el sistema.



