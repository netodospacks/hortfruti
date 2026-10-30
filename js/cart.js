/**
 * Gerenciamento do Carrinho de Compras com Persistência em LocalStorage
 */

class CartService {
  constructor() {
    this.storageKey = window.APP_CONFIG.storageKeys.cart;
    this.items = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Erro ao carregar carrinho:", e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      this.notify();
    } catch (e) {
      console.error("Erro ao salvar carrinho:", e);
    }
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.items);
      } catch (e) {
        console.error("Erro em listener do carrinho:", e);
      }
    }
  }

  addItem(product, quantity = null) {
    if (!product.available) {
      alert("Este produto está temporariamente indisponível.");
      return false;
    }

    const step = Number(product.step) || 1;
    const addQty = quantity !== null ? Number(quantity) : step;

    const existingIndex = this.items.findIndex(item => item.product.id === product.id);
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity = Number((this.items[existingIndex].quantity + addQty).toFixed(2));
    } else {
      this.items.push({
        product: { ...product },
        quantity: Number(addQty.toFixed(2))
      });
    }

    this.save();
    return true;
  }

  updateQuantity(productId, newQty) {
    const qty = Number(newQty);
    if (isNaN(qty) || qty <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.items.find(i => i.product.id === productId);
    if (item) {
      item.quantity = Number(qty.toFixed(2));
      this.save();
    }
  }

  increment(productId) {
    const item = this.items.find(i => i.product.id === productId);
    if (item) {
      const step = Number(item.product.step) || 1;
      item.quantity = Number((item.quantity + step).toFixed(2));
      this.save();
    }
  }

  decrement(productId) {
    const item = this.items.find(i => i.product.id === productId);
    if (item) {
      const step = Number(item.product.step) || 1;
      const nextQty = Number((item.quantity - step).toFixed(2));
      if (nextQty <= 0) {
        this.removeItem(productId);
      } else {
        item.quantity = nextQty;
        this.save();
      }
    }
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.product.id !== productId);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }

  getItems() {
    return this.items;
  }

  getItemCount() {
    return this.items.length;
  }

  getTotalQuantity() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  getCalculations() {
    let subtotal = 0;
    let hasUnconfirmedPrices = false;
    let confirmedCount = 0;
    let pendingCount = 0;

    for (const item of this.items) {
      const p = item.product;
      if (p.price !== null && p.price !== undefined && !isNaN(p.price) && !p.pendingReview) {
        subtotal += p.price * item.quantity;
        confirmedCount++;
      } else {
        hasUnconfirmedPrices = true;
        pendingCount++;
      }
    }

    return {
      subtotal: Number(subtotal.toFixed(2)),
      hasUnconfirmedPrices,
      confirmedCount,
      pendingCount
    };
  }

  generateWhatsAppMessage(customerName = "", deliveryNote = "") {
    const calcs = this.getCalculations();
    
    let msg = `Olá! Gostaria de fazer um pedido para a ${window.APP_CONFIG.companyName}.\n\n`;
    
    if (customerName.trim()) {
      msg += `👤 Cliente: ${customerName.trim()}\n`;
    }
    if (deliveryNote.trim()) {
      msg += `📍 Obs/Entrega: ${deliveryNote.trim()}\n`;
    }
    if (customerName.trim() || deliveryNote.trim()) {
      msg += `\n`;
    }

    msg += `Meu pedido:\n\n`;

    for (const item of this.items) {
      const p = item.product;
      const qtyStr = Utils.formatQuantity(item.quantity, p.unit);
      
      if (p.price !== null && p.price !== undefined && !isNaN(p.price) && !p.pendingReview) {
        const itemSubtotal = Utils.formatCurrency(p.price * item.quantity);
        const itemUnit = Utils.formatCurrency(p.price);
        msg += `• ${p.name} — ${qtyStr} — ${itemUnit}${Utils.formatUnit(p.unit)} — Subtotal: ${itemSubtotal}\n`;
      } else {
        msg += `• ${p.name} — ${qtyStr} — Preço a confirmar\n`;
      }
    }

    msg += `\n`;

    if (calcs.hasUnconfirmedPrices) {
      msg += `Total estimado dos itens com preço: ${Utils.formatCurrency(calcs.subtotal)} (+ itens com valor a confirmar)\n`;
    } else {
      msg += `Total estimado: ${Utils.formatCurrency(calcs.subtotal)}\n`;
    }

    msg += `\nPor favor, confirme a disponibilidade dos produtos e o valor final do pedido.\n\nObrigado!`;

    return msg;
  }
}

window.cartService = new CartService();

