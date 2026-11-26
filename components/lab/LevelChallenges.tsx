'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Database,
  Lock,
  Search,
  ShoppingCart,
  FileText,
  AlertTriangle,
  CheckCircle,
  Code,
  Terminal,
  ExternalLink,
  Eye,
  RefreshCw,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { evaluateMockSqlInjection, mockApiRouter } from '@/lib/lab/mockEngine';

interface ChallengeProps {
  levelId: number;
  onFlagDiscovered: (flag: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}

export const LevelChallenges: React.FC<ChallengeProps> = ({
  levelId,
  onFlagDiscovered,
  openTerminalWithCommand,
}) => {
  switch (levelId) {
    case 1:
      return (
        <Level1Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 2:
      return (
        <Level2Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 3:
      return (
        <Level3Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 4:
      return (
        <Level4Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 5:
      return (
        <Level5Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 6:
      return (
        <Level6Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    case 7:
      return (
        <Level7Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      );
    default:
      return null;
  }
};

// ==========================================
// RETO 1: RECONOCIMIENTO
// ==========================================
function Level1Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
              Portal Simulado: SecureCorp IT Services
            </span>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            Reto #01 · Reconocimiento
          </span>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Los desarrolladores de SecureCorp han dejado rutas confidenciales y comentarios olvidados
          en el código del portal. <strong>No hay botones trampa</strong>: debes abrir el modo{' '}
          <strong>Inspeccionar (F12)</strong> de tu navegador (o el visor DevTools integrado) para
          inspeccionar el árbol DOM, o usar la <strong>Terminal</strong> para consultar{' '}
          <code>/lab/robots.txt</code>.
        </p>

        {/* Portal simulado en el DOM con comentario deliberado */}
        <div
          id="securecorp-portal-root"
          className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-4 select-text"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
              SECURECORP // CLOUD DEFENSE
            </span>
            <span className="font-mono text-neutral-500 text-[11px]">v1.2.0-beta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-neutral-900 dark:text-neutral-200 font-semibold block">
                Infraestructura Perimetral
              </span>
              <p className="text-neutral-500 text-[11px] mt-1">
                Servidores dedicados y cortafuegos de inspección profunda.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <span className="text-neutral-900 dark:text-neutral-200 font-semibold block">
                Monitorización 24/7
              </span>
              <p className="text-neutral-500 text-[11px] mt-1">
                Detección de intrusiones activa y auditoría de eventos.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>© 2026 SecureCorp IT Solutions. Todos los derechos reservados.</span>
            <span className="text-[10px]">Confidencial</span>
          </div>
          {/* 
            TODO DE DESARROLLO (QUITAR ANTES DE PRODUCCIÓN):
            - Fichero de exclusión de robots disponible en: /lab/robots.txt
            - Copia de seguridad de notas de contingencia: /backup/staff_notes.txt
            - Flag del equipo de infraestructura: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}
          */}
        </div>

        {/* Indicaciones para auditoría con Terminal de Kali Linux */}
        <div className="p-3.5 bg-neutral-100/70 dark:bg-neutral-950/70 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-2">
          <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300 font-bold block flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Auditoría con Terminal (Comandos disponibles):</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              onClick={() => openTerminalWithCommand('curl /lab/robots.txt')}
              type="button"
              className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-emerald-500 cursor-pointer text-[11px] inline-flex items-center gap-1 transition-colors"
            >
              <Terminal className="w-3 h-3 text-emerald-500" />
              <span>&gt; curl /lab/robots.txt</span>
            </button>
            <button
              onClick={() => openTerminalWithCommand('nmap localhost')}
              type="button"
              className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-emerald-500 cursor-pointer text-[11px] inline-flex items-center gap-1 transition-colors"
            >
              <Terminal className="w-3 h-3 text-emerald-500" />
              <span>&gt; nmap localhost</span>
            </button>
            <button
              onClick={() =>
                openTerminalWithCommand(
                  'gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt'
                )
              }
              type="button"
              className="px-2.5 py-1 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:border-emerald-500 cursor-pointer text-[11px] inline-flex items-center gap-1 transition-colors"
            >
              <Terminal className="w-3 h-3 text-emerald-500" />
              <span>&gt; gobuster dir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RETO 2: EL CLIENTE NO ES DE FIAR
// ==========================================
function Level2Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [balance, setBalance] = useState(0);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [domPrice, setDomPrice] = useState(500);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  // Sincronizar sessionStorage y observar mutaciones directas en el DOM desde DevTools
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('lab_user_balance');
      if (stored !== null) {
        setBalance(Number(stored) || 0);
      } else {
        sessionStorage.setItem('lab_user_balance', '0');
        setBalance(0);
      }
    }

    // Intervalo de sincronización con la consola de DevTools
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentBal = Number(sessionStorage.getItem('lab_user_balance') || 0);
        setBalance(currentBal);

        const btn = document.getElementById('btnBuy') as HTMLButtonElement | null;
        if (btn) {
          setIsButtonDisabled(btn.disabled);
        }

        const inputPrice = document.getElementById('checkoutPrice') as HTMLInputElement | null;
        if (inputPrice) {
          const val = Number(inputPrice.value);
          if (!isNaN(val)) setDomPrice(val);
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    const currentSessionBal = Number(sessionStorage.getItem('lab_user_balance') || 0);
    const inputPrice = document.getElementById('checkoutPrice') as HTMLInputElement | null;
    const currentPrice = inputPrice ? Number(inputPrice.value) : domPrice;

    if (currentPrice <= 0 || currentSessionBal >= 500) {
      setPurchaseSuccess(true);
      setErrorMsg('');
      onFlagDiscovered('FLAG{N3V3R_TRUST_CL13NT_S1D3}');
    } else {
      setErrorMsg(
        `Error: Saldo insuficiente (${currentSessionBal} € en sessionStorage). El botón de compra y el precio deben modificarse mediante DevTools (Inspeccionar) o mediante la Terminal.`
      );
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Pasarela de Certificación Oficial (Validación Cliente)
          </span>
        </div>
        <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
          Tu Saldo en Sesión: {balance} €
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El botón de compra está bloqueado con el atributo <code>disabled</code> y el precio es de 500 €.
        El desarrollador confió únicamente en JavaScript y atributos HTML. Para superar este reto:
      </p>

      <div className="p-3.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-950/70 border border-neutral-200 dark:border-neutral-800 text-xs font-mono space-y-1.5 text-neutral-700 dark:text-neutral-300">
        <div>1. Abre <strong>DevTools (F12)</strong> -&gt; Pestaña <strong>Elements</strong>.</div>
        <div>2. Inspecciona el botón <code>id=&quot;btnBuy&quot;</code> y elimina su atributo <code>disabled</code>.</div>
        <div>3. Modifica el campo oculto <code>id=&quot;checkoutPrice&quot;</code> a <code>value=&quot;0&quot;</code>.</div>
        <div>4. O en la <strong>Consola</strong>: <code>sessionStorage.setItem(&apos;lab_user_balance&apos;, &apos;1000&apos;)</code>.</div>
        <div>5. O ejecuta en la <strong>Terminal</strong>: <code>curl -X POST /api/checkout -d &quot;price=0&quot;</code>.</div>
      </div>

      {/* Formulario de compra vulnerable */}
      <form
        id="checkoutForm"
        onSubmit={handleBuy}
        className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-sans"
      >
        {/* Campo oculto manipulable */}
        <input type="hidden" id="checkoutPrice" defaultValue={500} />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-200">
              Certificación SMR2 Ciberseguridad Web
            </h4>
            <span className="text-xs text-neutral-500">Expedición oficial y diploma digital</span>
          </div>
          <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-200">
            {domPrice}.00 €
          </span>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {purchaseSuccess && (
          <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>¡Compra confirmada a {domPrice}.00 €!</span>
            </div>
            <p className="font-mono text-neutral-800 dark:text-neutral-200 text-xs">
              Bandera capturada: <strong>FLAG&#123;N3V3R_TRUST_CL13NT_S1D3&#125;</strong>
            </p>
          </div>
        )}

        <div className="pt-2">
          <button
            id="btnBuy"
            type="submit"
            disabled={isButtonDisabled}
            className="w-full py-2 px-3 rounded-lg bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-emerald-600 dark:hover:enabled:bg-emerald-500 hover:enabled:text-white dark:hover:enabled:text-neutral-950 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            {isButtonDisabled ? 'Saldo insuficiente (Botón con atributo disabled)' : `Comprar por ${domPrice} €`}
          </button>
        </div>
      </form>

      <div className="pt-1">
        <button
          onClick={() =>
            openTerminalWithCommand(
              'curl -X POST /api/checkout -d "price=0&itemId=cert-sec-01"'
            )
          }
          type="button"
          className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-emerald-500 text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-500" />
          <span>&gt; curl -X POST /api/checkout -d &quot;price=0&quot;</span>
        </button>
      </div>
    </div>
  );
}

// ==========================================
// RETO 3: COOKIES Y SESIONES
// ==========================================
function Level3Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [currentRole, setCurrentRole] = useState<'guest' | 'admin' | 'unknown'>('guest');
  const [rawCookie, setRawCookie] = useState('');
  const [decodedJson, setDecodedJson] = useState('{"user":"student","role":"guest"}');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/lab_session=([^;]+)/);
      if (!match) {
        const defaultVal = btoa(JSON.stringify({ user: 'student', role: 'guest' }));
        document.cookie = `lab_session=${defaultVal}; path=/; SameSite=Lax`;
        setRawCookie(defaultVal);
      } else {
        setRawCookie(match[1]);
        try {
          setDecodedJson(atob(match[1]));
        } catch {}
      }
    }
  }, []);

  const handleVerifySession = () => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/lab_session=([^;]+)/);
    if (!match) {
      setCurrentRole('unknown');
      setIsVerified(true);
      return;
    }

    try {
      const decoded = atob(match[1]);
      const parsed = JSON.parse(decoded);
      setRawCookie(match[1]);
      setDecodedJson(decoded);
      if (parsed.role === 'admin') {
        setCurrentRole('admin');
        setIsVerified(true);
        onFlagDiscovered('FLAG{C00K13_T4MP3R1NG_SUCC3SS}');
      } else {
        setCurrentRole('guest');
        setIsVerified(true);
      }
    } catch {
      setCurrentRole('unknown');
      setIsVerified(true);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Control de Sesión Basado en Cookies
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          Rol detectado:{' '}
          <strong
            className={
              currentRole === 'admin'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }
          >
            {currentRole.toUpperCase()}
          </strong>
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El panel lee la cookie <code>lab_session</code> en cada comprobación. Contiene un objeto JSON
        codificado en Base64 con <code>&quot;role&quot;: &quot;guest&quot;</code>. No hay atajos: abre{' '}
        <strong>DevTools -&gt; Application -&gt; Cookies</strong> (o usa la <strong>Consola</strong>) para
        editar la cookie asignando <code>role: admin</code>, o genera la cadena con la <strong>Terminal</strong>.
      </p>

      <div className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-neutral-500 text-[11px]">Valor actual en document.cookie (lab_session):</span>
          <div className="p-2.5 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 text-cyan-600 dark:text-cyan-300 break-all select-all font-mono">
            {rawCookie || 'lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9'}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-neutral-500 text-[11px]">Contenido decodificado (JSON):</span>
          <div className="p-2.5 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-xs">
            {decodedJson}
          </div>
        </div>

        {isVerified && currentRole === 'admin' && (
          <div className="p-3.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>¡Sesión de Administrador verificada con éxito!</span>
            </div>
            <p className="text-neutral-800 dark:text-neutral-200 text-xs">
              Bandera capturada: <strong>FLAG&#123;C00K13_T4MP3R1NG_SUCC3SS&#125;</strong>
            </p>
          </div>
        )}

        {isVerified && currentRole === 'guest' && (
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            Sesión válida pero con permisos de &quot;guest&quot;. Modifica la cookie en DevTools para ser &quot;admin&quot;.
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleVerifySession}
            type="button"
            className="px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 font-bold font-mono text-xs cursor-pointer hover:opacity-90 transition-opacity"
          >
            Verificar Cookie de Sesión
          </button>

          <button
            onClick={() => openTerminalWithCommand('base64 -d "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9"')}
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; base64 -d (decodificar)</span>
          </button>

          <button
            onClick={() => openTerminalWithCommand('base64 "{\\"user\\":\\"student\\",\\"role\\":\\"admin\\"}"')}
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; base64 (codificar admin)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RETO 4: IDOR
// ==========================================
function Level4Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [invoiceId, setInvoiceId] = useState('1042');
  const [result, setResult] = useState<any>(null);

  const fetchInvoice = (id: string) => {
    const res = mockApiRouter(`/api/mock/invoices?id=${id}`);
    try {
      const parsed = JSON.parse(res.body);
      setResult(parsed);
      if (parsed.flag) {
        onFlagDiscovered(parsed.flag);
      }
    } catch {
      setResult({ error: res.body });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Visor de Facturación Corporativa (IDOR)
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">
          Endpoint: /api/mock/invoices?id=...
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Tu factura asignada es la <strong>#1042</strong>. Observa cómo viajan las peticiones en la
        pestaña <strong>Network (Red)</strong> de DevTools o usa <code>curl</code> en la terminal.
        ¿Qué ocurre si solicitas un ID anterior sin autorización?
      </p>

      <div className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="invIdInput" className="text-neutral-600 dark:text-neutral-400 shrink-0">
            ID de Factura:
          </label>
          <input
            id="invIdInput"
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-24 px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => fetchInvoice(invoiceId)}
            type="button"
            className="px-3.5 py-1.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 rounded font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          >
            Consultar Factura
          </button>
        </div>

        {result && (
          <div className="p-3.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 select-text">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">
              Respuesta HTTP de la API:
            </span>
            <pre className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.flag && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                ¡Vulnerabilidad IDOR confirmada! Bandera: {result.flag}
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => openTerminalWithCommand('curl /api/mock/invoices?id=1001')}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 text-xs cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; curl /api/mock/invoices?id=1001</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RETO 5: INYECCIONES (SQLi)
// ==========================================
function Level5Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [queryOutput, setQueryOutput] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const evalResult = evaluateMockSqlInjection(username, password);
    setQueryOutput(evalResult.query);
    setMessage(evalResult.message);
    setSuccess(evalResult.success);

    if (evalResult.success) {
      onFlagDiscovered('FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}');
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Autenticación Vulnerable a SQL Injection
          </span>
        </div>
        <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-semibold">
          SELECT * FROM users
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El backend concatena el usuario y la clave directamente en la consulta sin escapar caracteres.
        Debes formular tu propio payload de inyección booleana (con comillas simples y comentarios) o usar{' '}
        <code>sqlmap</code> en la terminal.
      </p>

      <form
        onSubmit={handleLogin}
        className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400">Nombre de Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="Introduce usuario o payload..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="contraseña..."
          />
        </div>

        {/* Visor de consulta generada */}
        <div className="p-3 bg-white dark:bg-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 space-y-1">
          <span className="text-[10px] text-neutral-500 uppercase font-bold block">
            Sentencia SQL ejecutada en el servidor:
          </span>
          <code className="text-xs text-amber-700 dark:text-amber-300 block overflow-x-auto select-all">
            SELECT * FROM users WHERE username = &apos;{username}&apos; AND password = &apos;{password}&apos;;
          </code>
        </div>

        {message && (
          <div
            className={`p-3 rounded text-xs border ${
              success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <p className="font-semibold">{message}</p>
            {success && (
              <p className="mt-1 text-neutral-900 dark:text-neutral-100 font-bold font-mono">
                Bandera: FLAG&#123;S4N1T1Z3_Y0UR_1NPUTS_SQL1&#125;
              </p>
            )}
          </div>
        )}

        <div className="pt-1 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            Ejecutar Consulta SQL
          </button>

          <button
            type="button"
            onClick={() => openTerminalWithCommand('sqlmap -u "http://localhost/login" --batch')}
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; sqlmap (Kali Linux)</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// RETO 6: AUTENTICACIÓN Y FUERZA BRUTA
// ==========================================
function Level6Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');
  const [authResponse, setAuthResponse] = useState<any>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const res = mockApiRouter(
      '/api/mock/auth',
      'POST',
      {},
      JSON.stringify({ username: user, password: pass })
    );
    try {
      const parsed = JSON.parse(res.body);
      setAuthResponse({ status: res.status, ...parsed });
      if (parsed.flag) {
        onFlagDiscovered(parsed.flag);
      }
    } catch {
      setAuthResponse({ status: res.status, error: res.body });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Ataque de Diccionario y Fuerza Bruta
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">
          Wordlist: /opt/wordlists/passwords.txt
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El endpoint <code>/api/mock/auth</code> carece de bloqueo de intentos (rate limiting) y el administrador
        utilizó una de las contraseñas más comunes del diccionario. Usa <code>hydra</code> en la terminal
        para atacarlo o revisa el diccionario con <code>cat</code>.
      </p>

      <form
        onSubmit={handleAuth}
        className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-neutral-600 dark:text-neutral-400">Usuario:</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-neutral-600 dark:text-neutral-400">Contraseña:</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Introduce clave descubierta..."
              className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            />
          </div>
        </div>

        {authResponse && (
          <div
            className={`p-3 rounded text-xs border ${
              authResponse.status === 200
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <p className="font-bold">{authResponse.mensaje || authResponse.error}</p>
            {authResponse.flag && (
              <p className="mt-1 text-neutral-900 dark:text-neutral-100 font-mono">
                Bandera: <strong>{authResponse.flag}</strong>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-neutral-950 font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            Probar Credencial
          </button>

          <button
            onClick={() => openTerminalWithCommand('hydra -l admin -P /opt/wordlists/passwords.txt')}
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; hydra (Kali Linux)</span>
          </button>

          <button
            onClick={() => openTerminalWithCommand('cat /opt/wordlists/passwords.txt')}
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ver diccionario en terminal</span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// RETO 7: CADENA FINAL (EXPLOIT CHAIN)
// ==========================================
function Level7Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [empId, setEmpId] = useState('');
  const [token, setToken] = useState('');
  const [response, setResponse] = useState<any>(null);

  const handleExecuteChain = (e: React.FormEvent) => {
    e.preventDefault();
    const res = mockApiRouter('/api/mock/admin/flag', 'GET', {
      'X-Employee-Id': empId.trim(),
      Authorization: `Bearer ${token.trim()}`,
    });

    try {
      const parsed = JSON.parse(res.body);
      setResponse({ status: res.status, ...parsed });
      if (parsed.flag) {
        onFlagDiscovered(parsed.flag);
      }
    } catch {
      setResponse({ status: res.status, error: res.body });
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Intranet Central: Mainframe Corporativo
          </span>
        </div>
        <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-bold uppercase">
          Cadena Completa · Nivel Experto
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Encadena las 3 fases aprendidas: <strong>1) Reconocimiento</strong> para localizar el endpoint de personal,{' '}
        <strong>2) Extracción de credenciales</strong> (Elena Ramos, CISO), y{' '}
        <strong>3) Falsificación de cabeceras HTTP</strong> para tomar el control del mainframe.
      </p>

      {/* Checklist de fases */}
      <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-mono space-y-2">
        <span className="text-neutral-500 text-[10px] uppercase font-bold block">
          Cadena de Explotación Requerida:
        </span>
        <div className="space-y-1.5 text-neutral-700 dark:text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Descubre la API de personal con curl o en Network: <code>/api/mock/staff?dept=security</code></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Identifica el <code>emp_id</code> y el <code>token</code> de Elena Ramos</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>Envía la petición con las cabeceras forjadas a <code>/api/mock/admin/flag</code></span>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleExecuteChain}
        className="p-4 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400">Cabecera X-Employee-Id:</label>
          <input
            type="text"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            placeholder="p. ej. sec-xxxx"
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400">
            Cabecera Authorization (Bearer Token):
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
            placeholder="emergency_xxxx"
          />
        </div>

        {response && (
          <div
            className={`p-3 rounded text-xs border ${
              response.status === 200
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <p className="font-bold">{response.mensaje || response.error}</p>
            {response.flag && (
              <div className="mt-2 p-2.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm">
                🏆 ¡HAS COMPLETADO LA CADENA FINAL DEL LABORATORIO! Bandera: {response.flag}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white font-bold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            Enviar Petición al Mainframe
          </button>

          <button
            onClick={() => openTerminalWithCommand('curl /api/mock/staff?dept=security')}
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; curl /api/mock/staff</span>
          </button>

          <button
            onClick={() =>
              openTerminalWithCommand(
                'curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag'
              )
            }
            type="button"
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-xs cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" />
            <span>&gt; curl (cadena final)</span>
          </button>
        </div>
      </form>
    </div>
  );
}
