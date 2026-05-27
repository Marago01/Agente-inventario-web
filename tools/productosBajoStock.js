const { query } = require('../database/db');

async function productosBajoStock({ categoria = '' } = {}) {
  const params = [];
  let sql = `
    SELECT p.id, p.nombre, p.categoria, p.stock_actual, p.stock_minimo,
           (p.stock_minimo - p.stock_actual) AS faltante,
           pr.nombre AS proveedor_nombre, pr.correo AS proveedor_correo
    FROM productos p
    LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
    WHERE p.stock_actual <= p.stock_minimo
  `;

  if (categoria) {
    params.push(`%${categoria}%`);
    sql += ` AND p.categoria ILIKE $1`;
  }

  sql += ' ORDER BY faltante DESC, p.nombre ASC';
  const result = await query(sql, params);
  return result.rows;
}

module.exports = { productosBajoStock };
