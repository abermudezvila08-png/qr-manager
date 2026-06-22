# qr-manager
# QR Manager

**Aplicación standalone y módulo embebible para generación, lectura y gestión de códigos QR con soporte offline.**

Desarrollado por **Verbum Tech Solution** · [verbumtech.cu](https://verbumtech.cu)

---

## ¿Qué es?

QR Manager es **dos cosas al mismo tiempo**:

1. **Una aplicación completa** — lista para publicar en GitHub Pages o cualquier servidor. No necesita backend. Funciona desde el navegador.

2. **Un módulo embebible** — puede inyectarse en cualquier plataforma web, app React, Vue, o sistema existente con una sola línea. Diseñado para eso desde el inicio.

---

## Características

- ✅ Genera QR con datos estructurados (no solo URLs)
- ✅ Funciona **offline** — los datos van dentro del QR, no en un servidor
- ✅ Lector por **cámara en vivo** y por **imagen subida**
- ✅ **Verificación de integridad** mediante hash interno
- ✅ **Galería** con filtros por tipo y búsqueda
- ✅ **3 roles** con permisos diferenciados: Admin, Agente, Usuario
- ✅ **5 tipos de QR**: Agente, Producto, Servicio, Información, Compra/Remesa
- ✅ ID único por cada QR generado (ej: `AGT-83683-47Q`)
- ✅ Descarga de QR como imagen PNG
- ✅ Sin dependencias de servidor — 100% frontend
- ✅ Mobile-first — optimizado para teléfonos Android

---

## Uso como aplicación standalone

### GitHub Pages (recomendado)

```
1. Sube este repositorio a GitHub
2. Ve a Settings → Pages
3. Selecciona rama: main / carpeta: root
4. Listo — accesible en: https://tu-usuario.github.io/qr-manager
```

### Local (sin servidor)

```bash
# Solo abre el archivo en el navegador:
open index.html

# O con servidor local:
npx serve .
python3 -m http.server 8080
```

---

## Uso como módulo embebible

### Opción A — iframe (la más simple)

```html
<!-- En cualquier página HTML -->
<iframe 
  src="https://tu-usuario.github.io/qr-manager/qr-module.html"
  width="100%" 
  height="600px"
  frameborder="0"
  id="qr-module">
</iframe>
```

### Opción B — Componente JavaScript (integración profunda)

```html
<!-- 1. Incluir el módulo -->
<script src="js/qr-module.js"></script>

<!-- 2. Crear contenedor -->
<div id="mi-qr-manager"></div>

<!-- 3. Inicializar con configuración -->
<script>
  QRManager.init({
    container: '#mi-qr-manager',
    rol: 'agente',          // 'admin' | 'agente' | 'usuario'
    tipos: ['agente', 'producto'],  // tipos habilitados
    tema: {
      primario: '#f97316',  // tu color naranja
      secundario: '#d4af37' // tu color dorado
    },
    onGenerar: function(datos) {
      // Callback cuando se genera un QR
      console.log('QR generado:', datos);
      // Aquí conectas con tu backend, Supabase, etc.
    },
    onLeer: function(datos) {
      // Callback cuando se escanea un QR
      console.log('QR leído:', datos);
      // Aquí ejecutas la lógica de tu plataforma
    }
  });
</script>
```

### Opción C — React / Vue (importación directa)

```jsx
// React
import QRManager from './js/qr-module.js';

function MiComponente() {
  return (
    <QRManager
      rol="agente"
      tipos={['agente', 'producto']}
      onGenerar={(datos) => guardarEnSupabase(datos)}
      onLeer={(datos) => procesarEnPlataforma(datos)}
    />
  );
}
```

---

## Estructura del QR generado

Cada QR contiene un JSON con esta estructura:

```json
{
  "tipo": "agente",
  "nombre": "Juan Pérez",
  "zona": "Habana del Este",
  "telefono": "59671678",
  "especialidad": "Remesas",
  "horario": "9:00 - 17:00",
  "id": "AGT-83683-47Q",
  "ts": "2026-06-22",
  "rol_emisor": "agente",
  "hash": "4D813F"
}
```

| Campo | Descripción |
|---|---|
| `tipo` | Categoría del QR |
| `id` | ID único generado automáticamente |
| `ts` | Fecha de emisión |
| `rol_emisor` | Rol que creó el QR |
| `hash` | Verificación de integridad |

---

## Tipos de QR disponibles

| Tipo | Prefijo ID | Quién puede crear |
|---|---|---|
| `agente` | AGT-XXXXX-XXX | Admin, Agente |
| `producto` | PRD-XXXXX-XXX | Admin, Agente |
| `servicio` | SRV-XXXXX-XXX | Admin, Agente |
| `info` | INF-XXXXX-XXX | Admin, Agente, Usuario |
| `compra` | CMP-XXXXX-XXX | Admin |

---

## Permisos por rol

| Acción | Admin | Agente | Usuario |
|---|---|---|---|
| Crear QR Agente | ✓ | ✓ | ✗ |
| Crear QR Producto | ✓ | ✓ | ✗ |
| Crear QR Servicio | ✓ | ✓ | ✗ |
| Crear QR Info | ✓ | ✓ | ✓ |
| Crear QR Compra | ✓ | ✗ | ✗ |
| Leer / Escanear | ✓ | ✓ | ✓ |
| Ver Galería | Todos | Propios | Públicos |
| Eliminar QR | ✓ | ✗ | ✗ |

---

## Integración con backend / Supabase

El módulo está preparado para conectarse a cualquier backend. En el callback `onGenerar` o `onLeer` puedes insertar tu lógica:

```javascript
QRManager.init({
  onGenerar: async function(datos) {
    // Guardar en Supabase
    const { data, error } = await supabase
      .from('qr_codes')
      .insert([datos]);
    
    if (error) console.error(error);
  }
});
```

**Tabla SQL sugerida para Supabase:**

```sql
CREATE TABLE qr_codes (
  id          TEXT PRIMARY KEY,       -- AGT-83683-47Q
  tipo        TEXT NOT NULL,
  nombre      TEXT,
  zona        TEXT,
  telefono    TEXT,
  datos       JSONB,                  -- todos los campos extra
  rol_emisor  TEXT,
  hash        TEXT,
  ts          DATE,
  guardado    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Dependencias externas (CDN)

El proyecto usa dos librerías cargadas desde CDN:

| Librería | Versión | Uso |
|---|---|---|
| [QRCode.js](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js) | 1.0.0 | Generación de QR |
| [jsQR](https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js) | 1.4.0 | Lectura de QR |

Para uso **100% offline** (sin CDN), descarga ambas y colócalas en `/assets/`:

```html
<!-- Reemplazar en index.html -->
<script src="assets/qrcode.min.js"></script>
<script src="assets/jsQR.min.js"></script>
```

---

## Roadmap

- [ ] Modo oscuro / claro
- [ ] Exportar galería completa como ZIP
- [ ] QR con logo embebido
- [ ] Historial de escaneos
- [ ] Sincronización con Supabase en tiempo real
- [ ] Notificaciones push al escanear QR de compra

---

## Licencia

MIT — Libre para uso personal y comercial con atribución.

```
QR Manager · Verbum Tech Solution
Desarrollado en Cuba para el mundo.
```
