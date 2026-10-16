import { Deadline, Resource, Quote, WallMessage, ScheduleClass, Profile } from './types';

export const INITIAL_USER: Profile = {
  id: 'demo-user-123',
  username: 'chaval_smr',
  full_name: 'Sysadmin en Prácticas',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=cablesmr2',
  rank: 'Admin de DHCP',
  karma_points: 340,
};

export const INITIAL_DEADLINES: Deadline[] = [
  {
    id: 'd-1',
    title: 'Práctica Servidor DNS BIND9 con Zona Inversa',
    subject: 'SR',
    due_date: '2026-10-18T10:00:00.000Z',
    panic_level: 'marron',
    description: 'Pide configurar dos zonas maestras en Debian, reenviadores a 1.1.1.1 y comprobación con dig y nslookup desde cliente Windows.',
    classroom: 'Aula 204 (Taller Redes)',
    creator_name: 'adri_debian',
  },
  {
    id: 'd-2',
    title: 'Examen de Active Directory: GPOs y Migración de Usuarios',
    subject: 'SOR',
    due_date: '2026-10-21T08:30:00.000Z',
    panic_level: 'f',
    description: 'Entra crear UOs por departamentos, aplicar políticas de bloqueo de panel de control y montar script logon con PowerShell.',
    classroom: 'Aula 204',
    creator_name: 'root_carlos',
  },
  {
    id: 'd-3',
    title: 'Laboratorio Firewall con iptables y DMZ',
    subject: 'SI',
    due_date: '2026-10-24T12:00:00.000Z',
    panic_level: 'marron',
    description: 'Montar topología en GNS3 o VirtualBox con 3 tarjetas de red en Debian: WAN, LAN y DMZ para servidor web Apache.',
    classroom: 'Taller 2',
    creator_name: 'laura_hack',
  },
  {
    id: 'd-4',
    title: 'Entrega Plan de Viabilidad y Nóminas (EIE)',
    subject: 'EIE',
    due_date: '2026-10-28T13:30:00.000Z',
    panic_level: 'medio',
    description: 'Subir el Excel con el cálculo de bases de cotización y retenciones IRPF del socio capitalista.',
    classroom: 'Aula Magna',
    creator_name: 'lucas_sl',
  },
  {
    id: 'd-5',
    title: 'Instalación Moodle sobre Nginx + PHP-FPM',
    subject: 'AW',
    due_date: '2026-11-02T11:00:00.000Z',
    panic_level: 'chill',
    description: 'Seguir la guía del PDF. Con tener la base de datos MariaDB creada y el virtualhost configurado se saca fácil.',
    classroom: 'Aula 204',
    creator_name: 'chaval_smr',
  },
];

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'r-1',
    title: 'Comandos salvavidas para reiniciar servicios de red en Linux',
    subject: 'SR',
    category: 'chuleta',
    description: 'Para cuando Bind9 o ISC-DHCP no levantan y no sabes qué has roto en la sintaxis.',
    command: 'sudo systemctl restart bind9 && sudo named-checkconf -z /etc/bind/named.conf.local',
    upvotes: 42,
    creator_name: 'root_carlos',
  },
  {
    id: 'r-2',
    title: 'Sacar usuarios y grupos de Active Directory por PowerShell en 1 línea',
    subject: 'SOR',
    category: 'script_ps',
    description: 'Te ahorra 20 minutos de clicks en la interfaz de Windows Server.',
    command: 'Get-ADUser -Filter * -Properties DisplayName,Department | Select DisplayName,Department | Out-GridView',
    upvotes: 38,
    creator_name: 'adri_debian',
  },
  {
    id: 'r-3',
    title: 'Resetear reglas de iptables y permitir solo SSH y tráfico establecido',
    subject: 'SI',
    category: 'chuleta',
    description: 'La chuleta de oro para cuando te quedas fuera del servidor por meter mal un DROP.',
    command: 'sudo iptables -F && sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT && sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT',
    upvotes: 61,
    creator_name: 'laura_hack',
  },
  {
    id: 'r-4',
    title: 'Apuntes completos resumen de Subnetting y VLSM para examen',
    subject: 'SR',
    category: 'apuntes',
    description: 'Tabla de máscaras de /24 a /30, cálculo de broadcast y saltos de red explicado para humanos.',
    link_url: 'https://docs.google.com',
    upvotes: 55,
    creator_name: 'marcos_ip',
  },
  {
    id: 'r-5',
    title: 'Script Bash para crear backups automáticos de /etc y www con fecha',
    subject: 'SOR',
    category: 'script_bash',
    description: 'Crea un tar.gz comprimido con timestamp listo para meter en el crontab de Linux.',
    command: 'tar -czvf /backup/sys_$(date +%Y%m%d_%H%M%S).tar.gz /etc /var/www/html',
    upvotes: 29,
    creator_name: 'chaval_smr',
  },
];

export const INITIAL_QUOTES: Quote[] = [
  {
    id: 'q-1',
    quote: 'Si veo a alguien más crimpar un cable directo con los colores de la bandera de España en vez de la norma B568, le pongo un 0 directo en la práctica.',
    teacher_name: 'Profe de Redes',
    subject: 'SR',
    context: 'Viendo a David intentar meter el cable gris en el conector RJ45 con tijeras de cocina.',
    date: '14 de Octubre',
    upvotes: 49,
    creator_name: 'adri_debian',
  },
  {
    id: 'q-2',
    quote: 'A ver los del fondo, dejad de jugar al Counter-Strike que la tarjeta de red del switch de clase está echando humo con el broadcast.',
    teacher_name: 'Profe de Sistemas',
    subject: 'SOR',
    context: 'En mitad de la explicación de cómo promocionar un controlador de dominio secundario.',
    date: '8 de Octubre',
    upvotes: 53,
    creator_name: 'laura_hack',
  },
  {
    id: 'q-3',
    quote: '¿Qué hacéis configurando la IP 192.168.1.1 en tres máquinas virtuales a la vez? Estáis haciendo un campeonato de colisiones.',
    teacher_name: 'Profe de Seguridad',
    subject: 'SI',
    context: 'Nadie tenía internet en el aula durante hora y media porque chocaban las IPs estáticas.',
    date: '2 de Octubre',
    upvotes: 37,
    creator_name: 'marcos_ip',
  },
  {
    id: 'q-4',
    quote: 'Chavales, en las prácticas de empresa (FCT) lo primero que os van a mandar es configurar una impresora compartida o cambiar un tóner. No os creáis hackers aún.',
    teacher_name: 'Tutor de FCT',
    subject: 'FCT',
    context: 'Charla motivacional antes de elegir empresa para el segundo trimestre.',
    date: '28 de Septiembre',
    upvotes: 68,
    creator_name: 'chaval_smr',
  },
];

export const INITIAL_WALL: WallMessage[] = [
  {
    id: 'w-1',
    author_name: 'adri_debian',
    author_rank: 'Root Supremo del Aula',
    content: 'Ojo chavales: el profe de Redes ha dicho que mañana revisa las carpetas compartidas de Samba. Que nadie tenga permisos 777 a lo loco.',
    tag: 'aviso',
    created_at: 'Hace 25 min',
  },
  {
    id: 'w-2',
    author_name: 'laura_hack',
    author_rank: 'Master de Active Directory',
    content: '¿Alguien tiene el conector RJ45 hembra que faltaba del patch panel del rack 3? Lo necesito para terminar el informe.',
    tag: 'duda',
    created_at: 'Hace 2 horas',
  },
  {
    id: 'w-3',
    author_name: 'marcos_ip',
    author_rank: 'Crimpador Novato',
    content: 'Acabo de meter una regla DROP en iptables sin meter el ACCEPT previo de SSH. Me he quedado sin máquina virtual en el servidor de clase. F.',
    tag: 'meme',
    created_at: 'Hace 4 horas',
  },
  {
    id: 'w-4',
    author_name: 'root_carlos',
    author_rank: 'Admin de DHCP',
    content: 'Gente, he subido al baúl el script de PowerShell para crear 50 usuarios de golpe con CSV. Usadlo para el examen del viernes.',
    tag: 'aviso',
    created_at: 'Ayer',
  },
];

export const WEEKLY_SCHEDULE: ScheduleClass[] = [
  // Lunes (1)
  { id: 'sch-1', dayOfWeek: 1, startHour: '08:30', endHour: '09:25', subject: 'SR', classroom: 'Aula 204', teacher: 'Profe Redes' },
  { id: 'sch-2', dayOfWeek: 1, startHour: '09:25', endHour: '10:20', subject: 'SR', classroom: 'Aula 204', teacher: 'Profe Redes' },
  { id: 'sch-3', dayOfWeek: 1, startHour: '10:20', endHour: '11:15', subject: 'SOR', classroom: 'Taller 2', teacher: 'Profe Sistemas' },
  // Recreo 11:15 - 11:45
  { id: 'sch-4', dayOfWeek: 1, startHour: '11:45', endHour: '12:40', subject: 'SOR', classroom: 'Taller 2', teacher: 'Profe Sistemas' },
  { id: 'sch-5', dayOfWeek: 1, startHour: '12:40', endHour: '13:35', subject: 'SI', classroom: 'Aula 204', teacher: 'Profe Seguridad' },
  { id: 'sch-6', dayOfWeek: 1, startHour: '13:35', endHour: '14:30', subject: 'EIE', classroom: 'Aula Magna', teacher: 'Profe Empresa' },

  // Martes (2)
  { id: 'sch-7', dayOfWeek: 2, startHour: '08:30', endHour: '10:20', subject: 'SOR', classroom: 'Taller 2', teacher: 'Profe Sistemas' },
  { id: 'sch-8', dayOfWeek: 2, startHour: '10:20', endHour: '11:15', subject: 'AW', classroom: 'Aula 204', teacher: 'Profe Web' },
  { id: 'sch-9', dayOfWeek: 2, startHour: '11:45', endHour: '13:35', subject: 'SR', classroom: 'Aula 204', teacher: 'Profe Redes' },
  { id: 'sch-10', dayOfWeek: 2, startHour: '13:35', endHour: '14:30', subject: 'SI', classroom: 'Aula 204', teacher: 'Profe Seguridad' },

  // Miércoles (3)
  { id: 'sch-11', dayOfWeek: 3, startHour: '08:30', endHour: '10:20', subject: 'SI', classroom: 'Taller 2', teacher: 'Profe Seguridad' },
  { id: 'sch-12', dayOfWeek: 3, startHour: '10:20', endHour: '11:15', subject: 'AW', classroom: 'Aula 204', teacher: 'Profe Web' },
  { id: 'sch-13', dayOfWeek: 3, startHour: '11:45', endHour: '13:35', subject: 'SOR', classroom: 'Taller 2', teacher: 'Profe Sistemas' },
  { id: 'sch-14', dayOfWeek: 3, startHour: '13:35', endHour: '14:30', subject: 'EIE', classroom: 'Aula Magna', teacher: 'Profe Empresa' },

  // Jueves (4)
  { id: 'sch-15', dayOfWeek: 4, startHour: '08:30', endHour: '10:20', subject: 'SR', classroom: 'Aula 204', teacher: 'Profe Redes' },
  { id: 'sch-16', dayOfWeek: 4, startHour: '10:20', endHour: '11:15', subject: 'SI', classroom: 'Aula 204', teacher: 'Profe Seguridad' },
  { id: 'sch-17', dayOfWeek: 4, startHour: '11:45', endHour: '13:35', subject: 'AW', classroom: 'Aula 204', teacher: 'Profe Web' },
  { id: 'sch-18', dayOfWeek: 4, startHour: '13:35', endHour: '14:30', subject: 'SOR', classroom: 'Taller 2', teacher: 'Profe Sistemas' },

  // Viernes (5)
  { id: 'sch-19', dayOfWeek: 5, startHour: '08:30', endHour: '10:20', subject: 'AW', classroom: 'Aula 204', teacher: 'Profe Web' },
  { id: 'sch-20', dayOfWeek: 5, startHour: '10:20', endHour: '11:15', subject: 'EIE', classroom: 'Aula Magna', teacher: 'Profe Empresa' },
  { id: 'sch-21', dayOfWeek: 5, startHour: '11:45', endHour: '13:35', subject: 'SR', classroom: 'Aula 204', teacher: 'Profe Redes' },
  { id: 'sch-22', dayOfWeek: 5, startHour: '13:35', endHour: '14:30', subject: 'FCT', classroom: 'Aula 204', teacher: 'Tutor FCT' },
];

export const CLASS_MATES_LIST = [
  'Adrián (Debian Boy)',
  'Carlos (Root)',
  'Laura (Wireshark)',
  'Marcos (IP estática)',
  'David (El de los cables)',
  'Lucía (PHP Hater)',
  'Javi (El del CS:GO)',
  'Sergio (DNS roto)',
  'Marta (Sysadmin)',
  'Pablo (El de las VMs)',
  'Álvaro (Powershell)',
  'Nerea (Packet Tracer)',
];
