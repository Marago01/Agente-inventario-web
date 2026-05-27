require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { query } = require('./database/db');
const { buscarProducto } = require('./tools/buscarProducto');
const { productosBajoStock } = require('./tools/productosBajoStock');
const { recomendarReabastecimiento } = require('./tools/recomendarReabastecimiento');
const { procesarMensaje } = require('./agent/reactAgent');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/productos', async (req, res) => {
  try {
    const q = req.query.q || '';
    const categoria = req.query.categoria || '';
    const data = await buscarProducto({ nombre: q, categoria });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/productos/bajo-stock', async (req, res) => {
  try {
    const data = await productosBajoStock({ categoria: req.query.categoria || '' });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reabastecimiento', async (req, res) => {
  try {
    const data = await recomendarReabastecimiento({
      categoria: req.query.categoria || '',
      enviarCorreo: req.query.enviarCorreo === 'true'
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agente', async (req, res) => {
  try {
    const { mensaje } = req.body;
    const data = await procesarMensaje(mensaje || '');
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/resumen', async (req, res) => {
  try {
    const totalProductos = (await query('SELECT COUNT(*)::int AS total FROM productos')).rows[0].total;
    const bajoStock = (await query('SELECT COUNT(*)::int AS total FROM productos WHERE stock_actual <= stock_minimo')).rows[0].total;
    const movimientos = (await query('SELECT COUNT(*)::int AS total FROM movimientos')).rows[0].total;
    const proveedores = (await query('SELECT COUNT(*)::int AS total FROM proveedores')).rows[0].total;
    res.json({ totalProductos, bajoStock, movimientos, proveedores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
