#  Monorepo de Deepcardio

Resumen rápido: este repositorio contiene tres proyectos relacionados:
- api-deepcardio-node — API backend (Node.js + Neon/Postgres)  
- deepcardio_pagina — Frontend (Angular)  
- backend_fevi_flask — Procesamiento y segmentación de vídeo (Python + Flask + PyTorch)

**Tecnologías principales:**
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14-brightgreen) ![Express](https://img.shields.io/badge/Express-4.x-lightgrey) ![Neon/Postgres](https://img.shields.io/badge/Neon%20(Postgres)-serverless-blue)![Angular](https://img.shields.io/badge/Angular-17-red) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)![Python](https://img.shields.io/badge/Python-3.10-blue) ![Flask](https://img.shields.io/badge/Flask-3.x-lightgrey) ![PyTorch](https://img.shields.io/badge/PyTorch-2.5.1-orange)![CUDA](https://img.shields.io/badge/CUDA-12.1-red) ![OpenCV](https://img.shields.io/badge/OpenCV-4.x-blue)

Estructura y propósito de cada carpeta
- api-deepcardio-node/  
  - Backend en Node.js + Express que se conecta a la base de datos en Neon (Postgres) y expone la API para el frontend.  
  - Contiene su propio README con instrucciones de instalación, variables .env y endpoints. Consulta: `api-deepcardio-node/README.md`

- deepcardio_pagina/  
  - Aplicación web principal hecha con Angular. Interactúa con la API para mostrar resultados, subir datos y visualizar reportes.  
  - Consulta: `deepcardio_pagina/README.md`

- backend_fevi_flask/  
  - Servicio en Python/Flask encargado de:
    - Convertir DICOM → .avi (si aplica)
    - Segmentación de vídeos .avi (genera vídeo segmentado)
    - Cálculo de FEVI / variabilidad de frecuencia y gráficas
    - Exportar resultados en .csv
  - Contiene modelos y pesos en `weights/` (modelos grandes) y su propio README con instrucciones de instalación y descarga de pesos. Consulta: `backend_fevi/README.md`

IMPORTANTE — modelos grandes y PyTorch/CUDA
- En el entorno local trabajado se tenía:  
  torch==2.5.1+cu121 — CUDA disponible: True — versión CUDA: 12.1
- ADVERTENCIA (muy importante): cada usuario debe instalar la versión de PyTorch compatible con la versión de CUDA de su GPU/driver. No instales un wheel `+cuXXX` que no coincida con tu CUDA.  
- Para comprobar tu entorno local:
```powershell
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.version.cuda)"
```
- Selector oficial/instalación de PyTorch: https://pytorch.org/get-started/locally/  
  (En `backend_fevi/README.md` hay la línea de ejemplo usada por el autor para CUDA 12.1.)

Modelos grandes
- Los pesos (.pt) suelen superar el límite de 100 MB de GitHub. Revisa `backend_fevi/README.md` para:  
  - enlaces de descarga (GitHub Releases / Google Drive / S3) o  
  - instrucciones para usar Git LFS si prefieres alojarlos en el repo.

Cómo empezar (rápido)
1. Clona el repo:
```bash
git clone <URL_REPO>
cd nuevoalgoritmo
```
2. Abre el README de la carpeta que quieras ejecutar y sigue las instrucciones específicas allí (cada subproyecto incluye su README con pasos detallados). Ejemplos:
```bash
# ver README de cada proyecto
type api-deepcardio-node\README.md
type deepcardio_pagina\README.md
type backend_fevi\README.md
```

Notas finales
- Cada carpeta incluye su propio README con pasos de instalación, dependencias y comandos de ejecución — úsalo como fuente principal.  
- Si vas a colaborar o distribuir modelos, decide si usar Git LFS o publicar pesos en Releases/almacenamiento externo; las instrucciones están en `backend_fevi/README.md`.
