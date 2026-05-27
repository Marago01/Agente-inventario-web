const { query } = require('../database/db');

async function buscarProducto({ nombre = '', categoria = '', stockMenorA = null }) {
  const conditions = [];
  const params = [];
  let i = 1;

  if (nombre) {
    conditions.push(`p.nombre ILIKE $${i++}`);
    params.push(`%${nombre}%`);
  }
  if (categoria) {
    conditions.push(`p.categoria ILIKE $${i++}`);
    params.push(`%${categoria}%`);
  }
  if (stockMenorA !== null && stockMenorA !== undefined) {
    conditions.push(`p.stock_actual < $${i++}`);
    params.push(stockMenorA);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT p.id, p.nombre, p.categoria, p.stock_actual, p.stock_minimo, p.precio,
           pr.nombre AS proveedor_nombre, pr.correo AS proveedor_correo
    FROM productos p
    LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
    ${where}
    ORDER BY p.nombre ASC
  `;
  const result = await query(sql, params);
  return result.rows;
}

module.exports = { buscarProducto };
