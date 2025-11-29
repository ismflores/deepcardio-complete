import os
import sys
import time
import torch
import torchvision
import numpy as np
import pandas as pd
import scipy.signal
import matplotlib
matplotlib.use('Agg') # Backend no interactivo para servidor
import matplotlib.pyplot as plt
import pathlib
import wget
import shutil
import cv2
import pydicom

# Añadir el directorio padre para importar echonet
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import echonet

class DeepCardioProcessor:
    def __init__(self, base_dir, weights_dir, output_dir):
        self.base_dir = base_dir
        self.weights_dir = weights_dir
        self.output_dir = output_dir
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # URLs de pesos. esta seccion se descomenta cuando se tengan los urls de los pesos
        self.seg_weights_url = 'https://github.com/douyang/EchoNetDynamic/releases/download/v1.0.0/deeplabv3_resnet50_random.pt' 
        self.ef_weights_url = 'https://github.com/douyang/EchoNetDynamic/releases/download/v1.0.0/r2plus1d_18_32_2_pretrained.pt'
        
        self._ensure_directories()
        self._download_weights()
        
        self.seg_model = self._load_seg_model()
        self.ef_model = self._load_ef_model()

    def _ensure_directories(self):
        os.makedirs(self.weights_dir, exist_ok=True)
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "videos"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "size"), exist_ok=True)
        os.makedirs(os.path.join(self.output_dir, "labels"), exist_ok=True)

    def _download_weights(self):
        seg_path = os.path.join(self.weights_dir, os.path.basename(self.seg_weights_url))
        ef_path = os.path.join(self.weights_dir, os.path.basename(self.ef_weights_url))
        
        if not os.path.exists(seg_path):
            print(f"Descargando pesos de segmentación a {seg_path}...")
            wget.download(self.seg_weights_url, out=self.weights_dir)
            
        if not os.path.exists(ef_path):
            print(f"Descargando pesos de EF a {ef_path}...")
            wget.download(self.ef_weights_url, out=self.weights_dir)

    def _load_seg_model(self):
        print("Cargando modelo de segmentación...")
        model = torchvision.models.segmentation.deeplabv3_resnet50(pretrained=False, aux_loss=False)
        model.classifier[-1] = torch.nn.Conv2d(model.classifier[-1].in_channels, 1, kernel_size=model.classifier[-1].kernel_size)
        
        weights_path = os.path.join(self.weights_dir, os.path.basename(self.seg_weights_url))
        
        if self.device.type == "cuda":
            model = torch.nn.DataParallel(model)
            model.to(self.device)
            checkpoint = torch.load(weights_path)
            model.load_state_dict(checkpoint['state_dict'])
        else:
            checkpoint = torch.load(weights_path, map_location="cpu")
            state_dict_cpu = {k[7:]: v for (k, v) in checkpoint['state_dict'].items()}
            model.load_state_dict(state_dict_cpu)
            
        model.eval()
        return model

    def _load_ef_model(self):
        print("Cargando modelo de EF...")
        model = torchvision.models.video.r2plus1d_18(pretrained=False)
        model.fc = torch.nn.Linear(model.fc.in_features, 1)
        
        weights_path = os.path.join(self.weights_dir, os.path.basename(self.ef_weights_url))
        
        if self.device.type == "cuda":
            model = torch.nn.DataParallel(model)
            model.to(self.device)
            checkpoint = torch.load(weights_path)
            model.load_state_dict(checkpoint['state_dict'])
        else:
            checkpoint = torch.load(weights_path, map_location="cpu")
            state_dict_cpu = {k[7:]: v for (k, v) in checkpoint['state_dict'].items()}
            model.load_state_dict(state_dict_cpu)
            
        model.eval()
        return model

    def _save_as_mp4(self, img_array, output_path):
        """Convierte el array de frames (C, T, H, W) a un archivo MP4 compatible con web."""
        try:
            c, t, h, w = img_array.shape
            fps = 50
            fourcc = cv2.VideoWriter_fourcc(*'avc1') 
            out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))
            
            if not out.isOpened():
                print("Codec avc1 no disponible, intentando mp4v...")
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

            for frame_idx in range(t):
                frame = img_array[:, frame_idx, :, :]
                frame = np.transpose(frame, (1, 2, 0))
                frame = frame.astype(np.uint8)
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                out.write(frame_bgr)
                
            out.release()
            return True
        except Exception as e:
            print(f"Error guardando MP4 {output_path}: {e}")
            return False

    # =========================================================================
    # LÓGICA DE CONVERSIÓN DICOM
    # =========================================================================
    
    def _apply_mask(self, output):
        dimension = output.shape[0]
        m1, m2 = np.meshgrid(np.arange(dimension), np.arange(dimension))
        mask = ((m1+m2)>int(dimension/2) + int(dimension/10)) 
        mask *=  ((m1-m2)<int(dimension/2) + int(dimension/10))
        mask = np.reshape(mask, (dimension, dimension)).astype(np.int8)
        maskedImage = cv2.bitwise_and(output, output, mask = mask)
        return maskedImage

    def _convert_dicom_to_avi(self, dicom_path, output_folder):
        try:
            filename = os.path.splitext(os.path.basename(dicom_path))[0]
            avi_path = os.path.join(output_folder, filename + ".avi")
            
            if os.path.exists(avi_path):
                return avi_path

            dataset = pydicom.dcmread(dicom_path, force=True)
            testarray = dataset.pixel_array

            if testarray.ndim == 3: 
                testarray = np.expand_dims(testarray, axis=-1)
            
            frame0 = testarray[0]
            if frame0.ndim == 3:
                mean_img = np.mean(frame0, axis=2)
            else:
                mean_img = frame0
                
            mean_val = np.mean(mean_img, axis=1)
            
            try:
                yCrop = np.where(mean_val < 1)[0][0]
            except:
                yCrop = 0
                
            testarray = testarray[:, yCrop:, :, :]

            bias = int(np.abs(testarray.shape[2] - testarray.shape[1])/2)
            if bias > 0:
                if testarray.shape[1] < testarray.shape[2]:
                    testarray = testarray[:, :, bias:-bias, :]
                else:
                    testarray = testarray[:, bias:-bias, :, :]

            frames, height, width, channels = testarray.shape
            
            if frames == 0 or height == 0 or width == 0:
                print(f"Error: Dimensiones inválidas en DICOM {filename}")
                return None

            cropSize = (112, 112)
            fps = 30
            try:
                fps = dataset[(0x18, 0x40)].value
            except:
                pass

            fourcc = cv2.VideoWriter_fourcc('M','J','P','G')
            out = cv2.VideoWriter(avi_path, fourcc, fps, cropSize)

            for i in range(frames):
                outputA = testarray[i, :, :, 0]
                margin = int(height/10)
                if height > 2 * margin:
                    smallOutput = outputA[margin:(height - margin), margin:(height - margin)]
                else:
                    smallOutput = outputA

                output = cv2.resize(smallOutput, cropSize, interpolation = cv2.INTER_CUBIC)
                finaloutput = self._apply_mask(output)
                finaloutput = cv2.merge([finaloutput, finaloutput, finaloutput])
                
                if finaloutput.max() > 255:
                    finaloutput = (finaloutput / finaloutput.max() * 255).astype(np.uint8)
                else:
                    finaloutput = finaloutput.astype(np.uint8)

                out.write(finaloutput)

            out.release()
            print(f"DICOM convertido: {filename}.dcm -> {filename}.avi")
            return avi_path

        except Exception as e:
            print(f"Error convirtiendo DICOM {dicom_path}: {e}")
            return None

    # =========================================================================
    # PROCESAMIENTO PRINCIPAL
    # =========================================================================

    def process_videos(self, videos_folder, progress_callback=None):
        # Carpeta temporal aislada para que EchoNet solo vea AVIs válidos
        inference_folder = os.path.join(videos_folder, "inference_ready")
        
        try:
            # 0. PRE-PROCESAMIENTO: AISLAR Y CONVERTIR VIDEOS
            if progress_callback: progress_callback(5, "Preparando archivos para análisis...")
            
            if os.path.exists(inference_folder):
                shutil.rmtree(inference_folder)
            os.makedirs(inference_folder)
            
            files = os.listdir(videos_folder)
            valid_files_count = 0
            
            for f in files:
                src_path = os.path.join(videos_folder, f)
                if os.path.isdir(src_path):
                    continue
                    
                lower_f = f.lower()
                if lower_f.endswith('.dcm') or lower_f.endswith('.dicom'):
                    # Convertir DICOM a AVI en la carpeta de inferencia
                    if self._convert_dicom_to_avi(src_path, inference_folder):
                        valid_files_count += 1
                elif lower_f.endswith('.avi'):
                    # Copiar AVI existente a carpeta de inferencia
                    shutil.copy2(src_path, os.path.join(inference_folder, f))
                    valid_files_count += 1
            
            if valid_files_count == 0:
                raise Exception("No se encontraron archivos válidos (.avi, .dcm) para procesar.")

            # NOTA IMPORTANTE: Usamos 'inference_folder' en lugar de 'videos_folder'
            # para todas las operaciones de EchoNet de aquí en adelante.
            
            # Configuración de Dataset
            frames = 32
            period = 1
            batch_size = 1 
            
            # 1. CALCULAR EF
            if progress_callback: progress_callback(10, "Calculando Fracción de Eyección (Modelo)...")
            
            ds = echonet.datasets.Echo(split="external_test", external_test_location=inference_folder, pad=12, crops="all")
            mean, std = echonet.utils.get_mean_and_std(ds, batch_size=1, num_workers=0)
            
            ds = echonet.datasets.Echo(split="external_test", external_test_location=inference_folder, pad=12, crops="all", mean=mean, std=std)
            dataloader = torch.utils.data.DataLoader(ds, batch_size=1, num_workers=0, shuffle=False, pin_memory=(self.device.type == "cuda"))
            
            _, yhat, _ = echonet.utils.video.run_epoch(self.ef_model, dataloader, False, None, self.device, save_all=True, block_size=25)
            
            ef_data = {}
            for (filename, pred) in zip(ds.fnames, yhat):
                ef_data[filename] = np.mean(pred)

            # 2. GENERAR SEGMENTACIONES
            if progress_callback: progress_callback(30, "Generando segmentaciones del ventrículo...")
            
            def collate_fn(x):
                x, f = zip(*x)
                i = list(map(lambda t: t.shape[1], x))
                x = torch.as_tensor(np.swapaxes(np.concatenate(x, 1), 0, 1))
                return x, f, i

            seg_ds = echonet.datasets.Echo(split="external_test", external_test_location=inference_folder, target_type=["Filename"], length=None, period=1, mean=mean, std=std)
            seg_dataloader = torch.utils.data.DataLoader(seg_ds, batch_size=1, num_workers=0, shuffle=False, pin_memory=(self.device.type == "cuda"), collate_fn=collate_fn)
            
            block = 1024
            with torch.no_grad():
                for (x, f, i) in seg_dataloader:
                    x = x.to(self.device)
                    y_list = []
                    for idx in range(0, x.shape[0], block):
                        batch = x[idx:(idx + block), :, :, :]
                        output = self.seg_model(batch)["out"]
                        y_list.append(output.detach().cpu().numpy())
                    
                    y = np.concatenate(y_list, axis=0).astype(np.float16)
                    
                    start = 0
                    for (filename, offset) in zip(f, i):
                        seg_output = y[start:(start + offset), 0, :, :]
                        np.save(os.path.join(self.output_dir, "labels", os.path.splitext(filename)[0]), seg_output)
                        start += offset

            # 3. GENERAR VIDEOS Y GRÁFICAS
            if progress_callback: progress_callback(60, "Generando videos y gráficas de volumen...")
            
            vis_dataloader = torch.utils.data.DataLoader(
                echonet.datasets.Echo(split="external_test", external_test_location=inference_folder, target_type=["Filename"], length=None, period=1),
                batch_size=1, num_workers=0, shuffle=False, pin_memory=False
            )
            
            echonet.utils.latexify()
            size_csv_path = os.path.join(self.output_dir, "size.csv")
            
            csv_lines = []
            csv_lines.append("Filename,Frame,Size,ComputerSmall,EF_Mean,ESV,EDV\n")
            
            for (x, filename) in vis_dataloader:
                filename_str = filename[0]
                seg_path = os.path.join(self.output_dir, "labels", os.path.splitext(filename_str)[0] + ".npy")
                
                if not os.path.exists(seg_path):
                    continue
                    
                logit = np.load(seg_path)
                x_numpy = x.numpy()
                
                img = x_numpy[0, :, :, :, :].copy()
                img[1, :, :, :] = img[0, :, :, :]
                img[2, :, :, :] = img[0, :, :, :]
                img = np.concatenate((img, img), 3)
                
                mask = (logit > 0)
                img[0, :, :, 112:] = np.maximum(255. * mask, img[0, :, :, 112:])
                img[1, :, :, 112:] = np.maximum(255. * mask, img[1, :, :, 112:])
                
                img = np.concatenate((img, np.zeros_like(img)), 2)
                size = (logit > 0).sum(2).sum(1)
                
                try:
                    trim_min = sorted(size)[round(len(size) ** 0.05)]
                    trim_max = sorted(size)[round(len(size) ** 0.95)]
                except:
                    trim_min = size.min() if len(size) > 0 else 0
                    trim_max = size.max() if len(size) > 0 else 0
                
                trim_range = trim_max - trim_min
                peaks = set()
                if trim_range > 0:
                    peaks = set(scipy.signal.find_peaks(-size, distance=20, prominence=(0.50 * trim_range))[0])
                
                esv_pixel = size.min() if len(size) > 0 else 0
                edv_pixel = size.max() if len(size) > 0 else 0
                pixel_to_ml = 0.03
                esv_ml = esv_pixel * pixel_to_ml
                edv_ml = edv_pixel * pixel_to_ml
                
                ef_model_val = ef_data.get(filename_str, 0)
                
                for (frame_idx, size_val) in enumerate(size):
                    csv_lines.append("{},{},{},{},{:.2f},{:.2f},{:.2f}\n".format(
                        filename_str, frame_idx, size_val, 1 if frame_idx in peaks else 0,
                        ef_model_val, esv_ml, edv_ml
                    ))
                
                # Generar Plot
                fig = plt.figure(figsize=(size.shape[0] / 50 * 1.5, 3))
                plt.scatter(np.arange(size.shape[0]) / 50, size, s=1)
                ylim = plt.ylim()
                for p in peaks:
                    plt.plot(np.array([p, p]) / 50, ylim, linewidth=1)
                plt.ylim(ylim)
                title_text = f"{os.path.splitext(filename_str)[0]}\nEF: {ef_model_val:.1f}% | ESV: {esv_ml:.1f}mL | EDV: {edv_ml:.1f}mL"
                plt.title(title_text, fontsize=10)
                plt.xlabel("Seconds")
                plt.ylabel("Size (pixels)")
                plt.tight_layout()
                plt.savefig(os.path.join(self.output_dir, "size", os.path.splitext(filename_str)[0] + ".pdf"))
                plt.close(fig)
                
                # Generar Video
                if size.max() > size.min():
                    size_norm = (size - size.min()) / (size.max() - size.min())
                    size_norm = 1 - size_norm
                else:
                    size_norm = np.zeros_like(size)

                # 1. DIBUJAR LA GRÁFICA ESTÁTICA
                for (t_point, y_val) in enumerate(size_norm):
                    x_coord = int(round(t_point / len(size_norm) * 200 + 10))
                    y_coord = int(round(115 + 100 * y_val))
                    interval_static = np.array([-1, 0, 1])
                    for a in interval_static:
                        for b in interval_static:
                            y_pos = a + y_coord
                            x_pos = b + x_coord
                            if (0 <= y_pos < img.shape[2] and 0 <= x_pos < img.shape[3]):
                                img[:, :, y_pos, x_pos] = 255.

                # 2. DIBUJAR EL CURSOR MÓVIL
                for (frame_idx, y_val) in enumerate(size_norm):
                    x_coord = int(round(frame_idx / len(size_norm) * 200 + 10))
                    y_coord = int(round(115 + 100 * y_val))
                    
                    interval_cursor = np.array([-3, -2, -1, 0, 1, 2, 3])
                    for a in interval_cursor:
                        for b in interval_cursor:
                            y_pos = a + y_coord
                            x_pos = b + x_coord
                            if (0 <= y_pos < img.shape[2] and 0 <= x_pos < img.shape[3] and 0 <= frame_idx < img.shape[1]):
                                img[0, frame_idx, y_pos, x_pos] = 255. # R
                                img[1, frame_idx, y_pos, x_pos] = 0.   # G
                                img[2, frame_idx, y_pos, x_pos] = 0.   # B
                    
                    if frame_idx in peaks and 0 <= x_coord < img.shape[3]:
                        img[0, :, 200:225, x_coord] = 255. # R
                        img[1, :, 200:225, x_coord] = 255. # G
                        img[2, :, 200:225, x_coord] = 0.   # B
                
                # Guardar AVI (Original)
                avi_path = os.path.join(self.output_dir, "videos", filename_str)
                echonet.utils.savevideo(avi_path, img.astype(np.uint8), 50)
                
                # Guardar MP4 (Para Web)
                mp4_filename = os.path.splitext(filename_str)[0] + ".mp4"
                mp4_path = os.path.join(self.output_dir, "videos", mp4_filename)
                self._save_as_mp4(img.astype(np.uint8), mp4_path)

            with open(size_csv_path, "w") as f:
                f.writelines(csv_lines)

            # 4. CLASIFICACIÓN FINAL
            if progress_callback: progress_callback(90, "Clasificando resultados...")
            
            df_size = pd.read_csv(size_csv_path)
            results = []
            
            # Nuevos umbrales clínicos:
            # Conservada (IC-FEc): FEVI >= 50%
            # Ligeramente reducida (IC-FElr): FEVI 41-49%
            # Reducida (IC-FEr): FEVI <= 40%
            
            for filename in df_size['Filename'].unique():
                video_data = df_size[df_size['Filename'] == filename]
                
                ef_model = video_data['EF_Mean'].iloc[0]
                esv = video_data['Size'].min()
                edv = video_data['Size'].max()
                
                if edv > 0:
                    ef_volumetric = ((edv - esv) / edv) * 100
                else:
                    ef_volumetric = 0
                
                # Aplicación de nuevos umbrales
                if ef_model >= 50.0:
                    classification = "Conservada (IC-FEc)"
                    severity = 0
                elif ef_model > 40.0: # Corresponde al rango 41-49% (aprox)
                    classification = "Ligeramente Reducida (IC-FElr)"
                    severity = 1
                else: # <= 40.0
                    classification = "Reducida (IC-FEr)"
                    severity = 2
                    
                systole_frames = video_data[video_data['ComputerSmall'] == 1]
                num_beats = len(systole_frames)
                
                # Cálculo de variabilidad (CV) se mantiene solo como dato estadístico
                size_std = video_data['Size'].std()
                size_mean = video_data['Size'].mean()
                cv = (size_std / size_mean) * 100 if size_mean > 0 else 0
                
                has_arrhythmia = "No evaluado"
                
                results.append({
                    'Filename': filename,
                    'EF_Model': ef_model,
                    'EF_Volumetric': ef_volumetric,
                    'ESV_pixels': esv,
                    'EDV_pixels': edv,
                    'Classification': classification,
                    'Severity': severity,
                    'Num_Beats': num_beats,
                    'Arrhythmia': has_arrhythmia,
                    'Variability_CV': cv
                })
                
            df_results = pd.DataFrame(results)
            df_results.to_csv(os.path.join(self.output_dir, "classification_results.csv"), index=False)
            
            if progress_callback: progress_callback(100, "Análisis completado")
            return True
            
        except Exception as e:
            print(f"Error en process_videos: {str(e)}")
            
            import traceback
            traceback.print_exc()
            raise e