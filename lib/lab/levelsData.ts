import { LevelData } from './types';

export const LAB_LEVELS: LevelData[] = [
  // ==========================================
  // NIVEL 1: RECONOCIMIENTO WEB
  // ==========================================
  {
    id: 1,
    title: 'Reconocimiento y Fugas en el Código',
    category: 'Information Disclosure & Recon',
    difficulty: 'Fácil',
    points: 100,
    objective: 'Inspecciona el código fuente del portal corporativo simulado o utiliza las herramientas de Kali Linux en la terminal (nmap, gobuster, nikto o curl) para descubrir las rutas ocultas y recuperar la flag de infraestructura.',
    lesson: {
      cwe: 'CWE-200: Fuga de Información Confidencial / OWASP A01:2021',
      overview: 'El reconocimiento (Footprinting & Enumeration) es la fase inicial imprescindible en cualquier auditoría de seguridad informática. Antes de lanzar cualquier prueba intrusiva, el analista analiza toda la información que el servidor y los desarrolladores exponen públicamente.',
      howItWorks: 'En la arquitectura web HTTP (RFC 9309 y RFC 7230), los navegadores descargan el código HTML, CSS y JavaScript sin compilar. Lo que el desarrollador oculta visualmente (con comentarios <!-- -->, variables de depuración o archivos de exclusión como robots.txt) es 100% visible para cualquier persona que inspeccione el tráfico o el DOM. Asimismo, los rastreadores web respetan robots.txt de forma voluntaria, lo que convierte a este archivo en un mapa perfecto para atacantes.',
      kaliToolSection: {
        toolName: 'Herramientas de Reconocimiento Web en Kali Linux',
        commandExample: 'nmap localhost\ngobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt\nnikto -h http://localhost',
        explanation: 'En Kali Linux, usamos "nmap" para escanear puertos y servicios activos, "gobuster" para realizar fuzzing y descubrir archivos o carpetas ocultas comparando con un diccionario (wordlist), y "nikto" para detectar desconfiguraciones del servidor web y archivos como robots.txt.',
      },
      vulnerableCodeExample: `<!-- INTRANET VULNERABLE: Comentario dejado por un desarrollador en producción -->
<div class="footer-container">
  <p>© 2026 SecureCorp IT Solutions</p>
  <!-- TODO: Mover las notas de contingencia a la VPN -->
  <!-- Ruta interna de backup: /backup/staff_notes.txt -->
  <!-- Comprobar que /lab/robots.txt bloquee a los rastreadores -->
</div>`,
      vulnerableCodeLang: 'html',
      whyItHappens: 'Falta de pipeline CI/CD con pasos de minificación (stripping de comentarios) antes de desplegar en producción, y el mito de la "seguridad por oscuridad" (creer erróneamente que si un elemento no se ve en pantalla, no existe).',
      realWorldImpact: 'Permite a los atacantes mapear la estructura interna de directorios, conocer nombres de usuarios del equipo técnico, versiones exactas de software y localizar archivos de backup olvidados sin generar alertas en los cortafuegos (WAF).',
    },
    challenge: {
      description: 'El portal simulado "SecureCorp" expone información confidencial en su código HTML y en archivos del servidor. Puedes inspeccionarlo con F12 en tu navegador o lanzar herramientas de Kali en la terminal integrada (nmap, gobuster, nikto, o curl).',
      targetHint: 'En la terminal ejecuta: "gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt" o "curl /lab/robots.txt".',
      devtoolsTab: 'Elements (Inspector)',
    },
    hints: [
      { id: 1, cost: 10, text: 'Abre el modo Inspeccionar del navegador (F12) y busca comentarios HTML dentro de la sección del portal corporativo.' },
      { id: 2, cost: 20, text: 'En la terminal de Kali Linux del laboratorio puedes ejecutar "nikto -h localhost" o "gobuster" para listar las rutas del servidor.' },
      { id: 3, cost: 30, text: 'Ejecuta en la terminal: curl /lab/robots.txt o cat /var/www/html/robots.txt para leer la flag.' },
    ],
    flag: 'FLAG{DOM_C0MM3NTS_4ND_R0B0TS}',
    solution: {
      steps: [
        'Abre las DevTools pulsando F12 o Ctrl+Mayús+I (o el botón "Inspeccionar" superior).',
        'En la pestaña "Elements", despliega el contenedor del portal SecureCorp y localiza el comentario: <!-- Flag del equipo de infraestructura: FLAG{DOM_C0MM3NTS_4ND_R0B0TS} -->.',
        'Como método alternativo desde Kali Linux: abre la terminal del laboratorio.',
        'Ejecuta: gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt para descubrir /robots.txt.',
        'Ejecuta: curl /lab/robots.txt para obtener la misma flag directamente desde la consola.',
      ],
      explanation: 'El archivo robots.txt indica a los motores de búsqueda legítimos qué partes del sitio web no indexar, pero es un fichero de libre acceso público. NUNCA se debe utilizar robots.txt para "proteger" directorios sensibles.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA EN SERVIDOR Y COMPILADOR:
// 1. Minificación en Vite / Webpack / Next.js (next.config.js):
module.exports = {
  compiler: {
    removeConsole: true, // Elimina logs en producción
  },
};

// 2. Regla defensiva en Nginx (/etc/nginx/sites-available/default):
// Bloquear acceso a archivos de backup y ocultos:
location ~* \\.(bak|config|sql|old|txt|log)$ {
  deny all;
  return 404;
}

// 3. Proteger las rutas mediante Middleware y Autenticación, no por robots.txt:
export function middleware(req) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    return verifySession(req) ? NextResponse.next() : NextResponse.redirect('/login');
  }
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Automatizar la minificación y eliminación de comentarios en los pipelines de integración continua (CI/CD).',
        'Aplicar el principio de que todo recurso privado debe exigir autenticación criptográfica en el backend.',
        'Configurar el servidor web (Nginx/Apache) para denegar el acceso a archivos de configuración y backups.',
      ],
    },
  },

  // ==========================================
  // NIVEL 2: EL CLIENTE NO ES DE FIAR
  // ==========================================
  {
    id: 2,
    title: 'El Cliente No Es De Fiar (Validación en Frontend)',
    category: 'Client-Side Validation Bypass',
    difficulty: 'Fácil',
    points: 150,
    objective: 'Manipula el formulario de compra para adquirir la certificación de ciberseguridad valorada en 500 € teniendo 0 € de saldo en tu cuenta.',
    lesson: {
      cwe: 'CWE-602: Client-Side Enforcement of Server-Side Security / OWASP A04:2021',
      overview: 'La regla de oro de la ingeniería de software seguro reza: "NUNCA confíes en los datos o validaciones que se ejecutan en el cliente". El navegador es un entorno hostil que está bajo el control físico y lógico absoluto del usuario.',
      howItWorks: 'Si una aplicación web valida el precio, el saldo o los permisos únicamente en JavaScript o atributos HTML (como <button disabled> o <input type="hidden" name="price" value="500">), cualquier persona puede abrir DevTools, eliminar el atributo "disabled" o reescribir el valor a "0". Cuando el formulario se envía, si el servidor no vuelve a comprobar el precio real en su base de datos, procesará la compra fraudulenta.',
      kaliToolSection: {
        toolName: 'Elusión de Frontend con Curl en Kali / Ubuntu',
        commandExample: 'curl -X POST http://localhost/api/checkout -d "price=0&itemId=cert-01"',
        explanation: 'Un auditor de seguridad rara vez utiliza la interfaz gráfica para enviar formularios críticos. En Kali Linux enviamos peticiones directas con "curl", enviando payloads con valores modificados para probar si la API del servidor valida los datos de forma independiente al navegador.',
      },
      vulnerableCodeExample: `<!-- CÓDIGO VULNERABLE: Confianza ciega en campos del formulario -->
<form action="/api/checkout" method="POST">
  <h3>Certificación en Ciberseguridad (500 €)</h3>
  <input type="hidden" name="item_id" value="cert-sec-01">
  <!-- ¡GRAVE VULNERABILIDAD! El frontend le dice al servidor cuánto cobrar -->
  <input type="hidden" name="price" value="500" id="checkoutPrice">
  
  <!-- El botón se desactiva solo visualmente si saldo < 500 € -->
  <button id="btnBuy" disabled>Saldo insuficiente (0 €)</button>
</form>`,
      vulnerableCodeLang: 'html',
      whyItHappens: 'Comodidad del desarrollador al reutilizar los valores que tiene cargados en pantalla para no hacer una consulta adicional a la base de datos en el backend.',
      realWorldImpact: 'Alteración de precios en plataformas de comercio electrónico, elusión de límites de transferencia bancaria y activación de suscripciones premium sin abonar su importe.',
    },
    challenge: {
      description: 'El simulador contiene una pasarela de certificación. Tu saldo es de 0 € y el botón de compra está deshabilitado. Abre DevTools (F12) o utiliza los botones de manipulación para quitar el atributo "disabled", cambiar el precio a 0 € o alterar el saldo guardado en sessionStorage.',
      targetHint: 'Inspecciona el botón de compra y el input del precio. Cambia el precio a 0 € o ejecuta en la consola: sessionStorage.setItem("lab_user_balance", "1000").',
      devtoolsTab: 'Elements (Inspector)',
    },
    hints: [
      { id: 1, cost: 15, text: 'Haz clic derecho sobre el botón "Saldo insuficiente" y pulsa "Inspeccionar elemento" (o abre DevTools con F12).' },
      { id: 2, cost: 30, text: 'En el árbol HTML, localiza la etiqueta <button disabled> y elimina el atributo "disabled" para habilitarlo.' },
      { id: 3, cost: 45, text: 'Cambia el valor del input del precio a 0 o inyecta saldo con sessionStorage.setItem("lab_user_balance", "1000") en la Consola.' },
    ],
    flag: 'FLAG{N3V3R_TRUST_CL13NT_S1D3}',
    solution: {
      steps: [
        'Abre DevTools (F12) sobre el formulario de certificación.',
        'Inspecciona el botón de compra: elimina el atributo "disabled" para que vuelva a ser interactivo.',
        'Busca el campo de precio oculto y edita su valor de "500" a "0".',
        'Alternativamente, en la pestaña Console ejecuta: sessionStorage.setItem("lab_user_balance", "1000") y refresca el saldo.',
        'Haz clic en el botón de compra: el simulador validará la compra a coste cero y emitirá la flag.',
      ],
      explanation: 'Las validaciones en el navegador son indispensables para una buena experiencia de usuario (UX), pero no ofrecen ninguna seguridad. La única validación que protege al negocio es la que se ejecuta obligatoriamente en el servidor.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA EN BACKEND (Next.js / Node.js API Route):
import { z } from "zod";

// 1. Esquema de validación estricta con Zod: NUNCA aceptar el precio del cliente
const CheckoutSchema = z.object({
  itemId: z.string().uuid(),
  // ¡El campo "price" no existe en el esquema! El cliente no puede definirlo.
});

export async function POST(req: Request) {
  const session = await auth.getSession(req);
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json();
  const { itemId } = CheckoutSchema.parse(body);

  // 2. Consultar el precio real y oficial directamente en la base de datos:
  const product = await db.products.findById(itemId);
  if (!product) return Response.json({ error: "Producto no encontrado" }, { status: 404 });

  // 3. Consultar el saldo real del usuario autenticado en la base de datos:
  const user = await db.users.findById(session.userId);
  if (user.balance < product.officialPrice) {
    return Response.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  // 4. Ejecutar la transacción financiera de forma atómica:
  await db.$transaction([
    db.users.decrementBalance(user.id, product.officialPrice),
    db.orders.create({ userId: user.id, itemId: product.id, amount: product.officialPrice }),
  ]);

  return Response.json({ success: true, message: "Compra completada" });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Tratar cualquier dato recibido del cliente (parámetros, cuerpo, cabeceras) como potencialmente malicioso.',
        'Obtener precios, privilegios y balances exclusivamente desde fuentes de datos confiables en el servidor.',
        'Utilizar esquemas de validación estricta (Zod, Joi) que descarten propiedades no autorizadas.',
      ],
    },
  },

  // ==========================================
  // NIVEL 3: COOKIES Y SESIONES INSEGURAS
  // ==========================================
  {
    id: 3,
    title: 'Cookies Inseguras y Manipulación de Sesión',
    category: 'Session Tampering & Broken Auth',
    difficulty: 'Media',
    points: 200,
    objective: 'Inspecciona la cookie de sesión del laboratorio en DevTools, identifica que está codificada en Base64 sin firma criptográfica y elévate a rol "admin" utilizando la terminal o el decodificador.',
    lesson: {
      cwe: 'CWE-565: Reliance on Cookies without Validation / CWE-384: Session Fixation / OWASP A07:2021',
      overview: 'El protocolo HTTP es un protocolo sin estado (stateless). Para mantener abierta una sesión de usuario, los servidores envían cookies al navegador (RFC 6265). Si el estado de sesión se almacena en el cliente sin firma criptográfica (HMAC), el usuario puede alterar su propio rol a su antojo.',
      howItWorks: 'Muchos sistemas guardan el objeto de usuario directamente en una cookie codificada en Base64: lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9. Como Base64 NO es cifrado (solo es un formato de representación binario-a-texto ASCII), cualquier usuario puede decodificarlo con atob() o base64 -d, modificar "guest" por "admin", recodificarlo y enviarlo al servidor para obtener privilegios máximos.',
      kaliToolSection: {
        toolName: 'Decodificación y Forja de Base64 en Ubuntu / Kali Linux',
        commandExample: 'echo "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9" | base64 -d\necho -n \'{"user":"student","role":"admin"}\' | base64',
        explanation: 'En entornos Linux, la herramienta "base64" con el parámetro "-d" permite decodificar al instante cualquier payload en Base64 encontrado en cookies o cabeceras, y sin el parámetro "-d" permite generar el nuevo token manipulado para inyectarlo en la sesión.',
      },
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Confianza ciega en cookies de cliente sin firma
import express from "express";
const app = express();

app.get("/api/admin/panel", (req, res) => {
  const rawCookie = req.cookies.lab_session;
  
  // ¡GRAVE ERROR! El servidor decodifica Base64 y asume que el contenido es íntegro:
  const session = JSON.parse(Buffer.from(rawCookie, "base64").toString("utf-8"));
  
  if (session.role === "admin") {
    return res.json({ secret: "FLAG{C00K13_T4MP3R1NG_SUCC3SS}" });
  }
  
  res.status(403).json({ error: "Acceso restringido a administradores" });
});`,
      vulnerableCodeLang: 'javascript',
      whyItHappens: 'Confusión habitual en programadores noveles entre codificación (Base64) y cifrado/firma criptográfica, junto con la omisión de las directivas HttpOnly, Secure y SameSite.',
      realWorldImpact: 'Escalada vertical de privilegios (de usuario anónimo o visitante a administrador con control absoluto del sistema sin conocer la contraseña).',
    },
    challenge: {
      description: 'El simulador lee la cookie "lab_session". Actualmente contiene un JSON con rol "guest". Abre DevTools -> Application -> Cookies (o usa document.cookie en Consola), o abre la terminal y usa "base64 -d", cambia el rol a "admin", actualiza la cookie y pulsa "Verificar Sesión".',
      targetHint: 'En la terminal ejecuta: base64 -d "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9". Luego codifica con rol admin y asígnalo en document.cookie.',
      devtoolsTab: 'Application (Cookies/Storage)',
    },
    hints: [
      { id: 1, cost: 20, text: 'Abre la pestaña "Application" en DevTools y en el menú izquierdo despliega "Cookies" para ver el valor de lab_session.' },
      { id: 2, cost: 40, text: 'En la terminal ejecuta: base64 -d "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9" para leer el JSON.' },
      { id: 3, cost: 60, text: 'Para forjar el rol admin, ejecuta en la consola: document.cookie = "lab_session=" + btoa(JSON.stringify({user:"student",role:"admin"})) y pulsa "Verificar Cookie de Sesión".' },
    ],
    flag: 'FLAG{C00K13_T4MP3R1NG_SUCC3SS}',
    solution: {
      steps: [
        'Abre DevTools (F12) y dirígete a la pestaña "Console" o "Application" -> "Cookies".',
        'Lee el valor actual de la cookie de sesión: document.cookie.',
        'En la terminal de Kali Linux ejecuta: echo "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9" | base64 -d para ver {"user":"student","role":"guest"}.',
        'Genera el payload con permisos elevados: echo -n \'{"user":"student","role":"admin"}\' | base64 -> genera "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJhZG1pbiJ9".',
        'Asigna la cookie en el navegador: document.cookie = "lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJhZG1pbiJ9; path=/".',
        'Haz clic en el botón "Verificar Cookie de Sesión" en el simulador: el sistema validará el nuevo rol y entregará la flag.',
      ],
      explanation: 'Base64 es únicamente un estándar de codificación sin garantías criptográficas. Las sesiones deben estar protegidas mediante identificadores opacos almacenados en la base de datos o tokens firmados con HMAC-SHA256 y la flag HttpOnly obligatoria.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA: Cookie de sesión HttpOnly firmada con HMAC-SHA256
import crypto from "crypto";

export function createSecureSession(userId: string, role: string) {
  const secretKey = process.env.SESSION_SECRET; // Mínimo 32 bytes aleatorios
  const payload = JSON.stringify({ userId, role, iat: Date.now() });
  
  const encodedData = Buffer.from(payload).toString("base64url");
  const hmacSignature = crypto
    .createHmac("sha256", secretKey)
    .update(encodedData)
    .digest("base64url");

  // El token contiene datos + firma: si alguien altera los datos, la firma no coincide
  const signedToken = \`\${encodedData}.\${hmacSignature}\`;

  return {
    name: "auth_session",
    value: signedToken,
    httpOnly: true, // ¡CRÍTICO! Impide el robo de cookies mediante ataques XSS
    secure: process.env.NODE_ENV === "production", // Solo se transmite bajo HTTPS
    sameSite: "lax", // Mitiga ataques de falsificación de peticiones (CSRF)
    path: "/",
    maxAge: 60 * 60 * 12, // Expiración a las 12 horas
  };
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Añadir SIEMPRE el atributo HttpOnly a las cookies de autenticación para que no sean accesibles vía JavaScript.',
        'Firmar criptográficamente cualquier cookie de estado mediante HMAC-SHA256 o emplear identificadores opacos en servidor (Redis).',
        'Establecer SameSite=Lax o SameSite=Strict y la flag Secure para exigir el cifrado TLS en tránsito.',
      ],
    },
  },

  // ==========================================
  // NIVEL 4: PETICIONES Y APIS (IDOR)
  // ==========================================
  {
    id: 4,
    title: 'Insecure Direct Object References (IDOR)',
    category: 'API Security & Broken Access Control',
    difficulty: 'Media',
    points: 250,
    objective: 'Inspecciona la petición de consulta de facturas en la pestaña Network (Red) o mediante curl, modifica el ID de factura para acceder a la factura confidencial #1001 de Dirección.',
    lesson: {
      cwe: 'CWE-639: Authorization Bypass Through User-Controlled Key / OWASP A01:2021',
      overview: 'IDOR (Insecure Direct Object Reference) o BOLA (Broken Object Level Authorization) es una de las vulnerabilidades más críticas y frecuentes en APIs REST modernas. Ocurre cuando un endpoint expone un registro en base de datos mediante un identificador directo (como ?id=1042 o /users/55) sin verificar si el usuario autenticado tiene permiso legítimo para acceder a ese objeto.',
      howItWorks: 'Si visitas tu factura en /api/invoices?id=1042, un atacante o auditor cambiará el parámetro en la URL a id=1041, id=1043 o id=1001. Si el backend ejecuta una consulta directa como "SELECT * FROM invoices WHERE id = $id" sin exigir "AND user_id = $current_user", el servidor devolverá la factura confidencial de cualquier otra persona u organización.',
      kaliToolSection: {
        toolName: 'Inspección y Fuzzing de APIs con Curl y Ffuf en Kali Linux',
        commandExample: 'curl -i "http://localhost/api/mock/invoices?id=1001"\nffuf -w ids.txt -u "http://localhost/api/mock/invoices?id=FUZZ"',
        explanation: 'En auditorías con Kali Linux, usamos "curl -i" para examinar tanto las cabeceras HTTP como el cuerpo de respuesta, y herramientas de fuzzing como "ffuf" para iterar sobre secuencias numéricas de IDs de forma automatizada y encontrar registros no protegidos.',
      },
      vulnerableCodeExample: `// CÓDIGO VULNERABLE EN ROUTE HANDLER / ENDPOINT:
export async function GET(req: Request) {
  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("id");

  // ¡ERROR GRAVE DE CONTROL DE ACCESO!
  // Se busca directamente por la clave primaria sin comprobar quién hace la petición:
  const invoice = await db.invoices.findUnique({
    where: { id: Number(invoiceId) }
  });

  if (!invoice) return Response.json({ error: "Factura no encontrada" }, { status: 404 });
  return Response.json(invoice); // ¡Fuga de datos de otros usuarios!
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'Asumir falsamente que los usuarios solo consultarán las URLs generadas por los botones visibles de la interfaz gráfica, omitiendo la verificación de propiedad en el backend.',
      realWorldImpact: 'Fuga masiva de datos personales (infracciones graves del RGPD), exposición de historiales médicos, contratos confidenciales, nóminas y balances financieros.',
    },
    challenge: {
      description: 'El visor de facturación corporativa consulta tu factura personal (#1042). Abre la pestaña Network (Red) de DevTools para observar la petición fetch, o utiliza la terminal de Kali Linux para solicitar la factura confidencial de Dirección (#1001).',
      targetHint: 'En la terminal ejecuta: curl /api/mock/invoices?id=1001, o edita el ID directamente en el visor de facturas.',
      devtoolsTab: 'Network (Red)',
    },
    hints: [
      { id: 1, cost: 25, text: 'Abre la pestaña "Network" (Red) en DevTools y haz clic en "Consultar Factura" para ver cómo viajan los parámetros en la URL.' },
      { id: 2, cost: 50, text: 'Observa que el endpoint llamado es /api/mock/invoices?id=1042. ¿Qué ocurre si cambias el parámetro por id=1001?' },
      { id: 3, cost: 75, text: 'En la terminal de Kali Linux del laboratorio ejecuta: curl /api/mock/invoices?id=1001' },
    ],
    flag: 'FLAG{1D0R_4P1_BR0K3N_0BJ3CT}',
    solution: {
      steps: [
        'Abre DevTools (F12) y haz clic en la pestaña "Network" (Red).',
        'En el visor de facturas del laboratorio, haz clic en "#1042 (Mía)". Observa la llamada a /api/mock/invoices?id=1042.',
        'Cambia el campo del ID a "1001" y haz clic en "Consultar Factura".',
        'Alternativamente, en la terminal integrada ejecuta: curl /api/mock/invoices?id=1001.',
        'La API simulada responderá con la factura confidencial de la Dirección General y la flag asociada.',
      ],
      explanation: 'El fallo de IDOR radica en confiar en que el identificador enviado por el cliente es legítimo. La autorización contextual debe validarse obligatoriamente a nivel de objeto antes de retornar cualquier dato.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA: Control de acceso basado en el contexto de sesión
export async function GET(req: Request) {
  // 1. Obtener la sesión autenticada del usuario desde la cookie segura:
  const session = await auth.getSession(req);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const invoiceId = Number(url.searchParams.get("id"));

  // 2. Consulta segura: EXIGIR que el recurso pertenezca al usuario de la sesión:
  const invoice = await db.invoices.findFirst({
    where: {
      id: invoiceId,
      ownerId: session.userId, // ¡CRÍTICO! Restricción de propiedad
    },
  });

  if (!invoice) {
    // Retornar 404 para evitar ataques de enumeración de recursos
    return Response.json({ error: "Factura no encontrada o acceso denegado" }, { status: 404 });
  }

  return Response.json(invoice);
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Comprobar en cada consulta a base de datos que el usuario autenticado sea el dueño legítimo del recurso solicitado.',
        'Implementar Row Level Security (RLS) en Postgres o Supabase como capa de defensa en profundidad.',
        'Emplear UUIDs v4 aleatorios y opacos en lugar de identificadores enteros auto-incrementales.',
      ],
    },
  },

  // ==========================================
  // NIVEL 5: INYECCIONES SIMULADAS (SQLi)
  // ==========================================
  {
    id: 5,
    title: 'Inyecciones SQL (SQLi) y Manipulación de Consultas',
    category: 'Injection Vulnerabilities',
    difficulty: 'Avanzada',
    points: 300,
    objective: 'Supera el inicio de sesión vulnerable aplicando una inyección SQL clásica para autenticarte como administrador sin conocer la contraseña.',
    lesson: {
      cwe: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command / OWASP A03:2021',
      overview: 'Las vulnerabilidades de inyección se producen cuando datos no confiables introducidos por un usuario se concatenan directamente en una consulta o comando sin sanitizar, haciendo que el intérprete (como el motor de PostgreSQL o MySQL) confunda datos con instrucciones de control.',
      howItWorks: 'En una sentencia SQL vulnerable como: SELECT * FROM users WHERE username = \'\' + user + \'\' AND password = \'\' + pass + \'\'; introducir comillas simples (\') rompe el delimitador de cadena. Al escribir: \' OR \'1\'=\'1\' -- la consulta final se convierte en: SELECT * FROM users WHERE username = \'\' OR \'1\'=\'1\' --...\'. Dado que \'1\'=\'1\' es siempre verdadero (TRUE), la condición WHERE se cumple para todas las filas de la tabla y el servidor devuelve el primer usuario registrado (el administrador).',
      kaliToolSection: {
        toolName: 'Detección y Explotación de SQLi con Sqlmap en Kali Linux',
        commandExample: 'sqlmap -u "http://localhost/login" --data="username=admin&password=x" --batch',
        explanation: 'En Kali Linux, "sqlmap" es la herramienta de referencia para auditorías de inyección SQL. Automatiza el análisis de parámetros, detecta la técnica de inyección (booleana, ciega basada en tiempo, UNION-based o de error) y permite extraer información o verificar derivaciones de autenticación.',
      },
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Concatenación directa de cadenas en SQL
import { db } from "@/lib/database";

export async function loginUser(usernameInput: string, passwordInput: string) {
  // ¡PELIGRO CRÍTICO! Concatenar cadenas permite al usuario inyectar sintaxis SQL:
  const query = "SELECT * FROM users WHERE username = '" + usernameInput + "' AND password = '" + passwordInput + "';";
  
  const result = await db.rawQuery(query);
  if (result.rows.length > 0) {
    return { success: true, user: result.rows[0] };
  }
  return { success: false, error: "Credenciales erróneas" };
}`,
      vulnerableCodeLang: 'javascript',
      whyItHappens: 'Construir sentencias de base de datos mediante interpolación o concatenación de strings en lugar de delegar el análisis sintáctico a consultas parametrizadas (Prepared Statements).',
      realWorldImpact: 'Elusión total de autenticación, volcado íntegro de bases de datos de clientes, borrado malicioso de datos y ejecución remota de comandos en el sistema operativo mediante funciones de base de datos.',
    },
    challenge: {
      description: 'El simulador cuenta con un formulario de login que renderiza y evalúa la consulta SQL simulada en tiempo real. Introduce un payload de inyección booleana (\' OR \'1\'=\'1\' --) o prueba con la herramienta "sqlmap" en la terminal para iniciar sesión como administrador.',
      targetHint: 'En el campo de usuario introduce: \' OR \'1\'=\'1\' -- y cualquier contraseña. O ejecuta "sqlmap" en la terminal del laboratorio.',
      devtoolsTab: 'Console',
    },
    hints: [
      { id: 1, cost: 30, text: 'Observa la sentencia SQL generada en vivo debajo del formulario. Tu meta es hacer que la condición WHERE sea siempre verdadera (TRUE).' },
      { id: 2, cost: 60, text: 'Una comilla simple (\') cierra la cadena del desarrollador. La instrucción OR añade una segunda condición evaluable.' },
      { id: 3, cost: 90, text: 'Introduce en el campo de usuario: \' OR \'1\'=\'1\' -- (el doble guion -- comenta el resto de la consulta original, anulando el chequeo de la contraseña).' },
    ],
    flag: 'FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}',
    solution: {
      steps: [
        'En el formulario de inicio de sesión del simulador, sitúa el cursor en el campo "Nombre de Usuario".',
        'Introduce el payload de escape booleano: \' OR \'1\'=\'1\' --.',
        'En el campo "Contraseña", introduce cualquier carácter (por ejemplo: x).',
        'Haz clic en "Ejecutar Consulta SQL".',
        'Alternativamente, en la terminal de Kali Linux ejecuta: sqlmap -u "http://localhost/login" --batch.',
        'El motor evaluará la condición WHERE como verdadera, autenticará la sesión de administración y mostrará la flag.',
      ],
      explanation: 'Las consultas preparadas (Prepared Statements) separan físicamente el código de los datos: el motor SQL compila y analiza la estructura sintáctica de la consulta antes de enlazar los valores del usuario, impidiendo que cualquier comilla altere la lógica lógica.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA: Consultas Parametrizadas (Prepared Statements) con Node-Postgres / Prisma
import { Pool } from "pg";
const pool = new Pool();

export async function loginUser(username: string, passwordHash: string) {
  // Los parámetros $1 y $2 se envían por separado al motor SQL.
  // Cualquier comilla simple inyectada se trata como texto literal plano, JAMÁS como comando:
  const query = "SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2";
  const { rows } = await pool.query(query, [username, passwordHash]);
  
  if (rows.length === 0) return null;
  return rows[0];
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Utilizar SIEMPRE consultas parametrizadas o un ORM moderno (Prisma, Drizzle) que las aplique por defecto.',
        'NUNCA concatenar ni interpolar cadenas de usuario en sentencias SQL ni comandos de sistema.',
        'Aplicar el principio de mínimo privilegio en el usuario de base de datos de la aplicación (sin permisos DROP ni GRANT).',
      ],
    },
  },

  // ==========================================
  // NIVEL 6: AUTENTICACIÓN Y FUERZA BRUTA
  // ==========================================
  {
    id: 6,
    title: 'Autenticación Rota, JWT y Ataques de Diccionario',
    category: 'Broken Authentication & Cryptography',
    difficulty: 'Avanzada',
    points: 350,
    objective: 'Utiliza las herramientas de Kali Linux en la terminal (hydra o cat con diccionarios de passwords) para descubrir la contraseña del usuario "admin" en la API de autenticación simulada.',
    lesson: {
      cwe: 'CWE-307: Improper Restriction of Excessive Authentication Attempts / OWASP A07:2021',
      overview: 'Los sistemas de autenticación colapsan comúnmente por dos motivos críticos: la ausencia de mecanismos de limitación de tasa (rate limiting) que permitan probar millones de combinaciones, y la mala configuración de estándares como JSON Web Tokens (JWT) que aceptan algoritmos inseguros como "none".',
      howItWorks: 'Un atacante que localiza un endpoint de login sin rate limiting ni CAPTCHA automatiza el envío de peticiones POST probando listas de contraseñas habituales (diccionarios estándar como rockyou.txt o passwords.txt). Si la contraseña del usuario es común (como "hunter2" o "123456"), la autenticación se rompe en pocos segundos.',
      kaliToolSection: {
        toolName: 'Ataques de Fuerza Bruta Automatizados con Hydra en Kali Linux',
        commandExample: 'hydra -l admin -P /opt/wordlists/passwords.txt http-post-form "/api/mock/auth:username=^USER^&password=^PASS^:F=401"',
        explanation: 'En Kali Linux, "THC-Hydra" es la herramienta de fuerza bruta multi-hilo más potente para servicios de red y formularios HTTP. Permite probar diccionarios enteros de contraseñas de forma paralela contra formularios web POST identificando respuestas exitosas (200 OK) frente a fallidas (401).',
      },
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Sin rate limiting ni retraso ante intentos fallidos
export async function POST(req: Request) {
  const { username, password } = await req.json();

  // Comprueba la clave directamente sin limitar intentos por IP:
  const user = await db.users.findUnique({ where: { username } });
  
  if (user && user.password === password) {
    // Emite token JWT permitiendo algoritmo "none"
    return Response.json({ success: true, token: issueInsecureToken(user) });
  }

  // Permite al atacante lanzar 1.000 intentos por segundo sin bloqueo alguno:
  return Response.json({ error: "Credenciales erróneas" }, { status: 401 });
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'No incorporar mecanismos de limitación de tasa (Rate Limiting) y confiar en que los usuarios elegirán contraseñas complejas por iniciativa propia.',
      realWorldImpact: 'Secuestro completo de cuentas de administración, filtración de credenciales maestras y elevación no autorizada de privilegios en el sistema.',
    },
    challenge: {
      description: 'En el sistema de archivos de la terminal existe un diccionario en /opt/wordlists/passwords.txt. Abre la terminal de Kali Linux para examinar las contraseñas con "cat", lanza un ataque automatizado con "hydra" o utiliza el simulador de fuerza bruta.',
      targetHint: 'En la terminal ejecuta: "hydra -l admin -P /opt/wordlists/passwords.txt" o prueba con curl: curl -X POST /api/mock/auth -d \'{"username":"admin","password":"hunter2"}\'',
      devtoolsTab: 'Terminal',
    },
    hints: [
      { id: 1, cost: 35, text: 'Abre la terminal integrada del laboratorio y revisa las contraseñas con: cat /opt/wordlists/passwords.txt' },
      { id: 2, cost: 70, text: 'En la terminal puedes ejecutar la herramienta de Kali: hydra -l admin -P /opt/wordlists/passwords.txt' },
      { id: 3, cost: 100, text: 'Una de las contraseñas más conocidas en la cultura de seguridad es "hunter2". Prueba con esa contraseña.' },
    ],
    flag: 'FLAG{BR0K3N_4UTH_JWT_N0N3}',
    solution: {
      steps: [
        'Abre la terminal del laboratorio.',
        'Ejecuta: cat /opt/wordlists/passwords.txt para visualizar las contraseñas disponibles en el diccionario.',
        'Ejecuta la herramienta de fuerza bruta de Kali: hydra -l admin -P /opt/wordlists/passwords.txt.',
        'Alternativamente, en el formulario del reto pulsa "Lanzar ataque de diccionario" o introduce la contraseña "hunter2".',
        'El servidor autenticará la petición con éxito, generará el token de administrador y emitirá la flag.',
      ],
      explanation: 'Las contraseñas débiles son la principal causa de incidentes de intrusión. Las defensas obligatorias incluyen algoritmos de derivación lentos con sal (Argon2id o bcrypt) y rate limiting estricto por IP y por cuenta.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA: Hash robusto con Bcrypt + Rate Limiter en Redis
import bcrypt from "bcrypt";
import { rateLimiter } from "@/lib/rateLimiter";

export async function POST(req: Request) {
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";

  // 1. Rate limiting estricto: máximo 5 intentos fallidos cada 15 minutos por IP
  const allowed = await rateLimiter.check(clientIp, { max: 5, windowSec: 900 });
  if (!allowed) {
    return Response.json(
      { error: "Demasiados intentos fallidos. Bloqueado temporalmente por seguridad." },
      { status: 429 }
    );
  }

  const { username, password } = await req.json();
  const user = await db.users.findUnique({ where: { username } });

  // 2. Comparación en tiempo constante con hash salteado (coste 12)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await rateLimiter.incrementFailedAttempts(clientIp);
    return Response.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  }

  return Response.json({ success: true, token: issueSecureJwt(user) });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Implementar protección contra fuerza bruta con bloqueo tras 5 intentos fallidos (HTTP 429 Too Many Requests).',
        'Exigir contraseñas de al menos 12 caracteres y verificar que no figuren en listas de brechas expuestas.',
        'Exigir obligatoriamente autenticación multifactor (MFA / 2FA) en todos los accesos con privilegios.',
      ],
    },
  },

  // ==========================================
  // NIVEL 7: CADENA FINAL (EXPLOIT CHAIN)
  // ==========================================
  {
    id: 7,
    title: 'Cadena de Ataque Final: Escalada Completa',
    category: 'Full Exploit Chain',
    difficulty: 'Experto',
    points: 500,
    objective: 'Encadena técnicas de reconocimiento de directorios, IDOR de APIs y forja de cabeceras HTTP en la terminal para autenticarte como Elena Ramos (CISO) y extraer la bandera final del servidor central.',
    lesson: {
      cwe: 'CWE-269: Improper Privilege Management / OWASP A01 & A04:2021',
      overview: 'En el mundo real, los sistemas modernos rara vez colapsan por una única vulnerabilidad aislada. Los atacantes combinan múltiples debilidades de severidad baja o media en una "cadena de explotación" (Exploit Chain) que, coordinada, culmina en el compromiso total de la infraestructura.',
      howItWorks: 'En este reto final encadenarás 3 técnicas profesionales:\n1. Reconocimiento Web con Kali Linux para descubrir el endpoint interno de personal (/api/mock/staff).\n2. Explotación IDOR solicitando el departamento de seguridad (?dept=security) para obtener el ID de empleado y el token de emergencia del CISO.\n3. Forja de cabeceras HTTP en consola con curl (X-Employee-Id y Authorization: Bearer ...) para validar la identidad privilegiada ante el panel central de contingencia (/api/mock/admin/flag).',
      kaliToolSection: {
        toolName: 'Orquestación de la Cadena con Fuzzing y Curl en Kali Linux',
        commandExample: 'gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt\ncurl http://localhost/api/mock/staff?dept=security\ncurl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" http://localhost/api/mock/admin/flag',
        explanation: 'En auditorías complejas en Kali Linux, combinamos gobuster para mapear APIs internas, analizamos los JSON devueltos con curl, y finalmente construimos peticiones autenticadas inyectando cabeceras personalizadas de autorización.',
      },
      vulnerableCodeExample: `// CADENA DE ERRORES EN LA ARQUITECTURA:
// 1. Endpoint interno sin autenticación perimetral:
// /api/mock/staff?dept=security devuelve tokens de contingencia en texto plano.

// 2. El servidor central confía ciegamente en cabeceras HTTP del cliente:
export async function GET(req: Request) {
  const empId = req.headers.get("X-Employee-Id");
  const auth = req.headers.get("Authorization");

  // ¡ERROR DE ARQUITECTURA ZERO TRUST!
  // Asumir que estas cabeceras solo pueden venir de un proxy confiable:
  if (empId === "sec-9902" && auth === "Bearer emergency_override_2026") {
    return Response.json({ flag: "FLAG{FULL_CH41N_M4ST3R_H4CK3R}" });
  }
  return Response.json({ error: "Forbidden" }, { status: 403 });
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'Confianza implícita en cabeceras perimetrales sin verificación criptográfica contra un proveedor de identidades centralizado (IdP), combinada con fuga de secretos en APIs de personal.',
      realWorldImpact: 'Compromiso total de la organización, escalada no autorizada a roles ejecutivos y control de los servidores centrales de contingencia.',
    },
    challenge: {
      description: 'El simulador muestra la intranet corporativa de SecureCorp. Inspecciona el código o lanza herramientas de Kali para encontrar la API de personal, consulta los datos del equipo de seguridad mediante la terminal y utiliza las cabeceras descubiertas para solicitar la flag final en /api/mock/admin/flag.',
      targetHint: 'Paso 1: curl /api/mock/staff?dept=security. Paso 2: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag',
      devtoolsTab: 'Terminal',
    },
    hints: [
      { id: 1, cost: 50, text: 'Inspecciona la intranet o ejecuta "gobuster" en la terminal: hay un endpoint de personal en /api/mock/staff?dept=security.' },
      { id: 2, cost: 100, text: 'En la terminal de Kali Linux ejecuta: curl /api/mock/staff?dept=security para obtener el ID de empleado y token de Elena Ramos.' },
      { id: 3, cost: 150, text: 'Envía la petición final con ambas cabeceras: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag' },
    ],
    flag: 'FLAG{FULL_CH41N_M4ST3R_H4CK3R}',
    solution: {
      steps: [
        'Abre la terminal del laboratorio o las DevTools.',
        'Localiza el endpoint de empleados corporativos ejecutando: gobuster o revisando el código HTML.',
        'Consulta los datos del departamento de ciberseguridad: curl /api/mock/staff?dept=security.',
        'Revisa la respuesta JSON: identifica a Elena Ramos (CISO), emp_id "sec-9902" y token "emergency_override_2026".',
        'Lanza la petición final con ambas cabeceras HTTP: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag.',
        'El mainframe de contingencia validará las credenciales y responderá con la bandera maestra del laboratorio.',
      ],
      explanation: 'Las cadenas de explotación demuestran por qué la estrategia de "Defensa en Profundidad" y el modelo "Zero Trust" son imperativos: ningún subsistema interno debe asumir que las solicitudes provienen de una fuente confiable.',
      secureCodeExample: `// SOLUCIÓN DEFENSIVA: Arquitectura Zero Trust y mTLS
export async function GET(req: Request) {
  // 1. Cero confianza en cabeceras enviadas por el cliente:
  // Se exige validación criptográfica contra el proveedor OIDC (Identity Provider)
  const userSession = await verifyOidcIdentity(req);
  if (!userSession || userSession.role !== "ciso") {
    return Response.json({ error: "Acceso denegado: se requiere rol de CISO" }, { status: 403 });
  }

  // 2. Exigir verificación de segundo factor (MFA) en tiempo real para acciones de contingencia:
  const isMfaValid = await verifyMfaSession(userSession.userId);
  if (!isMfaValid) {
    return Response.json({ error: "Se requiere autenticación multifactor activa" }, { status: 401 });
  }

  // 3. Registro inmutable de auditoría (SIEM):
  await auditLog.recordSecurityAction({
    action: "admin_mainframe_access",
    userId: userSession.userId,
    status: "granted",
  });

  return Response.json({ status: "Acceso concedido" });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Adoptar un modelo Zero Trust: verificar explícitamente la identidad en cada microservicio y petición.',
        'Nunca basar autorizaciones críticas en cabeceras HTTP arbitrarias que puedan ser forjadas por el cliente.',
        'Centralizar el control de acceso en proveedores de identidad criptográficos con soporte para MFA.',
      ],
    },
  },
];
