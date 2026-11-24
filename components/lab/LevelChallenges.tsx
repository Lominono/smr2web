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
  ExternalLink,
  Code,
  Terminal,
} from 'lucide-react';
import { evaluateMockSqlInjection, mockApiRouter } from '@/lib/lab/mockEngine';

interface ChallengeProps {
  levelId: number;
  onFlagDiscovered: (flag: string) => void;
  openTerminal: () => void;
}

export const LevelChallenges: React.FC<ChallengeProps> = ({
  levelId,
  onFlagDiscovered,
  openTerminal,
}) => {
  switch (levelId) {
    case 1:
      return <Level1Challenge onFlagDiscovered={onFlagDiscovered} openTerminal={openTerminal} />;
    case 2:
      return <Level2Challenge onFlagDiscovered={onFlagDiscovered} />;
    case 3:
      return <Level3Challenge onFlagDiscovered={onFlagDiscovered} />;
    case 4:
      return <Level4Challenge onFlagDiscovered={onFlagDiscovered} openTerminal={openTerminal} />;
    case 5:
      return <Level5Challenge onFlagDiscovered={onFlagDiscovered} />;
    case 6:
      return <Level6Challenge onFlagDiscovered={onFlagDiscovered} openTerminal={openTerminal} />;
    case 7:
      return <Level7Challenge onFlagDiscovered={onFlagDiscovered} openTerminal={openTerminal} />;
    default:
      return null;
  }
};

// ==========================================
// RETO 1: RECONOCIMIENTO
// ==========================================
function Level1Challenge({
  onFlagDiscovered,
  openTerminal,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminal: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-3 font-sans">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-sm text-neutral-200">
              Portal Simulado: SecureCorp IT Services
            </span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 uppercase">
            Entorno de pruebas #01
          </span>
        </div>

        <p className="text-xs text-neutral-400">
          Este portal corporativo contiene fugas de información dejadas por desarrolladores en el código fuente. Usa <strong>Inspeccionar elemento (F12)</strong> sobre el portal o utiliza la <strong>Terminal</strong> del lab para encontrar la ruta a <code>robots.txt</code> o a las notas de backup.
        </p>

        {/* Portal simulado en el DOM */}
        <div className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-4 select-text">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400 font-mono">SECURECORP // CLOUD DEFENSE</span>
            <span className="text-neutral-500">v1.2.0-beta</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-300 font-semibold">Infraestructura Crítica</span>
              <p className="text-neutral-500 text-[11px] mt-1">Servidores perimetrales protegidos con cortafuegos de nueva generación.</p>
            </div>
            <div className="p-3 bg-neutral-900/80 rounded border border-neutral-800">
              <span className="text-neutral-300 font-semibold">Monitorización 24/7</span>
              <p className="text-neutral-500 text-[11px] mt-1">Detección de intrusiones activa y auditoría de eventos en tiempo real.</p>
            </div>
          </div>

          {/* Pie de página con comentario HTML deliberado en el DOM */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>© 2026 SecureCorp IT Solutions. Todos los derechos reservados.</span>
            <span className="text-[10px] text-neutral-600">Confidencial</span>
          </div>
          {/* 
            TODO DE DESARROLLO (QUITAR EN PRODUCCIÓN):
            - Fichero de exclusión de robots disponible en: /lab/robots.txt
            - Copia de seguridad de notas de contingencia: /backup/staff_notes.txt
            - Flag del equipo de infraestructura: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}
          */}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={openTerminal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-xs cursor-pointer transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Abrir terminal y consultar robots.txt</span>
          </button>
          <span className="text-xs text-neutral-500">
            Pista en terminal: <code>curl /lab/robots.txt</code>
          </span>
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
}: {
  onFlagDiscovered: (f: string) => void;
}) {
  const [balance, setBalance] = useState(0);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('lab_user_balance');
      if (stored) {
        setBalance(Number(stored) || 0);
      } else {
        sessionStorage.setItem('lab_user_balance', '0');
      }
    }
  }, []);

  const handleBuy = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const priceInput = form.querySelector('#checkoutPrice') as HTMLInputElement | null;
    const priceVal = priceInput ? Number(priceInput.value) : 500;

    const currentSessionBal = Number(sessionStorage.getItem('lab_user_balance') || 0);

    // Si el usuario alteró el DOM para poner precio 0 o si aumentó su saldo en sessionStorage
    if (priceVal <= 0 || currentSessionBal >= 500) {
      setPurchaseSuccess(true);
      setErrorMsg('');
      onFlagDiscovered('FLAG{N3V3R_TRUST_CL13NT_S1D3}');
    } else {
      setErrorMsg('Error: Saldo insuficiente (0 €) para abonar 500 €. Modifica el precio en el DOM a 0 o altera sessionStorage.');
    }
  };

  return (
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Pasarela de Certificación Oficial
          </span>
        </div>
        <span className="text-xs font-mono text-amber-400 font-semibold">
          Tu Saldo: {balance} €
        </span>
      </div>

      <p className="text-xs text-neutral-400">
        El botón de compra está protegido con el atributo <code>disabled</code> y el formulario contiene un campo oculto <code>price=500</code>. Usa <strong>Inspeccionar elemento (F12)</strong> para borrar el atributo <code>disabled</code> del botón y cambiar el valor del input <code>#checkoutPrice</code> a <code>0</code>, o abre la consola y ejecuta <code>sessionStorage.setItem("lab_user_balance", "1000")</code>.
      </p>

      <form onSubmit={handleBuy} className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-neutral-200">Certificación SMR2 Ciberseguridad Web</h4>
            <span className="text-xs text-neutral-500">Expedición digital con sello oficial</span>
          </div>
          <span className="font-mono text-sm font-bold text-neutral-200">500.00 €</span>
        </div>

        {/* Campo oculto que el cliente no debería poder dictar */}
        <input type="hidden" id="checkoutPrice" name="price" defaultValue="500" />

        {errorMsg && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {purchaseSuccess && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>¡Compra procesada con éxito a 0.00 €!</span>
            </div>
            <p className="font-mono text-neutral-200">
              Flag capturada: <strong>FLAG&#123;N3V3R_TRUST_CL13NT_S1D3&#125;</strong>
            </p>
          </div>
        )}

        <div className="pt-2">
          {/* Botón inicialmente disabled en el DOM */}
          <button
            id="btnBuy"
            type="submit"
            disabled={true}
            className="w-full py-2 px-3 rounded bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-emerald-500 hover:enabled:text-neutral-950 font-mono text-xs font-semibold text-neutral-300 transition-colors cursor-pointer"
          >
            Adquirir Certificación (500 €)
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// RETO 3: COOKIES Y SESIONES
// ==========================================
function Level3Challenge({
  onFlagDiscovered,
}: {
  onFlagDiscovered: (f: string) => void;
}) {
  const [currentRole, setCurrentRole] = useState<'guest' | 'admin' | 'unknown'>('guest');
  const [rawCookie, setRawCookie] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Al montar, asegura que exista la cookie de sesión del reto
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/lab_session=([^;]+)/);
      if (!match) {
        // {"user":"student","role":"guest"}
        const defaultVal = btoa(JSON.stringify({ user: 'student', role: 'guest' }));
        document.cookie = `lab_session=${defaultVal}; path=/; SameSite=Lax`;
        setRawCookie(defaultVal);
      } else {
        setRawCookie(match[1]);
      }
    }
  }, []);

  const handleVerifySession = () => {
    if (typeof document === 'undefined') return;
    const match = document.cookie.match(/lab_session=([^;]+)/);
    if (!match) {
      setCurrentRole('unknown');
      return;
    }

    try {
      const decoded = atob(match[1]);
      const parsed = JSON.parse(decoded);
      setRawCookie(match[1]);
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
    }
  };

  return (
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Control de Sesión Basado en Cookies
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          Rol detectado: <strong className={currentRole === 'admin' ? 'text-emerald-400' : 'text-amber-400'}>{currentRole.toUpperCase()}</strong>
        </span>
      </div>

      <p className="text-xs text-neutral-400">
        El panel lee la cookie <code>lab_session</code> en cada verificación. Actualmente contiene un objeto JSON codificado en Base64 con <code>&quot;role&quot;: &quot;guest&quot;</code>. Abre DevTools (pestaña Application o Console), decodifícala con <code>atob</code>, cámbiala a <code>&quot;role&quot;: &quot;admin&quot;</code>, recodifícala con <code>btoa</code> y pulsa en verificar.
      </p>

      <div className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-neutral-500 text-[11px]">Valor actual de document.cookie (lab_session):</span>
          <div className="p-2 bg-neutral-900 rounded border border-neutral-800 text-cyan-300 break-all select-all">
            {rawCookie || 'lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9'}
          </div>
        </div>

        {isVerified && currentRole === 'admin' && (
          <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>¡Sesión de Administrador verificada!</span>
            </div>
            <p className="text-neutral-200">
              Flag capturada: <strong>FLAG&#123;C00K13_T4MP3R1NG_SUCC3SS&#125;</strong>
            </p>
          </div>
        )}

        {isVerified && currentRole === 'guest' && (
          <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            Sesión válida, pero con rol &quot;guest&quot;. Modifica la cookie para que el rol sea &quot;admin&quot;.
          </div>
        )}

        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleVerifySession}
            type="button"
            className="px-3 py-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer transition-colors"
          >
            Verificar Cookie de Sesión
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
  openTerminal,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminal: () => void;
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
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Visor de Facturación Corporativa (IDOR)
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">
          Endpoint: /api/mock/invoices
        </span>
      </div>

      <p className="text-xs text-neutral-400">
        Tu número de factura asignado es el <strong>#1042</strong>. Abre la pestaña <strong>Network (Red)</strong> en DevTools para ver cómo viajan los parámetros, o utiliza la <strong>Terminal</strong> con <code>curl</code> para consultar identificadores adyacentes hasta encontrar la factura confidencial de Dirección (#1001).
      </p>

      <div className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          <label htmlFor="invIdInput" className="text-neutral-400 shrink-0">
            Consultar ID de Factura:
          </label>
          <input
            id="invIdInput"
            type="text"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-24 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => fetchInvoice(invoiceId)}
            type="button"
            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded font-semibold cursor-pointer transition-colors"
          >
            Consultar Factura
          </button>
        </div>

        {result && (
          <div className="p-3 rounded bg-neutral-900 border border-neutral-800 space-y-2 select-text">
            <span className="text-[11px] text-neutral-500 font-bold">RESPUESTA HTTP 200 OK:</span>
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.flag && (
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                ¡Vulnerabilidad IDOR confirmada! Flag: <strong>{result.flag}</strong>
              </div>
            )}
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={openTerminal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs cursor-pointer transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Probar en Terminal con curl: curl /api/mock/invoices?id=1001</span>
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
}: {
  onFlagDiscovered: (f: string) => void;
}) {
  const [username, setUsername] = useState("' OR '1'='1' --");
  const [password, setPassword] = useState('x');
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
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Autenticación Vulnerable a SQL Injection
          </span>
        </div>
        <span className="text-xs font-mono text-rose-400">
          SELECT * FROM users
        </span>
      </div>

      <p className="text-xs text-neutral-400">
        El motor SQL concatena directamente el usuario y la contraseña. Introduce un payload clásico de inyección booleana (como <code>&apos; OR &apos;1&apos;=&apos;1&apos; --</code>) para cerrar la cadena y forzar que la condición siempre sea verdadera.
      </p>

      <form onSubmit={handleLogin} className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="space-y-1">
          <label className="text-neutral-400">Nombre de Usuario:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-emerald-500"
            placeholder="' OR '1'='1' --"
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-400">Contraseña:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100 focus:outline-none focus:border-emerald-500"
            placeholder="contraseña cualquiera"
          />
        </div>

        {/* Visor de la consulta generada en vivo */}
        <div className="p-2.5 bg-neutral-900 rounded border border-neutral-800 space-y-1">
          <span className="text-[10px] text-neutral-500 font-bold uppercase">Consulta SQL generada en el servidor:</span>
          <code className="text-xs text-amber-300 block overflow-x-auto">
            SELECT * FROM users WHERE username = &apos;{username}&apos; AND password = &apos;{password}&apos;;
          </code>
        </div>

        {message && (
          <div
            className={`p-3 rounded text-xs border ${
              success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {message}
            {success && (
              <p className="mt-1 text-neutral-200 font-bold font-mono">
                Flag: FLAG&#123;S4N1T1Z3_Y0UR_1NPUTS_SQL1&#125;
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded font-semibold cursor-pointer transition-colors"
        >
          Ejecutar Consulta de Autenticación
        </button>
      </form>
    </div>
  );
}

// ==========================================
// RETO 6: AUTENTICACIÓN Y JWT
// ==========================================
function Level6Challenge({
  onFlagDiscovered,
  openTerminal,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminal: () => void;
}) {
  const [user, setUser] = useState('admin');
  const [pass, setPass] = useState('');
  const [authResponse, setAuthResponse] = useState<any>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const res = mockApiRouter('/api/mock/auth', 'POST', {}, JSON.stringify({ username: user, password: pass }));
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
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Ataque de Diccionario y Fuerza Bruta
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-500">
          Wordlist: /opt/wordlists/passwords.txt
        </span>
      </div>

      <p className="text-xs text-neutral-400">
        El endpoint <code>/api/mock/auth</code> no tiene rate limiting y utiliza una contraseña débil. Abre la <strong>Terminal</strong> del laboratorio y examina el archivo <code>cat /opt/wordlists/passwords.txt</code> para probar las contraseñas comunes contra el usuario <strong>admin</strong>.
      </p>

      <form onSubmit={handleAuth} className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-neutral-400">Usuario:</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
            />
          </div>
          <div className="space-y-1">
            <label className="text-neutral-400">Contraseña:</label>
            <input
              type="text"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="p. ej. hunter2"
              className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
            />
          </div>
        </div>

        {authResponse && (
          <div
            className={`p-3 rounded text-xs border ${
              authResponse.status === 200
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <p className="font-bold">{authResponse.mensaje || authResponse.error}</p>
            {authResponse.flag && (
              <p className="mt-1 text-neutral-200 font-mono">
                Flag: <strong>{authResponse.flag}</strong>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded font-semibold cursor-pointer transition-colors"
          >
            Probar Autenticación
          </button>
          <button
            onClick={openTerminal}
            type="button"
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ver diccionario en terminal (cat /opt/wordlists/passwords.txt)</span>
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
  openTerminal,
}: {
  onFlagDiscovered: (f: string) => void;
  openTerminal: () => void;
}) {
  const [empId, setEmpId] = useState('sec-9902');
  const [token, setToken] = useState('emergency_override_2026');
  const [response, setResponse] = useState<any>(null);

  const handleExecuteChain = (e: React.FormEvent) => {
    e.preventDefault();
    const res = mockApiRouter(
      '/api/mock/admin/flag',
      'GET',
      {
        'X-Employee-Id': empId,
        Authorization: `Bearer ${token}`,
      }
    );

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
    <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-sm text-neutral-200">
            Intranet Central: Mainframe Corporativo
          </span>
        </div>
        <span className="text-xs font-mono text-purple-400 font-semibold">
          NIVEL EXPERTO · CADENA COMPLETA
        </span>
      </div>

      <p className="text-xs text-neutral-400 leading-relaxed">
        Encadena las fases: 1) Reconocimiento (busca el endpoint interno en comentarios de la intranet), 2) IDOR en la API de personal para obtener las credenciales de Elena Ramos (CISO), y 3) Envía la petición con las cabeceras HTTP requeridas para tomar control del servidor central.
      </p>

      {/* Intranet simulada con comentario oculto */}
      <div className="p-3 bg-neutral-950 rounded border border-neutral-800 text-xs font-mono space-y-2">
        <div className="text-neutral-500 text-[11px]">
          [INTRANET PRIVADA · ACCESO RESTRINGIDO A STAFF AUTORIZADO]
        </div>
        <p className="text-neutral-400">
          Portal de operaciones y contingencia de infraestructura crítica.
        </p>
        {/*
          NOTA PARA SOPORTE:
          Para consultar los datos y credenciales de contingencia de seguridad:
          GET /api/mock/staff?dept=security
        */}
        <div className="text-[10px] text-neutral-600">
          Usa curl en la terminal para consultar: curl /api/mock/staff?dept=security
        </div>
      </div>

      <form onSubmit={handleExecuteChain} className="p-4 rounded border border-neutral-800 bg-neutral-950 space-y-3 font-mono text-xs">
        <div className="space-y-1">
          <label className="text-neutral-400">Cabecera X-Employee-Id:</label>
          <input
            type="text"
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
            placeholder="sec-9902"
          />
        </div>

        <div className="space-y-1">
          <label className="text-neutral-400">Cabecera Authorization (Bearer Token):</label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-100"
            placeholder="emergency_override_2026"
          />
        </div>

        {response && (
          <div
            className={`p-3 rounded text-xs border ${
              response.status === 200
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <p className="font-bold">{response.mensaje || response.error}</p>
            {response.flag && (
              <div className="mt-2 p-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-sm">
                🏆 ¡HAS COMPLETADO LA CADENA FINAL! Flag: {response.flag}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded font-semibold cursor-pointer transition-colors"
          >
            Lanzar Petición al Servidor Central
          </button>
          <button
            onClick={openTerminal}
            type="button"
            className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 rounded cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lanzar con curl en la terminal</span>
          </button>
        </div>
      </form>
    </div>
  );
}
