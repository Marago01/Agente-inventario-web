# Agente inteligente de inventario web con Groq y PostgreSQL

App web para inventario con Node.js, PostgreSQL y un agente que interpreta pedidos en lenguaje natural con Groq.


## Variables de entorno

Usa solo estas variables en `.env`:

```env
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=agente_inventario
PGUSER=postgres
PGPASSWORD=tu_password_de_postgres
GROQ_API_KEY=gsk_tu_api_key_real
GROQ_MODEL=llama-3.3-70b-versatile
```

## Preparar PostgreSQL

1. Crea la base `agente_inventario`.
2. Ajusta `PGUSER` y `PGPASSWORD` en `.env`.
3. Ejecuta:

```bash
npm install
npm run init-db
npm run seed-db
npm start
```

## Qué hace

- Buscar productos.
- Registrar entradas y salidas.
- Ver stock bajo.
- Recomendar reabastecimiento. (mejorar)
- Usar Groq para interpretar mensajes. (mejorar)
