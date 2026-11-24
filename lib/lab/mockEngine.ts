import { MockFile } from './types';

export const MOCK_FILESYSTEM: Record<string, MockFile> = {
  '/home/student/readme.txt': {
    name: 'readme.txt',
    path: '/home/student/readme.txt',
    content: 'Bienvenido a la terminal interactiva del Cyber Lab de SMR2.\nUsa "help" para ver los comandos disponibles.\nTodas las herramientas corren de forma aislada en tu navegador.',
  },
  '/var/www/html/robots.txt': {
    name: 'robots.txt',
    path: '/var/www/html/robots.txt',
    content: `# SecureCorp IT Robots Exclusion File\nUser-agent: *\nDisallow: /admin-panel-hidden/\nDisallow: /backup/\nDisallow: /internal-api/\n# Staff flag: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}`,
  },
  '/backup/staff_notes.txt': {
    name: 'staff_notes.txt',
    path: '/backup/staff_notes.txt',
    content: `NOTAS INTERNAS DE INFRAESTRUCTURA (AULA 35):\n- El portal interno de facturación tiene IDOR pendiente de parchear en /api/mock/invoices.\n- No compartir las claves de emergencia.\n- Flag de contingencia: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}`,
  },
  '/opt/wordlists/passwords.txt': {
    name: 'passwords.txt',
    path: '/opt/wordlists/passwords.txt',
    content: `123456\npassword\nadmin123\nqwerty\nletmein\nfootball\niloveyou\nhunter2\nsecurity2026\nmasterkey`,
  },
  '/etc/config/auth.json': {
    name: 'auth.json',
    path: '/etc/config/auth.json',
    content: `{\n  "auth_service": "MockAuth v1.4",\n  "allowed_algorithms": ["HS256", "none"],\n  "warning": "alg: none debe deshabilitarse en produccion",\n  "admin_user": "admin"\n}`,
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
  const normalizedPath = path.trim().replace(/^https?:\/\/[^\/]+/, '');
  const [pathname, queryString] = normalizedPath.split('?');
  const params = new URLSearchParams(queryString || '');

  // 1. Robots.txt
  if (pathname === '/robots.txt' || pathname === '/lab/robots.txt' || pathname === '/var/www/html/robots.txt') {
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/plain' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Usa el método POST para autenticarte.' }, null, 2),
      };
    }

    // Parse URL-encoded or JSON body
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
        headers: { 'Content-Type': 'application/json' },
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
  
  // Detección de patrones booleanos clásicos de SQLi
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
