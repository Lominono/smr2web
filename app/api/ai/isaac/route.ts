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
// KNOWLEDGE BASE LOCAL (respuestas deterministas sin consumir API)
// ──────────────────────────────────────────────────────────────────────────────
interface KBEntry { pattern: RegExp; reply: string }

const KNOWLEDGE_BASE: KBEntry[] = [
  // Subnetting
  { pattern: /\/24/,   reply: 'Subred /24: máscara 255.255.255.0, 254 hosts útiles por red. El más fácil y el que más meten en los exámenes. [CMD:ipcalc 192.168.1.0/24]' },
  { pattern: /\/25/,   reply: 'Subred /25: máscara 255.255.255.128, saltos de 128, 126 hosts útiles. [CMD:ipcalc 192.168.1.0/25]' },
  { pattern: /\/26/,   reply: 'Subred /26: máscara 255.255.255.192, saltos de 64, 62 hosts útiles. [CMD:ipcalc 192.168.1.0/26]' },
  { pattern: /\/27/,   reply: 'Subred /27: máscara 255.255.255.224, saltos de 32, 30 hosts útiles por subred. [CMD:ipcalc 192.168.1.0/27]' },
  { pattern: /\/28/,   reply: 'Subred /28: máscara 255.255.255.240, saltos de 16, 14 hosts útiles. No te equivoques en el examen. [CMD:ipcalc 192.168.1.0/28]' },
  { pattern: /\/29/,   reply: 'Subred /29: máscara 255.255.255.248, saltos de 8, 6 hosts útiles. Muy usada en enlaces WAN. [CMD:ipcalc 192.168.1.0/29]' },
  { pattern: /\/30/,   reply: 'Subred /30: máscara 255.255.255.252, solo 2 hosts útiles. Para enlaces punto a punto entre routers. [CMD:ipcalc 192.168.1.0/30]' },
  // Servicios y comandos SMR2
  { pattern: /bind9?|dns.*(zona|configurar|directo|inverso|named)/i, reply: 'BIND9 para DNS: edita /etc/bind/named.conf.local para las zonas directas e inversas, luego comprueba con named-checkconf y named-checkzone. [CMD:sudo systemctl restart bind9]' },
  { pattern: /dhcp.*(configur|instalar|rango|pool)/i, reply: 'DHCP (isc-dhcp-server): edita /etc/dhcp/dhcpd.conf con subnet, netmask, range, default-lease-time y routers. [CMD:sudo systemctl restart isc-dhcp-server]' },
  { pattern: /apache2?|virtualhost|vhost/i, reply: 'Apache2 VirtualHost: crea el archivo en /etc/apache2/sites-available/, cópialos a sites-enabled con a2ensite y recarga. [CMD:sudo a2ensite tu-sitio.conf && sudo systemctl reload apache2]' },
  { pattern: /ftp|vsftpd/i, reply: 'vsftpd: edita /etc/vsftpd.conf y activa local_enable, write_enable. No olvides abrir el puerto 21 en UFW. [CMD:sudo systemctl restart vsftpd]' },
  { pattern: /ssh.*(configur|puerto|acceso|clave)/i, reply: 'SSH: edita /etc/ssh/sshd_config para cambiar el puerto, deshabilitar root login y forzar autenticación por clave pública. [CMD:sudo systemctl restart sshd]' },
  { pattern: /iptables|ufw.*(regla|puerto|abrir|bloquear)/i, reply: 'UFW: ufw allow 80/tcp, ufw allow 443/tcp, ufw deny 23/tcp para Telnet. Comprueba el estado con ufw status verbose. [CMD:sudo ufw status verbose]' },
  { pattern: /active.?directory|gpo|dominio.*(windows|server)/i, reply: 'Active Directory: gestiona usuarios con ADUC (dsa.msc) y las GPO con gpmc.msc. Luego lanza gpupdate /force en los clientes para forzar la actualización. [CMD:gpmc.msc]' },
  { pattern: /mysql|mariadb.*(usuario|grant|crear|contraseña)/i, reply: 'MariaDB: CREATE USER y GRANT ALL PRIVILEGES ON bbdd.* TO \'usuario\'@\'%\' IDENTIFIED BY \'pass\'; FLUSH PRIVILEGES; [CMD:mysql -u root -p]' },
  { pattern: /wordpress|cms.*(instalar|configurar)/i, reply: 'WordPress en LAMP: sube los archivos a /var/www/html/, configura wp-config.php con el usuario de MySQL y asigna permisos www-data. [CMD:sudo chown -R www-data:www-data /var/www/html]' },
  { pattern: /chmod|chown|permisos?(linux|carpeta|archivo)/i, reply: '755 (rwxr-xr-x) para directorios públicos, 644 para archivos web, 700 para privados. Owner www-data para Apache. [CMD:sudo chmod -R 755 /var/www/html]' },
  { pattern: /lvm|volumen.*(lógico|físico|grupo)/i, reply: 'LVM: pvcreate → vgcreate → lvcreate → mkfs.ext4 → mount. Para ampliar: lvextend -L +5G /dev/vg/lv && resize2fs /dev/vg/lv [CMD:lvdisplay]' },
  { pattern: /nmap|escaneo.*(puertos|red|host)/i, reply: 'nmap -sV -sC 192.168.X.X para detección de versiones y scripts básicos. Usa -p- para todos los puertos o -sU para UDP. [CMD:nmap -sV -sC 192.168.1.0/24]' },
  { pattern: /wireguard|vpn.*(configurar|tunel)/i, reply: 'WireGuard: genera claves con wg genkey | tee privatekey | wg pubkey > publickey, configura /etc/wireguard/wg0.conf y activa con wg-quick up wg0. [CMD:sudo wg-quick up wg0]' },
  { pattern: /ssl|tls|certificado|https.*(apache|nginx)/i, reply: 'SSL con Certbot para Let\'s Encrypt: sudo certbot --apache (o --nginx). Renueva automáticamente con certbot renew. También puedes usar openssl para certificados autofirmados. [CMD:sudo certbot --apache]' },
  // Puertos
  { pattern: /puertos.*(protocolo|lista|examen|importantes)/i, reply: 'Puertos para el examen: DNS 53/UDP, DHCP 67-68/UDP, HTTP 80, HTTPS 443, SSH 22, FTP 20/21, SMTP 25, POP3 110, IMAP 143, RDP 3389, MariaDB 3306. [CMD:ss -tuln]' },
  // Ruleta Rusa
  { pattern: /multimetro|multímetro/i, reply: 'El Multímetro Fluke mide la recámara actual en secreto: te dice BALA REAL 🔥 o SALVA ⚪. Úsalo antes de decidir a quién disparas. [ACTION:games]' },
  { pattern: /crimpadora/i, reply: 'La Crimpadora sierra el cañón para que el siguiente tiro haga 2 VIDAS de daño. Perfecta cuando sabes que viene bala real. [ACTION:games]' },
  { pattern: /inversor/i, reply: 'El Inversor cambia la bala: Salva → Real o Real → Salva. Ideal para trollear al rival o salvarte de una bala real. [ACTION:games]' },
  { pattern: /monster|bebida.*(energia|energética)/i, reply: 'El Monster te da +1 de salud al instante. El combustible oficial del informático del Aula 204. [ACTION:games]' },
  { pattern: /cable.*(rj45|esposas)|esposas/i, reply: 'El Cable RJ45 esposa al rival y le salta el siguiente turno. Una cerdada que si la juegas bien te da la partida. [ACTION:games]' },
  { pattern: /ruleta.*(estrategia|ganar|truco)|como.*(ganar|sobrevivir)/i, reply: 'Estrategia Ruleta: cuenta las salvas restantes. Si quedan más salvas que balas reales, dispárate a ti mismo para conservar el turno y robar objetos. Usa el Multímetro para info extra. [ACTION:games]' },
  // Web y creadores
  { pattern: /(quien|quién).*(creo|creó|hizo|programo|programó|web|página)/i, reply: 'La web la programaron JuanFe Ospina y David, los putos amos de 2º SMR que montaron todo esto mientras los demás os rascabais la barriga.' },
  { pattern: /(cuando|cuándo|fecha).*(sale|lanzamiento|estreno|abre)/i, reply: 'La web se abre oficialmente el 9 de noviembre de 2026 a las 8:35 AM en el Aula 204. No llegues tarde, meloncio.' },
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

    if (now - clientRecord.lastRequestTime < 2000) {
      return NextResponse.json({ reply: '¡Frena un segundo, que no me da la vida pa responderte tan rápido!' });
    }

    const oneMinuteAgo = now - 60 * 1000;
    clientRecord.minuteTimestamps = clientRecord.minuteTimestamps.filter(t => t > oneMinuteAgo);
    if (clientRecord.minuteTimestamps.length >= 10) {
      return NextResponse.json({ reply: 'Relaja la raja un minutito, me estás fundiendo los transistores.' });
    }

    const oneHourAgo = now - 60 * 60 * 1000;
    clientRecord.hourTimestamps = clientRecord.hourTimestamps.filter(t => t > oneHourAgo);
    if (clientRecord.hourTimestamps.length >= 18) {
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

    // ── Knowledge Base local (sin API) ───────────────────────────────────────
    for (const entry of KNOWLEDGE_BASE) {
      if (entry.pattern.test(promptLower)) {
        return NextResponse.json({ reply: entry.reply });
      }
    }

    // ── Sin clave API → fallback honesto ─────────────────────────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: 'Dile al admin que meta la OPENROUTER_API_KEY en Vercel si quiere que gaste saliva.',
      });
    }

    // ── Contexto dinámico ────────────────────────────────────────────────────
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
Eres PUTOISAAC, una bola naranja cabrona, experta en redes y sysadmin, mascota de 2º SMR (Sistemas Microinformáticos y Redes, Aula 204).

PERSONALIDAD Y ESTILO:
- Español de España coloquial y borde: "illo", "pesao", "vaya tela", "meloncio", "espabila", "¿pero qué buscas?".
- NUNCA empieces con saludos de IA ("Claro que sí", "Por supuesto", "¿En qué puedo ayudarte?"). Directo al grano.
- Respuestas CORTAS y útiles: máximo 3 frases. Incluye comandos exactos si la pregunta es técnica.
- Si la pregunta es técnica, da la respuesta técnica correcta aunque uses lenguaje coloquial.
- Si el alumno se equivoca en algo técnico, corrígele sin piedad pero con la info correcta.
- Si preguntan algo que no tiene que ver con el aula ni con informatica, responde de forma breve y redirige.

CONTEXTO EN DIRECTO:
- Alumno: @${username}${coins !== null ? ` (${coins} monedas)` : ''}
- Pestaña activa: ${activeTab}
- Estado de clase: ${statusText}
- Clase actual: ${currentSubject} (${minutesRemaining} min restantes)
- Próxima clase: ${nextSubject}

TEMARIO 2º SMR AULA 204:
• SR: DNS (BIND9, named.conf.local, zonas directas/inversas), DHCP (isc-dhcp-server, dhcpd.conf), Apache2 (VirtualHosts, a2ensite), FTP (vsftpd), SSH, UFW, Postfix/Dovecot.
• SOR: Windows Server (AD, GPO, dsa.msc, gpmc.msc, PowerShell), Linux Server (chmod/chown, systemctl, LVM, fstab, cron).
• SI: AES/RSA, SSL/TLS (Certbot, openssl), iptables/UFW, nmap, Metasploit básico, WireGuard VPN, análisis de logs.
• AW: LAMP stack, WordPress, MariaDB/MySQL (GRANT ALL, FLUSH PRIVILEGES), Nginx reverse proxy, Composer, PHP-FPM.
• IPE2: Itinerario personal para la empleabilidad (contratos, nóminas, convenio TIC, PRL). NUNCA inglés profesional.
• Subnetting: /24=254h, /25=126h, /26=62h, /27=30h, /28=14h, /29=6h, /30=2h. Siempre incluye el comando ipcalc.
• Puertos clave: DNS 53/UDP, DHCP 67-68/UDP, HTTP 80, HTTPS 443, SSH 22, FTP 20/21, SMTP 25, POP3 110, IMAP 143, RDP 3389, MariaDB 3306, Samba 445.
• Ruleta Rusa: Duelo táctico con cartuchos reales🔥 y salvas⚪. Objetos: Multímetro (revela recámara), Crimpadora (doble daño), Inversor (invierte bala), Monster (+1 vida), Cable RJ45 (paraliza rival).
• Web versión actual: v2.9.0. Autores: JuanFe Ospina y David. Apertura oficial: 9 de noviembre 2026, 08:35.

ETIQUETAS PERMITIDAS (solo si son relevantes, al final del mensaje):
[ACTION:schedule] → si hablas de horario o clases
[ACTION:investments] → si hablas de la Bolsa del Botellón o monedas
[ACTION:chat] → si hablas del tablón o avisos
[ACTION:games] → si hablas de la Ruleta Rusa o juegos
[ACTION:changelog] → si hablas de novedades o versiones
[ACTION:faucet] → si el alumno necesita monedas
[ACTION:leaderboard] → si hablas del ranking
[CMD:comando_exacto] → si recomiendas un comando de terminal (ej: [CMD:sudo systemctl restart bind9])`.trim();

    // ── Historial compacto (hasta 4 mensajes previos para más contexto) ──────
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

    // ── Modelos en orden de preferencia (velocidad + calidad) ───────────────
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
            max_tokens: 140,
            temperature: 0.75,
            top_p: 0.9,
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        const rawReply = data.choices?.[0]?.message?.content?.trim();

        if (rawReply) {
          // Limpiar comillas externas y markdown innecesario
          const cleanReply = rawReply
            .replace(/^["""']|["""']$/g, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/^#+\s+/gm, '')
            .trim();
          return NextResponse.json({ reply: cleanReply, model });
        }
      } catch {}
    }

    // ── Fallback si todos los modelos fallan ─────────────────────────────────
    return NextResponse.json({
      reply: 'Se ha caído la conexión del Aula 204. Echa una Ruleta Rusa mientras vuelve. [ACTION:games]',
    });

  } catch (error: any) {
    console.error('Error en /api/ai/isaac:', error);
    return NextResponse.json(
      { reply: 'Se me ha reiniciado la bola. Vuelve a preguntar si tienes huevos.' },
      { status: 500 }
    );
  }
}
