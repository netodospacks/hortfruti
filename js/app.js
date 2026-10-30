/**
 * Mega Hortifruti Delivery - Aplicação Principal
 */

let allProducts = [];
let allCategories = [];
let currentCategory = "todas";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
  await initApp();
  setupEventListeners();
});

async function initApp() {
  await window.catalogRepository.init();
  allProducts = await window.catalogRepository.getProducts();
  allCategories = await window.catalogRepository.getCategories();

  renderCategories();
  renderCatalog();
  updateCartUI();

  // Ouvir alterações do carrinho
  window.cartService.onChange(() => {
    updateCartUI();
  });
}

function setupEventListeners() {
  // Busca em tempo real
  const searchInput = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      clearBtn.style.display = searchQuery ? "block" : "none";
      renderCatalog();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      searchQuery = "";
      clearBtn.style.display = "none";
      renderCatalog();
      searchInput.focus();
    });
  }

  // Drawer do Carrinho
  const openCartBtn = document.getElementById("open-cart-btn");
  const closeCartBtn = document.getElementById("close-cart-btn");
  const cartOverlay = document.getElementById("cart-drawer-overlay");

  if (openCartBtn) openCartBtn.addEventListener("click", openCart);
  if (closeCartBtn) closeCartBtn.addEventListener("click", closeCart);
  if (cartOverlay) {
    cartOverlay.addEventListener("click", (e) => {
      if (e.target === cartOverlay) closeCart();
    });
  }

  // Limpar carrinho
  const clearCartBtn = document.getElementById("clear-cart-btn");
  if (clearCartBtn) {
    clearCartBtn.addEventListener("click", () => {
      if (confirm("Deseja realmente esvaziar todos os itens do carrinho?")) {
        window.cartService.clear();
        showToast("Carrinho esvaziado.");
      }
    });
  }

  // Finalizar via WhatsApp (abre modal de revisão)
  const checkoutBtn = document.getElementById("btn-checkout");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", openOrderReviewModal);
  }

  // Confirmar e Abrir WhatsApp oficial
  const confirmWhatsAppBtn = document.getElementById("btn-confirm-whatsapp");
  if (confirmWhatsAppBtn) {
    confirmWhatsAppBtn.addEventListener("click", sendOrderToWhatsApp);
  }

  // Fechar Review Modal
  const closeReviewModalBtn = document.getElementById("close-review-modal");
  const cancelReviewBtn = document.getElementById("btn-cancel-review");
  const reviewOverlay = document.getElementById("order-review-overlay");

  if (closeReviewModalBtn) closeReviewModalBtn.addEventListener("click", closeOrderReviewModal);
  if (cancelReviewBtn) cancelReviewBtn.addEventListener("click", closeOrderReviewModal);
  if (reviewOverlay) {
    reviewOverlay.addEventListener("click", (e) => {
      if (e.target === reviewOverlay) closeOrderReviewModal();
    });
  }

  // Botão flutuante WhatsApp
  const floatWaBtn = document.getElementById("whatsapp-float-btn");
  if (floatWaBtn) {
    floatWaBtn.addEventListener("click", () => {
      window.open(window.APP_CONFIG.whatsappLink, "_blank");
    });
  }
}

function renderCategories() {
  const container = document.getElementById("categories-bar");
  if (!container) return;

  container.innerHTML = allCategories.map(cat => `
    <button class="category-tab ${currentCategory === cat.id ? 'active' : ''}" onclick="selectCategory('${cat.id}')">
      <i class="fas ${cat.icon || 'fa-tag'}"></i>
      <span>${cat.name}</span>
    </button>
  `).join("");
}

window.selectCategory = function(catId) {
  currentCategory = catId;
  renderCategories();
  renderCatalog();
};

function renderCatalog() {
  const sectionsContainer = document.getElementById("catalog-sections");
  if (!sectionsContainer) return;

  // Filtrar produtos disponíveis / buscados
  let filtered = allProducts.filter(p => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery) || (p.description && p.description.toLowerCase().includes(searchQuery));
    const matchesCat = currentCategory === "todas" || p.category === currentCategory;
    return matchesSearch && matchesCat;
  });

  // Ordenar
  filtered.sort((a, b) => (a.order || 999) - (b.order || 999));

  if (filtered.length === 0) {
    sectionsContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 16px; color: var(--text-muted);">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 12px; color: #cbd5e1;"></i>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main);">Nenhum produto encontrado</h3>
        <p style="margin-top: 4px;">Tente pesquisar por outro nome ou selecione outra categoria.</p>
      </div>
    `;
    return;
  }

  // Se o usuário está filtrando por uma categoria específica ou buscando, exibe em grade direta
  if (currentCategory !== "todas" || searchQuery) {
    const currentCatObj = allCategories.find(c => c.id === currentCategory);
    const title = searchQuery ? `Resultados para "${searchQuery}"` : (currentCatObj ? currentCatObj.name : "Produtos");
    
    sectionsContainer.innerHTML = `
      <section class="catalog-section">
        <div class="section-header">
          <h2 class="section-title">
            <span>${title}</span>
          </h2>
          <span class="section-count">${filtered.length} produto(s)</span>
        </div>
        <div class="products-grid">
          ${filtered.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
    return;
  }

  // Modo padrão (Página inicial com seções temáticas)
  // 1. Frutas do Dia
  const fruitsOfTheDay = allProducts.filter(p => p.isFruitOfTheDay && p.available);
  // 2. Verduras e Folhas
  const verduras = allProducts.filter(p => p.category === "verduras");
  // 3. Legumes
  const legumes = allProducts.filter(p => p.category === "legumes");
  // 4. Temperos e Ervas
  const temperos = allProducts.filter(p => p.category === "temperos");
  // 5. Mercearia e Outros
  const mercearia = allProducts.filter(p => p.category === "mercearia");
  // 6. Demais Frutas
  const outrasFrutas = allProducts.filter(p => p.category === "frutas" && !p.isFruitOfTheDay);

  let html = "";

  if (fruitsOfTheDay.length > 0) {
    html += `
      <section class="catalog-section" id="sec-frutas-do-dia">
        <div class="section-header">
          <h2 class="section-title">
            <span>☀️ Frutas do Dia</span>
          </h2>
          <span class="section-count">${fruitsOfTheDay.length} itens frescos</span>
        </div>
        <div class="products-grid">
          ${fruitsOfTheDay.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  if (verduras.length > 0) {
    html += `
      <section class="catalog-section" id="sec-verduras">
        <div class="section-header">
          <h2 class="section-title">
            <span>🥬 Verduras e Folhas</span>
          </h2>
          <span class="section-count">${verduras.length} produtos</span>
        </div>
        <div class="products-grid">
          ${verduras.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  if (legumes.length > 0) {
    html += `
      <section class="catalog-section" id="sec-legumes">
        <div class="section-header">
          <h2 class="section-title">
            <span>🥕 Legumes Selecionados</span>
          </h2>
          <span class="section-count">${legumes.length} produtos</span>
        </div>
        <div class="products-grid">
          ${legumes.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  if (temperos.length > 0) {
    html += `
      <section class="catalog-section" id="sec-temperos">
        <div class="section-header">
          <h2 class="section-title">
            <span>🌿 Temperos e Ervas Aromáticas</span>
          </h2>
          <span class="section-count">${temperos.length} produtos</span>
        </div>
        <div class="products-grid">
          ${temperos.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  if (mercearia.length > 0) {
    html += `
      <section class="catalog-section" id="sec-mercearia">
        <div class="section-header">
          <h2 class="section-title">
            <span>🍯 Mercearia e Outros Produtos</span>
          </h2>
          <span class="section-count">${mercearia.length} produtos</span>
        </div>
        <div class="products-grid">
          ${mercearia.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  if (outrasFrutas.length > 0) {
    html += `
      <section class="catalog-section" id="sec-outras-frutas">
        <div class="section-header">
          <h2 class="section-title">
            <span>🍎 Mais Frutas Frescas</span>
          </h2>
          <span class="section-count">${outrasFrutas.length} produtos</span>
        </div>
        <div class="products-grid">
          ${outrasFrutas.map(p => createProductCardHTML(p)).join("")}
        </div>
      </section>
    `;
  }

  sectionsContainer.innerHTML = html;
}

function createProductCardHTML(product) {
  const step = Number(product.step) || 1;
  const initialQty = step;
  
  let priceDisplay = "";
  if (product.pendingReview || product.price === null || product.price === undefined) {
    priceDisplay = `<span class="price-pending-text"><i class="fas fa-clock"></i> Preço a confirmar</span>`;
  } else {
    priceDisplay = `
      <span class="card-price">${Utils.formatCurrency(product.price)}</span>
      <span class="card-price-unit">${Utils.formatUnit(product.unit)}</span>
    `;
  }

  let badges = "";
  if (product.isFruitOfTheDay) {
    badges += `<span class="badge-tag fruit-day">Fruta do Dia</span>`;
  }
  if (product.pendingReview) {
    badges += `<span class="badge-tag review" title="${product.reviewReason || 'Pendente de revisão'}">Revisão</span>`;
  }

  const isAvailable = product.available !== false;

  return `
    <article class="product-card" id="card-${product.id}">
      <div class="card-image-box">
        ${badges}
        <img 
          src="${product.image || 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'}" 
          alt="${product.name}" 
          class="card-img" 
          loading="lazy" 
          onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'"
        />
      </div>
      <div class="card-body">
        <div class="card-unit-badge">${Utils.formatUnitBadge(product.unit)}</div>
        <h3 class="card-title" title="${product.name}">${product.name}</h3>
        <p class="card-desc">${product.description || ''}</p>
        
        <div class="card-price-row">
          ${priceDisplay}
        </div>

        <div class="card-actions">
          ${isAvailable ? `
            <div class="qty-control">
              <button class="qty-btn" onclick="stepCardQty('${product.id}', -${step})" aria-label="Diminuir">
                <i class="fas fa-minus"></i>
              </button>
              <input 
                type="number" 
                id="input-qty-${product.id}" 
                class="qty-input" 
                value="${initialQty}" 
                min="${step}" 
                step="${step}" 
                readonly
              />
              <button class="qty-btn" onclick="stepCardQty('${product.id}', ${step})" aria-label="Aumentar">
                <i class="fas fa-plus"></i>
              </button>
            </div>
            <button class="btn-add-cart" id="btn-add-${product.id}" onclick="addToCartFromCard('${product.id}')">
              <i class="fas fa-cart-plus"></i> Adicionar
            </button>
          ` : `
            <div class="btn-unavailable">
              <i class="fas fa-ban"></i> Indisponível
            </div>
          `}
        </div>
      </div>
    </article>
  `;
}

window.stepCardQty = function(productId, delta) {
  const input = document.getElementById(`input-qty-${productId}`);
  if (!input) return;

  const product = allProducts.find(p => p.id === productId);
  const step = product ? (Number(product.step) || 1) : 1;

  let current = Number(input.value) || step;
  let next = current + delta;
  if (next < step) next = step;
  
  input.value = Number(next.toFixed(2));
};

window.addToCartFromCard = function(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const input = document.getElementById(`input-qty-${productId}`);
  const qty = input ? Number(input.value) : (product.step || 1);

  const success = window.cartService.addItem(product, qty);
  if (success) {
    showToast(`Adicionado: ${product.name} (${Utils.formatQuantity(qty, product.unit)})`);
    
    // Feedback visual momentâneo no botão
    const btn = document.getElementById(`btn-add-${productId}`);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<i class="fas fa-check"></i> Adicionado!`;
      btn.classList.add("added");
      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove("added");
      }, 1200);
    }
  }
};

function updateCartUI() {
  const items = window.cartService.getItems();
  const count = window.cartService.getItemCount();
  const calcs = window.cartService.getCalculations();

  // Contador no header
  const badge = document.getElementById("cart-badge");
  if (badge) {
    badge.textContent = count;
  }

  // Lista de itens no Drawer
  const container = document.getElementById("cart-items-container");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty-state">
        <i class="fas fa-shopping-basket cart-empty-icon"></i>
        <h4>Seu carrinho está vazio</h4>
        <p style="font-size: 0.85rem; margin-top: 6px;">Escolha produtos frescos no catálogo e monte seu pedido para o WhatsApp.</p>
      </div>
    `;
    const footerSubtotal = document.getElementById("cart-summary-total");
    if (footerSubtotal) footerSubtotal.textContent = "R$ 0,00";
    return;
  }

  container.innerHTML = items.map(item => {
    const p = item.product;
    const isPending = p.pendingReview || p.price === null || p.price === undefined;
    const unitPriceStr = isPending ? "Preço a confirmar" : `${Utils.formatCurrency(p.price)} ${Utils.formatUnit(p.unit)}`;
    const subtotalStr = isPending ? "A confirmar" : Utils.formatCurrency(p.price * item.quantity);

    return `
      <div class="cart-item">
        <img src="${p.image || ''}" alt="${p.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'">
        <div class="cart-item-info">
          <div class="cart-item-top">
            <div>
              <div class="cart-item-name">${p.name}</div>
              <div class="cart-item-unit-price">${unitPriceStr}</div>
            </div>
            <button class="cart-item-remove" onclick="window.cartService.removeItem('${p.id}')" title="Remover item">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>

          <div class="cart-item-bottom">
            <div class="qty-control" style="height: 28px; width: 110px;">
              <button class="qty-btn" style="width: 28px;" onclick="window.cartService.decrement('${p.id}')">
                <i class="fas fa-minus" style="font-size: 10px;"></i>
              </button>
              <input type="number" class="qty-input" style="font-size: 0.85rem;" value="${item.quantity}" readonly />
              <button class="qty-btn" style="width: 28px;" onclick="window.cartService.increment('${p.id}')">
                <i class="fas fa-plus" style="font-size: 10px;"></i>
              </button>
            </div>
            <div class="cart-item-subtotal">${subtotalStr}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const footerSubtotal = document.getElementById("cart-summary-total");
  if (footerSubtotal) {
    if (calcs.hasUnconfirmedPrices) {
      footerSubtotal.innerHTML = `${Utils.formatCurrency(calcs.subtotal)} <small style="font-size: 0.75rem; color: #d97706;">(+ pendentes)</small>`;
    } else {
      footerSubtotal.textContent = Utils.formatCurrency(calcs.subtotal);
    }
  }
}

function openCart() {
  const overlay = document.getElementById("cart-drawer-overlay");
  if (overlay) overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  const overlay = document.getElementById("cart-drawer-overlay");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
}

function openOrderReviewModal() {
  if (window.cartService.getItemCount() === 0) {
    alert("Seu carrinho está vazio. Adicione produtos antes de finalizar.");
    return;
  }

  const customerName = document.getElementById("cart-customer-name")?.value || "";
  const deliveryNote = document.getElementById("cart-customer-note")?.value || "";

  const previewMessage = window.cartService.generateWhatsAppMessage(customerName, deliveryNote);
  const previewBox = document.getElementById("review-message-preview");
  if (previewBox) {
    previewBox.textContent = previewMessage;
  }

  const reviewOverlay = document.getElementById("order-review-overlay");
  if (reviewOverlay) reviewOverlay.classList.add("active");
}

function closeOrderReviewModal() {
  const reviewOverlay = document.getElementById("order-review-overlay");
  if (reviewOverlay) reviewOverlay.classList.remove("active");
}

function sendOrderToWhatsApp() {
  const customerName = document.getElementById("cart-customer-name")?.value || "";
  const deliveryNote = document.getElementById("cart-customer-note")?.value || "";
  const message = window.cartService.generateWhatsAppMessage(customerName, deliveryNote);

  const url = Utils.buildWhatsAppLink(message);
  window.open(url, "_blank");
  closeOrderReviewModal();
  closeCart();
}

function showToast(message) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i class="fas fa-check-circle" style="color: #22c55e;"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

