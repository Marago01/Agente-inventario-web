const api = {
  productos: '/api/productos',
  bajoStock: '/api/productos/bajo-stock',
  reabastecimiento: '/api/reabastecimiento',
  agente: '/api/agente',
  resumen: '/api/resumen'
};

const resultsBody = document.getElementById('resultsBody');
const tableTitle = document.getElementById('tableTitle');
const stats = document.getElementById('stats');
const responseBox = document.getElementById('agentResponse');

function renderRows(rows = []) {
  resultsBody.innerHTML = rows.length ? rows.map(item => `
    <tr>
      <td>${item.nombre || item.producto}</td>
      <td>${item.categoria || '-'}</td>
      <td>${item.stock_actual ?? '-'}</td>
      <td>${item.stock_minimo ?? '-'}</td>
      <td>${item.precio ? '$' + Number(item.precio).toLocaleString('es-CO') : '-'}</td>
      <td>${item.proveedor_nombre || item.proveedor || '-'}</td>
    </tr>
  `).join('') : '<tr><td colspan="6">No hay resultados.</td></tr>';
}

function renderStats(data) {
  stats.innerHTML = `
    <div class="stat-card"><span>Total productos</span><strong>${data.totalProductos}</strong></div>
    <div class="stat-card"><span>Bajo stock</span><strong>${data.bajoStock}</strong></div>
    <div class="stat-card"><span>Movimientos</span><strong>${data.movimientos}</strong></div>
    <div class="stat-card"><span>Proveedores</span><strong>${data.proveedores}</strong></div>
  `;
}

async function cargarResumen() {
  const res = await fetch(api.resumen);
  const data = await res.json();
  renderStats(data);
}

async function cargarProductos(query = '') {
  const res = await fetch(`${api.productos}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  tableTitle.textContent = 'Inventario';
  renderRows(data);
}

async function cargarBajoStock() {
  const res = await fetch(api.bajoStock);
  const data = await res.json();
  tableTitle.textContent = 'Bajo stock';
  renderRows(data);
}

async function cargarReabastecimiento() {
  const res = await fetch(api.reabastecimiento);
  const data = await res.json();
  tableTitle.textContent = 'Reabastecimiento';
  renderRows(data.recomendaciones || []);
}

document.getElementById('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('search').value;
  await cargarProductos(query);
});

document.getElementById('agentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mensaje = document.getElementById('mensaje').value.trim();
  if (!mensaje) return;

  const res = await fetch(api.agente, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensaje })
  });
  const data = await res.json();
  responseBox.textContent = data.respuesta || data.error || 'Sin respuesta';

  if (Array.isArray(data.data)) renderRows(data.data);
  if (data.data?.recomendaciones) renderRows(data.data.recomendaciones);

  await cargarResumen();
});

document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;
    if (action === 'load-products') await cargarProductos();
    if (action === 'low-stock') await cargarBajoStock();
    if (action === 'restock') await cargarReabastecimiento();
  });
});

(function () {
  const toggle = document.querySelector('[data-theme-toggle]');
  let dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const apply = () => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    toggle.textContent = dark ? '☀️' : '🌙';
  };
  apply();
  toggle.addEventListener('click', () => { dark = !dark; apply(); });
})();

cargarResumen();
cargarProductos();
