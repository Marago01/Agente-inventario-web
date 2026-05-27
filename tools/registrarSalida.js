const { pool } = require('../database/db');

async function registrarSalida({ producto, cantidad, motivo = 'Venta' }) {
  if (!producto || !cantidad || cantidad <= 0) {
    throw new Error('Debes indicar un producto y una cantidad válida.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM productos WHERE nombre ILIKE $1 LIMIT 1', [`%${producto}%`]);
    const item = found.rows[0];
    if (!item) throw new Error('Producto no encontrado.');
    if (Number(item.stock_actual) < Number(cantidad)) {
      throw new Error(`Stock insuficiente. Stock actual: ${item.stock_actual}`);
    }

    await client.query('UPDATE productos SET stock_actual = stock_actual - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [cantidad, item.id]);
    await client.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, motivo)
       VALUES ($1, 'salida', $2, $3)`,
      [item.id, cantidad, motivo]
    );

    const actualizadoRes = await client.query('SELECT * FROM productos WHERE id = $1', [item.id]);
    const actualizado = actualizadoRes.rows[0];
    if (Number(actualizado.stock_actual) <= Number(actualizado.stock_minimo)) {
      const mensaje = `El producto ${actualizado.nombre} está en nivel crítico con ${actualizado.stock_actual} unidades.`;
      await client.query('INSERT INTO alertas (producto_id, nivel, mensaje) VALUES ($1, $2, $3)', [actualizado.id, 'critico', mensaje]);
    }

    await client.query('COMMIT');
    return {
      mensaje: `Salida registrada para ${actualizado.nombre}.`,
      nuevoStock: actualizado.stock_actual,
      bajoMinimo: Number(actualizado.stock_actual) <= Number(actualizado.stock_minimo)
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { registrarSalida };
