# Tenis Clean Control

MVP de PWA para registrar, seguir y entregar tenis en un negocio de limpieza y restauración.

## Abrir localmente

La aplicación no requiere instalación de paquetes. Desde esta carpeta, ejecute:

```powershell
python -m http.server 8080
```

Luego abra `http://localhost:8080` en Chrome o Edge. Para que la instalación PWA aparezca en un celular, publíquela en un hosting HTTPS estático, como Cloudflare Pages.

## Funcionalidades incluidas

- Registro de cliente, tenis, fecha de recepción, servicios, precios, observaciones y fecha estimada.
- Código único de orden.
- Flujo: Diagnóstico, Horma opcional, Desmanchado, Limpieza, Secado, Restauración de color opcional, Control de calidad y Listo para entrega.
- Adjuntos JPG de recepción opcionales, con un máximo conjunto de 100 MB por orden en este MVP local. Los archivos se guardan en IndexedDB del navegador.
- Perfiles de Administrador y Trabajador. El trabajador puede consultar órdenes, cambiar estados, descargar guías y generar/notificar mensajes por WhatsApp.
- Búsqueda por código.
- Guía imprimible para guardar como PDF, sin etapas internas y con fecha de recepción, servicios, precios y total.
- Generación de texto de estado y botón de mensaje prearmado para WhatsApp.
- Personalización local del nombre de la empresa y color principal.

Los datos se guardan únicamente en `localStorage` del navegador. Los perfiles son una restricción de interfaz, no un sistema de seguridad. Para producción se debe sustituir por Supabase con autenticación, permisos reales, almacenamiento de fotos y sincronización en tiempo real.
