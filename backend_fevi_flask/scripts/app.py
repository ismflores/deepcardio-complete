from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import uuid
import threading
import shutil
import pandas as pd
import zipfile
import io
import math
import matplotlib
matplotlib.use('Agg') # Asegurar backend no interactivo
import matplotlib.pyplot as plt
import numpy as np
from processor import DeepCardioProcessor

app = Flask(__name__)
CORS(app)

# Configuración de rutas
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'temp_uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')
WEIGHTS_FOLDER = os.path.join(BASE_DIR, 'weights')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Estado global de trabajos
JOBS = {}

# Inicializar procesador
print("Inicializando DeepCardio Processor...")
processor = DeepCardioProcessor(BASE_DIR, WEIGHTS_FOLDER, OUTPUT_FOLDER)
print("DeepCardio Processor listo.")

def ensure_clean_folders():
    if os.path.exists(UPLOAD_FOLDER):
        shutil.rmtree(UPLOAD_FOLDER)
    os.makedirs(UPLOAD_FOLDER)

ensure_clean_folders()

def clean_float(val):
    if val is None:
        return 0.0
    if isinstance(val, (float, np.floating)):
        if np.isnan(val) or np.isinf(val):
            return 0.0
    return float(val)

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.route('/api/upload/file', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        filename = file.filename
        # Validación básica de extensión
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ['.avi', '.dcm', '.dicom']:
             return jsonify({'error': 'Formato no soportado. Use .avi, .dcm o .dicom'}), 400

        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return jsonify({'message': 'File uploaded successfully', 'filename': filename}), 200

@app.route('/api/analysis/start', methods=['POST'])
def start_analysis():
    analysis_id = str(uuid.uuid4())
    
    files = os.listdir(app.config['UPLOAD_FOLDER'])
    if not files:
        return jsonify({'success': False, 'error': 'No files to analyze'}), 400
    
    stop_event = threading.Event()
    
    JOBS[analysis_id] = {
        'status': 'processing',
        'progress': 0,
        'message': 'Iniciando...',
        'stop_event': stop_event
    }
    
    thread = threading.Thread(target=run_analysis_task, args=(analysis_id, stop_event))
    thread.start()
    
    return jsonify({'success': True, 'analysis_id': analysis_id})

@app.route('/api/analysis/status/<analysis_id>', methods=['GET'])
def get_status(analysis_id):
    job = JOBS.get(analysis_id)
    if not job:
        return jsonify({'status': 'error', 'error': 'Analysis ID not found'}), 404
    
    return jsonify({
        'success': True,
        'analysis_id': analysis_id,
        'status': job['status'],
        'progress': job['progress'],
        'message': job['message'],
        'error': job.get('error')
    })

@app.route('/api/analysis/cancel/<analysis_id>', methods=['POST'])
def cancel_analysis(analysis_id):
    job = JOBS.get(analysis_id)
    if job:
        job['stop_event'].set()
        job['status'] = 'cancelled'
        job['message'] = 'Cancelado por el usuario'
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Job not found'}), 404

@app.route('/api/results/all', methods=['GET'])
def get_all_results():
    csv_path = os.path.join(OUTPUT_FOLDER, "classification_results.csv")
    
    if not os.path.exists(csv_path):
        return jsonify({'success': False, 'count': 0, 'results': []})
    
    try:
        df = pd.read_csv(csv_path)
        
        results = []
        for _, row in df.iterrows():
            results.append({
                'filename': row['Filename'],
                'ef_mean': clean_float(row['EF_Model']),
                'ef_volumetric': clean_float(row['EF_Volumetric']),
                'esv_pixels': clean_float(row['ESV_pixels']),
                'edv_pixels': clean_float(row['EDV_pixels']),
                'classification': row['Classification'],
                'severity': int(row['Severity']),
                'num_beats': int(row['Num_Beats']),
                'arrhythmia': row['Arrhythmia'],
                'variability_cv': clean_float(row['Variability_CV'])
            })
            
        if not df.empty:
            ef_mean = df['EF_Model'].mean()
            ef_std = df['EF_Model'].std()
            ef_min = df['EF_Model'].min()
            ef_max = df['EF_Model'].max()
        else:
            ef_mean = 0
            ef_std = 0
            ef_min = 0
            ef_max = 0

        summary = {
            'ef_mean': clean_float(ef_mean),
            'ef_std': clean_float(ef_std),
            'ef_min': clean_float(ef_min),
            'ef_max': clean_float(ef_max),
            'classifications': {k: int(v) for k, v in df['Classification'].value_counts().items()},
            'arrhythmia_count': int(len(df[df['Arrhythmia'] == 'Sí']))
        }
        
        return jsonify({
            'success': True,
            'count': len(results),
            'results': results,
            'summary': summary
        })
        
    except Exception as e:
        print(f"Error generando resultados: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/results/summary-plot', methods=['GET'])
def get_summary_plot():
    csv_path = os.path.join(OUTPUT_FOLDER, "classification_results.csv")
    
    if not os.path.exists(csv_path):
        return jsonify({'error': 'No results available'}), 404
        
    try:
        df = pd.read_csv(csv_path)
        
        if df.empty:
             return jsonify({'error': 'No data to plot'}), 404

        # Crear gráfica de resumen
        plt.figure(figsize=(10, 6))
        
        # Histograma de FEVI
        plt.hist(df['EF_Model'], bins=10, color='skyblue', edgecolor='black', alpha=0.7)
        plt.axvline(x=50, color='green', linestyle='--', label='Normal (50%)')
        plt.axvline(x=40, color='red', linestyle='--', label='Reducida (40%)')
        
        plt.title('Distribución de Fracción de Eyección (FEVI)')
        plt.xlabel('FEVI (%)')
        plt.ylabel('Número de Pacientes/Videos')
        plt.legend()
        plt.grid(axis='y', alpha=0.5)
        
        # Guardar en buffer
        img_io = io.BytesIO()
        plt.savefig(img_io, format='png', dpi=100)
        img_io.seek(0)
        plt.close()
        
        return send_file(img_io, mimetype='image/png', download_name='resumen_fevi.png')
        
    except Exception as e:
        print(f"Error generando summary plot: {e}")
        return jsonify({'error': str(e)}), 500
    
    
# ============================================================================
# NUEVA RUTA PARA VIDEOS
# ============================================================================
@app.route('/api/results/video/<filename>', methods=['GET'])
def get_video(filename):
    video_folder = os.path.join(OUTPUT_FOLDER, "videos")
    
    # 1. Intentar servir el archivo exacto solicitado (ej: video.avi)
    if os.path.exists(os.path.join(video_folder, filename)):
        return send_from_directory(video_folder, filename)
    
    # 2. Fallback: Si piden .avi pero no existe, intentar servir .mp4
    # (Esto ayuda si el navegador prefiere MP4 o si solo se generó MP4)
    base_name = os.path.splitext(filename)[0]
    mp4_name = base_name + ".mp4"
    if os.path.exists(os.path.join(video_folder, mp4_name)):
        return send_from_directory(video_folder, mp4_name)

    return jsonify({'error': 'Video not found'}), 404


@app.route('/api/results/plot/<filename>', methods=['GET'])
def get_plot(filename):
    # Manejar extensión .dcm en el nombre si viene del frontend
    base_name = os.path.splitext(filename)[0]
    pdf_filename = base_name + ".pdf"
    
    plot_path = os.path.join(OUTPUT_FOLDER, "size", pdf_filename)
    if os.path.exists(plot_path):
        return send_file(plot_path, mimetype='application/pdf')
    return jsonify({'error': 'Plot not found'}), 404

@app.route('/api/results/csv/<type>', methods=['GET'])
def get_csv(type):
    filename = ""
    if type == 'ef': filename = "classification_results.csv"
    elif type == 'size': filename = "size.csv"
    elif type == 'classification': filename = "classification_results.csv"
    
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    return jsonify({'error': 'CSV not found'}), 404

@app.route('/api/results/export-all', methods=['GET'])
def export_all():
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(OUTPUT_FOLDER):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, OUTPUT_FOLDER)
                zf.write(file_path, arcname)
    
    memory_file.seek(0)
    return send_file(memory_file, download_name='deepcardio_results.zip', as_attachment=True)

# ============================================================================
# TAREA EN SEGUNDO PLANO
# ============================================================================

def run_analysis_task(analysis_id, stop_event):
    try:
        def update_progress(progress, message):
            if stop_event.is_set():
                raise Exception("Cancelled")
            JOBS[analysis_id]['progress'] = progress
            JOBS[analysis_id]['message'] = message
            
        processor.process_videos(app.config['UPLOAD_FOLDER'], update_progress)
        
        JOBS[analysis_id]['status'] = 'completed'
        JOBS[analysis_id]['progress'] = 100
        JOBS[analysis_id]['message'] = 'Análisis completado exitosamente'
        
    except Exception as e:
        if str(e) == "Cancelled":
            JOBS[analysis_id]['status'] = 'cancelled'
        else:
            JOBS[analysis_id]['status'] = 'error'
            JOBS[analysis_id]['error'] = str(e)
            JOBS[analysis_id]['message'] = f"Error: {str(e)}"
            print(f"Error en tarea {analysis_id}: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)