const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { Pool } = require('pg');

const hasPgConfig = Boolean(
  process.env.PGHOST ||
  process.env.PGPORT ||
  process.env.PGDATABASE ||
  process.env.PGUSER ||
  process.env.PGPASSWORD
);

const pool = new Pool(
  hasPgConfig
    ? {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'agente_inventario',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres'
      }
    : {
        connectionString: process.env.DATABASE_URL || undefined
      }
);

const schemaPath = path.join(__dirname, 'schema.sql');

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

async function initDatabase() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

async function seedDatabase() {
  const existing = await query('SELECT COUNT(*)::int AS total FROM proveedores');
  if (existing.rows[0].total > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const p1 = await client.query(
      'INSERT INTO proveedores (nombre, telefono, correo) VALUES ($1, $2, $3) RETURNING id',
      ['Distribuidora Andina', '+57 3000000001', 'proveedor1@example.com']
    );
    const p2 = await client.query(
      'INSERT INTO proveedores (nombre, telefono, correo) VALUES ($1, $2, $3) RETURNING id',
      ['Abarrotes del Norte', '+57 3000000002', 'proveedor2@example.com']
    );
    const p3 = await client.query(
      'INSERT INTO proveedores (nombre, telefono, correo) VALUES ($1, $2, $3) RETURNING id',
      ['Limpio Hogar SAS', '+57 3000000003', 'proveedor3@example.com']
    );

    const productos = [
      ['Arroz Diana 500g', 'granos', 8, 10, 3500, p1.rows[0].id],
      ['Aceite Girasol 1L', 'despensa', 4, 8, 9800, p2.rows[0].id],
      ['Azucar Morena 1Kg', 'despensa', 15, 7, 4200, p2.rows[0].id],
      ['Jabon en Polvo 500g', 'aseo', 3, 6, 5600, p3.rows[0].id],
      ['Papel Higienico x4', 'aseo', 12, 8, 7400, p3.rows[0].id],
      ['Cafe Molido 250g', 'bebidas', 5, 9, 11200, p1.rows[0].id]
    ];

    for (const item of productos) {
      await client.query(
        'INSERT INTO productos (nombre, categoria, stock_actual, stock_minimo, precio, proveedor_id) VALUES ($1, $2, $3, $4, $5, $6)',
        item
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, initDatabase, seedDatabase };

if (require.main === module) {
  (async () => {
    try {
      if (process.argv.includes('--init')) {
        await initDatabase();
        console.log('Esquema PostgreSQL creado correctamente.');
      }
      if (process.argv.includes('--seed')) {
        await initDatabase();
        await seedDatabase();
        console.log('Datos de prueba cargados correctamente.');
      }
      await pool.end();
    } catch (error) {
      console.error('Error inicializando PostgreSQL:', error.message);
      process.exit(1);
    }
  })();
}
