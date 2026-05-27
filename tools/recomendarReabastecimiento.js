const nodemailer = require('nodemailer');
const { productosBajoStock } = require('./productosBajoStock');

function agruparPorProveedor(productos) {
  const grupos = {};
  for (const p of productos) {
    const key = p.proveedor_correo || 'sin-correo';
    if (!grupos[key]) {
      grupos[key] = {
        proveedor: p.proveedor_nombre || 'Proveedor sin nombre',
        correo: p.proveedor_correo || null,
        productos: []
      };
    }
    grupos[key].productos.push({
      nombre: p.nombre,
      categoria: p.categoria,
      stock_actual: Number(p.stock_actual),
      stock_minimo: Number(p.stock_minimo),
      cantidad_recomendada: Math.max(Number(p.stock_minimo) * 2 - Number(p.stock_actual), Number(p.faltante))
    });
  }
  return Object.values(grupos);
}

async function crearTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE) === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function recomendarReabastecimiento({ categoria = '', enviarCorreo = false } = {}) {
  const productos = await productosBajoStock({ categoria });
  const recomendaciones = productos.map(p => ({
    producto: p.nombre,
    categoria: p.categoria,
    stock_actual: Number(p.stock_actual),
    stock_minimo: Number(p.stock_minimo),
    urgencia: Number(p.stock_actual) === 0 ? 'alta' : (Number(p.stock_actual) <= Math.floor(Number(p.stock_minimo) / 2) ? 'media-alta' : 'media'),
    cantidad_sugerida: Math.max(Number(p.stock_minimo) * 2 - Number(p.stock_actual), Number(p.stock_minimo) - Number(p.stock_actual)),
    proveedor: p.proveedor_nombre,
    correo_proveedor: p.proveedor_correo
  }));

  const proveedores = agruparPorProveedor(productos);
  const resultadoCorreo = [];

  if (enviarCorreo && proveedores.length) {
    const transporter = await crearTransporter();
    for (const grupo of proveedores) {
      const asunto = 'Solicitud de reabastecimiento de inventario';
      const listaHtml = grupo.productos.map(item => `
        <li><strong>${item.nombre}</strong> (${item.categoria}) - stock actual: ${item.stock_actual}, mínimo: ${item.stock_minimo}, solicitar: ${item.cantidad_recomendada} unidades.</li>
      `).join('');
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
          <h2>Solicitud de reabastecimiento</h2>
          <p>Hola ${grupo.proveedor},</p>
          <p>Se requiere reabastecer los siguientes productos del inventario:</p>
          <ul>${listaHtml}</ul>
          <p>Por favor confirmar disponibilidad y tiempo de entrega.</p>
        </div>
      `;

      if (transporter && grupo.correo) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: grupo.correo,
          subject: asunto,
          html
        });
        resultadoCorreo.push({ proveedor: grupo.proveedor, correo: grupo.correo, estado: 'enviado' });
      } else {
        resultadoCorreo.push({ proveedor: grupo.proveedor, correo: grupo.correo, estado: 'pendiente-configuracion-smtp' });
      }
    }
  }

  return {
    totalProductos: recomendaciones.length,
    recomendaciones,
    correos: resultadoCorreo
  };
}

module.exports = { recomendarReabastecimiento };
