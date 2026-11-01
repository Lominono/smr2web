/**
 * Motor de traducción dinámica al español e integración económica para Farmhand en SMR2.
 */
(function () {
  const DICTIONARY = {
    // Acciones principales
    'Buy': 'Comprar',
    'Sell': 'Vender',
    'Plant': 'Sembrar',
    'Harvest': 'Cosechar',
    'Feed': 'Alimentar',
    'Close': 'Cerrar',
    'Open': 'Abrir',
    'Unlock': 'Desbloquear',
    'Upgrade': 'Mejorar',
    'Reset': 'Reiniciar',
    'Settings': 'Ajustes',

    // Cultivos y semillas
    'Blueberry': 'Arándano',
    'Blueberries': 'Arándanos',
    'Blueberry Seeds': 'Semillas de arándano',
    'Blueberry Seed': 'Semilla de arándano',
    'Corn': 'Maíz',
    'Corn Seeds': 'Semillas de maíz',
    'Corn Seed': 'Semilla de maíz',
    'Strawberry': 'Fresa',
    'Strawberries': 'Fresas',
    'Strawberry Seeds': 'Semillas de fresa',
    'Strawberry Seed': 'Semilla de fresa',
    'Pumpkin': 'Calabaza',
    'Pumpkins': 'Calabazas',
    'Pumpkin Seeds': 'Semillas de calabaza',
    'Pumpkin Seed': 'Semilla de calabaza',
    'Coffee': 'Café',
    'Coffee Bean': 'Grano de café',
    'Coffee Beans': 'Granos de café',
    'Coffee Seeds': 'Semillas de café',

    // Animales y productos
    'Cow': 'Vaca',
    'Cows': 'Vacas',
    'Cow Feed': 'Pienso de vaca',
    'Milk': 'Leche',
    'Chicken': 'Gallina',
    'Chickens': 'Gallinas',
    'Chicken Feed': 'Pienso de gallina',
    'Egg': 'Huevo',
    'Eggs': 'Huevos',

    // Pestañas y secciones
    'Seeds': 'Semillas',
    'Animals': 'Animales',
    'Plots': 'Parcelas',
    'Plot': 'Parcela',
    'Market': 'Mercado',
    'Inventory': 'Inventario',
    'Scarecrow': 'Espantapájaros',
    'Scarecrows': 'Espantapájaros',
    'Tumbleweed': 'Estepicursora',

    // Economía y estadísticas
    'Gold': 'Monedas',
    'Coins': 'Fichas',
    'Cost': 'Coste',
    'Price': 'Precio',
    'Total': 'Total',
    'Level': 'Nivel',
    'XP': 'EXP',
    'Capacity': 'Capacidad',
    'Locked': 'Bloqueado',
    'Unlocked': 'Desbloqueado',

    // Notificaciones
    'Your inventory is full!': '¡Tu inventario está lleno! Vende en el mercado.',
    "You're out of cow feed!": '¡Te has quedado sin pienso para vacas!',
    'Welcome back!': '¡Bienvenido de nuevo a la granja!',
    'You earned': 'Has conseguido',
    'while you were away!': 'mientras estabas fuera.',
    'Offline Earnings': 'Ganancias acumuladas',
  };

  function translateText(text) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (DICTIONARY[trimmed]) {
      return text.replace(trimmed, DICTIONARY[trimmed]);
    }

    // Comprobaciones parciales inteligentes
    for (const [en, es] of Object.entries(DICTIONARY)) {
      if (trimmed.includes(en) && en.length > 3) {
        return text.replace(new RegExp(`\\b${en}\\b`, 'g'), es);
      }
    }
    return text;
  }

  function walkAndTranslate(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const original = node.nodeValue;
      const translated = translateText(original);
      if (translated !== original) {
        node.nodeValue = translated;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      // Traducir atributos comunes
      if (node.title) node.title = translateText(node.title);
      if (node.placeholder) node.placeholder = translateText(node.placeholder);

      // Recorrer hijos
      for (let child = node.firstChild; child; child = child.nextSibling) {
        walkAndTranslate(child);
      }
    }
  }

  // Observer para mutaciones en el DOM de React
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          walkAndTranslate(mutation.addedNodes[i]);
        }
      } else if (mutation.type === 'characterData') {
        const target = mutation.target;
        const translated = translateText(target.nodeValue);
        if (translated !== target.nodeValue) {
          target.nodeValue = translated;
        }
      }
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    walkAndTranslate(document.body);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  // Puente de integración económica con el sistema SMR2
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SMR2_INJECT_FUNDS') {
      try {
        // Enviar confirmación al padre
        window.parent.postMessage({ type: 'SMR2_FUNDS_ACK', amount: event.data.amount }, '*');
      } catch (err) {
        console.warn('Error procesando fondos SMR2:', err);
      }
    }
  });
})();
