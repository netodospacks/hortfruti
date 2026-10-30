/**
 * Utilitários para formatação e manipulação de carrinho/WhatsApp
 */

const Utils = {
  formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return "Sob consulta";
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  },

  formatUnit(unit) {
    const map = {
      "kg": "/kg",
      "und": "/und",
      "100g": "/100g",
      "mc": "/maço",
      "cx": "/cx",
      "bdja": "/bdja",
      "sc": "/saco",
      "lt": "/litro",
      "cento": "/cento"
    };
    return map[unit] || `/${unit}`;
  },

  formatUnitBadge(unit) {
    const map = {
      "kg": "Quilograma (kg)",
      "und": "Unidade (und)",
      "100g": "Porção 100g",
      "mc": "Maço (mc)",
      "cx": "Caixa (cx)",
      "bdja": "Bandeja (bdja)",
      "sc": "Saco (sc)",
      "lt": "Litro (lt)",
      "cento": "Cento"
    };
    return map[unit] || unit.toUpperCase();
  },

  formatQuantity(qty, unit) {
    const num = Number(qty);
    if (unit === "kg" && !Number.isInteger(num)) {
      return num.toFixed(2).replace(".", ",") + " kg";
    }
    if (unit === "100g") {
      return num + "x 100g (" + (num * 100) + "g)";
    }
    return num + " " + unit;
  },

  buildWhatsAppLink(message) {
    const phone = window.APP_CONFIG.whatsappNumber;
    const encoded = encodeURIComponent(message);
    return `https://api.whatsapp.com/send/?phone=${phone}&text=${encoded}&type=phone_number&app_absent=0`;
  }
};

window.Utils = Utils;

