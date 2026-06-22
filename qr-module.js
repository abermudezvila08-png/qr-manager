/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  QR MANAGER — JavaScript Module API                 ║
 * ║  Verbum Tech Solution                               ║
 * ║                                                      ║
 * ║  Uso:                                                ║
 * ║    <script src="js/qr-module.js"></script>           ║
 * ║    QRManager.init({ container, rol, onGenerar })     ║
 * ╚══════════════════════════════════════════════════════╝
 */

const QRManager = (function () {

  // ── CONFIGURACIÓN POR DEFECTO ──
  const DEFAULTS = {
    container: '#qr-manager',
    rol: 'usuario',
    tipos: null,           // null = todos los del rol
    tema: {
      primario: '#f97316',
      secundario: '#d4af37',
      fondo: '#0a0a0a',
      texto: '#f5f5f0'
    },
    onGenerar: null,       // callback(datos) al generar QR
    onLeer: null,          // callback(datos) al leer QR
    onError: null          // callback(error) en caso de fallo
  };

  // ── PERMISOS POR ROL ──
  const PERMISOS = {
    admin:   ['agente','producto','servicio','info','compra'],
    agente:  ['agente','producto','servicio'],
    usuario: ['info']
  };

  // ── CAMPOS POR TIPO ──
  const CAMPOS = {
    agente: [
      { id:'nombre', label:'Nombre completo', requerido:true },
      { id:'zona', label:'Zona / Municipio', requerido:true },
      { id:'telefono', label:'Teléfono', tipo:'tel' },
      { id:'especialidad', label:'Especialidad', tipo:'select',
        opciones:['Remesas','Divisas','Productos','Servicios','General'] },
      { id:'horario', label:'Horario de atención' }
    ],
    producto: [
      { id:'nombre', label:'Nombre del producto', requerido:true },
      { id:'descripcion', label:'Descripción', tipo:'textarea' },
      { id:'precio', label:'Precio (CUP)', tipo:'number' },
      { id:'disponibilidad', label:'Disponibilidad', tipo:'select',
        opciones:['Disponible','Agotado','Por encargo'] },
      { id:'contacto', label:'Contacto para compra' }
    ],
    servicio: [
      { id:'nombre', label:'Nombre del servicio', requerido:true },
      { id:'descripcion', label:'Descripción', tipo:'textarea' },
      { id:'precio', label:'Tarifa (CUP)', tipo:'number' },
      { id:'proveedor', label:'Proveedor / Empresa' },
      { id:'zona', label:'Zona de cobertura' }
    ],
    info: [
      { id:'titulo', label:'Título', requerido:true },
      { id:'contenido', label:'Contenido', tipo:'textarea', requerido:true },
      { id:'url', label:'Enlace (opcional)', tipo:'url' },
      { id:'vigencia', label:'Válido hasta', tipo:'date' }
    ],
    compra: [
      { id:'orden_id', label:'ID de Orden', requerido:true },
      { id:'remitente', label:'Remitente', requerido:true },
      { id:'beneficiario', label:'Beneficiario', requerido:true },
      { id:'monto', label:'Monto (CUP)', tipo:'number', requerido:true },
      { id:'agente_destino', label:'ID Agente destino' }
    ]
  };

  let config = {};
  let datosPendientes = null;

  // ── UTILIDADES ──
  function generarID(tipo) {
    const prefijos = { agente:'AGT', producto:'PRD', servicio:'SRV', info:'INF', compra:'CMP' };
    const n = Math.floor(Math.random() * 90000) + 10000;
    const s = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefijos[tipo] || 'QR'}-${n}-${s}`;
  }

  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    return Math.abs(h).toString(16).substr(0, 6).toUpperCase();
  }

  function verificarIntegridad(datos) {
    if (!datos.hash) return null;
    const copia = { ...datos };
    delete copia.hash;
    return hash(JSON.stringify(copia)) === datos.hash;
  }

  // ── GENERACIÓN ──
  function generarQR(tipo, camposDatos, elementoDestino) {
    const datos = { tipo, ...camposDatos };
    datos.id = generarID(tipo);
    datos.ts = new Date().toISOString().split('T')[0];
    datos.rol_emisor = config.rol;
    datos.hash = hash(JSON.stringify(datos));

    if (typeof QRCode === 'undefined') {
      console.error('[QRManager] QRCode.js no está cargado.');
      if (config.onError) config.onError('QRCode.js no disponible');
      return null;
    }

    if (elementoDestino) {
      elementoDestino.innerHTML = '';
      new QRCode(elementoDestino, {
        text: JSON.stringify(datos),
        width: 200, height: 200,
        colorDark: '#0a0a0a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    datosPendientes = datos;
    if (config.onGenerar) config.onGenerar(datos);
    return datos;
  }

  // ── LECTURA ──
  function procesarQR(rawString) {
    let datos;
    try {
      datos = JSON.parse(rawString);
    } catch (e) {
      datos = { tipo: 'externo', contenido: rawString };
    }

    const integro = verificarIntegridad(datos);
    datos._integro = integro;

    if (config.onLeer) config.onLeer(datos);
    return datos;
  }

  async function leerDesdeImagen(file) {
    return new Promise((resolve, reject) => {
      if (typeof jsQR === 'undefined') {
        reject(new Error('jsQR no está cargado'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) resolve(procesarQR(code.data));
          else reject(new Error('No se detectó QR en la imagen'));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── DESCARGA ──
  function descargarQR(elementoCanvas, nombreArchivo) {
    const canvas = elementoCanvas.querySelector('canvas');
    if (!canvas) return false;
    try {
      const link = document.createElement('a');
      link.download = nombreArchivo || `QR-${datosPendientes?.id || 'codigo'}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      // Fallback: abrir en nueva pestaña
      const dataUrl = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<html><body style="margin:0;background:#000;display:flex;
          flex-direction:column;align-items:center;padding:20px;gap:12px">
          <p style="color:#f97316;font-family:sans-serif;font-size:13px">
            Mantén presionada la imagen → Guardar imagen
          </p>
          <img src="${dataUrl}" style="max-width:100%;border:3px solid #d4af37;border-radius:8px">
        </body></html>`);
      }
      return false;
    }
  }

  // ── API PÚBLICA ──
  return {

    /**
     * Inicializa el módulo en un contenedor.
     * @param {Object} opciones - Configuración (ver DEFAULTS)
     */
    init(opciones = {}) {
      config = { ...DEFAULTS, ...opciones };
      config.tema = { ...DEFAULTS.tema, ...(opciones.tema || {}) };
      console.log(`[QRManager] Iniciado. Rol: ${config.rol}`);
      return this;
    },

    /**
     * Genera un QR y opcionalmente lo renderiza.
     * @param {string} tipo - Tipo de QR
     * @param {Object} datos - Campos del QR
     * @param {HTMLElement|null} elementoDestino - Donde renderizar
     */
    generar(tipo, datos, elementoDestino = null) {
      const tiposPermitidos = config.tipos || PERMISOS[config.rol] || [];
      if (!tiposPermitidos.includes(tipo)) {
        console.warn(`[QRManager] Tipo '${tipo}' no permitido para rol '${config.rol}'`);
        if (config.onError) config.onError(`Tipo '${tipo}' no permitido`);
        return null;
      }
      return generarQR(tipo, datos, elementoDestino);
    },

    /**
     * Procesa un string QR leído.
     * @param {string} rawString - Contenido del QR
     */
    procesar(rawString) {
      return procesarQR(rawString);
    },

    /**
     * Lee un QR desde un archivo de imagen.
     * @param {File} file - Archivo de imagen
     * @returns {Promise<Object>} datos del QR
     */
    leerImagen(file) {
      return leerDesdeImagen(file);
    },

    /**
     * Descarga el último QR generado como PNG.
     * @param {HTMLElement} contenedor - Elemento que contiene el canvas
     */
    descargar(contenedor) {
      return descargarQR(contenedor);
    },

    /**
     * Verifica la integridad de un QR leído.
     * @param {Object} datos - Datos del QR
     * @returns {boolean|null} true=íntegro, false=alterado, null=sin hash
     */
    verificar(datos) {
      return verificarIntegridad(datos);
    },

    /**
     * Retorna los tipos permitidos para el rol actual.
     */
    tiposPermitidos() {
      return config.tipos || PERMISOS[config.rol] || [];
    },

    /**
     * Retorna los campos requeridos para un tipo.
     * @param {string} tipo
     */
    camposDeTipo(tipo) {
      return CAMPOS[tipo] || [];
    },

    /**
     * Retorna los datos del último QR generado.
     */
    ultimoGenerado() {
      return datosPendientes;
    },

    // Exponer constantes útiles
    PERMISOS,
    CAMPOS,
    VERSION: '1.0.0',
    AUTOR: 'Verbum Tech Solution'
  };

})();

// Exportar para entornos con módulos (React, Vue, Node)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QRManager;
}
