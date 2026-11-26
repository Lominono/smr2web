import { MockFile } from './types';

export const MOCK_DIRECTORIES: string[] = [
  '/',
  '/home',
  '/home/student',
  '/var',
  '/var/www',
  '/var/www/html',
  '/etc',
  '/etc/config',
  '/opt',
  '/opt/wordlists',
  '/backup',
  '/usr',
  '/usr/share',
  '/usr/share/wordlists',
  '/usr/share/wordlists/dirb',
];

export const MOCK_FILESYSTEM: Record<string, MockFile> = {
  '/home/student/readme.txt': {
    name: 'readme.txt',
    path: '/home/student/readme.txt',
    content: `KALI GNU/LINUX (SMR2 CYBERLAB EDITION)
-------------------------------------------------------------
Entorno de auditoría técnica y seguridad informática.
Herramientas instaladas en el sistema:
  - Red y Escaneo:     nmap, curl
  - Fuzzing Web:       gobuster, dirb, nikto
  - Inyecciones y DB:  sqlmap
  - Fuerza Bruta:      hydra, base64
  - Utilidades Linux:  cat, grep, ls, cd, pwd, whoami, id, uname, clear

Diccionarios disponibles en:
  /usr/share/wordlists/dirb/common.txt
  /usr/share/wordlists/rockyou.txt
  /opt/wordlists/passwords.txt`,
  },
  '/var/www/html/robots.txt': {
    name: 'robots.txt',
    path: '/var/www/html/robots.txt',
    content: `# SecureCorp IT Robots Exclusion Protocol
User-agent: *
Disallow: /admin-panel-hidden/
Disallow: /backup/
Disallow: /api/internal/
# Staff flag: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}`,
  },
  '/var/www/html/index.html': {
    name: 'index.html',
    path: '/var/www/html/index.html',
    content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SecureCorp IT Services</title>
</head>
<body>
  <h1>SecureCorp // Cloud Defense</h1>
  <p>Infraestructura perimetral y auditoría continua.</p>
  <!-- TODO: Quitar antes de producción. Los logs y el robots.txt están en /lab/robots.txt y /backup/staff_notes.txt -->
  <!-- Flag del equipo de infraestructura: FLAG{DOM_C0MM3NTS_4ND_R0B0TS} -->
  <footer>© 2026 SecureCorp IT Solutions.</footer>
</body>
</html>`,
  },
  '/backup/staff_notes.txt': {
    name: 'staff_notes.txt',
    path: '/backup/staff_notes.txt',
    content: `NOTAS INTERNAS DE INFRAESTRUCTURA (AULA 35):
- El portal interno de facturación tiene IDOR pendiente de parchear en /api/mock/invoices.
- No compartir las claves de emergencia.
- Flag de contingencia: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}`,
  },
  '/usr/share/wordlists/dirb/common.txt': {
    name: 'common.txt',
    path: '/usr/share/wordlists/dirb/common.txt',
    content: `admin
api
backup
config
database
images
invoices
login
robots.txt
server-status
staff
test`,
  },
  '/usr/share/wordlists/rockyou.txt': {
    name: 'rockyou.txt',
    path: '/usr/share/wordlists/rockyou.txt',
    content: `123456
password
12345678
qwerty
12345
123456789
football
iloveyou
admin
welcome
hunter2
security2026
masterkey`,
  },
  '/opt/wordlists/passwords.txt': {
    name: 'passwords.txt',
    path: '/opt/wordlists/passwords.txt',
    content: `123456
password
admin123
qwerty
letmein
football
iloveyou
hunter2
security2026
masterkey`,
  },
  '/etc/config/auth.json': {
    name: 'auth.json',
    path: '/etc/config/auth.json',
    content: `{
  "auth_service": "MockAuth v1.4",
  "allowed_algorithms": ["HS256", "none"],
  "warning": "alg: none debe deshabilitarse en produccion",
  "admin_user": "admin"
}`,
  },
  '/etc/passwd': {
    name: 'passwd',
    path: '/etc/passwd',
    content: `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
student:x:1000:1000:Student SMR2:/home/student:/bin/bash`,
  },
};

export interface MockApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Enrutador HTTP virtual en memoria para simular peticiones con `curl` o desde los retos
 */
export function mockApiRouter(
  path: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body: string = ''
): MockApiResponse {
  const res = internalMockApiRouter(path, method, headers, body);

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('lab:network_request', {
          detail: {
            id: 'req-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            method: method.toUpperCase(),
            url: path,
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            requestHeaders: headers,
            requestBody: body,
            responseBody: res.body,
            timestamp: Date.now(),
          },
        })
      );
    } catch {}
  }

  return res;
}

function internalMockApiRouter(
  path: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body: string = ''
): MockApiResponse {
  const normalizedPath = path.trim().replace(/^https?:\/\/[^\/]+/, '');
  const [pathname, queryString] = normalizedPath.split('?');
  const params = new URLSearchParams(queryString || '');

  // 1. Robots.txt
  if (pathname === '/robots.txt' || pathname === '/lab/robots.txt' || pathname === '/var/www/html/robots.txt') {
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Server': 'nginx/1.24.0 (Debian)',
      },
      body: MOCK_FILESYSTEM['/var/www/html/robots.txt'].content,
    };
  }

  // 2. IDOR Invoices (/api/mock/invoices?id=...)
  if (pathname === '/api/mock/invoices') {
    const id = params.get('id');
    if (!id) {
      return {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Falta el parámetro id de la factura (?id=...)' }, null, 2),
      };
    }

    if (id === '1042') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Audit': 'IDOR Vulnerable - No ownership check',
        },
        body: JSON.stringify({
          invoice_id: 1042,
          cliente: 'Alumno 2º SMR',
          concepto: 'Suscripción ordinaria al laboratorio',
          total: '0.00 €',
          estado: 'Pagada',
          nota: 'Factura estándar sin privilegios.',
        }, null, 2),
      };
    }

    if (id === '1001') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-Vulnerability': 'IDOR Broken Access Control (CWE-639)',
        },
        body: JSON.stringify({
          invoice_id: 1001,
          cliente: 'DIRECCIÓN GENERAL DE SISTEMAS',
          concepto: 'Auditoría confidencial de infraestructura de red',
          total: '84,500.00 €',
          estado: 'Confidencial / Pago inmediato',
          vulnerabilidad: 'IDOR detectada: No se validó la sesión del solicitante contra el dueño de la factura.',
          flag: 'FLAG{1D0R_4P1_BR0K3N_0BJ3CT}',
        }, null, 2),
      };
    }

    return {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Factura #${id} no encontrada en la base de datos simulada.` }, null, 2),
    };
  }

  // 3. Autenticación con contraseña débil (/api/mock/auth)
  if (pathname === '/api/mock/auth') {
    if (method.toUpperCase() !== 'POST') {
      return {
        status: 405,
        statusText: 'Method Not Allowed',
        headers: { 'Content-Type': 'application/json', 'Allow': 'POST' },
        body: JSON.stringify({ error: 'Usa el método POST para autenticarte.' }, null, 2),
      };
    }

    let user = '';
    let pass = '';

    if (body.startsWith('{')) {
      try {
        const parsed = JSON.parse(body);
        user = parsed.username || parsed.user || '';
        pass = parsed.password || parsed.pass || '';
      } catch {}
    } else {
      const formParams = new URLSearchParams(body);
      user = formParams.get('username') || formParams.get('user') || '';
      pass = formParams.get('password') || formParams.get('pass') || '';
    }

    if (user.toLowerCase() === 'admin' && pass === 'hunter2') {
      return {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': 'session_token=eyJhbGciOiJub25lIn0...; Path=/',
        },
        body: JSON.stringify({
          success: true,
          token: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcwMDAwMDAwMH0.',
          mensaje: '¡Acceso concedido como Administrador! Contraseña débil detectada en diccionario.',
          flag: 'FLAG{BR0K3N_4UTH_JWT_N0N3}',
        }, null, 2),
      };
    }

    return {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Credenciales inválidas. Usuario o contraseña incorrectos.' }, null, 2),
    };
  }

  // 4. Staff API para Cadena Final (/api/mock/staff)
  if (pathname === '/api/mock/staff') {
    const dept = params.get('dept');
    if (dept === 'security') {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departamento: 'Seguridad y Ciberdefensa',
          jefe_departamento: {
            nombre: 'Elena Ramos (CISO)',
            emp_id: 'sec-9902',
            autorizacion: 'emergency_override_2026',
            nota: 'Para acceder al panel de control /api/mock/admin/flag enviar X-Employee-Id y Authorization: Bearer <token>',
          },
        }, null, 2),
      };
    }

    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        departamentos_disponibles: ['marketing', 'it', 'security', 'rrhh'],
        aviso: 'Usa ?dept=security para consultar la plantilla de seguridad.',
      }, null, 2),
    };
  }

  // 5. Admin Flag para Cadena Final (/api/mock/admin/flag)
  if (pathname === '/api/mock/admin/flag') {
    const empId = headers['x-employee-id'] || headers['X-Employee-Id'];
    const authHeader = headers['authorization'] || headers['Authorization'];

    if (empId === 'sec-9902' && authHeader === 'Bearer emergency_override_2026') {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          mensaje: '¡Identidad verificada como Elena Ramos (CISO)! Escalada de privilegios en cadena completada.',
          servidor: 'mainframe-core-01.local',
          flag: 'FLAG{FULL_CH41N_M4ST3R_H4CK3R}',
        }, null, 2),
      };
    }

    return {
      status: 403,
      statusText: 'Forbidden',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Acceso denegado. Se requiere cabecera X-Employee-Id autorizada y cabecera Authorization: Bearer <token>',
      }, null, 2),
    };
  }

  return {
    status: 404,
    statusText: 'Not Found',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `Ruta simulada no encontrada: ${pathname}` }, null, 2),
  };
}

/**
 * Validador de inyecciones SQL simuladas en memoria
 */
export function evaluateMockSqlInjection(usernameInput: string, passwordInput: string): {
  success: boolean;
  query: string;
  message: string;
} {
  const query = `SELECT * FROM users WHERE username = '${usernameInput}' AND password = '${passwordInput}';`;
  
  const sqliPatterns = [
    /'\s*or\s*'1'\s*=\s*'1/i,
    /'\s*or\s*1\s*=\s*1/i,
    /'\s*or\s*true\s*--/i,
    /'\s*or\s*'a'\s*=\s*'a/i,
    /'\s*or\s*''\s*=\s*'/i,
    /'\s*union\s+select/i,
    /admin'\s*--/i,
    /admin'\s*#/i,
  ];

  const isVulnerableMatch = sqliPatterns.some(
    pattern => pattern.test(usernameInput) || pattern.test(passwordInput)
  );

  if (isVulnerableMatch) {
    return {
      success: true,
      query,
      message: '¡Inyección SQL exitosa! La cláusula WHERE evaluó a TRUE para todas las filas. Sesión iniciada como "admin".',
    };
  }

  if (usernameInput === 'admin' && passwordInput === 'hunter2') {
    return {
      success: true,
      query,
      message: 'Inicio de sesión válido con contraseña por defecto.',
    };
  }

  return {
    success: false,
    query,
    message: 'Consulta ejecutada sin coincidencias: 0 filas devueltas (Acceso denegado).',
  };
}

/**
 * Simulador de herramientas profesionales de Kali Linux / Ubuntu
 */
export function runKaliToolSimulation(tool: string, args: string[]): {
  type: 'output' | 'error' | 'success';
  content: string;
} {
  switch (tool) {
    case 'nmap': {
      const target = args.find(a => !a.startsWith('-')) || 'localhost';
      return {
        type: 'output',
        content: `Starting Nmap 7.94 ( https://nmap.org ) at 2026-11-24 13:25 CET
Nmap scan report for ${target} (127.0.0.1)
Host is up (0.00038s latency).
Not shown: 996 closed tcp ports (reset)
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
80/tcp   open  http    nginx 1.24.0 (Debian)
8080/tcp open  http    Node.js / Next.js Server
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Nmap done: 1 IP address (1 host up) scanned in 0.42 seconds`,
      };
    }

    case 'gobuster':
    case 'dirb': {
      return {
        type: 'output',
        content: `===============================================================
Gobuster v3.6 - Auditing Web Enumeration Tool
===============================================================
[+] Target URL:   http://localhost/
[+] Wordlist:     /usr/share/wordlists/dirb/common.txt
[+] Status Codes: 200, 301, 302, 307, 401, 403
===============================================================
/robots.txt           (Status: 200) [Size: 184]
/backup               (Status: 301) [Size: 169] --> /backup/staff_notes.txt
/api/mock/invoices    (Status: 400) [Size: 62]  --> Requiere ?id=...
/api/mock/auth        (Status: 405) [Size: 58]  --> Endpoint POST
/api/mock/staff       (Status: 200) [Size: 154]
===============================================================
Fuzzing completado: 5 rutas relevantes descubiertas.`,
      };
    }

    case 'nikto': {
      return {
        type: 'output',
        content: `- Nikto v2.5.0
---------------------------------------------------------------------------
+ Target IP:          127.0.0.1
+ Target Hostname:    localhost
+ Target Port:        80
---------------------------------------------------------------------------
+ Server: nginx/1.24.0 (Debian)
+ [!] Entry in robots.txt: /backup/
+ [!] Entry in robots.txt: /admin-panel-hidden/
+ [!] Information disclosure: /backup/staff_notes.txt visible en servidor
+ [!] Cookie lab_session creada sin flag HttpOnly (vulnerable a XSS/robo)
+ [!] IDOR potencial detectado en /api/mock/invoices
---------------------------------------------------------------------------
+ 5 posibles vulnerabilidades y hallazgos reportados.`,
      };
    }

    case 'sqlmap': {
      const urlArg = args.join(' ');
      return {
        type: 'output',
        content: `        ___
       __H__
 ___ ___["]_____ ___ ___  {1.7.11#stable}
|_ -| . [']     | .'| . |
|___|_  [.]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[*] Analizando objetivo de inyección SQL...
[INFO] Comprobando parámetro en formulario de inicio de sesión: 'username'
[INFO] El parámetro 'username' es vulnerable a SQL Injection de tipo boolean-based blind / OR condition
[INFO] Payload verificado: ' OR '1'='1' --
[+] Servidor vulnerable confirmado: La base de datos aceptó la derivación de autenticación.
[+] Flag de prueba obtenida: FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}`,
      };
    }

    case 'hydra': {
      return {
        type: 'output',
        content: `Hydra v9.5 (c) 2023 by van Hauser / THC & David Maciejak
[DATA] Atacando formulario HTTP-POST en http://localhost:8080/api/mock/auth
[ATTEMPT] Usuario: "admin" | Probando 10 contraseñas de /opt/wordlists/passwords.txt...
[ATTEMPT] Intento 1/10: "123456"    -> 401 Unauthorized
[ATTEMPT] Intento 2/10: "password"  -> 401 Unauthorized
[ATTEMPT] Intento 3/10: "admin123"  -> 401 Unauthorized
[ATTEMPT] Intento 4/10: "qwerty"    -> 401 Unauthorized
[ATTEMPT] Intento 5/10: "letmein"   -> 401 Unauthorized
[ATTEMPT] Intento 6/10: "football"  -> 401 Unauthorized
[ATTEMPT] Intento 7/10: "iloveyou"  -> 401 Unauthorized
[ATTEMPT] Intento 8/10: "hunter2"   -> 200 OK [TOKEN EMITIDO]

[+] [8080][http-post-form] host: localhost   login: admin   password: hunter2
[+] 1 contraseña válida encontrada con éxito.
[+] Flag capturada: FLAG{BR0K3N_4UTH_JWT_N0N3}`,
      };
    }

    default:
      return {
        type: 'error',
        content: `Herramienta "${tool}" no reconocida.`,
      };
  }
}
