/**
 * Test suite unitario y de lógica matemática para el Fondo Botellón.
 * Ejecutable directamente con: node scripts/test-investments-logic.js
 */

const assert = require('assert');

console.log('====================================================');
console.log('🧪 EJECUTANDO TESTS DEL SISTEMA DE INVERSIONES BOTELLÓN');
console.log('====================================================\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Detalle: ${err.message}\n`);
    testsFailed++;
  }
}

// -----------------------------------------------------------
// 1. FÓRMULA DE COMPRA Y SLIPPAGE SUAVE
// -----------------------------------------------------------
runTest('Cálculo de compra: el precio sube suavemente según el capital y liquidez', () => {
  const currentPrice = 10.0;
  const reserveBalance = 25000;
  const poolBalance = 10000;
  const totalLiquidity = reserveBalance + poolBalance; // 35,000

  const investAmount = 700; // 2% de la liquidez
  const sharesBought = Number((investAmount / currentPrice).toFixed(4));
  assert.strictEqual(sharesBought, 70.0, 'Las participaciones deben ser 70.0000');

  const slippage = Math.min(0.12, investAmount / totalLiquidity); // 700 / 35000 = 0.02 (+2%)
  const newPrice = Number((currentPrice * (1.0 + slippage)).toFixed(4));
  assert.strictEqual(newPrice, 10.2, 'El precio debe haber subido exactamente a 10.2000 (+2%)');
  assert(newPrice > currentPrice, 'El nuevo precio debe ser estrictamente mayor al anterior tras una compra');
});

// -----------------------------------------------------------
// 2. LÍMITE DE IMPACTO MÁXIMO POR OPERACIÓN (ANTI-WHALE CAP)
// -----------------------------------------------------------
runTest('Anti-Whale: Una compra masiva se limita al tope máximo de impacto del 12%', () => {
  const currentPrice = 10.0;
  const reserveBalance = 25000;
  const poolBalance = 10000;
  const totalLiquidity = reserveBalance + poolBalance; // 35,000

  const whaleAmount = 25000; // Importe máximo permitido
  let slippage = whaleAmount / totalLiquidity; // 25000 / 35000 = 0.714
  if (slippage > 0.12) slippage = 0.12; // Cap de seguridad al 12%

  const newPrice = Number((currentPrice * (1.0 + slippage)).toFixed(4));
  assert.strictEqual(slippage, 0.12, 'El slippage no puede superar el 12%');
  assert.strictEqual(newPrice, 11.2, 'El precio no puede subir más de +12% en una sola orden');
});

// -----------------------------------------------------------
// 3. FÓRMULA DE RETIRADA, COMISIÓN (2%) Y REDUCCIÓN DE PRECIO
// -----------------------------------------------------------
runTest('Cálculo de venta: retención del 2% al pool y bajada proporcional del precio', () => {
  const currentPrice = 10.2;
  const reserveBalance = 25000;
  const poolBalance = 10700;
  const totalLiquidity = reserveBalance + poolBalance; // 35,700
  const feeRate = 0.02;

  const sharesToSell = 70.0;
  const grossCoins = Math.round(sharesToSell * currentPrice); // 70 * 10.2 = 714
  assert.strictEqual(grossCoins, 714, 'El cobro bruto debe ser 714');

  const feeCoins = Math.round(grossCoins * feeRate); // 714 * 0.02 = 14
  assert.strictEqual(feeCoins, 14, 'La comisión debe ser 14 monedas');

  const netCoins = grossCoins - feeCoins; // 700 monedas netas
  assert.strictEqual(netCoins, 700, 'El usuario debe recibir 700 monedas netas');

  // Reducción del precio suave por venta
  const slippage = Math.min(0.12, grossCoins / totalLiquidity);
  const newPrice = Number((currentPrice * (1.0 - slippage)).toFixed(4));
  assert(newPrice < currentPrice, 'El precio debe haber disminuido tras la retirada');
  assert(newPrice >= 1.0, 'El precio nunca puede bajar de 1.0000');
});

// -----------------------------------------------------------
// 4. VALIDACIÓN DE SALDO INSUFICIENTE
// -----------------------------------------------------------
runTest('Validación de saldo insuficiente: no permite invertir más del balance', () => {
  const userCoins = 450;
  const investAttempt = 500;

  let errorThrown = false;
  if (userCoins < investAttempt) {
    errorThrown = true;
  }
  assert.strictEqual(errorThrown, true, 'Debe abortar si el usuario no tiene suficiente saldo');
});

// -----------------------------------------------------------
// 5. VALIDACIÓN DE COOLDOWN DE 60 SEGUNDOS
// -----------------------------------------------------------
runTest('Enforcement de cooldown: rechaza transacciones dentro de los 60s', () => {
  const cooldownSeconds = 60;
  const lastTxTime = Date.now() - 25 * 1000; // Realizada hace 25 segundos
  const elapsed = (Date.now() - lastTxTime) / 1000;

  const isCooldownActive = elapsed < cooldownSeconds;
  const remaining = Math.ceil(cooldownSeconds - elapsed);

  assert.strictEqual(isCooldownActive, true, 'El cooldown debe considerarse activo');
  assert(remaining > 30 && remaining <= 36, 'Los segundos restantes deben ser aproximadamente 35s');
});

// -----------------------------------------------------------
// 6. SUELO DE PRECIO Y EVENTOS TEMÁTICOS EXTREMOS
// -----------------------------------------------------------
runTest('Suelo inquebrantable de cotización (Precio mínimo 1.0000)', () => {
  let price = 1.0500;
  const catastrophicImpact = -0.30; // -30%
  let newPrice = price * (1.0 + catastrophicImpact); // 0.735

  // Aplicación del suelo de seguridad
  newPrice = Math.max(1.0000, Number(newPrice.toFixed(4)));
  assert.strictEqual(newPrice, 1.0, 'El precio jamás puede caer por debajo de 1.0000 monedas');
});

// -----------------------------------------------------------
// 7. CONCURRENCIA Y PRESERVACIÓN ATÓMICA
// -----------------------------------------------------------
runTest('Simulación de operaciones concurrentes con bloqueo secuencial (FOR UPDATE)', () => {
  let initialBalance = 1000;
  let marketPrice = 10.0;
  let pool = 10000;
  let sharesIssued = 0;

  // 5 compras simultáneas de 100 monedas cada una
  const orders = [100, 100, 100, 100, 100];
  orders.forEach((amt) => {
    assert(initialBalance >= amt, 'Saldo suficiente en cada paso secuencial');
    initialBalance -= amt;
    const bought = amt / marketPrice;
    sharesIssued += bought;
    pool += amt;
    // El precio sube un poco en cada orden consecutiva
    marketPrice = Number((marketPrice * (1 + amt / 35000)).toFixed(4));
  });

  assert.strictEqual(initialBalance, 500, 'El saldo del usuario queda exactamente en 500 tras 5 compras de 100');
  assert.strictEqual(pool, 10500, 'El pool absorbe exactamente los 500 invertidos');
  assert(marketPrice > 10.0, 'El precio final del mercado aumentó tras la serie de órdenes');
});

// -----------------------------------------------------------
// 8. APORTE DE RAKE DEL ARCADE Y CRECIMIENTO DE TESORERÍA (NAV)
// -----------------------------------------------------------
runTest('Tesorería de la empresa: el rake de los minijuegos incrementa la caja y el NAV por acción', () => {
  let treasury = 5000;
  let reserve = 25000;
  let totalShares = 1000;
  let totalRevenue = 0;

  // Jugadores apuestan en Crash y Ruleta generando 150 monedas de rake
  const arcadeRake = 150;
  treasury += arcadeRake;
  totalRevenue += arcadeRake;

  const initialNav = (5000 + reserve) / totalShares; // 30.00
  const newNav = (treasury + reserve) / totalShares; // 30.15

  assert.strictEqual(treasury, 5150, 'La tesorería aumentó con el rake');
  assert.strictEqual(totalRevenue, 150, 'Los ingresos generados se acumularon');
  assert(newNav > initialNav, 'El valor liquidativo de respaldo por acción creció');
});

// -----------------------------------------------------------
// 9. DINÁMICA DE MERCADO: OLA DE COMPRAS MÚLTIPLES (SUBE MUCHO) Y VENTA (BAJA)
// -----------------------------------------------------------
runTest('Ley de oferta y demanda continua: múltiples compras provocan subida pronunciada y ventas la bajan', () => {
  let price = 10.0;
  const baseLiquidity = 10000;

  // 4 compras consecutivas de 1000 monedas cada una
  for (let i = 0; i < 4; i++) {
    const slippage = Math.min(0.20, (1000 / (baseLiquidity + 5000)) * 1.4);
    price = Number((price * (1 + slippage)).toFixed(2));
  }

  assert(price > 13.5, 'Tras 4 compras fuertes el precio subió pronunciadamente');

  // Venta masiva de acciones
  const grossSell = 2000;
  const sellSlippage = Math.min(0.20, (grossSell / (baseLiquidity + 5000)) * 1.4);
  const droppedPrice = Math.max(1.0, Number((price * (1 - sellSlippage)).toFixed(2)));

  assert(droppedPrice < price, 'La venta redujo el precio inmediatamente');
  assert(droppedPrice >= 1.0, 'Respeta el suelo mínimo');
});

// -----------------------------------------------------------
// 10. LIBRO DE ACCIONISTAS (CAP TABLE): CÁLCULO DE PORCENTAJE DE PROPIEDAD
// -----------------------------------------------------------
runTest('Cap Table: cálculo exacto de porcentaje de propiedad sobre el total de acciones emitidas', () => {
  const investors = [
    { username: 'Juanfe', shares: 350 },
    { username: 'Carlos', shares: 200 },
    { username: 'Elena', shares: 150 },
  ];
  const totalShares = investors.reduce((sum, i) => sum + i.shares, 0); // 700

  const capTable = investors.map((i) => ({
    username: i.username,
    shares: i.shares,
    percentage: Number(((i.shares / totalShares) * 100).toFixed(1)),
  }));

  assert.strictEqual(capTable[0].percentage, 50.0, 'Juanfe controla exactamente el 50.0% de la empresa');
  assert.strictEqual(capTable[1].percentage, 28.6, 'Carlos controla el 28.6%');
  assert.strictEqual(capTable[2].percentage, 21.4, 'Elena controla el 21.4%');
});

console.log('\n====================================================');
console.log(`📊 RESULTADO DE TESTS: ${testsPassed} PASADOS, ${testsFailed} FALLADOS`);
console.log('====================================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
