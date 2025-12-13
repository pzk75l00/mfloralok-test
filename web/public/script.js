document.addEventListener('DOMContentLoaded', () => {
  const loadBtn = document.getElementById('loadProducts');
  const productsDiv = document.getElementById('products');
  const rubroSelect = document.getElementById('rubro');
  const demoForm = document.getElementById('demoForm');
  const demoResult = document.getElementById('demoResult');

  function renderProducts(list) {
    productsDiv.innerHTML = '';
    list.forEach(p => {
      const el = document.createElement('div');
      el.className = 'product';
      el.innerHTML = `<strong>${p.name}</strong><div>$ ${p.price}</div>`;
      productsDiv.appendChild(el);
    });
  }

  async function fetchProducts(rubro) {
    try {
      const res = await fetch(`/api/demo/products?rubro=${encodeURIComponent(rubro)}`);
      const json = await res.json();
      return json.products || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  loadBtn && loadBtn.addEventListener('click', async () => {
    const r = rubroSelect.value;
    loadBtn.disabled = true;
    loadBtn.textContent = 'Cargando...';
    const list = await fetchProducts(r);
    renderProducts(list);
    loadBtn.disabled = false;
    loadBtn.textContent = 'Ver productos';
  });

  demoForm && demoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(demoForm);
    const payload = Object.fromEntries(fd.entries());
    demoResult.textContent = 'Enviando...';
    try {
      const res = await fetch('/api/demo/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await res.json();
      if (j.ok) demoResult.textContent = 'Solicitud enviada. Te contactaremos pronto.';
      else demoResult.textContent = 'Error al enviar, intentá de nuevo.';
    } catch (err) {
      demoResult.textContent = 'Error de red.';
    }
    setTimeout(() => demoResult.textContent = '', 6000);
    demoForm.reset();
  });
});
