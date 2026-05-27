const { pool } = require('../database/db');

async function registrarEntrada({ producto, cantidad, costo = 0, motivo = 'Compra o ingreso de mercancía' }) {
  if (!producto || !cantidad || cantidad <= 0) {
    throw new Error('Debes indicar un producto y una cantidad válida.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM productos WHERE nombre ILIKE $1 LIMIT 1', [`%${producto}%`]);
    const item = found.rows[0];
    if (!item) throw new Error('Producto no encontrado.');

    await client.query('UPDATE productos SET stock_actual = stock_actual + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [cantidad, item.id]);
    await client.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo, costo_unitario)
       VALUES ($1, 'entrada', $2, $3, $4)`,
      [item.id, cantidad, motivo, costo]
    );

    const actualizado = await client.query('SELECT nombre, stock_actual FROM productos WHERE id = $1', [item.id]);
    await client.query('COMMIT');
    return {
      mensaje: `Entrada registrada para ${actualizado.rows[0].nombre}.`,
      nuevoStock: actualizado.rows[0].stock_actual
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { registrarEntrada };
