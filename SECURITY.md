# Seguridad de SMR2

Documento de referencia del endurecimiento de seguridad aplicado al portal:
qué se ha protegido, cómo desplegarlo y qué limitaciones quedan.

> Resumen: antes, **la economía era de confianza ciega en el navegador**. Cualquier
> alumno podía abrir la consola y:
> - fabricar 500 billones de monedas en una sola petición (`/api/user/balance/sync`),
> - vender acciones que no tenía en el mercado del botellón (dinero gratis),
> - inflar la tesorería de la empresa sin jugar (`/api/investments/rake`, `/tick`),
> - leer la recámara real de la ruleta rusa y forzar la eliminación de un rival,
> - cambiar su saldo o su rol escribiendo directamente en Supabase con la anon key,
> - duplicar su saldo al unirse a una sala de ruleta (bug de "delta" en el cliente).
>
> Todo eso está cerrado en el servidor, en la base de datos y en el cliente.

---

## 1. Qué se ha corregido

| Vector de abuso | Antes | Ahora |
| --- | --- | --- |
| Fabricar monedas | `POST /api/user/balance/sync` aceptaba cualquier `delta` (hasta 5·10¹⁴) | El importe lo **calcula el servidor**; el cliente solo pide el tipo de recompensa |
| Premios de minijuegos | El navegador decidía cuánto ganaba | Hace falta un **recibo firmado HMAC de un solo uso**, emitido al apostar |
| Vender acciones inexistentes | `if (shares > position + 0.001)` se saltaba con posición 0 | `execute_market_trade()` valida la posición real en PostgreSQL |
| Manipular el mercado | Escrituras directas a `market_state` desde el navegador | Solo el servidor escribe; la operación es **atómica** (sin carreras) |
| Inflar la tesorería | `/api/investments/rake` público y `/tick` sin `CRON_SECRET` | Rake calculado al apostar; `/tick` exige cron/admin/sesión + límite |
| Leer la bala de la ruleta | `rr_games.bullet_chamber` era pública | Vive en `rr_game_secrets` (solo service role) |
| Forzar eliminaciones | `/timeout` público y el timeout siempre disparaba | Solo participantes y con el plazo vencido; el timeout **no dispara** |
| Suplantar usuarios | Cookie `smr2_user_session` sin firmar autenticaba | Solo Supabase Auth o el token HMAC `smr2_session_token` (HttpOnly) |
| Auto-ascenso a admin | `profiles.role` editable desde el navegador | Trigger + permisos por columna + RLS |
| Duplicar saldo en ruleta | `onUpdateCoins(user.coins + bote)` (delta erróneo) | El servidor paga el bote; el cliente refresca el saldo |
| Confirmar correos ajenos | `/api/auth/confirm-legacy` sin credenciales | Exige correo **y** contraseña correctos |
| Notificaciones push | Clave VAPID privada en el código y suscripción sin sesión | Claves solo en entorno; suscripción ligada al usuario |
| Fuerza bruta / spam | Muchos endpoints sin límite | Rate limiting por usuario/IP en las rutas sensibles |
| CSRF | Sin comprobación de origen | `proxy.ts` + validación en cada ruta mutante |
| Clickjacking / XSS / sniffing | Cabeceras parciales | CSP, HSTS, `frame-ancestors`, `nosniff`, `Referrer-Policy`... |

---

## 2. Cómo funciona ahora el dinero

### 2.1 Cartera autoritativa (`app/api/user/balance/sync/route.ts`)

Es el **único** camino para mover saldo desde el cliente. Reglas:

- Requiere sesión verificada en el servidor (nunca se confía en el `userId` del body).
- Si el cliente **gasta** (apuesta, compra, fianza), el servidor descuenta y comprueba
  que no quede saldo negativo. En las apuestas emite un **recibo firmado** (15 minutos de
  validez, un solo uso, ligado al usuario y a la apuesta).
- Si el cliente **cobra**:
  - `daily`, `spin`, `rescue`: el importe lo decide el servidor (y sus cooldowns).
  - `game`: exige el recibo de la apuesta; el premio máximo es 36.000 y no puede
    superar 40× la apuesta. Además hay presupuesto por minuto (60.000) y por hora
    (300.000).
  - `vault`, `subsidio`, `rebirth`, `misc`: tope relativo al saldo (5 % con un mínimo),
    cooldown por tipo y presupuesto de ganancias por minuto/hora. Nadie puede pasar
    de 1.000 a billones en una sola petición.
- Cada rechazo se registra en `event_logs` (`security_action: wallet_*`).

### 2.2 Mercado del botellón (`app/api/investments/trade`)

- El usuario sale de la sesión; el ticker debe estar en la lista blanca.
- Compra: mínimo 10 monedas, máximo 100.000.000 por orden.
- Venta: **debe poseer** esas acciones; si no, se rechaza y se audita.
- Cooldown por usuario y activo (`market_state.cooldown_seconds`).
- Se ejecuta en `public.execute_market_trade()`: bloquea la fila del mercado
  (`FOR UPDATE`), actualiza precio, tesorería, posición, saldo y registra la
  transacción en una sola operación atómica.
- Si la migración 15 aún no está aplicada, hay un respaldo en JS igual de estricto
  (con actualizaciones condicionales para evitar carreras).

### 2.3 Minijuegos

Los juegos siguen calculando su animación en el navegador, pero el **pago** pasa
por el recibo firmado. Con los topes actuales, un tramposo puede, como mucho,
cobrar premios pequeños a un ritmo limitado (y queda registrado); ya no puede
fabricar saldo ilimitado.

### 2.4 Botellón (idle)

El estado de producción vive en `profiles.party_farm_data`, que sigue siendo del
alumno (para que el juego guarde sin fricción), pero **el canje del alijo** está
limitado por el tope relativo al saldo y el presupuesto temporal del servidor.
Es el punto con más confianza residual: ver §6.

---

## 3. Despliegue (pasos obligatorios)

### 3.1 Variables de entorno

```env
# Públicas (cliente)
NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# ⚠️ OBLIGATORIA: credencial administrativa (solo servidor)
SUPABASE_SERVICE_ROLE_KEY=<service_role key>

# Firma de sesiones/tokens (recomendada, 32+ caracteres aleatorios)
ADMIN_SECRET_KEY=<cadena aleatoria larga>

# Contraseña del panel de administración
ADMIN_PASSWORD=<contraseña fuerte>

# Crons del mercado (opcional pero recomendado)
CRON_SECRET=<cadena aleatoria>

# Push (obligatorias si se usan notificaciones)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clave pública>
VAPID_PRIVATE_KEY=<clave privada>
VAPID_SUBJECT=mailto:tu-correo@ejemplo.com

# Opcional: orígenes extra permitidos para la API (separados por comas)
ALLOWED_ORIGINS=https://tu-dominio.com
```

Sin `SUPABASE_SERVICE_ROLE_KEY` la aplicación arranca pero **no puede escribir**:
la RLS bloquea al cliente anónimo y el servidor no tiene credencial administrativa.
Es intencionado: la `anon key` viaja al navegador de cada alumno y no puede ser la
llave de la caja fuerte.

### 3.2 Base de datos

Ejecuta en Supabase → SQL Editor, **en este orden**:

1. `supabase/migrations/15_endurecimiento_seguridad.sql`
   - Amplía los tipos de `balance_transactions`.
   - Crea `wallet_receipts` (recibos de un solo uso).
   - Crea `rr_game_secrets` y limpia la bala filtrada.
   - Crea `execute_market_trade()` y retira `EXECUTE` público a las funciones
     económicas (`trade_parody_stock`, `record_arcade_rake_to_market`,
     `tick_market_price`...).
   - Aplica RLS estricta y permisos por columna en `profiles`.
   - Instala el trigger anti-escalada.
2. `supabase/migrations/16_endurecimiento_seguridad_rls.sql`
   - Refuerza columnas sensibles (mascotas, rol, suspensión).
   - Cierra `event_logs`, `chat_message_likes`, `feedback_votes` y
     `push_subscriptions` a clientes con JWT.

Ambas son idempotentes.

---

## 4. Cabeceras y CSRF

- `proxy.ts` (el antiguo middleware en Next.js 16) bloquea peticiones mutantes con
  `Origin`/`Sec-Fetch-Site` de otro sitio y añade cabeceras a las respuestas de API.
- `next.config.ts` añade CSP, HSTS (producción), `X-Frame-Options`,
  `Cross-Origin-Opener-Policy`, `Permissions-Policy` y `noindex` para `/api`.
- Si usas un proveedor externo (imágenes, fuentes, websocket propio), añádelo a la
  CSP de `next.config.ts` y a `ALLOWED_ORIGINS` si llama a la API.

---

## 5. Cómo verificar que funciona

Con la app desplegada y una cuenta de prueba:

1. **Fabricar saldo**: en la consola, `fetch('/api/user/balance/sync', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({delta:999999999999, claimType:'game'})})`
   → debe responder `400` ("Premio no autorizado…").
2. **Cambiar tu saldo en Supabase**: `supabase.from('profiles').update({coins: 999999999}).eq('id', miId)`
   → debe fallar (permiso denegado o excepción del trigger).
3. **Vender acciones sin tenerlas**: mercado → vender 1.000 acciones de un activo que no poseas
   → `400` y evento `market_sell_without_position` en `/admin`.
4. **Tick del mercado** sin sesión: `curl -X POST https://tu-dominio/api/investments/tick` → `401`.
5. **Rake**: `POST /api/investments/rake` sin cookie de admin → `403`.
6. **Ruleta rusa**: `POST /api/russian-roulette/timeout` sin ser participante → `403`;
   con el turno en curso (antes del plazo) → `400`.
7. **CSRF**: `POST` con `Origin: https://evil.example` → `403`.
8. **Panel**: `/admin` → Auditoría muestra los intentos bloqueados.

---

## 6. Riesgos residuales (y siguientes pasos)

1. **Botellón idle**: la producción y el alijo se simulan en el navegador. Los topes
   del servidor limitan el daño, pero la solución definitiva es simular la producción
   en PostgreSQL/Edge Function y que el cliente solo dibuje. Siguiente paso recomendado.
2. **Rate limiting en memoria**: en serverless cada instancia tiene su propio contador.
   Es una primera barrera; los límites económicos importantes (presupuestos, recibos,
   cooldowns) sí se apoyan en PostgreSQL. Para límites fuertes por IP, usa Upstash/Redis.
3. **Cuentas locales** (fallback sin Supabase): viven en `localStorage`; su economía no
   es persistente ni comparable. No deben usarse en producción.
4. **Sesión persistente**: si alguien con acceso físico al navegador copia las cookies
   podría actuar como el alumno. El token es HttpOnly+SameSite=Lax; en producción viaja
   siempre por HTTPS. Para cuentas compartidas en el aula, considera caducidad más corta.
5. **Contenido generado por alumnos**: el chat permite publicar como usuario autenticado;
   conviene moderación (ya existe borrado por staff) y límites de longitud/likes.
6. **Datos personales en `profiles`**: la lectura es pública para que funcionen el ranking
   y las fichas de alumno (incluye correo y NIF/NIA). Si quieres reducirlo, concede
   `SELECT` por columnas (sin `email`) y cambia los `select('*')` del cliente por listas
   explícitas de columnas. Es el siguiente paso recomendado en privacidad.
7. **Fugas de secretos**: las claves `VAPID`, `SERVICE_ROLE` y `ADMIN_*` deben rotarse
   si alguna vez estuvieron en el repositorio (la clave VAPID privada estaba hardcodeada).

---

## 7. Auditoría

Los eventos de seguridad se guardan en `public.event_logs` y se consultan en
`/admin` → Auditoría (o `GET /api/admin/logs`). Acciones registradas:

`wallet_claim_cap_exceeded`, `wallet_earnings_budget_exceeded`,
`wallet_casino_budget_exceeded`, `wallet_round_receipt_invalid`,
`wallet_round_receipt_replay`, `wallet_round_payout_rejected`,
`wallet_large_credit`, `market_trade_rejected`, `market_sell_without_position`,
`market_tick_unauthorized`, `rake_unauthorized_attempt`, `rr_timeout_unauthorized`,
`legacy_confirm_invalid_credentials`, `admin_claim_*`, `pet_purchase`...

`event_logs` es de solo escritura para el servidor y de solo lectura para
administradores: nadie puede borrar su rastro desde el navegador.
