# backend_fevi 🚀

## Descripción
Proyecto para procesamiento / segmentación y clasificación de video. Código, modelos y utilidades incluidos en la estructura del repositorio.

## Badges
![python](https://img.shields.io/badge/python-3.10-blue) ![pytorch](https://img.shields.io/badge/pytorch-2.5.1-orange)

## Inicio rápido

1. Clona el repositorio:
```powershell
git clone <URL_PROYECTO>
cd backend_fevi
```

2. Crea y activa un entorno virtual (Windows):
```powershell
python -m venv nombre_entorno
.\nombre_entorno\Scripts\activate
```

3. Instala dependencias:
```powershell
python -m pip install -r requirements.txt
```

4. Ejecuta scripts desde la raíz del proyecto (ejemplos en `nombre_entorno/`).

## Generar requirements desde tu entorno
1. Activar entorno:
```powershell
.\nombre_entorno\Scripts\activate
```
2. Volcar dependencias, esto por si quieres actuazliar el requierements con tus versiones instaladas de las dependencias:
```powershell
pip freeze > temp_requirements.txt
# revisar temp_requirements.txt y eliminar entradas locales o paths
move temp_requirements.txt requirements.txt
```

## PyTorch y CUDA — ¡ATENCIÓN IMPORTANTE! ⚠️

<span style="color:red; font-weight:700">ADVERTENCIA: la versión de PyTorch debe coincidir con la versión de CUDA instalada en tu sistema.</span>

<span style="color:red; font-weight:700">*Usado en este entorno de trabajo, cambiar a la tuya:*</span>
- torch==2.5.1+cu121  
- CUDA disponible: True  
- Versión CUDA detectada: 12.1

Si tu GPU o tu driver usan otra versión de CUDA, instala la version de PyTorch correspondiente. Ejemplo (para CUDA 12.1 — coincide con este entorno de trabajo):
```powershell
pip install --extra-index-url https://download.pytorch.org/whl/cu121 \
  torch==2.5.1+cu121 torchvision==0.18.1+cu121 torchaudio==2.5.1+cu121
```

Si no estás seguro de tu CUDA local, compruébalo así:
```powershell
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), torch.version.cuda)"
```

Selector oficial para elegir la instalación correcta de PyTorch:
- https://pytorch.org/get-started/locally/
- Versiones anteriores: https://pytorch.org/get-started/previous-versions/

**Nota:** GitHub puede filtrar estilos inline (color). Si el color no se muestra, el aviso sigue visible por el emoji ⚠️ y el texto en negrita.


## Contribuir
1. Crea una rama nueva: `git checkout -b feat/mi-cambio`
2. Haz commits claros y PR hacia `main`.

