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
    objective: 'Inspecciona el código fuente del portal corporativo simulado o usa la terminal para encontrar la ruta oculta y recuperar la flag de los empleados.',
    lesson: {
      overview: 'El reconocimiento es la primera fase de cualquier auditoría de seguridad. Muchos desarrolladores dejan comentarios temporales en HTML, rutas internas en metadatos o ficheros como robots.txt y copias de seguridad (.bak) expuestos públicamente.',
      howItWorks: 'Los navegadores descargan todo el código HTML, CSS y JS sin compilar. Lo que el desarrollador oculta visualmente (con display: none o comentarios <!-- -->) sigue estando presente en el DOM y accesible pulsando F12 o viendo el código fuente.',
      vulnerableCodeExample: `<!-- INTRANET VULNERABLE: Comentario dejado por un desarrollador -->
<div class="footer">
  <p>© 2026 SecureCorp</p>
  <!-- TODO: Mover el backup de credenciales de /backup/staff_notes.txt a la VPN -->
  <!-- Comprobar que /robots.txt bloquea los rastreadores de Google -->
</div>`,
      vulnerableCodeLang: 'html',
      whyItHappens: 'Falta de procesos de compilación (minificación/stripping de comentarios) antes de subir a producción y asunción errónea de que "si no se ve en pantalla, nadie lo leerá".',
      realWorldImpact: 'Permite a los atacantes mapear endpoints internos, conocer nombres de usuarios o versiones de software sin necesidad de enviar ningún payload malicioso.',
    },
    challenge: {
      description: 'El portal simulado "SecureCorp" tiene información técnica expuesta. Ábrelo en la pestaña de reto, abre la herramienta de inspeccionar elementos (F12) o consulta la terminal interna para descubrir el archivo robots.txt o las notas de backup.',
      targetHint: 'Inspecciona el pie de página del simulador con botón derecho -> Inspeccionar, o escribe en la terminal: curl /lab/robots.txt',
      devtoolsTab: 'Elements (Inspector)',
    },
    hints: [
      { id: 1, cost: 10, text: 'Abre el modo Inspeccionar del navegador (F12) y busca comentarios verdes en el árbol HTML dentro de la sección del portal.' },
      { id: 2, cost: 20, text: 'En el código fuente hay una mención al archivo /robots.txt y /backup/staff_notes.txt.' },
      { id: 3, cost: 30, text: 'Abre la terminal del laboratorio y ejecuta: curl /lab/robots.txt o cat /var/www/html/robots.txt' },
    ],
    flag: 'FLAG{DOM_C0MM3NTS_4ND_R0B0TS}',
    solution: {
      steps: [
        'Abre las DevTools de tu navegador pulsando F12 o Ctrl+Mayús+I.',
        'En la pestaña "Elements" (o Inspector), despliega el contenedor del reto corporativo.',
        'Localiza el comentario HTML: <!-- TODO: Quitar antes de producción. Los logs y el robots.txt están en /lab/robots.txt y /backup/staff_notes.txt -->.',
        'Abre la terminal integrada del laboratorio y ejecuta: curl /lab/robots.txt.',
        'Copia la flag que aparece en el fichero: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}.',
      ],
      explanation: 'El fichero robots.txt está diseñado para indicarle a los motores de búsqueda qué rutas no indexar, pero es un fichero 100% público. Cualquier ruta listada en robots.txt se convierte en un objetivo prioritario para un auditor o atacante.',
      secureCodeExample: `// SOLUCIÓN: Limpieza de comentarios en Vite / Webpack / Next.js
// En next.config.ts o vite.config.js:
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // NUNCA listar rutas confidenciales en robots.txt:
  // Si una ruta debe ser privada, protégela con autenticación y middleware,
  // no confíes en que robots.txt la mantenga en secreto.
};`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Eliminar todos los comentarios de depuración durante el proceso de build (minificación).',
        'Nunca utilizar robots.txt como mecanismo de seguridad ("seguridad por oscuridad").',
        'Proteger cualquier endpoint sensible con autenticación robusta y control de acceso.',
      ],
    },
  },

  // ==========================================
  // NIVEL 2: EL CLIENTE NO ES DE FIAR
  // ==========================================
  {
    id: 2,
    title: 'El Cliente No Es De Fiar',
    category: 'Client-Side Validation Bypass',
    difficulty: 'Fácil',
    points: 150,
    objective: 'Manipula el formulario de compra para adquirir la certificación de ciberseguridad valorada en 500 € teniendo 0 € de saldo.',
    lesson: {
      overview: 'La primera regla de la ciberseguridad web es: "NUNCA confíes en los datos o validaciones que ocurren en el cliente". Cualquier comprobación hecha con JavaScript o atributos HTML puede ser modificada por el usuario.',
      howItWorks: 'Si una aplicación web comprueba el saldo o el precio únicamente en el navegador y envía el resultado al servidor (por ejemplo, enviando <input type="hidden" name="price" value="500">), el usuario puede cambiar el valor a "0" desde el Inspector de Elementos y engañar al sistema.',
      vulnerableCodeExample: `<!-- CÓDIGO VULNERABLE: Confianza ciega en campos ocultos -->
<form action="/api/checkout" method="POST">
  <h3>Licencia Oficial (500 €)</h3>
  <input type="hidden" name="item_id" value="cert-sec-01">
  <!-- ¡PELIGRO! El precio lo envía el cliente -->
  <input type="hidden" name="price" value="500">
  <button disabled id="btnBuy">Saldo insuficiente (0 €)</button>
</form>`,
      vulnerableCodeLang: 'html',
      whyItHappens: 'Comodidad del programador al reutilizar los datos del frontend en el backend en lugar de consultar el precio oficial en la base de datos.',
      realWorldImpact: 'Permite alterar precios en carritos de compra, eludir topes de transferencia o desbloquear funciones de pago sin abonar su importe.',
    },
    challenge: {
      description: 'El simulador contiene una pasarela de certificación. Tu saldo es 0 € y el botón de compra está deshabilitado. Modifica los atributos del DOM (quita el disabled y cambia el precio a 0 €) o altera el saldo almacenado en sessionStorage.',
      targetHint: 'Inspecciona el botón de compra y el input del precio. Cambia price a 0 y borra el atributo disabled, o abre la consola y ejecuta sessionStorage.setItem("lab_user_balance", "1000").',
      devtoolsTab: 'Elements (Inspector)',
    },
    hints: [
      { id: 1, cost: 15, text: 'Haz clic derecho sobre el botón "Saldo insuficiente" y selecciona "Inspeccionar elemento".' },
      { id: 2, cost: 30, text: 'En la etiqueta <button>, haz doble clic en el atributo "disabled" y bórralo para habilitar el botón.' },
      { id: 3, cost: 45, text: 'Encuentra el input oculto <input type="hidden" id="itemPrice" value="500"> y cámbialo a value="0". Luego haz clic en Comprar.' },
    ],
    flag: 'FLAG{N3V3R_TRUST_CL13NT_S1D3}',
    solution: {
      steps: [
        'Abre DevTools (F12) sobre el formulario de compra.',
        'Busca la etiqueta del botón: <button id="btnBuy" disabled ...>. Haz doble clic sobre "disabled" y elimínalo.',
        'Busca el campo de precio oculto: <input type="hidden" id="checkoutPrice" value="500"> y cambia su valor a "0".',
        'Alternativamente, en la pestaña Console, ejecuta: sessionStorage.setItem("lab_user_balance", "1000").',
        'Haz clic en el botón de compra ahora activo.',
        'El servidor simulado procesará la compra a coste cero y emitirá la flag.',
      ],
      explanation: 'El navegador es un entorno hostil que está bajo el control total del usuario. Las validaciones de interfaz son útiles para la experiencia de usuario (UX), pero la única validación que protege la aplicación es la que se ejecuta en el servidor.',
      secureCodeExample: `// SOLUCIÓN EN SERVIDOR (Next.js / Node.js API Route)
export async function POST(req: Request) {
  const { itemId } = await req.json();

  // 1. El precio NUNCA se recibe del cliente: se busca en la BD
  const product = await db.products.findById(itemId);
  if (!product) return Response.json({ error: "Producto inexistente" }, { status: 404 });

  // 2. Se comprueba el saldo real del usuario autenticado en la BD
  const user = await auth.getUserFromSession(req);
  if (user.balance < product.price) {
    return Response.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  // 3. Transacción atómica
  await db.chargeBalance(user.id, product.price);
  return Response.json({ success: true });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Validar todos los precios, cantidades y permisos en el servidor consultando la base de datos.',
        'Tratar cualquier dato que llegue en el cuerpo (body), parámetros o cabeceras como potencialmente malicioso.',
        'Usar schemas de validación estricta (como Zod) en todos los endpoints de API.',
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
    objective: 'Inspecciona la cookie de sesión del laboratorio en DevTools, identifica que está codificada en Base64 sin firma y elévate a rol "admin".',
    lesson: {
      overview: 'Las cookies son pequeños fragmentos de datos que el navegador envía en cada petición. Si una cookie de sesión no está firmada criptográficamente (HMAC) ni protegida con flags de seguridad, el usuario puede modificarla para suplantar a otros usuarios.',
      howItWorks: 'Muchos sistemas guardan el estado de usuario directamente en una cookie codificada en Base64: {"user":"student","role":"guest"}. Como Base64 NO es cifrado (solo codificación), cualquier persona puede decodificarlo, cambiar "guest" por "admin", recodificarlo y enviarlo.',
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Cookie sin firma y sin HttpOnly
// El servidor confía ciegamente en lo que el cliente le devuelve:
const sessionData = JSON.parse(Buffer.from(req.cookies.lab_session, 'base64').toString());

if (sessionData.role === 'admin') {
  // ¡Vulnerabilidad! El usuario pudo haber alterado el rol él mismo
  showAdminSecretPanel();
}`,
      vulnerableCodeLang: 'javascript',
      whyItHappens: 'Confundir codificación (Base64) con cifrado o firma criptográfica, y olvidar las directivas HttpOnly, Secure y SameSite.',
      realWorldImpact: 'Escalada vertical de privilegios (de usuario anónimo a administrador del sistema sin conocer la contraseña).',
    },
    challenge: {
      description: 'El simulador lee la cookie "lab_session". Actualmente tiene valor codificado de rol "guest". Abre DevTools -> Application -> Cookies (o usa document.cookie en Consola), decodifica el Base64, cambia el rol a "admin", actualiza la cookie y pulsa "Verificar Sesión".',
      targetHint: 'En la consola puedes ver la cookie con: document.cookie. Para decodificar: atob(document.cookie.split("=")[1]). Cámbialo por btoa(JSON.stringify({user:"student",role:"admin"})) y reasígnalo.',
      devtoolsTab: 'Application (Cookies/Storage)',
    },
    hints: [
      { id: 1, cost: 20, text: 'Abre la pestaña "Application" en DevTools y en la barra lateral izquierda despliega "Cookies".' },
      { id: 2, cost: 40, text: 'La cookie se llama "lab_session". Su valor termina en "=" (síntoma claro de Base64). En la consola ejecuta: atob("eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9")' },
      { id: 3, cost: 60, text: 'En la consola ejecuta: document.cookie = "lab_session=" + btoa(JSON.stringify({user:"student",role:"admin"})) y haz clic en el botón "Verificar Sesión".' },
    ],
    flag: 'FLAG{C00K13_T4MP3R1NG_SUCC3SS}',
    solution: {
      steps: [
        'Abre DevTools (F12) y dirígete a la pestaña "Console" (o "Application" -> "Cookies").',
        'Lee el valor actual de la cookie de sesión ejecutando: document.cookie.',
        'Observa el valor: lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9.',
        'Decodifícalo en consola: JSON.parse(atob("eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9")). Muestra { user: "student", role: "guest" }.',
        'Genera el nuevo valor con rol admin: btoa(JSON.stringify({ user: "student", role: "admin" })). El resultado es eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJhZG1pbiJ9.',
        'Asigna la cookie manipulada: document.cookie = "lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJhZG1pbiJ9; path=/".',
        'Vuelve al simulador del reto y pulsa "Verificar Sesión". El sistema detectará el rol de administrador y entregará la flag.',
      ],
      explanation: 'Base64 es un esquema de codificación de binario a texto ASCII, no ofrece ninguna confidencialidad ni integridad. Las sesiones deben estar protegidas mediante identificadores aleatorios opacos en base de datos o tokens firmados con HMAC-SHA256.',
      secureCodeExample: `// SOLUCIÓN SEGURA: Cookie HttpOnly con firma criptográfica HMAC-SHA256
import crypto from "crypto";

export function createSecureSessionCookie(payload: { userId: string; role: string }) {
  const secret = process.env.SESSION_SECRET; // Clave privada de 32+ bytes
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  
  const signedToken = \`\${data}.\${signature}\`;

  return {
    name: "auth_session",
    value: signedToken,
    httpOnly: true, // ¡CRÍTICO! JavaScript no puede leerla en document.cookie
    secure: true,   // Solo viaja por HTTPS
    sameSite: "lax",
    path: "/",
  };
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Añadir SIEMPRE el flag HttpOnly a las cookies de autenticación para mitigar robo por XSS.',
        'Firmar criptográficamente cualquier dato almacenado en el cliente para detectar manipulaciones.',
        'Almacenar el estado crítico de sesión (como el rol de administrador) en la base de datos del servidor.',
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
    objective: 'Inspecciona la petición de consulta de facturas en la pestaña Network (Red) o mediante curl, modifica el ID de factura para acceder a la factura confidencial #1001.',
    lesson: {
      overview: 'IDOR (Insecure Direct Object Reference) es una de las vulnerabilidades más comunes en aplicaciones web modernas. Ocurre cuando una API expone un objeto directamente mediante un identificador (ID numérico o UUID) sin verificar si el usuario tiene permiso para acceder a él.',
      howItWorks: 'Si visitas tu factura en /api/invoices?id=1042, un atacante probará a cambiar la URL a id=1041, id=1043 o id=1001. Si el backend no comprueba "SELECT * FROM invoices WHERE id = $id AND user_id = $current_user", el servidor devolverá la factura de otra persona.',
      vulnerableCodeExample: `// CÓDIGO VULNERABLE EN ROUTE HANDLER / ENDPOINT:
export async function GET(req: Request) {
  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("id");

  // ¡ERROR CRÍTICO! Se busca por ID directamente sin ligar al usuario autenticado:
  const invoice = await db.invoices.findFirst({
    where: { id: Number(invoiceId) }
  });

  return Response.json(invoice);
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'Asumir que un usuario solo solicitará URLs que correspondan a enlaces visibles en su pantalla.',
      realWorldImpact: 'Fuga masiva de datos personales (RGPD), contratos confidenciales, historiales médicos o datos financieros.',
    },
    challenge: {
      description: 'El visor de facturas del simulador consulta tu factura #1042. Abre la pestaña Network (Red) de las DevTools para observar la petición, o utiliza la terminal del lab para consultar la factura confidencial #1001.',
      targetHint: 'En la terminal ejecuta: curl /api/mock/invoices?id=1001, o inspecciona la petición en Network y edítala.',
      devtoolsTab: 'Network (Red)',
    },
    hints: [
      { id: 1, cost: 25, text: 'Abre la pestaña "Network" (Red) en DevTools y haz clic en "Ver mi factura #1042" en el simulador para ver cómo se llama el endpoint.' },
      { id: 2, cost: 50, text: 'Observa que la URL llamada es /api/mock/invoices?id=1042. ¿Qué pasa si pides la factura #1001?' },
      { id: 3, cost: 75, text: 'En la terminal interactiva del laboratorio ejecuta: curl /api/mock/invoices?id=1001' },
    ],
    flag: 'FLAG{1D0R_4P1_BR0K3N_0BJ3CT}',
    solution: {
      steps: [
        'Abre DevTools (F12) y selecciona la pestaña "Network" (Red).',
        'En el visor de facturas del laboratorio, haz clic en "Ver mi factura #1042".',
        'En la pestaña Red, observa la petición fetch a /api/mock/invoices?id=1042 y revisa la respuesta JSON.',
        'Abre la terminal integrada del laboratorio.',
        'Lanza la petición cambiando el parámetro a la factura de dirección: curl /api/mock/invoices?id=1001.',
        'La API simulada responderá con los datos de la factura confidencial y la flag.',
      ],
      explanation: 'El error fundamental de IDOR es confiar en que el identificador enviado por el cliente es legítimo. La autorización debe aplicarse a nivel de objeto antes de retornar cualquier dato.',
      secureCodeExample: `// SOLUCIÓN SEGURA: Validación de propiedad a nivel de base de datos
export async function GET(req: Request) {
  const session = await auth.getSession(req);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const invoiceId = Number(searchParams.get("id"));

  // ¡SEGURO! La consulta exige que el recurso pertenezca al usuario de la sesión:
  const invoice = await db.invoices.findFirst({
    where: {
      id: invoiceId,
      ownerId: session.userId, // Control de acceso contextual obligatorio
    }
  });

  if (!invoice) {
    return Response.json({ error: "Factura no encontrada o acceso denegado" }, { status: 404 });
  }

  return Response.json(invoice);
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Verificar siempre que el usuario autenticado sea el legítimo propietario del recurso solicitado.',
        'Utilizar políticas de seguridad a nivel de fila (Row Level Security - RLS) en la base de datos.',
        'Considerar el uso de UUIDs no secuenciales (v4) en lugar de IDs enteros incrementales.',
      ],
    },
  },

  // ==========================================
  // NIVEL 5: INYECCIONES SIMULADAS (SQLi & XSS)
  // ==========================================
  {
    id: 5,
    title: 'Inyecciones: SQLi y Cross-Site Scripting (XSS)',
    category: 'Injection Vulnerabilities',
    difficulty: 'Avanzada',
    points: 300,
    objective: 'Supera el login vulnerable aplicando una inyección SQL clásica para autenticarte como administrador sin conocer la contraseña.',
    lesson: {
      overview: 'Las inyecciones ocurren cuando datos no confiables introducidos por un usuario se concatenan directamente en una consulta o se insertan en el DOM sin sanitizar, haciendo que el intérprete (SQL o el motor de JavaScript) los ejecute como código.',
      howItWorks: 'En SQL Injection (SQLi), introducir caracteres como comillas simples (\') permite romper la estructura original de la consulta: SELECT * FROM users WHERE user = \'\' OR \'1\'=\'1\' --. Como "1=1" siempre es verdadero, la condición se cumple para todas las filas.',
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Concatenación directa de strings en SQL
const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
const result = await db.query(query); // ¡INYECCIÓN GARANTIZADA!

// Si el usuario introduce: ' OR '1'='1' --
// La consulta final es:
// SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = '...'`,
      vulnerableCodeLang: 'javascript',
      whyItHappens: 'Construir sentencias de base de datos mediante concatenación de cadenas de texto en lugar de utilizar consultas parametrizadas (Prepared Statements).',
      realWorldImpact: 'Extracción completa de bases de datos, elusión de autenticación, modificación de saldos y ejecución remota de comandos en el servidor.',
    },
    challenge: {
      description: 'El simulador cuenta con un formulario de inicio de sesión que genera y ejecuta una consulta SQL simulada en tiempo real. Introduce un payload de inyección SQL en el campo de usuario para que la condición WHERE siempre sea verdadera.',
      targetHint: 'En el campo de usuario introduce: \' OR \'1\'=\'1\' -- y cualquier contraseña. Observa cómo cambia la sentencia SQL renderizada.',
      devtoolsTab: 'Console',
    },
    hints: [
      { id: 1, cost: 30, text: 'Observa la consulta SQL que se genera debajo del formulario de login. Tu objetivo es hacer que la parte WHERE evalúe a verdadero (TRUE).' },
      { id: 2, cost: 60, text: 'Una comilla simple (\') cierra la cadena del programador. La palabra OR permite añadir una condición alternativa.' },
      { id: 3, cost: 90, text: 'Introduce en el campo de usuario: \' OR \'1\'=\'1\' -- (el guion doble -- comenta el resto de la consulta original).' },
    ],
    flag: 'FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}',
    solution: {
      steps: [
        'En el simulador del reto, sitúate en el formulario de inicio de sesión.',
        'En el campo "Nombre de usuario", escribe el payload: \' OR \'1\'=\'1\' --.',
        'En el campo "Contraseña", introduce cualquier carácter (por ejemplo: x).',
        'Haz clic en "Iniciar Sesión (Ejecutar Query)".',
        'El motor SQL simulado evaluará la cláusula OR como verdadera, autenticará con éxito al usuario administrador y revelará la flag.',
      ],
      explanation: 'Las consultas parametrizadas separan el código de los datos: el motor de la base de datos compila la estructura de la consulta antes de insertar los valores del usuario, impidiendo que los caracteres especiales alteren la lógica lógica.',
      secureCodeExample: `// SOLUCIÓN SEGURA: Consultas Parametrizadas (Prepared Statements)
import { Pool } from "pg";
const pool = new Pool();

export async function loginUser(username: string, passwordHash: string) {
  // Los parámetros $1 y $2 se envían por separado al motor SQL.
  // Cualquier comilla simple se trata como texto literal, jamás como comando.
  const query = "SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2";
  const { rows } = await pool.query(query, [username, passwordHash]);
  
  return rows[0] || null;
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Utilizar SIEMPRE consultas parametrizadas o un ORM moderno (Prisma, Drizzle) que las aplique por defecto.',
        'Nunca concatenar entradas de usuario directamente en cadenas SQL o comandos de sistema.',
        'Aplicar el principio de mínimo privilegio en el usuario de base de datos de la aplicación.',
      ],
    },
  },

  // ==========================================
  // NIVEL 6: AUTENTICACIÓN Y JWT
  // ==========================================
  {
    id: 6,
    title: 'Autenticación Rota: JWT Inseguro y Fuerza Bruta',
    category: 'Broken Authentication & Cryptography',
    difficulty: 'Avanzada',
    points: 350,
    objective: 'Utiliza el diccionario de contraseñas de la terminal para encontrar la credencial del usuario "admin" en la API de autenticación simulada.',
    lesson: {
      overview: 'Los mecanismos de autenticación fallan a menudo por dos motivos: contraseñas débiles vulnerables a ataques de diccionario, o mala implementación de estándares como JSON Web Tokens (JWT), por ejemplo permitiendo firmas no válidas o el algoritmo "none".',
      howItWorks: 'Un atacante automatiza peticiones POST contra el endpoint de login probando listas de contraseñas habituales (diccionarios como rockyou.txt). Si la API no tiene rate limiting ni bloqueo tras varios intentos, la contraseña se descubre en cuestión de segundos.',
      vulnerableCodeExample: `// CÓDIGO VULNERABLE: Sin bloqueo de intentos ni verificación de complejidad
export async function POST(req: Request) {
  const { username, password } = await req.json();

  // Comprueba la contraseña directamente sin retardo ni límite de intentos:
  const user = await db.users.findUnique({ where: { username } });
  if (user && user.password === password) {
    return Response.json({ success: true, token: issueToken(user) });
  }

  // No hay bloqueo temporal: el atacante puede probar 10.000 contraseñas por minuto
  return Response.json({ error: "Credenciales inválidas" }, { status: 401 });
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'No implementar rate limiting, no obligar a contraseñas robustas y configurar librerías JWT permitiendo algoritmos no seguros.',
      realWorldImpact: 'Secuestro completo de cuentas de administración por uso de credenciales comunes o por omisión de firma de tokens.',
    },
    challenge: {
      description: 'En el sistema de archivos de la terminal existe un diccionario en /opt/wordlists/passwords.txt. Utiliza cat para ver las contraseñas y realiza pruebas con curl contra /api/mock/auth hasta dar con la contraseña correcta del usuario "admin".',
      targetHint: 'En la terminal ejecuta: cat /opt/wordlists/passwords.txt. Luego prueba: curl -X POST /api/mock/auth -d "username=admin&password=..." con cada una.',
      devtoolsTab: 'Terminal',
    },
    hints: [
      { id: 1, cost: 35, text: 'Abre la terminal integrada del laboratorio y examina las contraseñas con: cat /opt/wordlists/passwords.txt' },
      { id: 2, cost: 70, text: 'Prueba a autenticarte con curl: curl -X POST /api/mock/auth -d "username=admin&password=123456"' },
      { id: 3, cost: 100, text: 'Una de las contraseñas de la lista es una referencia clásica de ciberseguridad: "hunter2". Prueba con esa contraseña.' },
    ],
    flag: 'FLAG{BR0K3N_4UTH_JWT_N0N3}',
    solution: {
      steps: [
        'Abre la terminal del laboratorio.',
        'Ejecuta: cat /opt/wordlists/passwords.txt para visualizar el diccionario de palabras clave.',
        'Observa las contraseñas disponibles: 123456, password, admin123, qwerty, letmein, hunter2, etc.',
        'Lanza una petición POST con curl probando credenciales: curl -X POST /api/mock/auth -d "username=admin&password=hunter2".',
        'La API simulada confirmará el inicio de sesión exitoso y retornará la flag.',
      ],
      explanation: 'Las contraseñas débiles son la puerta de entrada más rápida para atacantes automatizados. Es obligatorio aplicar algoritmos de hash lentos (bcrypt/argon2) junto a rate limiting y autenticación multifactor (MFA).',
      secureCodeExample: `// SOLUCIÓN SEGURA: Hash robusto con Argon2/Bcrypt + Rate Limiting estricto
import bcrypt from "bcrypt";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // 1. Rate limiting estricto: máximo 5 intentos por cada 15 minutos por IP
  const isAllowed = await rateLimiter.checkLimit(ip, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
  if (!isAllowed) {
    return Response.json({ error: "Demasiados intentos fallidos. Bloqueado temporalmente." }, { status: 429 });
  }

  const { username, password } = await req.json();
  const user = await db.users.findUnique({ where: { username } });

  // 2. Comparación en tiempo constante con hash salteado
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  return Response.json({ success: true, token: issueSecureJwt(user) });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Implementar protección contra fuerza bruta (bloqueo por IP y por cuenta tras 5 intentos fallidos).',
        'Exigir contraseñas de al menos 12 caracteres y verificar que no figuren en bases de datos de brechas (HaveIBeenPwned).',
        'Implantar autenticación de doble factor (2FA / TOTP) en todas las cuentas con privilegios.',
      ],
    },
  },

  // ==========================================
  // NIVEL 7: CADENA FINAL (ESCALADA A ADMIN)
  // ==========================================
  {
    id: 7,
    title: 'Cadena de Ataque Final: Escalada Completa',
    category: 'Full Exploit Chain',
    difficulty: 'Experto',
    points: 500,
    objective: 'Encadena técnicas de reconocimiento, API IDOR y forja de cabeceras HTTP para autenticarte como Elena Ramos (CISO) y extraer la bandera final del servidor central.',
    lesson: {
      overview: 'En el mundo real, los sistemas modernos rara vez caen por una única vulnerabilidad aislada. Los atacantes combinan varios fallos de bajo o medio impacto en una "cadena de explotación" (exploit chain) hasta lograr acceso con máximos privilegios.',
      howItWorks: 'En este reto encadenarás 3 pasos:\n1. Fuga en comentarios para descubrir el endpoint interno de personal de seguridad.\n2. IDOR para obtener el ID de empleado y token de emergencia del CISO.\n3. Petición autenticada en terminal con cabeceras especiales (X-Employee-Id y Authorization: Bearer ...) para acceder al mainframe central.',
      vulnerableCodeExample: `// CADENA DE ERRORES:
// 1. Endpoint interno expuesto sin autenticación inicial: /api/mock/staff?dept=security
// 2. La API de empleados devuelve tokens de emergencia en texto claro: { emp_id: "sec-9902", autorizacion: "..." }
// 3. El panel de administración confía en cabeceras HTTP manipulables:
if (req.headers.get("X-Employee-Id") === "sec-9902" && req.headers.get("Authorization") === "Bearer ...") {
  grantFullAdminAccess();
}`,
      vulnerableCodeLang: 'typescript',
      whyItHappens: 'Confianza en cabeceras HTTP perimetrales sin validar contra el proveedor de identidad y fuga de datos en APIs internas.',
      realWorldImpact: 'Compromiso total de la organización y toma de control de la infraestructura crítica.',
    },
    challenge: {
      description: 'El simulador muestra la intranet corporativa de SecureCorp. Inspecciona el código para hallar la API de personal, consulta los datos del equipo de seguridad mediante la terminal y utiliza las cabeceras descubiertas para solicitar la flag final en /api/mock/admin/flag.',
      targetHint: 'Paso 1: Busca en el código del reto la API de staff. Paso 2: curl /api/mock/staff?dept=security. Paso 3: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag',
      devtoolsTab: 'Terminal',
    },
    hints: [
      { id: 1, cost: 50, text: 'Inspecciona la intranet del reto: hay un comentario que menciona la API de personal: /api/mock/staff?dept=security.' },
      { id: 2, cost: 100, text: 'En la terminal ejecuta: curl /api/mock/staff?dept=security para obtener los datos confidenciales de Elena Ramos.' },
      { id: 3, cost: 150, text: 'Envía una petición al endpoint de administración pasando las dos cabeceras requeridas con curl: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag' },
    ],
    flag: 'FLAG{FULL_CH41N_M4ST3R_H4CK3R}',
    solution: {
      steps: [
        'Abre DevTools (F12) e inspecciona la intranet corporativa simulada en el reto.',
        'Localiza el comentario con la ruta de la API: <!-- API interna: /api/mock/staff?dept=security -->.',
        'Abre la terminal del laboratorio y consulta el endpoint: curl /api/mock/staff?dept=security.',
        'Revisa la respuesta JSON: identifica el emp_id "sec-9902" y el token de autorización "emergency_override_2026".',
        'Construye la petición con ambas cabeceras dirigidas al panel central: curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag.',
        'El servidor central verificará las credenciales y responderá con la flag definitiva del laboratorio.',
      ],
      explanation: 'Las cadenas de explotación demuestran por qué la estrategia de "Defensa en Profundidad" es esencial: ningún componente debe asumir que las capas anteriores son seguras.',
      secureCodeExample: `// SOLUCIÓN SEGURA: Defensa en profundidad y Zero Trust
export async function GET(req: Request) {
  // 1. Cero confianza en cabeceras del cliente: validación de sesión con proveedor criptográfico
  const session = await verifySignedOidcSession(req);
  if (!session || session.role !== "ciso") {
    return Response.json({ error: "Acceso no autorizado" }, { status: 403 });
  }

  // 2. Comprobación de contexto: exigir MFA activo y conexión desde red de gestión
  const isMfaValid = await verifyMfaChallenge(session.userId);
  if (!isMfaValid) {
    return Response.json({ error: "Se requiere segundo factor de autenticación" }, { status: 401 });
  }

  // 3. Registro de auditoría inmutable
  await auditLog.recordSecurityAction({
    action: "admin_mainframe_access",
    userId: session.userId,
    status: "granted",
  });

  return Response.json({ status: "Acceso concedido" });
}`,
      secureCodeLang: 'typescript',
      defenseRecommendations: [
        'Adoptar un modelo Zero Trust: verificar siempre y de forma explícita en cada capa.',
        'Nunca confiar en cabeceras personalizadas inyectadas por el cliente sin validación criptográfica.',
        'Implementar registros de auditoría centralizados y alertas ante accesos anómalos.',
      ],
    },
  },
];
