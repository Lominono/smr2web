'use client';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInitialized = false;

// Inicializa la captura del evento nativo beforeinstallprompt en el navegador
export function initDesktopInstallListeners() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Evita el banner por defecto del navegador para usar nuestra interfaz personalizada
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('smr2_install_prompt_changed', { detail: { available: true } }));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('smr2_app_installed'));
    window.dispatchEvent(new CustomEvent('smr2_install_prompt_changed', { detail: { available: false, installed: true } }));
  });
}

/**
 * Comprueba si la aplicación se está ejecutando en modo standalone (instalada como app de escritorio o móvil)
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isReferrerPwa = document.referrer.includes('android-app://');

  return Boolean(isStandaloneMedia || isIosStandalone || isReferrerPwa);
}

/**
 * Detecta el sistema operativo de escritorio del usuario
 */
export function getDesktopPlatform(): 'windows' | 'mac' | 'linux' | 'mobile' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  const ua = window.navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod/.test(ua)) return 'mobile';
  if (/windows|win32|win64/.test(ua)) return 'windows';
  if (/macintosh|mac os x/.test(ua)) return 'mac';
  if (/linux|x11/.test(ua)) return 'linux';

  return 'unknown';
}

/**
 * Detecta el navegador actual para dar instrucciones exactas de instalación
 */
export function getBrowserType(): 'chrome' | 'edge' | 'safari' | 'brave' | 'firefox' | 'opera' | 'other' {
  if (typeof window === 'undefined') return 'other';

  const ua = window.navigator.userAgent.toLowerCase();
  
  if ((window.navigator as unknown as { brave?: unknown }).brave !== undefined) return 'brave';
  if (/edg\//.test(ua)) return 'edge';
  if (/opr\/|opera/.test(ua)) return 'opera';
  if (/chrome|chromium|crios/.test(ua) && !/edg\//.test(ua)) return 'chrome';
  if (/firefox|fxios/.test(ua)) return 'firefox';
  if (/safari/.test(ua) && !/chrome|chromium|crios/.test(ua)) return 'safari';

  return 'other';
}

/**
 * Comprueba si el prompt nativo está disponible para disparo directo
 */
export function hasNativeInstallPrompt(): boolean {
  return deferredPrompt !== null;
}

/**
 * Lanza el prompt nativo de instalación si está disponible
 */
export async function promptDesktopInstall(): Promise<'accepted' | 'dismissed' | 'manual'> {
  if (!deferredPrompt) {
    return 'manual';
  }

  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    
    if (choice.outcome === 'accepted') {
      deferredPrompt = null;
      window.dispatchEvent(new CustomEvent('smr2_install_prompt_changed', { detail: { available: false, installed: true } }));
      return 'accepted';
    } else {
      return 'dismissed';
    }
  } catch (error) {
    console.warn('Error al invocar prompt de instalación:', error);
    return 'manual';
  }
}
