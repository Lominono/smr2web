export type Language = 'es' | 'en';

export interface ProjectItem {
  id: string;
  index: string;
  title: string;
  tagline: string;
  desc: string;
  problem: string;
  role: string;
  tech: string[];
  github: string;
  demo: string | null;
  featured: boolean;
}

export interface SkillItem {
  name: string;
  level: string;
  variant: 'learning' | 'neutral' | 'active';
}

export interface CourseItem {
  platform: string;
  name: string;
  meta: string;
  status: 'planned' | 'inprogress' | 'completed';
  statusLabel: string;
  href: string;
}

export interface Translations {
  intro: {
    titleLine1: string;
    titleLine2: string;
    titleLine3: string;
    tagline: string;
    chooseLanguage: string;
    langEs: string;
    langEn: string;
    skip: string;
    enter: string;
  };
  nav: {
    presentation: string;
    skills: string;
    projects: string;
    training: string;
    documents: string;
    contact: string;
    replayIntro: string;
  };
  hero: {
    meta: string;
    nameFirst: string;
    nameLast: string;
    tagline: string;
    statement: string;
    availability: string;
    photoPlaceholder: string;
    photoNote: string;
    ctaProjects: string;
    ctaContact: string;
  };
  skills: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    hardHeading: string;
    softHeading: string;
    note: string;
    items: SkillItem[];
    softSkills: string[];
  };
  projects: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    repoLabel: string;
    problemLabel: string;
    roleLabel: string;
    techLabel: string;
    visitGithub: string;
    items: ProjectItem[];
    allReposNote: string;
  };
  training: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    currentBadge: string;
    currentTitle: string;
    currentCenter: string;
    currentDesc: string;
    subjectsTitle: string;
    subjects: string[];
    itineraryHeading: string;
    courses: CourseItem[];
  };
  documents: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    viewBtn: string;
    downloadBtn: string;
    pendingNote: string;
    skillsCv: {
      type: string;
      title: string;
      desc: string;
    };
    europassCv: {
      type: string;
      title: string;
      desc: string;
    };
  };
  contact: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    intro: string;
    availabilityNotice: string;
    copyEmail: string;
    copiedEmail: string;
    sendEmail: string;
    openProfile: string;
    locationLabel: string;
    locationValue: string;
  };
  footer: {
    academicNote: string;
    rights: string;
  };
}

export const translations: Record<Language, Translations> = {
  es: {
    intro: {
      titleLine1: 'JUAN FERNANDO',
      titleLine2: 'OSPINA',
      titleLine3: 'TIGREROS',
      tagline: 'Sistemas Microinformáticos y Redes · Santander, España',
      chooseLanguage: 'SELECCIONA TU IDIOMA',
      langEs: 'ESPAÑOL',
      langEn: 'ENGLISH',
      skip: 'Omitir intro →',
      enter: 'Entrar al portfolio →',
    },
    nav: {
      presentation: '01 Identidad',
      skills: '02 Competencias',
      projects: '03 Proyectos',
      training: '04 Formación',
      documents: '05 Documentación',
      contact: '06 Contacto',
      replayIntro: 'Ver intro',
    },
    hero: {
      meta: 'SMR · IES Augusto González de Linares · Santander',
      nameFirst: 'Juan Fernando',
      nameLast: 'Ospina Tigreros',
      tagline:
        'Tengo 18 años y me formo en Sistemas Microinformáticos y Redes. Desarrollador curioso, autodidacta y enfocado en construir herramientas reales: desde redes locales y sistemas operativos hasta plataformas web interactivas.',
      statement: 'Aprender construyendo. Cada proyecto nace de una necesidad real y de la inquietud por entender cómo funciona la tecnología por dentro.',
      availability: 'Disponible para prácticas formativas FCT · 2025–2026',
      photoPlaceholder: 'Espacio para Fotografía Profesional',
      photoNote: 'Guarda tu imagen en /public/foto-perfil.jpg',
      ctaProjects: 'Explorar proyectos',
      ctaContact: 'Contacto directo',
    },
    skills: {
      sectionNum: '02',
      sectionTitle: 'Competencias Técnicas y Personales',
      heading: 'Matriz de competencias',
      subheading:
        'Habilidades técnicas adquiridas en el ciclo de SMR y mediante proyectos personales autónomos. Los niveles se muestran con honestidad académica y sin autoevaluaciones arbitrarias.',
      hardHeading: 'Hard Skills — Sistemas, Redes y Software',
      softHeading: 'Soft Skills — Enfoque de trabajo',
      note:
        'Transparencia profesional: Ningún nivel se presenta como "experto" ni con porcentajes inventados. Las competencias reflejan la formación reglada en curso en SMR y el aprendizaje práctico mediante desarrollo de proyectos individuales.',
      items: [
        { name: 'Sistemas operativos Windows (Client & Server)', level: 'En formación reglada', variant: 'learning' },
        { name: 'Sistemas operativos Linux (Ubuntu, Debian, CLI)', level: 'En formación reglada', variant: 'learning' },
        { name: 'Administración básica de sistemas y usuarios', level: 'En formación reglada', variant: 'learning' },
        { name: 'Redes locales y arquitectura TCP/IP', level: 'En formación reglada', variant: 'learning' },
        { name: 'Direccionamiento IPv4 y Subnetting (VLSM)', level: 'En práctica activa', variant: 'learning' },
        { name: 'Configuración de VLANs y conmutación básica', level: 'En aprendizaje práctico', variant: 'learning' },
        { name: 'Virtualización (VirtualBox, VMware)', level: 'Uso habitual en laboratorio', variant: 'learning' },
        { name: 'Hardware, montaje y mantenimiento de equipos', level: 'En formación reglada', variant: 'learning' },
        { name: 'HTML5 semántico y CSS3 estructurado', level: 'Aplicado en proyectos', variant: 'active' },
        { name: 'JavaScript moderno (ES6+)', level: 'Aplicado en proyectos', variant: 'active' },
        { name: 'Control de versiones con Git y GitHub', level: 'Flujo de trabajo diario', variant: 'active' },
        { name: 'Bases de datos relacionales (Postgres / Supabase)', level: 'Básico en proyectos', variant: 'neutral' },
      ],
      softSkills: [
        'Iniciativa y aprendizaje autónomo',
        'Resolución analítica de problemas',
        'Organización y meticulosidad técnica',
        'Trabajo en equipo y comunicación',
        'Adaptabilidad a nuevas herramientas',
        'Gestión del tiempo y entregas',
      ],
    },
    projects: {
      sectionNum: '03',
      sectionTitle: 'Escaparate Técnico',
      heading: 'Proyectos destacados',
      subheading:
        'Proyectos reales desarrollados de forma personal. Cada uno responde a un desafío concreto, con código público inspeccionable en GitHub.',
      repoLabel: 'Repositorio',
      problemLabel: 'Desafío / Problema resuelto',
      roleLabel: 'Trabajo realizado',
      techLabel: 'Stack tecnológico',
      visitGithub: 'Ver código en GitHub →',
      items: [
        {
          id: 'salitre',
          index: '01',
          title: 'SALITRE (STDR_UNDERGROUND)',
          tagline: 'Plataforma social clandestina con economía interna y estética neo-brutalista portuaria',
          desc:
            'Plataforma social web inspirada en la cultura costera y portuaria de Santander. Incorpora el feed dinámico "La Marea", sistema de rangos (Polizón a Soberano), reputación comunitaria y una economía lúdica cerrada basada en "Anchoas". Rechaza las interfaces genéricas mediante un diseño con identidad gráfica propia.',
          problem:
            'Crear un espacio digital con identidad visual radicalmente opuesta a los clones de redes sociales comerciales, conectando con el humor local y mecánicas interactivas.',
          role:
            'Desarrollo 100% individual: arquitectura integral, maquetación gráfica editorial, integración de backend y animaciones de interfaz.',
          tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase (PostgreSQL)', 'GSAP'],
          github: 'https://github.com/Lominono/STDR_UNDERGROUND',
          demo: null,
          featured: true,
        },
        {
          id: 'smr2web',
          index: '02',
          title: 'Portal de Clase SMR2',
          tagline: 'Portal colaborativo y de horario lectivo en tiempo real para el aula de 2.º SMR',
          desc:
            'Herramienta web interactiva para los alumnos del ciclo de Sistemas Microinformáticos y Redes del IES Augusto González de Linares. Incluye calendario de sesiones, sistema de asistencia, avisos en tiempo real, tabla de posiciones académica y paneles de gestión interna del aula.',
          problem:
            'Eliminar la dispersión de información del aula facilitando una plataforma centralizada accesible desde dispositivos móviles y puestos del taller.',
          role:
            'Desarrollo frontend principal y arquitectura web, integrando la sincronización en tiempo real y la experiencia visual responsive.',
          tech: ['Next.js', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase Realtime', 'Web Push'],
          github: 'https://github.com/Lominono/smr2web',
          demo: null,
          featured: true,
        },
        {
          id: 'muudel',
          index: '03',
          title: 'muudel',
          tagline: 'Aplicación de asistencia, rachas de clase y recompensas inspirada en Apple HIG',
          desc:
            'Sistema web orientado a dinamizar la rutina del aula: registro de asistencia puntual, cálculo automático de rachas consecutivas, canje de recompensas y chat entre compañeros bajo una estética sobria y minimalista.',
          problem:
            'Fomentar la puntualidad y el compromiso de los compañeros de forma lúdica y con una interfaz limpia que no distraiga.',
          role:
            'Proyecto concebido y programado individualmente desde el diseño del esquema de base de datos SQL (`database.sql`) hasta los componentes cliente en React.',
          tech: ['Vite', 'React', 'Tailwind CSS', 'Express', 'Supabase (PostgreSQL)'],
          github: 'https://github.com/lominono/muudel',
          demo: null,
          featured: false,
        },
        {
          id: 'jfdelegado',
          index: '04',
          title: 'JUANFE DELEGADO',
          tagline: 'Web de campaña para la delegación de clase con estética fanzine y base de datos en tiempo real',
          desc:
            'Aplicación web interactiva creada para la campaña de elección a delegado de clase. Diseño visual fanzine / Neo-Brutalista con adhesivos rotados, votaciones interactivas y comunicación en vivo con Firebase.',
          problem:
            'Presentar propuestas académicas y de aula de una forma cercana, original y transparente que captase la atención de toda la clase.',
          role:
            'Desarrollo íntegro individual de diseño visual, lógica en Vanilla JavaScript y sincronización con Firebase Realtime Database.',
          tech: ['HTML5 Semántico', 'CSS3 Neo-Brutalist', 'JavaScript Vanilla', 'Firebase Realtime'],
          github: 'https://github.com/Lominono/JFDELEGADO',
          demo: null,
          featured: false,
        },
      ],
      allReposNote: 'Puedes consultar todos mis repositorios y commits públicos directamente en',
    },
    training: {
      sectionNum: '04',
      sectionTitle: 'Formación y Crecimiento',
      heading: 'Trayectoria y aprendizaje futuro',
      subheading:
        'Mi base formal en informática se construye en el IES Augusto González de Linares, complementada con un itinerario autodidacta de cursos MOOC y plataformas especializadas.',
      currentBadge: 'Formación Oficial · En curso',
      currentTitle: 'Técnico en Sistemas Microinformáticos y Redes (SMR)',
      currentCenter: 'IES Augusto González de Linares · Santander, Cantabria',
      currentDesc:
        'Ciclo Formativo de Grado Medio centrado en el montaje, reparación y mantenimiento de sistemas microinformáticos, despliegue de redes locales, configuración de servidores Windows y Linux, seguridad informática básica y aplicaciones web.',
      subjectsTitle: 'Módulos troncales trabajados:',
      subjects: [
        'Redes Locales (cableado, conmutación, direccionamiento)',
        'Sistemas Operativos Monopuesto (Windows y Linux CLI/GUI)',
        'Sistemas Operativos en Red (administración de dominios y servicios)',
        'Montaje y Mantenimiento de Equipos (hardware y diagnósticos)',
        'Aplicaciones Web (despliegue de gestores de contenidos y servidores web)',
        'Seguridad Informática (políticas, copias de seguridad y cortafuegos)',
        'IPE II (Itinerario Personal para la Empleabilidad)',
      ],
      itineraryHeading: 'Itinerario de formación complementaria previsto (MOOCs)',
      courses: [
        {
          platform: 'Cisco Networking Academy',
          name: 'CCNA: Introduction to Networks (ITN)',
          meta: 'Protocolos de red, modelos OSI/TCP-IP, IPv4/IPv6, switches y routers',
          status: 'planned',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.netacad.com/courses/networking/ccna-introduction-networks',
        },
        {
          platform: 'freeCodeCamp',
          name: 'Responsive Web Design Certification',
          meta: 'HTML5 semántico, CSS Flexbox, Grid, accesibilidad web y diseño adaptable',
          status: 'planned',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
        },
        {
          platform: 'Microsoft Learn',
          name: 'Microsoft Azure Fundamentals (AZ-900)',
          meta: 'Conceptos de nube, servicios principales de Azure, seguridad y gobernanza',
          status: 'planned',
          statusLabel: 'Previsto en itinerario',
          href: 'https://learn.microsoft.com/es-es/training/paths/az-900-describe-cloud-concepts/',
        },
        {
          platform: 'Google Cloud Skills Boost',
          name: 'Cloud Computing Fundamentals',
          meta: 'Infraestructura en la nube, máquinas virtuales, almacenamiento y redes',
          status: 'planned',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.cloudskillsboost.google/paths/36',
        },
        {
          platform: 'Coursera / Google',
          name: 'Google IT Support Professional Certificate',
          meta: 'Soporte técnico, administración de sistemas Linux, seguridad y redes',
          status: 'planned',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.coursera.org/professional-certificates/google-it-support',
        },
      ],
    },
    documents: {
      sectionNum: '05',
      sectionTitle: 'Documentación Profesional',
      heading: 'Documentos de empleabilidad',
      subheading:
        'Archivos curriculares preparados para su visualización y descarga directa en formato PDF. Desarrollados para procesos de selección y plazas de Formación en Centros de Trabajo (FCT).',
      viewBtn: 'Ver en navegador',
      downloadBtn: 'Descargar PDF',
      pendingNote: 'Ruta configurada en /public/docs/ — documento en fase de incorporación.',
      skillsCv: {
        type: 'Currículum Funcional',
        title: 'CV de Habilidades y Competencias',
        desc:
          'Documento adaptado que pone en primer plano las competencias prácticas de soporte informático, redes, montaje de hardware y desarrollo web, ideal para valorar potencial técnico e iniciativa.',
      },
      europassCv: {
        type: 'Estándar Europeo',
        title: 'Currículum Vitae Europass',
        desc:
          'Estructura curricular estandarizada para el marco laboral europeo, que detalla la formación oficial en SMR, idiomas y competencias personales según las directrices de la Unión Europea.',
      },
    },
    contact: {
      sectionNum: '06',
      sectionTitle: 'Contacto y Redes',
      heading: 'Iniciemos una conversación',
      intro:
        'Si estás interesado en mi perfil para prácticas formativas de SMR, quieres consultar detalles sobre mis proyectos personales o te gustaría conversar sobre tecnología, estaré encantado de responderte.',
      availabilityNotice: 'Resido en Santander, Cantabria, con disponibilidad para incorporación a prácticas formativas.',
      copyEmail: 'Copiar dirección de correo',
      copiedEmail: '¡Copiado en el portapapeles!',
      sendEmail: 'Enviar correo electrónico',
      openProfile: 'Abrir perfil externo',
      locationLabel: 'Ubicación',
      locationValue: 'Santander, Cantabria, España',
    },
    footer: {
      academicNote: 'Portafolio académico y profesional · Módulo IPE II · Ciclo SMR · IES Augusto González de Linares',
      rights: 'Diseño editorial y desarrollo autónomo. Código abierto en GitHub.',
    },
  },
  en: {
    intro: {
      titleLine1: 'JUAN FERNANDO',
      titleLine2: 'OSPINA',
      titleLine3: 'TIGREROS',
      tagline: 'Microcomputer Systems and Networks · Santander, Spain',
      chooseLanguage: 'SELECT YOUR LANGUAGE',
      langEs: 'ESPAÑOL',
      langEn: 'ENGLISH',
      skip: 'Skip intro →',
      enter: 'Enter portfolio →',
    },
    nav: {
      presentation: '01 Identity',
      skills: '02 Competencies',
      projects: '03 Projects',
      training: '04 Education',
      documents: '05 Documents',
      contact: '06 Contact',
      replayIntro: 'Watch intro',
    },
    hero: {
      meta: 'SMR · IES Augusto González de Linares · Santander, Spain',
      nameFirst: 'Juan Fernando',
      nameLast: 'Ospina Tigreros',
      tagline:
        'I am 18 years old studying Microcomputer Systems and Networks. A curious, self-driven developer passionate about building tangible tools: from local networks and OS configuration to full-stack interactive web apps.',
      statement: 'Learn by building. Every project originates from a genuine problem and the curiosity to master how technology works under the hood.',
      availability: 'Available for internship placement (FCT) · 2025–2026',
      photoPlaceholder: 'Professional Portrait Slot',
      photoNote: 'Save your photo in /public/foto-perfil.jpg',
      ctaProjects: 'View projects',
      ctaContact: 'Get in touch',
    },
    skills: {
      sectionNum: '02',
      sectionTitle: 'Technical & Interpersonal Competencies',
      heading: 'Skills matrix',
      subheading:
        'Technical capabilities acquired through formal vocational training in SMR and autonomous personal project development. Levels are presented with academic honesty and zero inflated ratings.',
      hardHeading: 'Hard Skills — Systems, Networking & Software',
      softHeading: 'Soft Skills — Working Approach',
      note:
        'Professional integrity note: No competency is presented as "expert" nor measured with arbitrary percentages. These skills represent current vocational coursework in SMR and hands-on learning through individual coding projects.',
      items: [
        { name: 'Windows Operating Systems (Client & Server)', level: 'In formal training', variant: 'learning' },
        { name: 'Linux Operating Systems (Ubuntu, Debian, CLI)', level: 'In formal training', variant: 'learning' },
        { name: 'Basic System & User Administration', level: 'In formal training', variant: 'learning' },
        { name: 'Local Area Networks & TCP/IP Architecture', level: 'In formal training', variant: 'learning' },
        { name: 'IPv4 Addressing & Subnetting (VLSM)', level: 'Active laboratory practice', variant: 'learning' },
        { name: 'VLAN Configuration & Basic Switching', level: 'In practical learning', variant: 'learning' },
        { name: 'Virtualization (VirtualBox, VMware Workstation)', level: 'Regular laboratory usage', variant: 'learning' },
        { name: 'Computer Hardware, Assembly & Maintenance', level: 'In formal training', variant: 'learning' },
        { name: 'Semantic HTML5 & Structured CSS3', level: 'Applied across projects', variant: 'active' },
        { name: 'Modern JavaScript (ES6+)', level: 'Applied across projects', variant: 'active' },
        { name: 'Version Control with Git & GitHub', level: 'Daily workflow standard', variant: 'active' },
        { name: 'Relational Databases (Postgres / Supabase)', level: 'Basic usage in projects', variant: 'neutral' },
      ],
      softSkills: [
        'Proactive self-guided learning',
        'Analytical problem solving',
        'Technical organization & precision',
        'Collaborative teamwork & communication',
        'Adaptability to emerging toolchains',
        'Reliable time management & delivery',
      ],
    },
    projects: {
      sectionNum: '03',
      sectionTitle: 'Technical Showcase',
      heading: 'Featured projects',
      subheading:
        'Real software applications built entirely by myself. Each responds to a practical challenge, with open source code available on GitHub.',
      repoLabel: 'Repository',
      problemLabel: 'Challenge / Problem solved',
      roleLabel: 'Individual contribution',
      techLabel: 'Technology stack',
      visitGithub: 'View source on GitHub →',
      items: [
        {
          id: 'salitre',
          index: '01',
          title: 'SALITRE (STDR_UNDERGROUND)',
          tagline: 'Underground social platform featuring an internal economy and coastal neo-brutalist aesthetics',
          desc:
            'A social web application inspired by the maritime culture of Santander port. Features the live feed "La Marea", a gamified progression hierarchy (Stowaway to Sovereign), community standing, and a closed internal economy based on "Anchovies". Deliberately breaks free from corporate SaaS cliches with a bespoke editorial visual identity.',
          problem:
            'Crafting an authentic digital space diametrically opposed to generic social media clones, pairing local satire with real-time interactive game mechanics.',
          role:
            '100% individual project: full-stack architecture, neo-brutalist graphic design, database integration, and UI micro-interactions.',
          tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase (PostgreSQL)', 'GSAP'],
          github: 'https://github.com/Lominono/STDR_UNDERGROUND',
          demo: null,
          featured: true,
        },
        {
          id: 'smr2web',
          index: '02',
          title: 'SMR2 Class Portal',
          tagline: 'Collaborative real-time timetable and classroom hub for 2nd-year SMR students',
          desc:
            'An interactive web platform built for students of the Microcomputer Systems and Networks program at IES Augusto González de Linares. Features interactive weekly class schedules, attendance tracking, live classroom announcements, academic leaderboards, and administrative tools.',
          problem:
            'Eliminating fragmented classroom communications by delivering a unified, mobile-optimized hub accessible directly from laboratory workstations.',
          role:
            'Lead frontend developer and co-architect, implementing real-time data synchronization and an accessible responsive experience.',
          tech: ['Next.js', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase Realtime', 'Web Push'],
          github: 'https://github.com/Lominono/smr2web',
          demo: null,
          featured: true,
        },
        {
          id: 'muudel',
          index: '03',
          title: 'muudel',
          tagline: 'Classroom attendance, streak tracking, and rewards application with Apple HIG design',
          desc:
            'A focused web app engineered to gamify daily attendance: timestamped check-in, consecutive day streak computations, reward redemption, and classmate messaging under a clean, sober design language.',
          problem:
            'Encouraging punctuality and classroom engagement through subtle gamification wrapped in an unobtrusive, distraction-free interface.',
          role:
            'Individually conceived and programmed from the PostgreSQL database schema (`database.sql`) to Express APIs and client React components.',
          tech: ['Vite', 'React', 'Tailwind CSS', 'Express', 'Supabase (PostgreSQL)'],
          github: 'https://github.com/lominono/muudel',
          demo: null,
          featured: false,
        },
        {
          id: 'jfdelegado',
          index: '04',
          title: 'JUANFE DELEGADO',
          tagline: 'Class delegate election campaign web app featuring fanzine visuals and real-time polling',
          desc:
            'An interactive single-page app built for my student representative campaign. Features a physical fanzine / Neo-Brutalist graphic identity, sticker interactions, live polling, and instant feedback powered by Firebase.',
          problem:
            'Presenting student union proposals in an engaging, honest, and high-impact format that earned the direct attention of classmates.',
          role:
            'Full personal execution: graphic layout, tactile animations, Vanilla JavaScript state handling, and Firebase Realtime Database setup.',
          tech: ['Semantic HTML5', 'Neo-Brutalist CSS3', 'Vanilla JavaScript', 'Firebase Realtime'],
          github: 'https://github.com/Lominono/JFDELEGADO',
          demo: null,
          featured: false,
        },
      ],
      allReposNote: 'You can inspect all my public repositories, branches and commits at',
    },
    training: {
      sectionNum: '04',
      sectionTitle: 'Education & Growth',
      heading: 'Academic journey and upcoming roadmap',
      subheading:
        'My foundational IT background is grounded in the SMR vocational program at IES Augusto González de Linares, augmented by a self-directed curriculum of MOOCs and specialized platforms.',
      currentBadge: 'Official Vocational Degree · In Progress',
      currentTitle: 'Technician in Microcomputer Systems and Networks (SMR)',
      currentCenter: 'IES Augusto González de Linares · Santander, Cantabria, Spain',
      currentDesc:
        'Official Spanish intermediate vocational degree (EQF Level 4) focused on computer assembly, hardware troubleshooting, local network design and cabling, Windows and Linux server administration, network security practices, and web services.',
      subjectsTitle: 'Core curriculum modules completed / in progress:',
      subjects: [
        'Local Area Networks (Cabling, Switching, Subnetting, Routing)',
        'Standalone Operating Systems (Windows & Linux CLI/GUI)',
        'Networked Operating Systems (Active Directory, Domains & Services)',
        'Hardware Assembly and Maintenance (Diagnostics, Components, Repair)',
        'Web Applications (CMS deployment, LAMP stack, Web servers)',
        'Computer Security (Firewalls, Antivirus policies, Backup strategies)',
        'Personal Itinerary for Employability (IPE II)',
      ],
      itineraryHeading: 'Planned complementary MOOC training roadmap',
      courses: [
        {
          platform: 'Cisco Networking Academy',
          name: 'CCNA: Introduction to Networks (ITN)',
          meta: 'Network protocols, OSI/TCP-IP models, IPv4/IPv6, switches and routers',
          status: 'planned',
          statusLabel: 'Planned in itinerary',
          href: 'https://www.netacad.com/courses/networking/ccna-introduction-networks',
        },
        {
          platform: 'freeCodeCamp',
          name: 'Responsive Web Design Certification',
          meta: 'Semantic HTML5, CSS Flexbox, CSS Grid, web accessibility, and fluid layouts',
          status: 'planned',
          statusLabel: 'Planned in itinerary',
          href: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
        },
        {
          platform: 'Microsoft Learn',
          name: 'Microsoft Azure Fundamentals (AZ-900)',
          meta: 'Cloud computing models, core Azure architectural services, security, and governance',
          status: 'planned',
          statusLabel: 'Planned in itinerary',
          href: 'https://learn.microsoft.com/es-es/training/paths/az-900-describe-cloud-concepts/',
        },
        {
          platform: 'Google Cloud Skills Boost',
          name: 'Cloud Computing Fundamentals',
          meta: 'Cloud infrastructure, virtual machine orchestration, storage, and VPC networks',
          status: 'planned',
          statusLabel: 'Planned in itinerary',
          href: 'https://www.cloudskillsboost.google/paths/36',
        },
        {
          platform: 'Coursera / Google',
          name: 'Google IT Support Professional Certificate',
          meta: 'Hardware troubleshooting, Linux system administration, customer support, and networking',
          status: 'planned',
          statusLabel: 'Planned in itinerary',
          href: 'https://www.coursera.org/professional-certificates/google-it-support',
        },
      ],
    },
    documents: {
      sectionNum: '05',
      sectionTitle: 'Professional Documents',
      heading: 'Employability documents',
      subheading:
        'Curricular documents prepared for online viewing and instant PDF download. Designed specifically for technical internship opportunities and job applications.',
      viewBtn: 'Open in browser',
      downloadBtn: 'Download PDF',
      pendingNote: 'Configured at /public/docs/ — document awaiting final upload.',
      skillsCv: {
        type: 'Functional Resume',
        title: 'Skills & Competencies Resume',
        desc:
          'A competency-focused resume accentuating hands-on technical skills in IT support, network configuration, hardware assembly, and web development, ideal for evaluating practical capability and initiative.',
      },
      europassCv: {
        type: 'European Standard',
        title: 'Europass Curriculum Vitae',
        desc:
          'Standardized European CV template detailing official vocational education in SMR, language proficiencies, and organizational competences aligned with European Union employment portals.',
      },
    },
    contact: {
      sectionNum: '06',
      sectionTitle: 'Contact & Network',
      heading: "Let's connect",
      intro:
        'Whether you are considering my profile for an internship in IT systems or networking, want to discuss my personal software projects, or share technical thoughts, I look forward to hearing from you.',
      availabilityNotice: 'Based in Santander, Cantabria, Spain — with full availability for vocational internship placement.',
      copyEmail: 'Copy email address',
      copiedEmail: 'Copied to clipboard!',
      sendEmail: 'Send an email',
      openProfile: 'Open external profile',
      locationLabel: 'Location',
      locationValue: 'Santander, Cantabria, Spain',
    },
    footer: {
      academicNote: 'Academic & Professional Portfolio · IPE II Module · SMR Vocational Program · IES Augusto González de Linares',
      rights: 'Editorial design & autonomous code. Open source on GitHub.',
    },
  },
};
