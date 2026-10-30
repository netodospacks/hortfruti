/**
 * Mega Hortifruti Delivery - Repository Pattern
 * Abstrai o acesso aos dados para permitir transição futura transparente para Supabase.
 * 
 * LocalCatalogRepository -> SupabaseCatalogRepository (futuro)
 */

class ICatalogRepository {
  async getProducts() { throw new Error("Not implemented"); }
  async getProductById(id) { throw new Error("Not implemented"); }
  async saveProduct(product) { throw new Error("Not implemented"); }
  async deleteProduct(id) { throw new Error("Not implemented"); }
  async getCategories() { throw new Error("Not implemented"); }
  async saveCategory(category) { throw new Error("Not implemented"); }
  async resetToDefaults() { throw new Error("Not implemented"); }
  async exportDataJSON() { throw new Error("Not implemented"); }
  async importDataJSON(jsonData) { throw new Error("Not implemented"); }
}

class LocalCatalogRepository extends ICatalogRepository {
  constructor() {
    super();
    this.storageKeys = window.APP_CONFIG.storageKeys;
  }

  async init() {
    const existing = localStorage.getItem(this.storageKeys.products);
    if (!existing) {
      await this.resetToDefaults();
    }
  }

  async resetToDefaults() {
    try {
      let defaultProducts = null;
      let defaultCategories = null;

      if (window.SEED_DATA && window.SEED_DATA.products) {
        defaultProducts = window.SEED_DATA.products;
        defaultCategories = window.SEED_DATA.categories;
      } else {
        const prodRes = await fetch("data/initial-products.json");
        defaultProducts = await prodRes.json();

        const catRes = await fetch("data/categories.json");
        defaultCategories = await catRes.json();
      }

      localStorage.setItem(this.storageKeys.products, JSON.stringify(defaultProducts));
      localStorage.setItem(this.storageKeys.categories, JSON.stringify(defaultCategories));

      return { success: true, count: defaultProducts.length };
    } catch (e) {
      console.error("Falha ao carregar defaults:", e);
      if (window.SEED_DATA && window.SEED_DATA.products) {
        localStorage.setItem(this.storageKeys.products, JSON.stringify(window.SEED_DATA.products));
        localStorage.setItem(this.storageKeys.categories, JSON.stringify(window.SEED_DATA.categories));
        return { success: true, count: window.SEED_DATA.products.length };
      }
      return { success: false, error: e.message };
    }
  }

  async getProducts() {
    const raw = localStorage.getItem(this.storageKeys.products);
    if (!raw) {
      await this.init();
      return JSON.parse(localStorage.getItem(this.storageKeys.products) || "[]");
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Erro ao fazer parse dos produtos:", e);
      return [];
    }
  }

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  async saveProduct(productData) {
    const products = await this.getProducts();
    const cleanProduct = { ...productData };
    
    // Garantir tipos corretos
    if (cleanProduct.price !== null && cleanProduct.price !== "" && !isNaN(cleanProduct.price)) {
      cleanProduct.price = Number(cleanProduct.price);
    } else {
      cleanProduct.price = null;
    }
    cleanProduct.step = Number(cleanProduct.step) || 1;
    cleanProduct.order = Number(cleanProduct.order) || (products.length + 1);
    cleanProduct.available = Boolean(cleanProduct.available);
    cleanProduct.isFruitOfTheDay = Boolean(cleanProduct.isFruitOfTheDay);
    cleanProduct.isFeatured = Boolean(cleanProduct.isFeatured);
    cleanProduct.pendingReview = Boolean(cleanProduct.pendingReview);

    const index = products.findIndex(p => p.id === cleanProduct.id);
    if (index >= 0) {
      products[index] = cleanProduct;
    } else {
      if (!cleanProduct.id) {
        cleanProduct.id = "prod-" + Date.now();
      }
      products.push(cleanProduct);
    }

    localStorage.setItem(this.storageKeys.products, JSON.stringify(products));
    return cleanProduct;
  }

  async deleteProduct(id) {
    let products = await this.getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem(this.storageKeys.products, JSON.stringify(products));
    return true;
  }

  async getCategories() {
    const raw = localStorage.getItem(this.storageKeys.categories);
    if (!raw) {
      await this.init();
      return JSON.parse(localStorage.getItem(this.storageKeys.categories) || "[]");
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  async saveCategory(category) {
    const categories = await this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(this.storageKeys.categories, JSON.stringify(categories));
    return category;
  }

  async exportDataJSON() {
    const products = await this.getProducts();
    const categories = await this.getCategories();
    return {
      exportedAt: new Date().toISOString(),
      company: window.APP_CONFIG.companyName,
      whatsapp: window.APP_CONFIG.whatsappNumber,
      categories,
      products
    };
  }

  async importDataJSON(parsedData) {
    if (!parsedData || !Array.isArray(parsedData.products)) {
      throw new Error("Arquivo JSON inválido. Deve conter uma lista 'products'.");
    }
    localStorage.setItem(this.storageKeys.products, JSON.stringify(parsedData.products));
    if (Array.isArray(parsedData.categories)) {
      localStorage.setItem(this.storageKeys.categories, JSON.stringify(parsedData.categories));
    }
    return { success: true, count: parsedData.products.length };
  }

  async exportProductsCSV() {
    const products = await this.getProducts();
    const headers = ["id", "name", "category", "price", "unit", "available", "isFruitOfTheDay", "isFeatured", "step", "pendingReview", "reviewReason", "description"];
    const rows = [headers.join(";")];
    
    for (const p of products) {
      const row = [
        `"${p.id || ""}"`,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${p.category || ""}"`,
        p.price !== null && p.price !== undefined ? p.price : "",
        `"${p.unit || ""}"`,
        p.available ? "true" : "false",
        p.isFruitOfTheDay ? "true" : "false",
        p.isFeatured ? "true" : "false",
        p.step || 1,
        p.pendingReview ? "true" : "false",
        `"${(p.reviewReason || "").replace(/"/g, '""')}"`,
        `"${(p.description || "").replace(/"/g, '""')}"`
      ];
      rows.push(row.join(";"));
    }
    return rows.join("\r\n");
  }
}

// Instância singleton inicializada
window.catalogRepository = new LocalCatalogRepository();
