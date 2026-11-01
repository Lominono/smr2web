'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Terminal,
  VolumeX,
  Volume2,
  RotateCcw,
  LogOut,
  AlertOctagon,
  Flame,
  Check,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface TerminalLine {
  text: string;
  type?: 'input' | 'output' | 'error' | 'success' | 'system';
}

export default function AdminHackerPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([
    { text: 'SMR2 HARDENED LINUX 6.6.21-X86_64 (ttyS0)', type: 'system' },
    { text: 'Gateway de Auditoría Forense · Acceso alumno (UID=1001, GID=1001)', type: 'system' },
    { text: '============================================================', type: 'system' },
    { text: 'ADVERTENCIA: Consola protegida. El panel de root requiere privilegios UID=0.', type: 'system' },
    { text: 'Para desbloquear el acceso debes deducir la clave mediante análisis forense.', type: 'output' },
    { text: "Escribe 'help' para comandos o 'ls -la' para explorar los archivos locales.", type: 'output' },
    { text: '============================================================', type: 'system' },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const terminalInputRef = useRef<HTMLInputElement | null>(null);

  // Video state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Hardware explosion & glitch crash state
  const [hasExploded, setHasExploded] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [crashKey, setCrashKey] = useState(0);

  // Verificación inicial de sesión
  useEffect(() => {
    let isMounted = true;
    async function checkServerAdminAuth() {
      try {
        const res = await fetch('/api/admin/verify');
        const data = await res.json();
        if (isMounted) {
          setIsAdmin(res.ok && data.authorized === true);
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      }
    }
    checkServerAdminAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  // Focus terminal input
  useEffect(() => {
    if (!isAdmin) {
      terminalInputRef.current?.focus();
    }
  }, [isAdmin]);

  // Autoplay con sonido al desbloquear
  useEffect(() => {
    if (isAdmin && videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(() => {});
        }
      });
      try {
        sound.jackpot();
      } catch {}
    }
  }, [isAdmin]);

  // Detonador de colapso de hardware brutalista (Sin diseño IA)
  const triggerHardwareExplosion = () => {
    setHasExploded(true);
    setIsGlitching(true);
    setCrashKey((prev) => prev + 1);

    // Audio de sobrecarga eléctrica y detonación grave
    try {
      sound.crashExplode();
      setTimeout(() => {
        try { sound.gunshotBoom(); } catch {}
      }, 200);
      setTimeout(() => {
        try { sound.impact(1.3); } catch {}
      }, 500);
      setTimeout(() => {
        try { sound.crashExplode(); } catch {}
      }, 850);
      setTimeout(() => {
        try { sound.broke(); } catch {}
      }, 1300);
    } catch {}

    // Detener glitch violento a los 3.2 segundos
    setTimeout(() => {
      setIsGlitching(false);
    }, 3200);
  };

  // Procesador interactivo de comandos hacker en la terminal (Modo CTF con deducción)
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCmd = currentInput.trim();
    if (!rawCmd || isProcessing) return;

    setCurrentInput('');
    const newHistory: TerminalLine[] = [
      ...terminalHistory,
      { text: `alumno@smr2-gateway:~$ ${rawCmd}`, type: 'input' },
    ];

    const lower = rawCmd.toLowerCase();
    const parts = rawCmd.split(/\s+/);
    const cmdName = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(' ').trim();

    // 1. Comando help
    if (lower === 'help' || lower === '?' || lower === 'man') {
      newHistory.push(
        { text: 'COMANDOS DE AUDITORÍA Y ANÁLISIS FORENSE:', type: 'system' },
        { text: '  ls [-la]              - Explorar archivos y artefactos locales', type: 'output' },
        { text: '  cat <archivo>         - Leer el contenido de un archivo', type: 'output' },
        { text: '  grep <texto> <arch>   - Filtrar líneas específicas de un archivo', type: 'output' },
        { text: '  ps [aux]              - Inspeccionar procesos activos en memoria', type: 'output' },
        { text: '  scan | nmap           - Sondeo de puertos y servicios de red', type: 'output' },
        { text: '  uname -a              - Información del kernel y compilación', type: 'output' },
        { text: '  hex <cadena_hex>      - Decodificar bytes hexadecimales a texto ASCII', type: 'output' },
        { text: '  base64 [-d] <cadena>  - Decodificar o codificar en Base64', type: 'output' },
        { text: '  whoami | id           - Ver usuario actual y nivel de permisos', type: 'output' },
        { text: '  login <clave>         - Validar clave maestra para escalar a root', type: 'output' },
        { text: '  clear                 - Limpiar pantalla del terminal', type: 'output' },
        { text: 'Pista: La clave no está en texto claro. Debes deducirla explorando archivos y logs.', type: 'system' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 2. Comando clear
    if (lower === 'clear' || lower === 'cls') {
      setTerminalHistory([
        { text: 'Terminal reiniciada. Escribe \'help\' para ayuda forense.', type: 'system' },
      ]);
      return;
    }

    // 3. Comando ls / dir
    if (cmdName === 'ls' || cmdName === 'dir') {
      newHistory.push(
        { text: 'total 48', type: 'output' },
        { text: 'drwxr-xr-x 4 alumno alumnos 4096 Oct 28 19:10 .', type: 'output' },
        { text: 'drwxr-xr-x 3 root   root    4096 Oct 28 18:30 ..', type: 'output' },
        { text: '-rw------- 1 alumno alumnos  340 Oct 28 19:05 .bash_history', type: 'output' },
        { text: '-rw-r--r-- 1 admin  admin    520 Oct 28 18:45 notas_profesor.txt', type: 'output' },
        { text: '-rw-r--r-- 1 root   root      48 Oct 28 18:50 /opt/token.hex', type: 'output' },
        { text: '-rw-r----- 1 root   admin    612 Oct 28 19:00 /var/log/auth.log', type: 'output' },
        { text: '-rw-r--r-- 1 root   root     180 Oct 28 18:00 /etc/hosts', type: 'output' },
        { text: '-rw-r----- 1 root   shadow   290 Oct 28 18:00 /etc/shadow', type: 'output' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 4. Comando ps / ps aux / top
    if (cmdName === 'ps' || lower.startsWith('ps ') || lower === 'top') {
      newHistory.push(
        { text: 'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND', type: 'system' },
        { text: 'root         1  0.0  0.1  21300  3200 ?        Ss   18:00   0:01 /sbin/init', type: 'output' },
        { text: 'root       402  0.0  0.2  15400  4100 ?        Ss   18:00   0:00 /usr/sbin/sshd -D', type: 'output' },
        { text: 'root       512  0.0  0.3  32100  5800 ?        S    18:00   0:01 nginx: master process', type: 'output' },
        { text: 'root       910  0.0  0.4  48200  8900 ?        Sl   18:00   0:04 /usr/local/bin/smr2-gateway --daemon --vault=/opt/token.hex', type: 'output' },
        { text: 'alumno    1001  0.0  0.2  11200  2800 ttyS0    S+   19:10   0:00 /bin/bash (restricted_shell)', type: 'output' },
        { text: '[+] Proceso sospechoso detectado: PID 910 cargando bóveda /opt/token.hex', type: 'system' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 5. Comando scan / nmap
    if (lower.startsWith('scan') || lower.startsWith('nmap')) {
      newHistory.push(
        { text: '[*] Iniciando sondeo TCP SYN contra 192.168.204.1/24...', type: 'output' },
        { text: 'PUERTO 22/tcp   OPEN  OpenSSH 9.6p1 Debian-SMR2', type: 'output' },
        { text: 'PUERTO 80/tcp   OPEN  nginx/1.24.0 (Proxy inverso)', type: 'output' },
        { text: 'PUERTO 443/tcp  OPEN  Cloudflare HTTPS Edge', type: 'output' },
        { text: 'PUERTO 2026/tcp OPEN  SMR2-AUTH-GATEWAY (Clave maestra requerida)', type: 'output' },
        { text: '[+] Escaneo completado: 1 host activo (0.28s).', type: 'success' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 6. Comando uname
    if (cmdName === 'uname') {
      newHistory.push(
        { text: 'Linux smr2-srv 6.6.21-smr2-hardened #1 SMP PREEMPT_DYNAMIC Wed Oct 28 2026 x86_64 GNU/Linux', type: 'output' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 7. Comando whoami / id
    if (lower === 'whoami' || lower === 'id') {
      newHistory.push(
        { text: 'uid=1001(alumno) gid=1001(alumnos) groups=1001(alumnos)', type: 'output' },
        { text: 'Nivel: RESTRINGIDO. Se requiere UID=0 (root) para acceder al panel.', type: 'error' }
      );
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 8. Comando hex / xxd (Decodificador hexadecimal para el puzzle)
    if (cmdName === 'hex' || cmdName === 'xxd') {
      const hexInput = args.replace(/0x|\s+|[,;]/g, '');
      if (!hexInput) {
        newHistory.push(
          { text: 'Uso: hex <cadena_hexadecimal>', type: 'system' },
          { text: 'Ejemplo: hex 3230323670617075', type: 'output' }
        );
      } else {
        let asciiOutput = '';
        for (let i = 0; i < hexInput.length; i += 2) {
          const byteVal = parseInt(hexInput.substring(i, i + 2), 16);
          if (!isNaN(byteVal) && byteVal >= 32 && byteVal <= 126) {
            asciiOutput += String.fromCharCode(byteVal);
          } else {
            asciiOutput += '.';
          }
        }
        newHistory.push(
          { text: '[+] DECODIFICADOR HEX -> ASCII:', type: 'system' },
          { text: `    Entrada hex : ${hexInput}`, type: 'output' },
          { text: `    Texto ASCII : "${asciiOutput}"`, type: 'success' },
          { text: `[!] Si esta es la clave maestra, prueba: login ${asciiOutput}`, type: 'system' }
        );
      }
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 9. Comando base64
    if (cmdName === 'base64' || cmdName === 'b64') {
      const b64Str = args.replace(/-d|-D|--decode/g, '').trim();
      if (!b64Str) {
        newHistory.push(
          { text: 'Uso: base64 -d <cadena_base64>', type: 'system' },
          { text: 'Ejemplo: base64 -d MjAyNnBhcHU=', type: 'output' }
        );
      } else {
        try {
          const decoded = atob(b64Str);
          newHistory.push(
            { text: `[+] Base64 decodificado: "${decoded}"`, type: 'success' },
            { text: `[!] Prueba: login ${decoded}`, type: 'system' }
          );
        } catch {
          newHistory.push({ text: '[-] Error: Cadena Base64 inválida.', type: 'error' });
        }
      }
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 10. Comando cat / more / less / head / tail / nano
    if (['cat', 'more', 'less', 'head', 'tail', 'nano', 'vi', 'vim'].includes(cmdName)) {
      const target = args.toLowerCase();

      if (target.includes('notas') || target.includes('profesor')) {
        newHistory.push(
          { text: '============================================================', type: 'system' },
          { text: 'AVISO DE SEGURIDAD INTERNA · DEPARTAMENTO INFORMÁTICA SMR', type: 'system' },
          { text: '============================================================', type: 'system' },
          { text: 'Por directiva de ciberseguridad, ninguna clave se almacena en plano.', type: 'output' },
          { text: 'Para recuperar el acceso de root, existen dos vías de deducción:', type: 'output' },
          { text: '', type: 'output' },
          { text: '[VÍA 1 - CRIPTOGRAFÍA FORENSE / HEXADECIMAL]:', type: 'system' },
          { text: '  En \'/opt/token.hex\' se generó un volcado de 8 bytes hexadecimales.', type: 'output' },
          { text: '  Conviértelos a caracteres ASCII usando \'hex <bytes>\' o tabla ASCII.', type: 'output' },
          { text: '', type: 'output' },
          { text: '[VÍA 2 - POLÍTICA ALGORÍTMICA PAM]:', type: 'system' },
          { text: '  En \'/var/log/auth.log\' está registrada la directiva de aula.', type: 'output' },
          { text: '  Requiere cruzar: [CURSO], [AULA en /etc/hosts] y [AÑO en uname -a].', type: 'output' },
          { text: '============================================================', type: 'system' }
        );
      } else if (target.includes('token') || target.includes('opt')) {
        newHistory.push(
          { text: '[VOLCADO EN BRUTO - DIRECCIÓN DE MEMORIA 0x00007FFF]', type: 'system' },
          { text: 'Offset    00 01 02 03 04 05 06 07', type: 'output' },
          { text: '0x0000    32 30 32 36 70 61 70 75', type: 'output' },
          { text: '', type: 'output' },
          { text: 'CADENA HEX: 3230323670617075', type: 'output' },
          { text: '(Pista: 8 bytes ASCII. Ej: 0x32 = \'2\', 0x70 = \'p\'...)', type: 'system' },
          { text: 'Usa: \'hex 3230323670617075\' para decodificarlo o hazlo mentalmente.', type: 'system' }
        );
      } else if (target.includes('auth') || target.includes('log') || target.includes('syslog')) {
        newHistory.push(
          { text: 'Oct 28 18:40:11 smr2-srv pam_smr2[812]: Regla de política de contraseñas (PAM_POL_2026):', type: 'system' },
          { text: 'Oct 28 18:40:12 smr2-srv pam_smr2[812]: FORMATO = [CURSO]#[AULA].[ACCESO][AÑO]!', type: 'output' },
          { text: 'Oct 28 18:40:13 smr2-srv pam_smr2[812]: Parámetros requeridos para deducirla:', type: 'output' },
          { text: '  1. [CURSO]   -> Ciclo actual en mayúsculas (ej: SMR2)', type: 'output' },
          { text: '  2. [AULA]    -> Hostname asignado en /etc/hosts (ej: Aula204)', type: 'output' },
          { text: '  3. [ACCESO]  -> Palabra clave \'Acceso\'', type: 'output' },
          { text: '  4. [AÑO]     -> Año de promoción en \'uname -a\' (ej: 2026)', type: 'output' },
          { text: '  5. Sufijo obligatorio final: \'!\'', type: 'output' },
          { text: 'Oct 28 18:42:05 smr2-srv smr2-gateway[910]: Gateway listo en TCP/2026. Esperando login.', type: 'system' }
        );
      } else if (target.includes('hosts') || target.includes('hostname')) {
        newHistory.push(
          { text: '127.0.0.1       localhost smr2-srv', type: 'output' },
          { text: '192.168.204.1   gateway.smr2.local', type: 'output' },
          { text: '192.168.204.204 aula204.smr2.lan      # Servidor DHCP del aula asignada', type: 'output' }
        );
      } else if (target.includes('shadow') || target.includes('passwd')) {
        newHistory.push(
          { text: 'root:$6$rounds=65536$SMR2_SALT_9x7$89a4cf3b91a78b5e283c...:19741:0:99999:7:::', type: 'output' },
          { text: 'admin:$6$rounds=65536$SMR2_SALT_9x7$c14e92fa07de629f10a4...:19741:0:99999:7:::', type: 'output' },
          { text: 'alumno:x:1001:1001::/home/alumno:/bin/bash', type: 'output' },
          { text: '[!] ALERTA CRIPTOGRÁFICA PAM: Hashes blindados con SHA-512 (65.536 rondas).', type: 'error' },
          { text: 'No intentes fuerza bruta. Investiga \'notas_profesor.txt\', \'/opt/token.hex\' o \'/var/log/auth.log\'.', type: 'system' }
        );
      } else if (target.includes('history')) {
        newHistory.push(
          { text: '# Historial de comandos recientes del administrador:', type: 'system' },
          { text: 'systemctl restart smr2-auth-gateway.service', type: 'output' },
          { text: 'ps aux | grep gateway', type: 'output' },
          { text: '# "He guardado el token de emergencia en /opt/token.hex (bytes ASCII)"', type: 'output' },
          { text: '# "Si olvidáis la clave maestra del aula, calculadla con /var/log/auth.log"', type: 'output' },
          { text: 'xxd /opt/token.hex', type: 'output' }
        );
      } else {
        newHistory.push(
          { text: `cat: ${args || 'archivo'}: No existe el archivo o el directorio. Usa 'ls' para ver archivos disponibles.`, type: 'error' }
        );
      }
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 11. Comando grep
    if (cmdName === 'grep') {
      const term = parts[1]?.toLowerCase();
      if (!term) {
        newHistory.push({ text: 'Uso: grep <término> <archivo>', type: 'system' });
      } else if (term.includes('aula') || term.includes('host') || term.includes('204')) {
        newHistory.push(
          { text: '192.168.204.204 aula204.smr2.lan      # Servidor DHCP del aula asignada', type: 'success' }
        );
      } else if (term.includes('formato') || term.includes('curso') || term.includes('pam')) {
        newHistory.push(
          { text: 'FORMATO = [CURSO]#[AULA].[ACCESO][AÑO]!', type: 'success' },
          { text: 'Parámetros: SMR2 + # + Aula204 + . + Acceso + 2026 + !', type: 'output' }
        );
      } else {
        newHistory.push({ text: `grep: no se encontraron coincidencias para '${parts[1]}'`, type: 'output' });
      }
      setTerminalHistory(newHistory);
      try { sound.tap(); } catch {}
      return;
    }

    // 12. Intento de autenticación / escalada de privilegios
    let candidateKey = rawCmd;
    if (lower.startsWith('login ')) candidateKey = rawCmd.slice(6).trim();
    if (lower.startsWith('auth ')) candidateKey = rawCmd.slice(5).trim();
    if (lower.startsWith('sudo ')) candidateKey = rawCmd.slice(5).trim();
    if (lower.startsWith('su ')) candidateKey = rawCmd.slice(3).trim();

    newHistory.push({ text: `[*] Verificando vector de escalada '${candidateKey}' contra el kernel...`, type: 'system' });
    setTerminalHistory(newHistory);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/admin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: candidateKey }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        newHistory.push(
          { text: '[+] Vector de escalada verificado con éxito: CVE-2026-X86_ROOT_ESCALATION', type: 'success' },
          { text: '[+] Elevando privilegios: UID=1001 (alumno) -> UID=0 (root)... OK', type: 'success' },
          { text: '[+] Descifrando payload confidencial /dev/shm/.admin_core... [████████████] 100%', type: 'success' },
          { text: '[!] ACCESO DE ROOT CONCEDIDO: DESPLEGANDO SISTEMA CENTRAL...', type: 'success' }
        );
        setTerminalHistory(newHistory);
        try { sound.toastClink(); } catch {}

        setTimeout(() => {
          setIsAdmin(true);
        }, 900);
      } else {
        newHistory.push(
          { text: `[!] ERROR DE AUTENTICACIÓN: ${data.error || 'Clave de escalada rechazada por directiva PAM.'}`, type: 'error' },
          { text: 'Acceso denegado. Escribe \'help\', revisa \'notas_profesor.txt\' o analiza \'/opt/token.hex\'.', type: 'system' }
        );
        setTerminalHistory(newHistory);
        try { sound.impact(0.5); } catch {}
      }
    } catch {
      newHistory.push({ text: '[!] Error de socket: Fallo en la comunicación con el subsistema PAM.', type: 'error' });
      setTerminalHistory(newHistory);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAdmin(false);
    setHasExploded(false);
    setTerminalHistory([
      { text: 'Sesión finalizada. Terminal de nuevo protegida.', type: 'system' },
      { text: 'Escribe \'help\' para investigar el sistema.', type: 'output' },
    ]);
  };

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleReplayVideo = () => {
    setHasExploded(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // Cargando verificación inicial
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-400 flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neutral-400 animate-ping" />
          <span>[BOOT] Sincronizando con socket administrativo...</span>
        </div>
      </div>
    );
  }

  // ==============================================================
  // PANTALLA 1: CONSOLA TERMINAL HACKER (Desafío interactivo minimalista)
  // ==============================================================
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col justify-between p-3 sm:p-6 md:p-8 font-mono antialiased selection:bg-neutral-800">
        {/* Barra superior de terminal */}
        <header className="w-full max-w-4xl mx-auto flex items-center justify-between text-xs text-neutral-500 pb-3 border-b border-neutral-900">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-neutral-300 font-semibold tracking-tight">
              smr2-gateway:~# (tty1)
            </span>
          </div>

          <Link
            href="/"
            className="hover:text-neutral-300 transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al portal</span>
          </Link>
        </header>

        {/* Ventana de Consola CLI */}
        <main className="w-full max-w-4xl mx-auto my-auto py-4 flex-1 flex flex-col justify-end">
          <div className="w-full rounded-xl border border-neutral-800/80 bg-neutral-950 p-4 sm:p-6 shadow-2xl flex flex-col space-y-2 min-h-[440px] max-h-[70vh] overflow-y-auto">
            {/* Historial de líneas */}
            <div className="space-y-1.5 text-xs leading-relaxed">
              {terminalHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`${
                    item.type === 'input'
                      ? 'text-white font-semibold'
                      : item.type === 'error'
                      ? 'text-red-400'
                      : item.type === 'success'
                      ? 'text-emerald-400 font-medium'
                      : item.type === 'system'
                      ? 'text-neutral-500'
                      : 'text-neutral-300'
                  }`}
                >
                  {item.text}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Input interactivo del terminal */}
            <form onSubmit={handleTerminalSubmit} className="pt-2 flex items-center gap-2">
              <span className="text-emerald-400 select-none text-xs font-bold">
                alumno@smr2-gateway:~$
              </span>
              <input
                ref={terminalInputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Escribe un comando (ej: 'help', 'ls -la', 'cat notas_profesor.txt')..."
                disabled={isProcessing}
                className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-white placeholder:text-neutral-600 focus:ring-0 p-0"
                autoFocus
                spellCheck={false}
                autoCapitalize="none"
              />
              {isProcessing && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-neutral-400 shrink-0" />
              )}
            </form>
          </div>

          {/* Atajos de comandos de auditoría (Sin soluciones regaladas) */}
          <div className="pt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
            <span>Herramientas rápidas:</span>
            {[
              { label: 'help', cmd: 'help' },
              { label: 'ls -la', cmd: 'ls -la' },
              { label: 'ps aux', cmd: 'ps aux' },
              { label: 'cat notas_profesor.txt', cmd: 'cat notas_profesor.txt' },
              { label: 'cat /opt/token.hex', cmd: 'cat /opt/token.hex' },
              { label: 'cat /var/log/auth.log', cmd: 'cat /var/log/auth.log' },
              { label: 'clear', cmd: 'clear' },
            ].map((shortcut) => (
              <button
                key={shortcut.cmd}
                type="button"
                onClick={() => {
                  setCurrentInput(shortcut.cmd);
                  terminalInputRef.current?.focus();
                }}
                className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 hover:text-neutral-300 transition-colors cursor-pointer text-[10px]"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </main>

        {/* Pie austero */}
        <footer className="w-full max-w-4xl mx-auto flex items-center justify-between text-[11px] text-neutral-600 pt-2 border-t border-neutral-900">
          <div>2º SMR · Aula: Ni puta idea</div>
          <div>Terminal segura SSH / TLS 1.3</div>
        </footer>
      </div>
    );
  }

  // ==============================================================
  // PANTALLA 2: EL TROLLAZO + HARDWARE GLITCH EXPLOSION (Sin diseño IA)
  // ==============================================================
  return (
    <div
      className={`min-h-screen bg-[#09090b] text-neutral-100 flex flex-col justify-between p-4 sm:p-8 font-mono antialiased selection:bg-neutral-800 relative overflow-hidden transition-all duration-200 ${
        isGlitching ? 'animate-hardware-glitch' : ''
      }`}
    >
      {/* Superposición de Kernel Panic y colapso electrónico */}
      {isGlitching && (
        <div
          key={`crash-${crashKey}`}
          className="fixed inset-0 z-[9999] pointer-events-none bg-black/95 text-red-500 p-6 flex flex-col justify-center items-start text-xs font-mono select-none overflow-hidden"
        >
          <div className="border border-red-500/50 p-4 rounded bg-red-950/20 max-w-2xl w-full mx-auto space-y-1">
            <div className="font-bold text-red-400 uppercase tracking-widest text-sm pb-1 border-b border-red-500/30">
              *** FATAL EXCEPTION: KERNEL_PANIC_0xDEADBEEF ***
            </div>
            <div>[ 42.198302] kernel: VFS: Unable to mount root fs on unknown-block(0,0)</div>
            <div>[ 42.198450] CPU 0: Machine Check Exception: 0000000000000004</div>
            <div>[ 42.198512] RIP 0010:[&lt;ffffffff8104821a&gt;] panic+0x1f/0x1c0</div>
            <div>[ 42.198601] Call Trace:</div>
            <div>[ 42.198650]  [&lt;ffffffff81a02931&gt;] smr2_security_violation+0x8f/0x90</div>
            <div>[ 42.198710]  [&lt;ffffffff81002014&gt;] do_syscall_64+0x74/0x160</div>
            <div>[ 42.198800] ---[ end Kernel panic - not syncing: Fatal Hardware Failure ]---</div>
          </div>
        </div>
      )}

      {/* Barra superior minimalista */}
      <header className="w-full max-w-3xl mx-auto flex items-center justify-between pt-1 relative z-20 text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al portal público</span>
        </Link>

        <button
          type="button"
          onClick={handleAdminLogout}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-neutral-400 hover:text-red-400 rounded border border-neutral-800 transition-colors cursor-pointer text-xs"
          title="Cerrar sesión de root"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión root</span>
        </button>
      </header>

      {/* Contenedor central */}
      <main className="w-full max-w-2xl mx-auto my-auto py-6 sm:py-8 flex flex-col items-center text-center space-y-6 relative z-20">
        {/* Encabezado editorial sobrio */}
        <div className="space-y-2">
          <div className="inline-block text-[11px] text-neutral-500 uppercase tracking-widest px-2.5 py-0.5 rounded border border-neutral-800 bg-neutral-900">
            {hasExploded ? 'STATUS: HARDWARE_FAILURE (0x0000007B)' : 'PAYLOAD DECRYPTED: ROOT_STREAM_01'}
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white uppercase">
            {hasExploded ? 'COLAPSO DEL SISTEMA' : '¿Te creías hacker?'}
          </h1>

          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            {hasExploded
              ? 'Has ejecutado el vídeo hasta el final y has frito el servidor. Te has quedado sin panel, sin notas y con el terminal bloqueado. Te jodes.'
              : 'Has superado el terminal interactivo, investigado el /etc/shadow y escalado privilegios pensando que cambiarías las notas... pues te jodes, toma tu premio:'}
          </p>
        </div>

        {/* Reproductor de Video Troll */}
        <div
          className={`w-full relative rounded-xl overflow-hidden border bg-neutral-950 transition-all duration-300 ${
            hasExploded
              ? 'border-red-600/80 shadow-[0_0_40px_rgba(220,38,38,0.3)]'
              : 'border-neutral-800 shadow-2xl'
          }`}
        >
          <video
            ref={videoRef}
            src="/admin-troll.mp4"
            autoPlay
            playsInline
            controls
            onEnded={triggerHardwareExplosion}
            className="w-full max-h-[60vh] object-contain mx-auto bg-black"
          />

          {isMuted && !hasExploded && (
            <button
              type="button"
              onClick={toggleSound}
              className="absolute top-3 right-3 px-2.5 py-1 rounded bg-black/80 hover:bg-black text-white text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
            >
              <VolumeX className="w-3 h-3" />
              <span>Activar sonido</span>
            </button>
          )}

          {/* Sello de terminal destruido */}
          {hasExploded && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-4 text-center space-y-2 pointer-events-none border border-red-500/40">
              <div className="text-red-500 font-bold text-lg tracking-widest uppercase">
                [SYSTEM_HALTED]
              </div>
              <p className="text-xs text-neutral-400 font-mono max-w-xs">
                0 días de cárcel · 0 aprobados en SMR2 · Auditoría finalizada
              </p>
            </div>
          )}
        </div>

        {/* Acciones austeras */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-200 text-black transition-colors"
          >
            Volver al portal humildemente
          </Link>

          <button
            type="button"
            onClick={handleReplayVideo}
            className="px-3.5 py-2 rounded-lg text-xs border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{hasExploded ? 'Reintentar transmisión' : 'Repetir vídeo'}</span>
          </button>

          {hasExploded && (
            <button
              type="button"
              onClick={triggerHardwareExplosion}
              className="px-3.5 py-2 rounded-lg text-xs border border-red-500/50 bg-red-950/20 text-red-400 hover:bg-red-900/30 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Detonar colapso otra vez</span>
            </button>
          )}
        </div>
      </main>

      {/* Pie minimalista */}
      <footer className="w-full max-w-3xl mx-auto flex items-center justify-between text-[11px] text-neutral-600 py-1 border-t border-neutral-900">
        <div>2º SMR · Aula: Ni puta idea</div>
        <div>Código de salida: 0xDEADBEEF</div>
      </footer>
    </div>
  );
}
