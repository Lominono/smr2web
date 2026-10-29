/**
 * Configuración oficial de lanzamiento de la web de 2º SMR
 * Fecha oficial de apertura pública: 9 de noviembre de 2026 a las 8:35 AM (CET)
 */
export const TARGET_LAUNCH_TIMESTAMP = new Date('2026-11-09T08:35:00+01:00').getTime();

export function isOfficiallyLaunched(): boolean {
  return Date.now() >= TARGET_LAUNCH_TIMESTAMP;
}
