'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Terminal as TerminalIcon,
  ShieldAlert,
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface TerminalLine {
  id: string;
  type: 'system' | 'input' | 'output' | 'error' | 'success';
  text: string;
}

const INITIAL_LINES: TerminalLine[] = [
  {
    id: '1',
    type: 'system',
    text: 'SMR2 KERNEL v4.19.0-21-hardened (Aula 204 Mainframe)',
  },
  {
    id: '2',
    type: 'system',
    text: 'PANEL DE ADMINISTRACIÓN CENTRAL // ACCESO RESTRICTED_ROOT',
  },
  {
    id: '3',
    type: 'error',
    text: '[ALERTA] Intrusión detectada. Sesión degradada a privilegios mínimos (guest).',
  },
  {
    id: '4',
    type: 'output',
    text: 'Escribe "help" para listar utilidades de diagnóstico o "scan" para auditar la red.',
  },
];

export default function AdminPage() {
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>(INITIAL_LINES);
  const [commandInput, setCommandInput] = useState('');
  const [isHacked, setIsHacked] = useState(false);
  const [isBreaching, setIsBreaching] = useState(false);
  const [breachStep, setBreachStep] = useState(0);

  // Video state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clave secreta cifrada de la subred de clase
  // Subred: 192.168.10.0/27 -> Broadcast: 192.168.10.31
  // Token Base64: c21yMl9rM3JuM2xfcjAwdA== -> smr2_kern3l_r00t
  // Combinación: 192.168.10.31_smr2_kern3l_r00t
  const VALID_HACK_TOKENS = new Set([
    '192.168.10.31_smr2_kern3l_r00t',
    'smr2_kern3l_r00t',
    '2026papu',
    'admin2026',
    'smr2admin',
    'root@smr2',
  ]);

  // Comprobar si ya fue desbloqueado previamente en esta sesión/equipo
  useEffect(() => {
    try {
      const unlocked = localStorage.getItem('smr2_admin_hacked') === 'true';
      if (unlocked) {
        setIsHacked(true);
      }
    } catch {}

    // Pistas sutiles inyectadas en la consola de desarrollo del navegador
    console.log(
      '%c[SMR2 KERNEL SECURITY]%c Diagnostic probe active on endpoint: /api/admin/probe',
      'color: #10b981; font-weight: bold;',
      'color: #9ca3af;'
    );
    console.log(
      '%c[SMR2 HINT]%c Subnet: 192.168.10.0/27. Determine broadcast address and decode Base64 signature.',
      'color: #f59e0b; font-weight: bold;',
      'color: #9ca3af;'
    );
  }, []);

  // Mantener scroll del terminal abajo
  useEffect(() => {
    if (!isHacked) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, isHacked]);

  // Auto-foco en el input del terminal
  useEffect(() => {
    if (!isHacked && !isBreaching) {
      inputRef.current?.focus();
    }
  }, [isHacked, isBreaching]);

  // Actualizar progreso del vídeo
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration || 1;
      setVideoProgress((current / total) * 100);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const triggerBreachSequence = () => {
    setIsBreaching(true);
    setBreachStep(1);

    const steps = [
      'VERIFICANDO HASH DE AUTORIZACIÓN EN KERNEL...',
      'DESBORDAMIENTO DE BÚFER CONTROLADO EN PUERTO 8022...',
      'ESCALADA DE PRIVILEGIOS: OBTENIENDO ACCESO ROOT (uid=0)...',
      'DESENCRIPTANDO PAYLOAD CLASIFICADO: /opt/vault/secret_video.mp4...',
      'ACCESO CONCEDIDO // REPRODUCIENDO CONTENIDO...',
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setBreachStep(index + 1);
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now() + index),
            type: index === steps.length - 1 ? 'success' : 'system',
            text: `[+] ${step}`,
          },
        ]);

        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsBreaching(false);
            setIsHacked(true);
            try {
              localStorage.setItem('smr2_admin_hacked', 'true');
              sound.toastClink();
            } catch {}
          }, 800);
        }
      }, (index + 1) * 600);
    });
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput.trim();
    if (!raw || isBreaching) return;

    setCommandInput('');
    const inputLine: TerminalLine = {
      id: String(Date.now()),
      type: 'input',
      text: `guest@smr2-gateway:~$ ${raw}`,
    };

    setTerminalHistory((prev) => [...prev, inputLine]);

    const parts = raw.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Procesador de comandos de hacking / Linux
    if (cmd === 'clear') {
      setTerminalHistory([]);
      return;
    }

    if (cmd === 'help') {
      const output = [
        'Utilidades disponibles en el entorno restringido:',
        '  scan                 - Escanea puertos y servicios del aula',
        '  netstat / ifconfig   - Inspecciona interfaces de red y máscaras CIDR',
        '  probe                - Consulta telemetría del socket de diagnóstico',
        '  cat <archivo>        - Lee archivos de registro del sistema',
        '  decrypt <cadena>     - Decodifica hashes Base64',
        '  auth <clave>         - Envía token de autenticación para escalada a root',
        '  hint                 - Muestra acertijo criptográfico',
        '  clear                - Limpia el búfer del terminal',
      ];
      setTerminalHistory((prev) => [
        ...prev,
        ...output.map((text, i) => ({
          id: `${Date.now()}-${i}`,
          type: 'output' as const,
          text,
        })),
      ]);
      return;
    }

    if (cmd === 'scan' || cmd === 'nmap') {
      const output = [
        'Iniciando escaneo de puertos en 127.0.0.1...',
        '[+] PORT 22/tcp    ABIERTO     OpenSSH 8.9 (SMR2-Gateway)',
        '[+] PORT 80/tcp    ABIERTO     HTTP Nginx (Portal Alumnos)',
        '[!] PORT 8022/tcp  FILTRADO    SMR-Payload-Daemon (AES-256)',
        'Firma de memoria detectada: Segmento 0x0A2B contiene archivo multimedia encriptado.',
        'Se requiere autorización root para levantar el bloqueo.',
      ];
      setTerminalHistory((prev) => [
        ...prev,
        ...output.map((text, i) => ({
          id: `${Date.now()}-${i}`,
          type: 'output' as const,
          text,
        })),
      ]);
      return;
    }

    if (cmd === 'ifconfig' || cmd === 'netstat' || cmd === 'ip') {
      const output = [
        'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
        '      inet 192.168.10.14  netmask 255.255.255.224  broadcast 192.168.10.31',
        '      rx packets 10492  bytes 8492019 (8.4 MB)',
        '      tx packets 9120   bytes 7104920 (7.1 MB)',
        'Nota de red: Subred /27 activa en Aula 204.',
      ];
      setTerminalHistory((prev) => [
        ...prev,
        ...output.map((text, i) => ({
          id: `${Date.now()}-${i}`,
          type: 'output' as const,
          text,
        })),
      ]);
      return;
    }

    if (cmd === 'probe') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          type: 'output',
          text: 'Conectando con /api/admin/probe...',
        },
      ]);

      try {
        const res = await fetch('/api/admin/probe');
        const data = await res.json();
        const jsonLines = [
          `[PROBE_RESPONSE] Firmware: ${data.firmware || 'SMR2-GW'}`,
          `[REGLA_1] Subred: ${data.network_segment?.subnet || '192.168.10.0/27'}`,
          `[REGLA_2] Token cifrado: ${data.cipher_payload?.encoded_token || 'c21yMl9rM3JuM2xfcjAwdA=='}`,
          `[FÓRMULA] ${data.cipher_payload?.format || 'auth <BROADCAST_IP>_<DECODED_TOKEN>'}`,
        ];
        setTerminalHistory((prev) => [
          ...prev,
          ...jsonLines.map((text, i) => ({
            id: `${Date.now()}-${i}`,
            type: 'system' as const,
            text,
          })),
        ]);
      } catch {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'Error al consultar probe. Revisa la consola del navegador.',
          },
        ]);
      }
      return;
    }

    if (cmd === 'cat') {
      const file = args[0] || '';
      if (file.includes('shadow') || file.includes('auth.log')) {
        const output = [
          'root:$6$smr2$k92.xL4p0Q:19620:0:99999:7:::',
          '# NOTA CONFIDENCIAL JUANFE & DAVID:',
          '# Si olvidas la clave del payload del vídeo, combina la IP de broadcast',
          '# de nuestra subred /27 con la clave decodificada base64:',
          '# Clave: 192.168.10.31_smr2_kern3l_r00t (o claves maestras de desarrollador)',
        ];
        setTerminalHistory((prev) => [
          ...prev,
          ...output.map((text, i) => ({
            id: `${Date.now()}-${i}`,
            type: 'output' as const,
            text,
          })),
        ]);
      } else if (file.includes('syslog') || file.includes('issue')) {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'output',
            text: 'Kernel SMR2-Classroom. Módulo de auditoría 2º SMR activo. Aula 204.',
          },
        ]);
      } else {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: `cat: ${file || 'archivo'}: Archivo no encontrado. Prueba con "/var/log/auth.log"`,
          },
        ]);
      }
      return;
    }

    if (cmd === 'decrypt') {
      const token = args[0] || '';
      if (!token) {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'Uso: decrypt <cadena_base64>',
          },
        ]);
        return;
      }

      try {
        const decoded = atob(token);
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'success',
            text: `[DECODE_SUCCESS] ${token} -> "${decoded}"`,
          },
        ]);
      } catch {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'Fallo al decodificar: cadena Base64 no válida.',
          },
        ]);
      }
      return;
    }

    if (cmd === 'hint') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          type: 'output',
          text: 'Pista técnica: En 192.168.10.0/27, la máscara es 255.255.255.224. El broadcast es 192.168.10.31. Decodifica el token base64 "c21yMl9rM3JuM2xfcjAwdA==" con "decrypt" y únelos con "_" en "auth <broadcast>_<token>".',
        },
      ]);
      return;
    }

    if (cmd === 'sudo' || cmd === 'su') {
      const enteredPass = args.join(' ');
      if (
        enteredPass === 'smr2' ||
        enteredPass === '2026papu' ||
        enteredPass === 'admin2026' ||
        enteredPass.includes('kern3l')
      ) {
        triggerBreachSequence();
        return;
      }
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          type: 'error',
          text: '[sudo] password for guest: Permiso denegado. Utiliza el comando "auth <clave>"',
        },
      ]);
      return;
    }

    if (cmd === 'matrix' || cmd === 'hack') {
      setTerminalHistory((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          type: 'output',
          text: '[EXPLOIT_AUTO] Ejecutando payload de inyección automática en el mainframe...',
        },
      ]);
      setTimeout(() => {
        triggerBreachSequence();
      }, 700);
      return;
    }

    if (cmd === 'auth') {
      const key = args.join(' ').trim();
      if (!key) {
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'Uso: auth <clave_o_token>',
          },
        ]);
        return;
      }

      if (VALID_HACK_TOKENS.has(key)) {
        triggerBreachSequence();
      } else {
        try {
          sound.impact(0.5);
        } catch {}
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: 'error',
            text: `[DENEGADO] Token "${key}" no coincide con la firma del kernel. Sigue investigando con "probe" o "scan".`,
          },
        ]);
      }
      return;
    }

    // Comando desconocido
    setTerminalHistory((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        type: 'error',
        text: `Comando no reconocido: "${cmd}". Escribe "help" para ver las herramientas disponibles.`,
      },
    ]);
  };

  const handleReLock = () => {
    try {
      localStorage.removeItem('smr2_admin_hacked');
    } catch {}
    setIsHacked(false);
    setIsBreaching(false);
    setTerminalHistory(INITIAL_LINES);
    try {
      sound.tap();
    } catch {}
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col justify-between selection:bg-neutral-800 selection:text-white antialiased">
      {/* Pistas Ocultas en el DOM (Accesibles para alumnos inspeccionando el código fuente) */}
      <div
        style={{ display: 'none' }}
        data-smr-challenge="layer-1-subnet-broadcast"
        data-smr-encoded-token="c21yMl9rM3JuM2xfcjAwdA=="
        data-smr-hint="Broadcast IP for 192.168.10.0/27 is 192.168.10.31. Format: auth 192.168.10.31_smr2_kern3l_r00t"
      >
        {/* SMR2 CTF HACK PUZZLE // Si estás leyendo el DOM, vas por buen camino.
            Calcula el broadcast de 192.168.10.0/27 y decodifica el base64.
            Usa el comando: auth 192.168.10.31_smr2_kern3l_r00t */}
      </div>

      {/* Top Bar Minimalista */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-neutral-900 bg-neutral-950/80 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-semibold tracking-wider text-neutral-200">
              SMR2 // KERNEL CONSOLE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          {isHacked ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Unlock className="w-3.5 h-3.5" />
              <span>ROOT CONCEDIDO</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-500 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>TERMINAL BLOQUEADA</span>
            </span>
          )}
        </div>
      </header>

      {/* ESTADO 1: PANTALLA HACKEADA CON ÉXITO - EL VÍDEO SECRETO */}
      {isHacked ? (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center space-y-6 my-auto">
          {/* Mensaje irónico y desclasificado */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SMR2 // PRIVILEGIOS DE ROOT ADQUIRIDOS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Payload Clasificado Desbloqueado
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto font-sans leading-relaxed">
              Tanto esfuerzo descifrando subredes, ciphers y vulnerabilidades para entrar al panel de administración... y el gran secreto confidencial era esto:
            </p>
          </div>

          {/* Reproductor de Vídeo Minimalista */}
          <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl relative group">
            <video
              ref={videoRef}
              src="/admin_access.mp4"
              className="w-full aspect-video object-cover bg-black"
              autoPlay
              loop
              playsInline
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Barra de progreso sutil */}
            <div className="w-full h-1 bg-neutral-900">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>

            {/* Controles de reproducción minimalistas */}
            <div className="p-3 bg-neutral-950/90 border-t border-neutral-900 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  title={isMuted ? 'Activar audio' : 'Silenciar'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-[11px] text-neutral-500 font-mono">
                PAYLOAD_ID: #06AA9841 · 2º SMR
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white transition-colors cursor-pointer"
                  title="Pantalla completa"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleReLock}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bloquear terminal</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-neutral-500 pt-2 font-mono">
            Desarrollado y asegurado por JuanFe Ospina y David · 2º SMR 2026
          </div>
        </main>
      ) : (
        /* ESTADO 2: TERMINAL DE HACKING CTF INTERACTIVA */
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between my-auto">
          <div className="w-full bg-neutral-950 border border-neutral-900 rounded-2xl p-4 sm:p-6 shadow-2xl flex-1 flex flex-col justify-between min-h-[460px]">
            {/* Registro de salida del terminal */}
            <div className="space-y-2 overflow-y-auto max-h-[58vh] pr-2 text-xs leading-relaxed">
              {terminalHistory.map((line) => (
                <div
                  key={line.id}
                  className={
                    line.type === 'error'
                      ? 'text-red-400'
                      : line.type === 'success'
                      ? 'text-emerald-400 font-bold'
                      : line.type === 'system'
                      ? 'text-neutral-400 font-semibold'
                      : line.type === 'input'
                      ? 'text-neutral-200'
                      : 'text-neutral-400'
                  }
                >
                  {line.text}
                </div>
              ))}

              {isBreaching && (
                <div className="text-emerald-400 font-bold animate-pulse text-xs">
                  [SISTEMA EN PROCESO DE INTRUSIÓN · PASO {breachStep}/5...]
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Prompt de entrada del hacker */}
            <form onSubmit={handleCommandSubmit} className="mt-4 pt-3 border-t border-neutral-900 flex items-center gap-2">
              <span className="text-emerald-500 select-none text-xs font-bold">
                guest@smr2-gateway:~$
              </span>
              <input
                ref={inputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={isBreaching ? 'Acceso en curso...' : 'escribe un comando (ej: help, scan, probe)...'}
                disabled={isBreaching}
                autoComplete="off"
                spellCheck="false"
                className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder:text-neutral-700"
              />
            </form>
          </div>
        </main>
      )}

      {/* Footer Minimalista */}
      <footer className="px-4 sm:px-6 py-3 border-t border-neutral-900 bg-neutral-950/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 select-none gap-1">
        <div>Aula 204 · Sistemas Microinformáticos y Redes</div>
        <div>Auditoría de seguridad y penetración ética</div>
      </footer>
    </div>
  );
}
