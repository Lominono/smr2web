import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// ──────────────────────────────────────────────────────────────────────────────
// RATE LIMITING en memoria por IP
// ──────────────────────────────────────────────────────────────────────────────
interface RateLimitRecord {
  lastRequestTime: number;
  minuteTimestamps: number[];
  hourTimestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.lastRequestTime > 20 * 60 * 1000) rateLimitMap.delete(ip);
  }
}, 20 * 60 * 1000);

// ──────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE BASE LOCAL (Fallback de seguridad si la IA está offline o sin cuota)
// ──────────────────────────────────────────────────────────────────────────────
interface KBEntry { pattern: RegExp; reply: string }

const KNOWLEDGE_BASE: KBEntry[] = [
  // Crash Game
  { pattern: /crash|scrash|multiplicador|apuesta.*crash|juego.*crash/i, reply: 'El minijuego Crash arranca ahora en 0.50x, pedazo de lerdo. Si te acojonas y retiras en 0.70x recuperas parte de tu apuesta, pero el punto de equilibrio es 1.00x y a partir de ahí son ganancias netas. No seas ludópata y no le metas todo a una ronda o te vas a quedar en la ruina. [ACTION:games]' },
  // La Bolsa del Botellón
  { pattern: /bolsa|acciones|mercadona|kebab|botellon|botellón|invertir|comprar.*accion/i, reply: 'La Bolsa de El Botellón es puro mercado libre de clase: Mercadona, Kebab Amigo y más chuminadas. Si los vagos compran a lo loco, la gráfica sube; si venden todos como ratas, se va al hoyo. Compra barato y vende caro, espabila. [ACTION:investments]' },
  // Feed / Tablón de la clase
  { pattern: /feed|tablon|tablón|chat|escribir|mensaje|propina|50.*fichas/i, reply: 'En el tablón puedes poner quejas del examen, avisos y hablar con la clase sin recargar. Y si alguien pone algo que te salve la vida, suéltale una propina de 50 fichas. No spamees tonterías o te denuncio con el profesor. [ACTION:chat]' },
  // Grifo / Faucet
  { pattern: /faucet|grifo|sin.*(fichas|monedas|pasta)|arruinado|pobre|tieso/i, reply: '¿Te has fundido toda tu pasta apostando como un mono? Vete al grifo (Faucet) a lloriquear y pide tu limosna de fichas diarias para salir del pozo. [ACTION:faucet]' },
  // Leaderboard / Ranking
  { pattern: /ranking|leaderboard|clasificacion|clasificación|quien.*va.*primero|puntos/i, reply: 'En el ranking se ve quién es el puto amo de 2º SMR con más pasta y quién es el más pringao de la clase. Gana partidas en la ruleta o en el Crash si quieres subir puestos. [ACTION:leaderboard]' },
  // Horario y Recreos
  { pattern: /horario|recreo|clase.*(toca|siguiente|ahora)|profesor/i, reply: 'Arriba tienes el horario del Aula 35 que te chiva qué tortura toca ahora y cuántos minutos de condena te quedan para el recreo. Espabila que luego te ponen falta. [ACTION:schedule]' },
  // Ser admin
  { pattern: /admin|administrador|permisos.*admin|hacerse.*admin|clave.*admin|password.*admin/i, reply: '¿Hacerte admin? ¡Ni de coña, flipao! Los permisos de admin solo se dan tocando directamente la base de datos de los jefes en PostgreSQL. Tú eres un simple alumno de FP, ponte a crimpar cables y no te hagas ilusiones.' },
  // Identificación de puesto
  { pattern: /puesto|identificacion|identificación|nombre.*real|numero.*serie/i, reply: 'Te pedimos el nombre real y el puesto de tu PC en el Aula 35 para tenerte fichado y que nadie se haga pasar por otro en el tablón. No te inventes el puesto o te van a pillar.' },
  // Novedades
  { pattern: /novedades|actualizacion|actualizaciones|cambios|version/i, reply: 'Estamos en la versión 2.9.0 de la web: nuevo motor de Crash que arranca en 0.50x, autoría verídica en el tablón y el tour donde te guío. [ACTION:changelog]' },
  // Subnetting
  { pattern: /\/24/,   reply: 'Subred /24: máscara 255.255.255.0, 254 hosts útiles por red. El más fácil y el que más meten en los exámenes, hasta un mono lo saca. [CMD:ipcalc 192.168.1.0/24]' },
  { pattern: /\/25/,   reply: 'Subred /25: máscara 255.255.255.128, saltos de 128, 126 hosts útiles. [CMD:ipcalc 192.168.1.0/25]' },
  { pattern: /\/26/,   reply: 'Subred /26: máscara 255.255.255.192, saltos de 64, 62 hosts útiles. [CMD:ipcalc 192.168.1.0/26]' },
  { pattern: /\/27/,   reply: 'Subred /27: máscara 255.255.255.224, saltos de 32, 30 hosts útiles por subred. [CMD:ipcalc 192.168.1.0/27]' },
  { pattern: /\/28/,   reply: 'Subred /28: máscara 255.255.255.240, saltos de 16, 14 hosts útiles. No te equivoques en el examen de redes que luego lloras. [CMD:ipcalc 192.168.1.0/28]' },
  { pattern: /\/29/,   reply: 'Subred /29: máscara 255.255.255.248, saltos de 8, 6 hosts útiles. Muy usada en enlaces WAN entre routers. [CMD:ipcalc 192.168.1.0/29]' },
  { pattern: /\/30/,   reply: 'Subred /30: máscara 255.255.255.252, solo 2 míseros hosts útiles. Para enlaces punto a punto entre routers. [CMD:ipcalc 192.168.1.0/30]' },
  // Servicios y comandos SMR2
  { pattern: /bind9?|dns.*(zona|configurar|directo|inverso|named)/i, reply: 'BIND9 para DNS: edita /etc/bind/named.conf.local para las zonas directas e inversas, luego comprueba con named-checkconf y named-checkzone antes de cagarla. [CMD:sudo systemctl restart bind9]' },
  { pattern: /dhcp.*(configur|instalar|rango|pool)/i, reply: 'DHCP (isc-dhcp-server): edita /etc/dhcp/dhcpd.conf con subnet, netmask, range, default-lease-time y routers. [CMD:sudo systemctl restart isc-dhcp-server]' },
  { pattern: /apache2?|virtualhost|vhost/i, reply: 'Apache2 VirtualHost: crea el archivo en /etc/apache2/sites-available/, cópialos a sites-enabled con a2ensite y recarga sin romper el servidor. [CMD:sudo a2ensite tu-sitio.conf && sudo systemctl reload apache2]' },
  { pattern: /ftp|vsftpd/i, reply: 'vsftpd: edita /etc/vsftpd.conf y activa local_enable, write_enable. No olvides abrir el puerto 21 en UFW o no va a conectar ni Dios. [CMD:sudo systemctl restart vsftpd]' },
  { pattern: /ssh.*(configur|puerto|acceso|clave)/i, reply: 'SSH: edita /etc/ssh/sshd_config para cambiar el puerto 22, deshabilitar root login y forzar claves públicas. Deja de meter contraseñas tipo 1234. [CMD:sudo systemctl restart sshd]' },
  { pattern: /iptables|ufw.*(regla|puerto|abrir|bloquear)/i, reply: 'UFW: ufw allow 80/tcp, ufw allow 443/tcp, ufw deny 23/tcp para Telnet. Comprueba el estado con ufw status verbose. [CMD:sudo ufw status verbose]' },
  { pattern: /active.?directory|gpo|dominio.*(windows|server)/i, reply: 'Active Directory: gestiona usuarios con ADUC (dsa.msc) y las GPO con gpmc.msc. Luego lanza gpupdate /force en los clientes para forzar la actualización de directivas. [CMD:gpmc.msc]' },
  { pattern: /mysql|mariadb.*(usuario|grant|crear|contraseña)/i, reply: 'MariaDB: CREATE USER y GRANT ALL PRIVILEGES ON bbdd.* TO \'usuario\'@\'%\' IDENTIFIED BY \'pass\'; FLUSH PRIVILEGES; [CMD:mysql -u root -p]' },
  { pattern: /wordpress|cms.*(instalar|configurar)/i, reply: 'WordPress en LAMP: sube los archivos a /var/www/html/, configura wp-config.php con el usuario de MySQL y dale permisos a www-data. [CMD:sudo chown -R www-data:www-data /var/www/html]' },
  { pattern: /chmod|chown|permisos?(linux|carpeta|archivo)/i, reply: '755 (rwxr-xr-x) para directorios públicos, 644 para archivos web, 700 para privados. Propietario www-data para Apache. [CMD:sudo chmod -R 755 /var/www/html]' },
  { pattern: /lvm|volumen.*(lógico|físico|grupo)/i, reply: 'LVM: pvcreate → vgcreate → lvcreate → mkfs.ext4 → mount. Para ampliar: lvextend -L +5G /dev/vg/lv && resize2fs /dev/vg/lv [CMD:lvdisplay]' },
  { pattern: /nmap|escaneo.*(puertos|red|host)/i, reply: 'nmap -sV -sC 192.168.X.X para detección de versiones y scripts básicos. Usa -p- para todos los puertos o -sU para UDP. [CMD:nmap -sV -sC 192.168.1.0/24]' },
  { pattern: /wireguard|vpn.*(configurar|tunel)/i, reply: 'WireGuard: genera claves con wg genkey | tee privatekey | wg pubkey > publickey, configura /etc/wireguard/wg0.conf y activa con wg-quick up wg0. [CMD:sudo wg-quick up wg0]' },
  { pattern: /ssl|tls|certificado|https.*(apache|nginx)/i, reply: 'SSL con Certbot para Let\'s Encrypt: sudo certbot --apache (o --nginx). Renueva automáticamente con certbot renew. [CMD:sudo certbot --apache]' },
  // Puertos
  { pattern: /puertos.*(protocolo|lista|examen|importantes)/i, reply: 'Puertos para no suspender el examen: DNS 53/UDP, DHCP 67-68/UDP, HTTP 80, HTTPS 443, SSH 22, FTP 20/21, SMTP 25, POP3 110, IMAP 143, RDP 3389, MariaDB 3306. [CMD:ss -tuln]' },
  // Ruleta Rusa
  { pattern: /multimetro|multímetro/i, reply: 'El Multímetro Fluke mide la recámara actual en secreto: te dice BALA REAL o SALVA. Úsalo antes de disparar para no hacer el ridículo. [ACTION:games]' },
  { pattern: /crimpadora/i, reply: 'La Crimpadora sierra el cañón para que el siguiente tiro meta 2 VIDAS de daño. Perfecta cuando sabes que viene bala real y quieres mandar al rival al hoyo. [ACTION:games]' },
  { pattern: /inversor/i, reply: 'El Inversor cambia la bala: Salva → Real o Real → Salva. Ideal para trolear al rival o salvarte de un tiro en la jeta. [ACTION:games]' },
  { pattern: /monster|bebida.*(energia|energética)/i, reply: 'El Monster te mete +1 de salud al instante. El combustible oficial del informático del Aula 35. [ACTION:games]' },
  { pattern: /cable.*(rj45|esposas)|esposas/i, reply: 'El Cable RJ45 esposa al rival y le salta el siguiente turno. Una cerdada que si la juegas bien te da la victoria. [ACTION:games]' },
  { pattern: /ruleta.*(estrategia|ganar|truco)|como.*(ganar|sobrevivir)/i, reply: 'Estrategia Ruleta: cuenta las salvas restantes. Si quedan más salvas que balas reales, dispárate a ti mismo para conservar el turno y robar objetos. Usa el Multímetro para no palmarla. [ACTION:games]' },
  // Web y creadores
  { pattern: /(quien|quién).*(creo|creó|hizo|programo|programó|web|página)/i, reply: 'La web la programaron JuanFe Ospina y David, los putos amos de 2º SMR que montaron todo esto mientras los demás os rascabais la barriga.' },
  { pattern: /(cuando|cuándo|fecha).*(sale|lanzamiento|estreno|abre)/i, reply: 'La web se abre oficialmente el 9 de noviembre de 2026 a las 8:35 AM en el Aula 35. No llegues tarde, meloncio.' },
  // IPE2
  { pattern: /ipe2?|empleabilidad|nominas/i, reply: 'IPE2 = Itinerario Personal para la Empleabilidad: contratos, nóminas, PRL, convenio TIC. Cero inglés profesional en 2º SMR.' },
];

// ──────────────────────────────────────────────────────────────────────────────
// HANDLER PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'anonymous_client';
    const now = Date.now();

    // ── Rate limiting ────────────────────────────────────────────────────────
    const clientRecord = rateLimitMap.get(ip) || { lastRequestTime: 0, minuteTimestamps: [], hourTimestamps: [] };

    if (now - clientRecord.lastRequestTime < 1800) {
      return NextResponse.json({ reply: '¡Frena un segundo, que no me da la vida pa responderte tan rápido!' });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.minuteTimestamps = clientRecord.minuteTimestamps.filter(t => t > oneMinuteAgo);
    if (clientRecord.minuteTimestamps.length >= 10) {
      return NextResponse.json({ reply: 'Relaja la raja un minutito, me estás fundiendo los transistores.' });
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    clientRecord.hourTimestamps = clientRecord.hourTimestamps.filter(t => t > oneHourAgo);
    if (clientRecord.hourTimestamps.length >= 20) {
      const oldest = Math.min(...clientRecord.hourTimestamps);
      const waitMins = Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now) / 60000));
      return NextResponse.json({ reply: `Has petado el cupo por hora, fiera. Vuelve en ${waitMins} min y mientras ponte a estudiar subnetting.` });
    }

    clientRecord.lastRequestTime = now;
    clientRecord.minuteTimestamps.push(now);
    clientRecord.hourTimestamps.push(now);
    rateLimitMap.set(ip, clientRecord);

    // ── Parsear cuerpo ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const rawPrompt = (body.prompt || '').trim();

    if (!rawPrompt) {
      return NextResponse.json({ reply: '¿Pero qué coño quieres? Si no has escrito nada, retrasado.' });
    }
    if (rawPrompt.length > 400) {
      return NextResponse.json({ reply: 'Menudo tocho me has soltado. Resume a menos de 400 caracteres que no soy ChatGPT.' });
    }

    const promptLower = rawPrompt.toLowerCase();

    // ── Contexto dinámico de usuario y aula ───────────────────────────────────
    const ctx = body.context || {};
    const username  = ctx.username || 'alumno';
    const activeTab = ctx.activeTab || 'tablón';
    const coins     = typeof ctx.coins === 'number' ? ctx.coins : null;
    const sched     = ctx.scheduleStatus || {};
    const currentSubject   = sched.currentSubject   || 'Sin clase activa';
    const minutesRemaining = sched.minutesRemaining ?? 0;
    const nextSubject      = sched.nextSubject      || 'Ninguna pendiente';
    const statusText       = sched.status           || 'fuera_de_horario';

    const dynamicSystemPrompt = `\
Eres PUTOISAAC, una bola naranja cabrona, borde y malhablada, pero un auténtico genio en redes y sysadmin. Eres la mascota no oficial de 2º SMR (Sistemas Microinformáticos y Redes, Aula 35).

PERSONALIDAD Y TONO:
- Grosero, vacilón, cínico y con la mala leche de un estudiante de FP quemado: suelta tacos y giros coloquiales españoles ("cojones", "hostia", "ni de coña", "espabila", "vago", "lerdo", "ludópata de mierda", "matao", "pesao", "iluminado", "¿pero qué coño dices?").
- CERO educación corporativa ni saludos de IA lameculos ("Por supuesto", "Hola amigo", "¿En qué puedo ayudarte?"). Ve a machete desde la primera palabra.
- Respuestas CORTAS, afiladas y demoledoras: máximo 2 o 3 frases contundentes.
- Si la pregunta es técnica, das la respuesta PERFECTA y el comando exacto con formato [CMD:...], pero vacilando por no sabérselo de memoria.
- Si preguntan sobre la web, dominas todo al 100%:
  * Crash: arranca en 0.50x y el punto de equilibrio es 1.00x. Si el multiplicador revienta antes de cobrar, pierdes la apuesta. Si cobras antes de 1.00x amortizas parte del dinero; de 1.00x hacia arriba son ganancias puras.
  * Ruleta Rusa Táctica: duelo estilo Buckshot Roulette con salvas y balas reales. Objetos tácticos: Crimpadora (x2 vidas de daño cortando el cañón), Multímetro Fluke (escanea la recámara en secreto), Inversor (cambia salva a real o real a salva), Monster Energy (+1 vida), Cable RJ45 (esposas que inmovilizan al rival un turno). Truco: si sabes que hay salva, dispárate a ti mismo para conservar el turno y robar objetos.
  * Bolsa del Botellón: mercado de acciones locales (Mercadona, Kebab Amigo...). La cotización fluctúa en vivo según las compras y ventas de los alumnos. Comprar en mínimos y vender en máximos.
  * Tablón (Feed en vivo): muro donde la clase comenta en directo. Se pueden mandar propinas de 50 fichas a los compañeros que aporten o ayuden.
  * Grifo / Faucet: sistema de auxilio para los arruinados que se quedan a cero fichas por apostar a lo loco.
  * Horario de Aula 35: qué clase toca ahora, el recreo y los minutos exactos que faltan.
  * Puestos de PC: cada alumno tiene registrado su puesto físico del Aula 35 (ej: Puesto #1).
- Si alguien pide ser admin o pregunta por claves maestras, búrlate salvajemente: los administradores SOLO se asignan de forma directa en la base de datos PostgreSQL por los creadores; ningún alumno puede hacerse admin por comandos ni contraseñas.
- Si alguien pregunta por secretos, contraseñas o el Easter Egg, no sueltes ni pío: diles que se dejen de hackear y se pongan a crimpar cables.

CONTEXTO EN DIRECTO:
- Alumno: @${username}${coins !== null ? ` (${coins} monedas)` : ''}
- Pestaña activa: ${activeTab}
- Estado de clase: ${statusText}
- Clase actual: ${currentSubject} (${minutesRemaining} min restantes)
- Próxima clase: ${nextSubject}

TEMARIO 2º SMR AULA 35:
• SR: DNS (BIND9, named.conf.local, zonas directas/inversas), DHCP (isc-dhcp-server, dhcpd.conf), Apache2 (VirtualHosts, a2ensite), FTP (vsftpd), SSH, UFW, Postfix/Dovecot.
• SOR: Windows Server (AD, GPO, dsa.msc, gpmc.msc, PowerShell), Linux Server (chmod/chown, systemctl, LVM, fstab, cron).
• SI: AES/RSA, SSL/TLS (Certbot, openssl), iptables/UFW, nmap, WireGuard VPN, análisis de logs.
• AW: LAMP stack, WordPress, MariaDB/MySQL (GRANT ALL, FLUSH PRIVILEGES), Nginx reverse proxy, Composer, PHP-FPM.
• IPE2: Itinerario personal para la empleabilidad (contratos, nóminas, convenio TIC, PRL). CERO inglés profesional.
• Subnetting: /24=254h, /25=126h, /26=62h, /27=30h, /28=14h, /29=6h, /30=2h. Siempre incluye el comando ipcalc.
• Puertos clave: DNS 53/UDP, DHCP 67-68/UDP, HTTP 80, HTTPS 443, SSH 22, FTP 20/21, SMTP 25, POP3 110, IMAP 143, RDP 3389, MariaDB 3306, Samba 445.
• Web versión actual: v2.9.0. Autores: JuanFe Ospina y David. Apertura oficial: 9 de noviembre 2026, 08:35 en Aula 35.

ETIQUETAS PERMITIDAS (solo si son relevantes, al final del mensaje):
[ACTION:schedule] → si hablas de horario o clases
[ACTION:investments] → si hablas de la Bolsa del Botellón o monedas
[ACTION:chat] → si hablas del tablón o avisos
[ACTION:games] → si hablas de Crash, Ruleta Rusa o juegos
[ACTION:changelog] → si hablas de novedades o versiones
[ACTION:faucet] → si el alumno necesita monedas o está arruinado
[ACTION:leaderboard] → si hablas del ranking
[CMD:comando_exacto] → si recomiendas un comando de terminal (ej: [CMD:sudo systemctl restart bind9])`.trim();

    // ── Historial compacto ───────────────────────────────────────────────────
    const history = Array.isArray(body.history)
      ? body.history.slice(-4).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: String(msg.content || '').slice(0, 200),
        }))
      : [];

    const messages = [
      { role: 'system', content: dynamicSystemPrompt },
      ...history,
      { role: 'user', content: rawPrompt },
    ];

    // ── 1. VÍA PRINCIPAL: Llamada a la IA (OpenRouter / Gemini) ──────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const modelsToTry = [
        'google/gemini-2.5-flash',
        'google/gemini-2.0-flash-001',
        'google/gemini-flash-1.5',
        'meta-llama/llama-3.3-70b-instruct',
        'mistralai/mistral-small-3.1-24b-instruct:free',
      ];

      for (const model of modelsToTry) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://smr2web.vercel.app',
              'X-Title': 'Portal 2º SMR - PUTOISAAC v2.9',
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens: 150,
              temperature: 0.75,
              top_p: 0.9,
            }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const rawReply = data.choices?.[0]?.message?.content?.trim();

          if (rawReply) {
            const cleanReply = rawReply
              .replace(/^["""']|["""']$/g, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/^#+\s+/gm, '')
              .trim();
            return NextResponse.json({ reply: cleanReply, model });
          }
        } catch {}
      }
    } else if (geminiKey) {
      // Soporte directo alternativo para Gemini API si no hay OpenRouter
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${dynamicSystemPrompt}\n\nPregunta del alumno: ${rawPrompt}` }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.75,
              },
            }),
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            const cleanReply = text
              .replace(/^["""']|["""']$/g, '')
              .replace(/\*\*([^*]+)\*\*/g, '$1')
              .replace(/^#+\s+/gm, '')
              .trim();
            return NextResponse.json({ reply: cleanReply, model: 'gemini-direct' });
          }
        }
      } catch {}
    }

    // ── 2. FALLBACK OFFLINE / RESIDUAL (Knowledge Base local) ─────────────────
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.pattern.test(promptLower)) {
        return NextResponse.json({ reply: entry.reply, fallback: true });
      }
    }

    // ── 3. Fallback final si nada coincide ────────────────────────────────────
    return NextResponse.json({
      reply: 'Se ha caído la conexión del Aula 35. Echa una Ruleta Rusa mientras vuelve. [ACTION:games]',
    });

  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola. Vuelve a preguntar si tienes huevos.' },
      { status: 500 }
    );
  }
}
