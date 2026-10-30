/**
 * Painel Administrativo Local - Mega Hortifruti Delivery
 * Gerenciamento de Produtos, Categorias, Importação/Exportação JSON e CSV
 */

let adminProducts = [];
let adminCategories = [];
let adminFilterQuery = "";
let adminFilterCategory = "all";
let adminFilterReview = "all";

document.addEventListener("DOMContentLoaded", async () => {
  await loadAdminData();
  setupAdminListeners();
});

async function loadAdminData() {
  await window.catalogRepository.init();
  adminProducts = await window.catalogRepository.getProducts();
  adminCategories = await window.catalogRepository.getCategories();
  
  populateCategorySelects();
  renderAdminTable();
  updateAdminStats();
}

function updateAdminStats() {
  const total = adminProducts.length;
  const pending = adminProducts.filter(p => p.pendingReview).length;
  const available = adminProducts.filter(p => p.available).length;
  const fruitOfDay = adminProducts.filter(p => p.isFruitOfTheDay).length;

  const statTotal = document.getElementById("stat-total");
  const statPending = document.getElementById("stat-pending");
  const statAvailable = document.getElementById("stat-available");
  const statFruits = document.getElementById("stat-fruits");

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statAvailable) statAvailable.textContent = available;
  if (statFruits) statFruits.textContent = fruitOfDay;
}

function populateCategorySelects() {
  const filterSelect = document.getElementById("admin-filter-category");
  const formCatSelect = document.getElementById("prod-category");

  if (filterSelect) {
    const catsToOptions = adminCategories
      .filter(c => c.id !== "todas")
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    filterSelect.innerHTML = `<option value="all">Todas as Categorias</option>` + catsToOptions;
  }

  if (formCatSelect) {
    const catsToOptions = adminCategories
      .filter(c => c.id !== "todas")
      .map(c => `<option value="${c.id}">${c.name}</option>`)
      .join("");
    formCatSelect.innerHTML = catsToOptions;
  }
}

function renderAdminTable() {
  const tbody = document.getElementById("admin-products-tbody");
  if (!tbody) return;

  let filtered = adminProducts.filter(p => {
    const matchesSearch = !adminFilterQuery || p.name.toLowerCase().includes(adminFilterQuery) || p.id.toLowerCase().includes(adminFilterQuery);
    const matchesCat = adminFilterCategory === "all" || p.category === adminFilterCategory;
    const matchesReview = adminFilterReview === "all" ? true : (adminFilterReview === "review" ? p.pendingReview : !p.pendingReview);
    return matchesSearch && matchesCat && matchesReview;
  });

  filtered.sort((a, b) => (a.order || 999) - (b.order || 999));

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
          Nenhum produto corresponde aos filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const isPending = p.pendingReview;
    const priceText = (p.price !== null && p.price !== undefined) ? Utils.formatCurrency(p.price) : '<span style="color: #dc2626; font-weight: 700;">Em branco</span>';

    return `
      <tr>
        <td style="width: 50px;">
          <img src="${p.image || ''}" alt="" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'">
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${p.name}</div>
          <div style="font-size: 0.72rem; color: var(--text-light); font-family: monospace;">ID: ${p.id} | Ordem: ${p.order || '-'}</div>
        </td>
        <td>
          <span style="text-transform: capitalize; font-weight: 600;">${p.category}</span>
        </td>
        <td>
          <div style="font-weight: 700;">${priceText}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${Utils.formatUnitBadge(p.unit)} (passo: ${p.step || 1})</div>
        </td>
        <td>
          <span class="badge-status ${p.available ? 'active' : 'inactive'}">${p.available ? 'Disponível' : 'Indisponível'}</span>
          ${p.isFruitOfTheDay ? '<span class="badge-status" style="background:#fef3c7; color:#b45309; margin-left:4px;">Fruta do Dia</span>' : ''}
          ${isPending ? `<div style="margin-top: 4px;"><span class="badge-status review" title="${p.reviewReason || ''}">⚠️ Revisão Pendente</span></div>` : ''}
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-action edit" onclick="editProduct('${p.id}')" title="Editar produto" style="color: var(--primary); padding: 6px 8px;">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-action delete" onclick="deleteProduct('${p.id}')" title="Excluir produto" style="color: var(--danger); padding: 6px 8px;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function setupAdminListeners() {
  // Filtros
  const searchInput = document.getElementById("admin-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      adminFilterQuery = e.target.value.toLowerCase().trim();
      renderAdminTable();
    });
  }

  const catSelect = document.getElementById("admin-filter-category");
  if (catSelect) {
    catSelect.addEventListener("change", (e) => {
      adminFilterCategory = e.target.value;
      renderAdminTable();
    });
  }

  const revSelect = document.getElementById("admin-filter-review");
  if (revSelect) {
    revSelect.addEventListener("change", (e) => {
      adminFilterReview = e.target.value;
      renderAdminTable();
    });
  }

  // Novo Produto
  const newProdBtn = document.getElementById("btn-new-product");
  if (newProdBtn) {
    newProdBtn.addEventListener("click", () => {
      openProductModal();
    });
  }

  // Salvar Produto Form
  const prodForm = document.getElementById("product-form");
  if (prodForm) {
    prodForm.addEventListener("submit", handleSaveProduct);
  }

  // Fechar Modal de Produto
  const closeProdModal = document.getElementById("close-product-modal");
  const cancelProdModal = document.getElementById("btn-cancel-prod-modal");
  const prodModalOverlay = document.getElementById("product-modal-overlay");

  if (closeProdModal) closeProdModal.addEventListener("click", closeProductModal);
  if (cancelProdModal) cancelProdModal.addEventListener("click", closeProductModal);
  if (prodModalOverlay) {
    prodModalOverlay.addEventListener("click", (e) => {
      if (e.target === prodModalOverlay) closeProductModal();
    });
  }

  // Exportar JSON
  const btnExportJson = document.getElementById("btn-export-json");
  if (btnExportJson) {
    btnExportJson.addEventListener("click", exportJSON);
  }

  // Exportar CSV
  const btnExportCsv = document.getElementById("btn-export-csv");
  if (btnExportCsv) {
    btnExportCsv.addEventListener("click", exportCSV);
  }

  // Importar JSON
  const btnImportJson = document.getElementById("btn-import-json");
  const fileInputJson = document.getElementById("file-import-json");
  if (btnImportJson && fileInputJson) {
    btnImportJson.addEventListener("click", () => fileInputJson.click());
    fileInputJson.addEventListener("change", handleFileImport);
  }

  // Resetar Catálogo para o Original da Tabela
  const btnReset = document.getElementById("btn-reset-defaults");
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      if (confirm("ATENÇÃO: Deseja redefinir todo o catálogo para a tabela original de referência? Alterações locais não salvas em backup serão perdidas.")) {
        const res = await window.catalogRepository.resetToDefaults();
        if (res.success) {
          alert(`Catálogo redefinido com sucesso! ${res.count} produtos carregados.`);
          await loadAdminData();
        } else {
          alert("Erro ao redefinir: " + res.error);
        }
      }
    });
  }
}

function openProductModal(product = null) {
  const overlay = document.getElementById("product-modal-overlay");
  const modalTitle = document.getElementById("product-modal-title");
  const form = document.getElementById("product-form");

  if (!overlay || !form) return;

  form.reset();

  if (product) {
    modalTitle.textContent = "Editar Produto";
    document.getElementById("prod-id").value = product.id;
    document.getElementById("prod-name").value = product.name || "";
    document.getElementById("prod-category").value = product.category || "frutas";
    document.getElementById("prod-price").value = (product.price !== null && product.price !== undefined) ? product.price : "";
    document.getElementById("prod-unit").value = product.unit || "kg";
    document.getElementById("prod-step").value = product.step || 1;
    document.getElementById("prod-order").value = product.order || 99;
    document.getElementById("prod-image").value = product.image || "";
    document.getElementById("prod-desc").value = product.description || "";
    document.getElementById("prod-available").checked = Boolean(product.available);
    document.getElementById("prod-fruit-day").checked = Boolean(product.isFruitOfTheDay);
    document.getElementById("prod-featured").checked = Boolean(product.isFeatured);
    document.getElementById("prod-pending").checked = Boolean(product.pendingReview);
    document.getElementById("prod-review-reason").value = product.reviewReason || "";
  } else {
    modalTitle.textContent = "Cadastrar Novo Produto";
    document.getElementById("prod-id").value = "";
    document.getElementById("prod-step").value = "1";
    document.getElementById("prod-order").value = adminProducts.length + 1;
    document.getElementById("prod-available").checked = true;
    document.getElementById("prod-fruit-day").checked = false;
    document.getElementById("prod-featured").checked = false;
    document.getElementById("prod-pending").checked = false;
  }

  overlay.classList.add("active");
}

function closeProductModal() {
  const overlay = document.getElementById("product-modal-overlay");
  if (overlay) overlay.classList.remove("active");
}

window.editProduct = function(productId) {
  const product = adminProducts.find(p => p.id === productId);
  if (product) {
    openProductModal(product);
  }
};

window.deleteProduct = async function(productId) {
  const product = adminProducts.find(p => p.id === productId);
  if (!product) return;

  if (confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
    await window.catalogRepository.deleteProduct(productId);
    await loadAdminData();
    alert("Produto excluído com sucesso.");
  }
};

async function handleSaveProduct(e) {
  e.preventDefault();

  const idInput = document.getElementById("prod-id").value.trim();
  const name = document.getElementById("prod-name").value.trim();
  const category = document.getElementById("prod-category").value;
  const priceVal = document.getElementById("prod-price").value.trim();
  const unit = document.getElementById("prod-unit").value;
  const step = parseFloat(document.getElementById("prod-step").value) || 1;
  const order = parseInt(document.getElementById("prod-order").value) || 99;
  const image = document.getElementById("prod-image").value.trim();
  const description = document.getElementById("prod-desc").value.trim();
  const available = document.getElementById("prod-available").checked;
  const isFruitOfTheDay = document.getElementById("prod-fruit-day").checked;
  const isFeatured = document.getElementById("prod-featured").checked;
  const pendingReview = document.getElementById("prod-pending").checked;
  const reviewReason = document.getElementById("prod-review-reason").value.trim();

  if (!name) {
    alert("Por favor, informe o nome do produto.");
    return;
  }

  const generatedId = idInput || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

  const productData = {
    id: generatedId,
    name,
    category,
    price: priceVal !== "" ? parseFloat(priceVal) : null,
    unit,
    step,
    order,
    image,
    description,
    available,
    isFruitOfTheDay,
    isFeatured,
    pendingReview,
    reviewReason
  };

  await window.catalogRepository.saveProduct(productData);
  closeProductModal();
  await loadAdminData();
  alert(`Produto "${name}" salvo com sucesso!`);
}

async function exportJSON() {
  const data = await window.catalogRepository.exportDataJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mega_hortifruti_catalogo_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportCSV() {
  const csv = await window.catalogRepository.exportProductsCSV();
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mega_hortifruti_produtos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (confirm(`Confirma a importação de ${parsed.products ? parsed.products.length : 0} produtos? Isso substituirá os dados locais atuais.`)) {
        const res = await window.catalogRepository.importDataJSON(parsed);
        alert(`Importação concluída com sucesso! ${res.count} produtos atualizados.`);
        await loadAdminData();
      }
    } catch (err) {
      alert("Falha ao importar arquivo JSON: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

