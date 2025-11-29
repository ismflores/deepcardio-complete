import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from sklearn.metrics import r2_score, mean_absolute_error, confusion_matrix, ConfusionMatrixDisplay
import os

def generate_validation_report(results_csv_path, ground_truth_csv_path, output_folder):
    print("Generando reporte de validación...")
    
    # 1. Cargar datos
    if not os.path.exists(results_csv_path) or not os.path.exists(ground_truth_csv_path):
        print("Error: No se encuentran los archivos CSV necesarios.")
        return

    df_model = pd.read_csv(results_csv_path)
    df_gt = pd.read_csv(ground_truth_csv_path)

    # 2. Limpiar y Unir datos (Merge)
    # El modelo tiene nombres como "0X1A...avi", el GT tiene "0X1A..."
    # Quitamos la extensión para poder compararlos
    df_model['CleanName'] = df_model['Filename'].apply(lambda x: os.path.splitext(x)[0])
    
    # Unimos las tablas donde coincidan los nombres
    merged = pd.merge(df_model, df_gt, left_on='CleanName', right_on='FileName', how='inner')
    
    if len(merged) == 0:
        print("No se encontraron coincidencias entre los videos analizados y el FileList.csv")
        return

    print(f"Comparando {len(merged)} videos coincidentes.")

    # Crear carpeta para gráficas de validación
    val_output = os.path.join(output_folder, "validation_report")
    os.makedirs(val_output, exist_ok=True)

    # =================================================================
    # GRÁFICA 1: SCATTER PLOT (Correlación)
    # =================================================================
    plt.figure(figsize=(8, 8))
    x = merged['EF'] # Experto
    y = merged['EF_Model'] # Tu Modelo
    
    # Calcular métricas
    r2 = r2_score(x, y)
    mae = mean_absolute_error(x, y)
    
    plt.scatter(x, y, alpha=0.6, color='blue', label='Predicciones')
    
    # Línea de identidad (Ideal)
    lims = [0, 100]
    plt.plot(lims, lims, 'k--', alpha=0.75, zorder=0, label='Ideal (y=x)')
    
    # Línea de tendencia real
    z = np.polyfit(x, y, 1)
    p = np.poly1d(z)
    plt.plot(x, p(x), "r--", alpha=0.8, label=f'Tendencia ($R^2$={r2:.2f})')

    plt.xlabel('FEVI Experto (Ground Truth) [%]')
    plt.ylabel('FEVI DeepCardio (Modelo) [%]')
    plt.title(f'Correlación Modelo vs Experto\nMAE: {mae:.2f}% (Error Promedio Absoluto)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig(os.path.join(val_output, "1_correlation_scatter.png"))
    plt.close()

    # =================================================================
    # GRÁFICA 2: BLAND-ALTMAN (Análisis de Error)
    # =================================================================
    plt.figure(figsize=(10, 6))
    mean_vals = (x + y) / 2
    diffs = y - x # Modelo - Experto
    mean_diff = np.mean(diffs)
    std_diff = np.std(diffs)
    
    plt.scatter(mean_vals, diffs, alpha=0.6, color='purple')
    plt.axhline(mean_diff, color='black', linestyle='-', label=f'Sesgo Medio: {mean_diff:.2f}')
    plt.axhline(mean_diff + 1.96 * std_diff, color='red', linestyle='--', label='+1.96 SD')
    plt.axhline(mean_diff - 1.96 * std_diff, color='red', linestyle='--', label='-1.96 SD')
    
    plt.xlabel('Promedio (Experto + Modelo) / 2')
    plt.ylabel('Diferencia (Modelo - Experto)')
    plt.title('Gráfico de Bland-Altman (Acuerdo entre métodos)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.savefig(os.path.join(val_output, "2_bland_altman.png"))
    plt.close()

    # =================================================================
    # GRÁFICA 3: MATRIZ DE CONFUSIÓN (Clasificación Clínica)
    # =================================================================
    # Definir función para clasificar según umbrales
    def classify(ef_value):
        if ef_value >= 50: return "Normal"
        elif ef_value >= 40: return "Ligeramente Reducida"
        else: return "Reducida"

    y_true_class = x.apply(classify)
    y_pred_class = y.apply(classify)
    labels = ["Normal", "Ligeramente Reducida", "Reducida"]

    cm = confusion_matrix(y_true_class, y_pred_class, labels=labels)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.xlabel('Predicción del Modelo')
    plt.ylabel('Diagnóstico del Experto')
    plt.title('Matriz de Confusión Clínica')
    plt.tight_layout()
    plt.savefig(os.path.join(val_output, "3_confusion_matrix.png"))
    plt.close()

    print(f"Reporte generado exitosamente en: {val_output}")
    return {
        'r2': r2,
        'mae': mae,
        'count': len(merged)
    }

# Bloque para ejecutarlo 
if __name__ == "__main__":
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    RESULTS_PATH = os.path.join(BASE_DIR, 'output', 'classification_results.csv')
    
    # RUTA AL FILELIST.CSV (Asegúrate de que la ruta sea correcta)
    # Según tus adjuntos, parece estar en CodeBase/a4c-video-dir/..../FileList.csv
    # Ajusta esta ruta si es necesario:
    GT_PATH = os.path.join(BASE_DIR, '..', 'CodeBase', 'a4c-video-dir', 'EchoNet-Dynamic', 'FileList.csv')
    
    OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

    if os.path.exists(RESULTS_PATH) and os.path.exists(GT_PATH):
        generate_validation_report(RESULTS_PATH, GT_PATH, OUTPUT_DIR)
    else:
        print("No se encontraron los archivos. Verifica las rutas en el script.")
        print(f"Buscando resultados en: {RESULTS_PATH}")
        print(f"Buscando FileList en: {GT_PATH}")