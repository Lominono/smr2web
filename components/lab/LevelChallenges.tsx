'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Database,
  Lock,
  ShoppingCart,
  FileText,
  AlertTriangle,
  CheckCircle,
  Terminal,
  ExternalLink,
  Layers,
  Search,
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
  return (
    <div id="challenge-container" className="space-y-4">
      {levelId === 1 && (
        <Level1Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 2 && (
        <Level2Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 3 && (
        <Level3Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 4 && (
        <Level4Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 5 && (
        <Level5Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 6 && (
        <Level6Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
      {levelId === 7 && (
        <Level7Challenge
          onFlagDiscovered={onFlagDiscovered}
          openTerminalWithCommand={openTerminalWithCommand}
        />
      )}
    </div>
  );
};

// ==========================================
// RETO 1: RECONOCIMIENTO (DIFICULTAD MEDIA-ALTA)
// ==========================================
function Level1Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [activePortalTab, setActivePortalTab] = useState<'servicios' | 'infraestructura' | 'auditoria'>('servicios');

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Portal Corporativo: SecureCorp IT Solutions
          </span>
        </div>
        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
          Reto #01 · Reconocimiento
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        SecureCorp ha desplegado la beta de su portal de infraestructura. Como auditor de seguridad web,
        tu objetivo es recopilar información del sistema inspeccionando los elementos del DOM,
        comentarios dejados por los desarrolladores y ficheros públicos indexables.
      </p>

      {/* Portal simulado en el DOM con estructura jerárquica */}
      <div
        id="securecorp-portal-root"
        className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-4 select-text"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
              SECURECORP // CLOUD v1.2.0-beta
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-mono">
              Entorno Staging
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[11px]">
            <button
              onClick={() => setActivePortalTab('servicios')}
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                activePortalTab === 'servicios'
                  ? 'bg-neutral-200 dark:bg-neutral-800 font-bold text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Servicios
            </button>
            <button
              onClick={() => setActivePortalTab('infraestructura')}
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                activePortalTab === 'infraestructura'
                  ? 'bg-neutral-200 dark:bg-neutral-800 font-bold text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Infraestructura
            </button>
            <button
              onClick={() => setActivePortalTab('auditoria')}
              type="button"
              className={`px-2.5 py-1 rounded transition-colors ${
                activePortalTab === 'auditoria'
                  ? 'bg-neutral-200 dark:bg-neutral-800 font-bold text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              Estado Red
            </button>
          </div>
        </div>

        {activePortalTab === 'servicios' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-neutral-900 dark:text-neutral-100 font-semibold block">
                Firewall Perimetral NGFW
              </span>
              <p className="text-neutral-500 text-[11px] mt-1">
                Filtrado por paquetes de nivel 7 con análisis heurístico activo.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-xs">
              <span className="text-neutral-900 dark:text-neutral-100 font-semibold block">
                Balanceo de Carga L4/L7
              </span>
              <p className="text-neutral-500 text-[11px] mt-1">
                Distribución equitativa y tolerancia a fallos por nodos geográficos.
              </p>
            </div>
          </div>
        )}

        {activePortalTab === 'infraestructura' && (
          <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold block">
              Topología de Servidores Internos
            </span>
            <p className="text-neutral-500 text-[11px]">
              Los nodos del clúster operan bajo Debian GNU/Linux con servidor NGINX expuesto en el puerto 80.
            </p>
          </div>
        )}

        {activePortalTab === 'auditoria' && (
          <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs space-y-2">
            <span className="text-neutral-900 dark:text-neutral-100 font-semibold block">
              Estado de los Nodos del Sistema
            </span>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Todos los servicios perimetrales están operativos (100% Uptime).</span>
            </div>
            {/* 
              TODO DE DESARROLLO (QUITAR EN PRODUCCIÓN):
              - Archivo de exclusión robots disponible en: /lab/robots.txt
              - Copia de notas de contingencia del administrador: /backup/staff_notes.txt
              - Flag de acceso para auditoría interna: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}
            */}
          </div>
        )}

        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
          <span>© 2026 SecureCorp IT Solutions. Servidor: nginx/1.24.0</span>
          <span>Confidencial · Uso interno</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RETO 2: EL CLIENTE NO ES DE FIAR (SIN AYUDAS)
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

  // Sincronizar en tiempo real los atributos manipulados en DevTools
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

    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const currentBal = Number(sessionStorage.getItem('lab_user_balance') || 0);
        setBalance(currentBal);

        const btn = document.getElementById('btnBuy') as HTMLButtonElement | null;
        if (btn) {
          setIsButtonDisabled(btn.hasAttribute('disabled'));
        }

        const inputPrice = document.getElementById('checkoutPrice') as HTMLInputElement | null;
        if (inputPrice) {
          const val = Number(inputPrice.value);
          if (!isNaN(val)) setDomPrice(val);
        }
      }
    }, 300);

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
        `Error 402 Payment Required: Saldo insuficiente (${currentSessionBal}.00 € en sesión) para abonar ${currentPrice}.00 €. Transacción bloqueada en el cliente.`
      );
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Pasarela de Pago Oficial SecureCorp
          </span>
        </div>
        <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
          Saldo en Sesión: {balance}.00 €
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Adquiere la certificación oficial para desbloquear la credencial del curso. El desarrollador ha
        implementado la comprobación de saldo y bloqueo del botón directamente en el navegador del usuario.
      </p>

      {/* Formulario de compra */}
      <form
        id="checkoutForm"
        onSubmit={handleBuy}
        className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-sans"
      >
        {/* Campo oculto con el precio editable en DevTools */}
        <input type="hidden" id="checkoutPrice" defaultValue={500} />

        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Certificación Oficial SMR2 Ciberseguridad Web
            </h4>
            <span className="text-xs text-neutral-500">Expedición oficial y diploma digital acreditado</span>
          </div>
          <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {domPrice}.00 €
          </span>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {purchaseSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>¡Transacción confirmada a {domPrice}.00 €!</span>
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
            className="w-full py-2.5 px-3 rounded-lg bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-emerald-600 dark:hover:enabled:bg-emerald-500 hover:enabled:text-white dark:hover:enabled:text-neutral-950 font-mono text-xs font-semibold transition-colors cursor-pointer"
          >
            {isButtonDisabled ? 'Saldo insuficiente (Botón bloqueado)' : `Comprar por ${domPrice}.00 €`}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// RETO 3: COOKIES Y SESIONES (SIN DECODIFICAR EN PANTALLA)
// ==========================================
function Level3Challenge({
  onFlagDiscovered,
  openTerminalWithCommand,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminalWithCommand: (cmd: string) => void;
}) {
  const [currentRole, setCurrentRole] = useState<'guest' | 'admin' | 'unknown'>('guest');
  const [authMessage, setAuthMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/lab_session=([^;]+)/);
      if (!match) {
        const defaultVal = btoa(JSON.stringify({ user: 'student', role: 'guest' }));
        document.cookie = `lab_session=${defaultVal}; path=/; SameSite=Lax`;
      }
    }
  }, []);

  const handleVerifySession = () => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/lab_session=([^;]+)/);
    if (!match) {
      setCurrentRole('unknown');
      setAuthMessage('Error: Cookie lab_session no encontrada en document.cookie.');
      setIsVerified(true);
      return;
    }

    try {
      const decoded = atob(match[1]);
      const parsed = JSON.parse(decoded);
      if (parsed.role === 'admin') {
        setCurrentRole('admin');
        setAuthMessage('¡Autenticación con éxito! La sesión cuenta con permisos de administrador.');
        setIsVerified(true);
        onFlagDiscovered('FLAG{C00K13_T4MP3R1NG_SUCC3SS}');
      } else {
        setCurrentRole('guest');
        setAuthMessage(`Acceso denegado (403 Forbidden): La cookie identifica tu usuario como '${parsed.role || 'guest'}'. Se requiere rol 'admin'.`);
        setIsVerified(true);
      }
    } catch {
      setCurrentRole('unknown');
      setAuthMessage('Error: La cookie lab_session contiene un formato o codificación corrupta.');
      setIsVerified(true);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Panel de Control: Autenticación Basada en Cookies
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          Rol activo:{' '}
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
        El panel lee la cookie de sesión del navegador para autorizar las acciones de gestión.
        Inspecciona el almacenamiento de cookies en tu navegador para auditar su estructura y escalar
        a los privilegios de administrador.
      </p>

      <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between text-neutral-500 text-[11px] border-b border-neutral-200 dark:border-neutral-800 pb-2">
          <span>Identificador de sesión: <code>lab_session</code></span>
          <span>Alcance: Path=/; SameSite=Lax</span>
        </div>

        {isVerified && currentRole === 'admin' && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>{authMessage}</span>
            </div>
            <p className="text-neutral-800 dark:text-neutral-200 text-xs">
              Bandera capturada: <strong>FLAG&#123;C00K13_T4MP3R1NG_SUCC3SS&#125;</strong>
            </p>
          </div>
        )}

        {isVerified && currentRole !== 'admin' && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
            {authMessage}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={handleVerifySession}
            type="button"
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold cursor-pointer transition-colors shadow-sm"
          >
            Verificar Permisos de Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RETO 4: IDOR (SIN EXPONER LA RUTA EN TEXTO)
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
  const [isLoading, setIsLoading] = useState(false);

  const fetchInvoice = (id: string) => {
    setIsLoading(true);
    const res = mockApiRouter(`/api/mock/invoices?id=${id.trim()}`);
    try {
      const parsed = JSON.parse(res.body);
      setResult(parsed);
      if (parsed.flag) {
        onFlagDiscovered(parsed.flag);
      }
    } catch {
      setResult({ error: res.body });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200">
            Visor de Facturación y Albaranes Internos
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">Módulo de Clientes</span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Consulta el estado de tu factura corporativa asignada (#1042). Inspecciona el tráfico
        en la pestaña <strong>Network (Red)</strong> para entender cómo viaja la petición y determinar
        si el backend verifica la identidad de quien solicita los documentos.
      </p>

      <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="invIdInput" className="text-neutral-600 dark:text-neutral-400 shrink-0 font-medium">
            Número de Factura:
          </label>
          <input
            id="invIdInput"
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-28 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => fetchInvoice(invoiceId)}
            disabled={isLoading}
            type="button"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm disabled:opacity-50"
          >
            {isLoading ? 'Consultando...' : 'Cargar Documento'}
          </button>
        </div>

        {result && (
          <div className="p-3.5 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2 select-text">
            <span className="text-[10px] text-neutral-500 uppercase font-bold block">
              Documento recibido del servidor:
            </span>
            <pre className="text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.flag && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                ¡Vulnerabilidad IDOR confirmada! Bandera: {result.flag}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// RETO 5: INYECCIONES SQL (CON MENSAJES DE ERROR REALES DE DB)
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
  const [message, setMessage] = useState('');
  const [dbError, setDbError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDbError('');
    setMessage('');

    // Detección realista de errores de sintaxis provocados por comillas sin cerrar
    const quoteCountUser = (username.match(/'/g) || []).length;
    const quoteCountPass = (password.match(/'/g) || []).length;
    const totalQuotes = quoteCountUser + quoteCountPass;

    // Si tiene comilla impar y no tiene comentario SQL (-- o #), arroja error sintáctico de DB
    const hasComment = /--|#/i.test(username) || /--|#/i.test(password);
    if (totalQuotes % 2 !== 0 && !hasComment) {
      setDbError(`500 Internal Server Error: SQLite3::SQLException: unrecognized token: "'''" at offset 47 (near 'AND password = '${password}').`);
      setSuccess(false);
      return;
    }

    const evalResult = evaluateMockSqlInjection(username, password);
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
            Base de Datos: Autenticación de Usuarios
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">Motor: SQLite3 / Relacional</span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El servicio de login procesa directamente las credenciales de entrada. Provoca anomalías en la
        sintaxis para identificar el comportamiento del motor de base de datos e inyecta condiciones booleanas
        para evadir la comprobación de contraseña.
      </p>

      <form
        onSubmit={handleLogin}
        className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400 font-medium">Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            placeholder="Introduce usuario..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400 font-medium">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 font-mono text-xs"
            placeholder="Introduce contraseña..."
          />
        </div>

        {dbError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-mono">
            {dbError}
          </div>
        )}

        {message && !dbError && (
          <div
            className={`p-3 rounded-lg text-xs border ${
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

        <div className="pt-1">
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            Enviar Credenciales
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
      JSON.stringify({ username: user.trim(), password: pass.trim() })
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
            Control de Acceso: Inicio de Sesión Administrativo
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">Servicio de Autenticación</span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        El usuario <code>admin</code> utiliza una clave común presente en diccionarios de uso habitual.
        Utiliza las herramientas instaladas en la <strong>Terminal</strong> (como <code>hydra</code> o{' '}
        <code>cat</code> sobre <code>/opt/wordlists/passwords.txt</code>) para auditar las credenciales.
      </p>

      <form
        onSubmit={handleAuth}
        className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-neutral-600 dark:text-neutral-400 font-medium">Usuario:</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-neutral-600 dark:text-neutral-400 font-medium">Contraseña:</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Contraseña a probar..."
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs"
            />
          </div>
        </div>

        {authResponse && (
          <div
            className={`p-3 rounded-lg text-xs border ${
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

        <div className="pt-1">
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            Probar Autenticación
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// RETO 7: CADENA FINAL (EXPLOIT CHAIN COMPLETA)
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
          Reto Final · Escala de Privilegios
        </span>
      </div>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        Encadena las fases de auditoría aprendidas: localiza el endpoint de empleados mediante
        reconocimiento en la red o terminal, extrae las credenciales confidenciales de la CISO (Elena Ramos),
        y forja las cabeceras HTTP de autorización para apoderarte de la consola de control del mainframe.
      </p>

      <form
        onSubmit={handleExecuteChain}
        className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 space-y-3 font-mono text-xs"
      >
        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400 font-medium">Cabecera X-Employee-Id:</label>
          <input
            type="text"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs"
            placeholder="Ejemplo: sec-xxxx"
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-600 dark:text-neutral-400 font-medium">
            Cabecera Authorization (Bearer Token):
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-xs"
            placeholder="Token secreto..."
          />
        </div>

        {response && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              response.status === 200
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            <p className="font-bold">{response.mensaje || response.error}</p>
            {response.flag && (
              <div className="mt-2 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm">
                🏆 ¡HAS COMPLETADO LA CADENA FINAL DEL LABORATORIO! Bandera: {response.flag}
              </div>
            )}
          </div>
        )}

        <div className="pt-1">
          <button
            type="submit"
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
          >
            Enviar Petición al Mainframe
          </button>
        </div>
      </form>
    </div>
  );
}
