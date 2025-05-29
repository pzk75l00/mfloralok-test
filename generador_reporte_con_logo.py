from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import os
from PIL import Image
from io import BytesIO

def generar_pdf_con_logo(ruta_pdf_salida):
    """
    Genera un PDF con el logo de la empresa en la esquina superior derecha.
    """    # Ruta del logo usando raw string para evitar problemas con Windows
    ruta_logo = r"c:\Proyectos\Sistema\mfloralok\src\assets\images\logo.png"
    
    # Verificar si existe el archivo
    if not os.path.exists(ruta_logo):
        print(f"Error: No se encontró la imagen del logo en {ruta_logo}")
        return
    
    # Procesar imagen para ReportLab
    try:
        # Abrir imagen con Pillow
        img = Image.open(ruta_logo)
        
        # Convertir a RGB si es necesario (ReportLab no maneja RGBA)
        if img.mode == 'RGBA':
            # Crear fondo blanco y pegar la imagen usando canal alfa
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, (0, 0), img.split()[3])
            img = background
              # Guardar en un buffer de memoria
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        processed_image = buffer
    
    except Exception as e_pil:
        print(f"Error al procesar la imagen: {e_pil}")
        return 

    try:
        # Crear el PDF con tamaño carta
        c = canvas.Canvas(ruta_pdf_salida, pagesize=letter)
        
        # Cargar la imagen desde el buffer de memoria
        img_reader = ImageReader(processed_image)
        
        # Obtener dimensiones de la imagen y de la página
        img_width, img_height = img_reader.getSize()
        page_width, page_height = letter        # Definir un ancho deseado para el logo (120px para mejor visibilidad)
        desired_logo_width = 120
        aspect_ratio = img_height / float(img_width)
        logo_height = desired_logo_width * aspect_ratio
        
        # Posición del logo (esquina superior derecha, con un margen)
        margin = 50
        x_logo = page_width - desired_logo_width - margin
        y_logo = page_height - logo_height - margin

        # Dibujar la imagen en el PDF
        c.drawImage(img_reader, x_logo, y_logo, width=desired_logo_width, height=logo_height, mask='auto')
        
        # Texto en el PDF
        c.drawString(72, page_height - margin - logo_height - 30, "Reporte Generado con Logo")
        c.drawString(72, 72, "Este es un ejemplo de PDF generado con ReportLab y un logo.")
        
        c.save()
        print(f"PDF generado exitosamente en: {ruta_pdf_salida}")

    except Exception as e:
        print(f"Ocurrió un error al generar el PDF con ReportLab: {e}")

if __name__ == "__main__":
    # Define dónde se guardará el PDF generado
    ruta_salida = r"c:\Proyectos\Sistema\mfloralok\reporte_con_logo.pdf"
    generar_pdf_con_logo(ruta_salida)
