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
  image: string;
  github: string;
  demo: string | null;
  layoutVariant: 'featured-horizontal' | 'split-vertical' | 'editorial-dense';
}

export interface SkillCategory {
  title: string;
  description: string;
  skills: {
    name: string;
    application: string;
    status: 'learning' | 'applied' | 'lab';
  }[];
}

export interface CourseItem {
  platform: string;
  name: string;
  meta: string;
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
    eyebrow: string;
    nameFirst: string;
    nameLast: string;
    ageLocation: string;
    bio: string;
    quote: string;
    availability: string;
    ctaProjects: string;
    ctaContact: string;
    photoCaption: string;
  };
  skills: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    transparencyNote: string;
    categories: SkillCategory[];
    softTitle: string;
    softDesc: string;
    softItems: {
      title: string;
      desc: string;
    }[];
  };
  projects: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    viewCode: string;
    viewDemo: string;
    problemLabel: string;
    solutionLabel: string;
    roleLabel: string;
    techLabel: string;
    items: ProjectItem[];
    githubArchive: string;
  };
  training: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    officialBadge: string;
    officialTitle: string;
    officialCenter: string;
    officialDesc: string;
    officialModulesTitle: string;
    officialModules: string[];
    itineraryHeading: string;
    itineraryDesc: string;
    courses: CourseItem[];
  };
  documents: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    subheading: string;
    pendingBadge: string;
    skillsCv: {
      title: string;
      desc: string;
      status: string;
    };
    europassCv: {
      title: string;
      desc: string;
      status: string;
    };
  };
  contact: {
    sectionNum: string;
    sectionTitle: string;
    heading: string;
    intro: string;
    emailLabel: string;
    copyBtn: string;
    copiedBtn: string;
    directSend: string;
    channelsTitle: string;
    locationLabel: string;
    locationValue: string;
  };
  footer: {
    academic: string;
    standards: string;
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
      langEs: 'Español',
      langEn: 'English',
      skip: 'Omitir intro →',
      enter: 'Entrar al portfolio →',
    },
    nav: {
      presentation: 'Identidad',
      skills: 'Competencias',
      projects: 'Proyectos',
      training: 'Formación',
      documents: 'Documentos',
      contact: 'Contacto',
      replayIntro: 'Ver intro',
    },
    hero: {
      eyebrow: 'Estudiante de Sistemas Microinformáticos y Redes · Santander',
      nameFirst: 'Juan Fernando',
      nameLast: 'Ospina Tigreros',
      ageLocation: '18 años · Santander, Cantabria, España',
      bio: 'Me formo en Sistemas Microinformáticos y Redes (SMR) en el IES Augusto González de Linares. Tengo un interés genuino por la tecnología, las redes y el desarrollo de software. Aprendo de manera autónoma y me motiva construir proyectos reales desde cero, abordando desde la infraestructura y sistemas hasta aplicaciones web completas.',
      quote: 'Aprender construyendo. Cada proyecto nace de una necesidad práctica y del interés por comprender cómo funciona la informática por dentro.',
      availability: 'Disponible para prácticas formativas FCT · Periodo 2025–2026',
      ctaProjects: 'Ver proyectos',
      ctaContact: 'Contactar',
      photoCaption: 'Fotografía profesional · Santander, 2026',
    },
    skills: {
      sectionNum: '02',
      sectionTitle: 'Competencias',
      heading: 'Conocimientos y herramientas',
      subheading:
        'Habilidades técnicas adquiridas a través del ciclo oficial de SMR y reforzadas mediante proyectos personales individuales. Sin porcentajes arbitrarios ni autoevaluaciones infladas.',
      transparencyNote:
        'Transparencia profesional: Ningún nivel se presenta como "experto". Todos los conocimientos reflejan la formación reglada en curso y la resolución de problemas técnicos reales en proyectos propios.',
      categories: [
        {
          title: 'Sistemas Operativos',
          description: 'Administración, configuración y mantenimiento en clientes y servidores.',
          skills: [
            { name: 'Linux (Ubuntu, Debian)', application: 'Uso de terminal CLI, gestión de paquetes, permisos y servicios.', status: 'lab' },
            { name: 'Windows Server', application: 'Configuración básica de usuarios, directivas y roles de servidor.', status: 'learning' },
            { name: 'Windows 10/11 Pro', application: 'Instalación, soporte técnico, particionado y optimización.', status: 'applied' },
            { name: 'Virtualización', application: 'Creación y gestión de entornos aislados con VirtualBox y VMware.', status: 'lab' },
          ],
        },
        {
          title: 'Redes y Comunicaciones',
          description: 'Topologías físicas y lógicas, direccionamiento y protocolos esenciales.',
          skills: [
            { name: 'Arquitectura TCP/IP', application: 'Modelos OSI y TCP/IP, análisis de tráfico y resolución de problemas.', status: 'learning' },
            { name: 'Direccionamiento IPv4 y Subnetting', application: 'Cálculo de máscaras, división en subredes fijas y variables (VLSM).', status: 'applied' },
            { name: 'Conmutación y VLANs', application: 'Segmentación de redes locales y configuración básica en switches.', status: 'learning' },
            { name: 'Cableado y Hardware de Red', application: 'Crimpadora RJ-45, comprobación de latiguillos y paneles de parcheo.', status: 'lab' },
          ],
        },
        {
          title: 'Desarrollo de Software y Web',
          description: 'Construcción autónoma de interfaces web interactivas y lógica de servidor.',
          skills: [
            { name: 'JavaScript moderno (ES6+)', application: 'Lógica asíncrona, manipulación de DOM y gestión de estado.', status: 'applied' },
            { name: 'HTML5 y CSS3 semántico', application: 'Maquetación responsive con Flexbox, CSS Grid y accesibilidad básica.', status: 'applied' },
            { name: 'React y Next.js', application: 'Desarrollo de aplicaciones completas con Server y Client Components.', status: 'applied' },
            { name: 'Bases de Datos Relacionales', application: 'Esquemas SQL, consultas y sincronización en tiempo real con Supabase.', status: 'applied' },
          ],
        },
        {
          title: 'Hardware y Entorno de Trabajo',
          description: 'Montaje físico, diagnóstico de componentes y herramientas de desarrollo.',
          skills: [
            { name: 'Montaje y Mantenimiento PC', application: 'Ensamblaje de componentes, diagnosis de fallos de hardware y sustitución.', status: 'lab' },
            { name: 'Control de Versiones (Git/GitHub)', application: 'Flujo diario con commits atómicos, ramas y repositorios remotos.', status: 'applied' },
            { name: 'Seguridad Informática básica', application: 'Políticas de contraseñas, cortafuegos y copias de seguridad.', status: 'learning' },
          ],
        },
      ],
      softTitle: 'Enfoque personal de trabajo',
      softDesc: 'Forma de afrontar los desafíos técnicos y la colaboración.',
      softItems: [
        {
          title: 'Iniciativa y aprendizaje autónomo',
          desc: 'Capacidad demostrada para investigar documentación técnica oficial y aprender tecnologías nuevas por cuenta propia.',
        },
        {
          title: 'Resolución metódica de problemas',
          desc: 'Hábito de descomponer averías o errores de software paso a paso para identificar la causa raíz sin precipitarse.',
        },
        {
          title: 'Cuidado por el detalle',
          desc: 'Interés por entregar trabajos bien acabados, con interfaces limpias, código legible y sin añadidos innecesarios.',
        },
        {
          title: 'Comunicación y compañerismo',
          desc: 'Disposición constructiva para colaborar en el taller, compartir conocimientos y escuchar aportaciones.',
        },
      ],
    },
    projects: {
      sectionNum: '03',
      sectionTitle: 'Proyectos',
      heading: 'Trabajos seleccionados',
      subheading:
        'Cuatro proyectos reales desarrollados de forma personal. Cada uno con código público disponible en GitHub, sin trabajos ficticios ni colaboraciones inventadas.',
      viewCode: 'Ver repositorio en GitHub',
      viewDemo: 'Ver demostración',
      problemLabel: 'Qué resuelve',
      solutionLabel: 'Enfoque técnico',
      roleLabel: 'Desarrollo personal',
      techLabel: 'Tecnologías utilizadas',
      items: [
        {
          id: 'salitre',
          index: '01',
          title: 'SALITRE',
          tagline: 'Plataforma social clandestina con economía lúdica y estética neo-brutalista portuaria',
          desc: 'Plataforma web con identidad gráfica basada en el puerto y la noche de Santander. Dispone del feed dinámico "La Marea", progresión de rangos (Polizón a Soberano), reputación comunitaria y una economía cerrada de 30.000 "Anchoas". Rompe deliberadamente con los patrones clónicos de redes comerciales.',
          problem: 'Crear un espacio digital que conecte con el humor local y la cultura cántabra a través de mecánicas de interacción lúdica y un diseño con fuerte personalidad visual.',
          role: 'Proyecto concebido y desarrollado 100% individualmente: arquitectura integral, diseño visual editorial, base de datos Postgres en Supabase y animaciones con GSAP.',
          tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase (PostgreSQL)', 'GSAP'],
          image: '/projects/salitre.png',
          github: 'https://github.com/Lominono/STDR_UNDERGROUND',
          demo: null,
          layoutVariant: 'featured-horizontal',
        },
        {
          id: 'smr2web',
          index: '02',
          title: 'Portal de Clase SMR2',
          tagline: 'Herramienta colaborativa y horario lectivo interactivo para el aula de 2.º SMR',
          desc: 'Portal web diseñado para el alumnado de Sistemas Microinformáticos y Redes del IES Augusto González de Linares. Centraliza el horario de sesiones de clase, avisos de exámenes, asistencias y herramientas internas accesibles tanto desde móviles como desde los puestos del taller.',
          problem: 'Evitar la dispersión de información del curso y proporcionar un punto de acceso unificado al ritmo de la clase.',
          role: 'Desarrollo frontend principal y diseño de la experiencia de usuario, integrando sincronización en tiempo real y notificaciones Push.',
          tech: ['Next.js', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase Realtime', 'Web Push'],
          image: '/projects/smr2.png',
          github: 'https://github.com/Lominono/smr2web',
          demo: null,
          layoutVariant: 'split-vertical',
        },
        {
          id: 'muudel',
          index: '03',
          title: 'muudel',
          tagline: 'Aplicación de asistencia de clase y canje de recompensas inspirada en Apple HIG',
          desc: 'Aplicación orientada a dinamizar la rutina del aula con registro de asistencia con control horario, cálculo automático de rachas consecutivas, canje de recompensas simbólicas y chat entre compañeros bajo una estética sobria y minimalista.',
          problem: 'Promover la puntualidad y el compromiso de los compañeros mediante dinámicas positivas en una interfaz sin elementos de distracción.',
          role: 'Diseñado e implementado individualmente desde el esquema relacional (`database.sql`) hasta la API en Express y la interfaz de usuario en React.',
          tech: ['Vite', 'React', 'Tailwind CSS', 'Express', 'Supabase (PostgreSQL)'],
          image: '/projects/muudel.png',
          github: 'https://github.com/lominono/muudel',
          demo: null,
          layoutVariant: 'split-vertical',
        },
        {
          id: 'jfdelegado',
          index: '04',
          title: 'JUANFE DELEGADO',
          tagline: 'Web interactiva de campaña electoral escolar con diseño fanzine y votaciones en vivo',
          desc: 'Aplicación web creada para presentar la candidatura a delegado de clase de forma transparente, directa y participativa, con sistema de votaciones interactivas y comunicación en tiempo real respaldada por Firebase.',
          problem: 'Acercar las propuestas de la candidatura a todos los compañeros mediante un formato cercano y participativo.',
          role: 'Desarrollo íntegro individual: diseño gráfico tipo fanzine / Neo-Brutalista, programación en Vanilla JavaScript y sincronización con Firebase Realtime Database.',
          tech: ['HTML5 Semántico', 'CSS3 Neo-Brutalist', 'Vanilla JavaScript', 'Firebase Realtime'],
          image: '/projects/jfdelegado.jpg',
          github: 'https://github.com/Lominono/JFDELEGADO',
          demo: null,
          layoutVariant: 'editorial-dense',
        },
      ],
      githubArchive: 'Ver todos los repositorios y código fuente en',
    },
    training: {
      sectionNum: '04',
      sectionTitle: 'Formación',
      heading: 'Itinerario de formación técnica',
      subheading:
        'Base oficial en el IES Augusto González de Linares complementada con un itinerario autodidacta planificado para seguir ampliando competencias.',
      officialBadge: 'Formación Oficial Reglada · En curso',
      officialTitle: 'Técnico en Sistemas Microinformáticos y Redes (SMR)',
      officialCenter: 'IES Augusto González de Linares · Santander, Cantabria',
      officialDesc:
        'Ciclo Formativo de Grado Medio orientado a la instalación, configuración y mantenimiento de sistemas informáticos aislados o en red, canalizaciones y cableado de datos, servidores Windows y Linux, y aplicaciones web.',
      officialModulesTitle: 'Módulos troncales en estudio:',
      officialModules: [
        'Redes Locales (Montaje físico, direccionamiento IP y conmutación)',
        'Sistemas Operativos Monopuesto (Windows y Linux)',
        'Sistemas Operativos en Red (Servidores, dominios y servicios de red)',
        'Montaje y Mantenimiento de Equipos (Hardware, componentes y diagnóstico)',
        'Aplicaciones Web (Servidores web, CMS y gestores de contenidos)',
        'Seguridad Informática (Copias de seguridad, antivirus y cortafuegos)',
        'Itinerario Personal para la Empleabilidad (IPE II)',
      ],
      itineraryHeading: 'Itinerario de formación complementaria previsto (MOOCs)',
      itineraryDesc:
        'Cursos técnicos planificados para complementar la formación reglada. Ninguno de ellos se presenta como certificado completado.',
      courses: [
        {
          platform: 'Cisco Networking Academy',
          name: 'CCNA: Introduction to Networks (ITN)',
          meta: 'Protocolos de red, modelos OSI/TCP-IP, IPv4/IPv6, switches y routers.',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.netacad.com/courses/networking/ccna-introduction-networks',
        },
        {
          platform: 'freeCodeCamp',
          name: 'Responsive Web Design Certification',
          meta: 'HTML5 semántico, CSS Flexbox, CSS Grid y accesibilidad web.',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
        },
        {
          platform: 'Microsoft Learn',
          name: 'Microsoft Azure Fundamentals (AZ-900)',
          meta: 'Conceptos de nube, servicios principales de Azure, seguridad y gobernanza.',
          statusLabel: 'Previsto en itinerario',
          href: 'https://learn.microsoft.com/es-es/training/paths/az-900-describe-cloud-concepts/',
        },
        {
          platform: 'Google Cloud Skills Boost',
          name: 'Cloud Computing Fundamentals',
          meta: 'Infraestructura cloud, máquinas virtuales, almacenamiento y redes virtuales.',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.cloudskillsboost.google/paths/36',
        },
        {
          platform: 'Coursera / Google',
          name: 'Google IT Support Professional Certificate',
          meta: 'Soporte técnico integral, sistemas Linux, ciberseguridad básica y atención a usuarios.',
          statusLabel: 'Previsto en itinerario',
          href: 'https://www.coursera.org/professional-certificates/google-it-support',
        },
      ],
    },
    documents: {
      sectionNum: '05',
      sectionTitle: 'Documentos',
      heading: 'Documentación profesional',
      subheading:
        'Currículos orientados a procesos de selección y plazas de Formación en Centros de Trabajo (FCT). Actualmente en preparación para su incorporación en formato PDF.',
      pendingBadge: 'En preparación',
      skillsCv: {
        title: 'Currículum Vitae de Habilidades',
        desc: 'Formato funcional que destaca las competencias prácticas en administración de sistemas, redes locales, hardware y desarrollo web.',
        status: 'Documento en fase de redacción final. Estará disponible para descarga en PDF.',
      },
      europassCv: {
        title: 'Currículum Vitae Europass',
        desc: 'Estructura curricular oficial según el estándar de la Unión Europea, detallando la formación reglada en SMR y competencias transversales.',
        status: 'Documento en preparación en el portal oficial Europass. Estará disponible en PDF.',
      },
    },
    contact: {
      sectionNum: '06',
      sectionTitle: 'Contacto',
      heading: 'Hablemos',
      intro:
        'Si tienes una propuesta de prácticas formativas de SMR, quieres consultar detalles sobre mis proyectos o conversar sobre tecnología, puedes escribirme directamente.',
      emailLabel: 'Correo electrónico profesional',
      copyBtn: 'Copiar dirección',
      copiedBtn: '¡Copiado!',
      directSend: 'Abrir en tu cliente de correo →',
      channelsTitle: 'Perfiles profesionales',
      locationLabel: 'Ubicación',
      locationValue: 'Santander, Cantabria, España',
    },
    footer: {
      academic: 'Portafolio académico y profesional · Módulo IPE II · Ciclo SMR · IES Augusto González de Linares',
      standards: 'Diseñado bajo principios de claridad, jerarquía y accesibilidad.',
      rights: '© 2026 Juan Fernando Ospina Tigreros · Todos los derechos reservados.',
    },
  },
  en: {
    intro: {
      titleLine1: 'JUAN FERNANDO',
      titleLine2: 'OSPINA',
      titleLine3: 'TIGREROS',
      tagline: 'Computer Systems and Networks · Santander, Spain',
      chooseLanguage: 'SELECT YOUR LANGUAGE',
      langEs: 'Español',
      langEn: 'English',
      skip: 'Skip intro →',
      enter: 'Enter portfolio →',
    },
    nav: {
      presentation: 'Identity',
      skills: 'Competencies',
      projects: 'Projects',
      training: 'Education',
      documents: 'Documents',
      contact: 'Contact',
      replayIntro: 'Watch intro',
    },
    hero: {
      eyebrow: 'Computer Systems and Networks Student · Santander, Spain',
      nameFirst: 'Juan Fernando',
      nameLast: 'Ospina Tigreros',
      ageLocation: '18 years old · Santander, Cantabria, Spain',
      bio: 'I study Microcomputer Systems and Networks (SMR) at IES Augusto González de Linares. I have a genuine interest in computer hardware, networking infrastructure, and software development. I am an independent self-learner who enjoys building real projects from the ground up, spanning systems administration, network protocols, and complete web applications.',
      quote: 'Learn by building. Every project originates from a practical challenge and the curiosity to understand how computer systems operate under the surface.',
      availability: 'Available for internship placement (FCT) · Period 2025–2026',
      ctaProjects: 'View projects',
      ctaContact: 'Get in touch',
      photoCaption: 'Professional portrait · Santander, 2026',
    },
    skills: {
      sectionNum: '02',
      sectionTitle: 'Competencies',
      heading: 'Technical capabilities & tools',
      subheading:
        'Practical capabilities developed through formal vocational training in SMR and autonomous personal software projects. Zero inflated metrics or arbitrary percentage bars.',
      transparencyNote:
        'Professional transparency: No skill is rated as "expert". All proficiencies reflect active vocational coursework and hands-on technical problem solving in individual projects.',
      categories: [
        {
          title: 'Operating Systems',
          description: 'Administration, configuration, and troubleshooting on client and server systems.',
          skills: [
            { name: 'Linux (Ubuntu, Debian)', application: 'CLI navigation, package management, user permissions, and daemons.', status: 'lab' },
            { name: 'Windows Server', application: 'Basic domain user administration, Group Policy (GPO), and server roles.', status: 'learning' },
            { name: 'Windows 10/11 Pro', application: 'Installation, technical diagnostics, storage partitioning, and system tuning.', status: 'applied' },
            { name: 'Virtualization', application: 'Configuration and isolation of virtual machines with VirtualBox and VMware.', status: 'lab' },
          ],
        },
        {
          title: 'Networking & Protocols',
          description: 'Physical cabling, logical topologies, addressing schemes, and core protocols.',
          skills: [
            { name: 'TCP/IP Architecture', application: 'OSI and TCP/IP models, packet inspection, and connectivity diagnostics.', status: 'learning' },
            { name: 'IPv4 Addressing & Subnetting', application: 'Subnet calculations, fixed and variable length subnet masking (VLSM).', status: 'applied' },
            { name: 'Switching & VLANs', application: 'Local network segmentation and basic managed switch configuration.', status: 'learning' },
            { name: 'Cabling & Network Hardware', application: 'RJ-45 crimping, patch panel wiring, and continuity testing.', status: 'lab' },
          ],
        },
        {
          title: 'Software & Web Development',
          description: 'Autonomous construction of responsive client interfaces and backend logic.',
          skills: [
            { name: 'Modern JavaScript (ES6+)', application: 'Asynchronous control flow, DOM manipulation, and state management.', status: 'applied' },
            { name: 'Semantic HTML5 & Modern CSS3', application: 'Accessible, responsive layouts with CSS Flexbox and Grid.', status: 'applied' },
            { name: 'React & Next.js', application: 'Full-stack application architecture with Server and Client Components.', status: 'applied' },
            { name: 'Relational Databases', application: 'SQL table modeling, queries, and real-time synchronization with Supabase.', status: 'applied' },
          ],
        },
        {
          title: 'Hardware & Development Environment',
          description: 'Physical computer assembly, component diagnostic checks, and developer tooling.',
          skills: [
            { name: 'PC Assembly & Maintenance', application: 'Component selection, bench diagnostics, thermal upkeep, and replacements.', status: 'lab' },
            { name: 'Version Control (Git/GitHub)', application: 'Daily development flow with clean commits, branching, and remote pushes.', status: 'applied' },
            { name: 'Basic Cyber Security', application: 'Password guidelines, host firewall setup, and scheduled backup routines.', status: 'learning' },
          ],
        },
      ],
      softTitle: 'Working Approach',
      softDesc: 'Mindset toward technical challenges and team collaboration.',
      softItems: [
        {
          title: 'Initiative & autonomous learning',
          desc: 'Demonstrated habit of studying official technical documentation and learning new toolchains independently.',
        },
        {
          title: 'Methodical problem solving',
          desc: 'Disciplined approach to isolating hardware faults or software bugs systematically to trace root causes.',
        },
        {
          title: 'Attention to craftsmanship',
          desc: 'Commitment to delivering well-finished work with clean visual hierarchy, readable code, and no superficial extras.',
        },
        {
          title: 'Constructive teamwork',
          desc: 'Collaborative attitude in the laboratory, sharing practical findings and listening carefully to peer feedback.',
        },
      ],
    },
    projects: {
      sectionNum: '03',
      sectionTitle: 'Projects',
      heading: 'Selected works',
      subheading:
        'Four real-world projects developed independently. Each backed by inspectable open source repositories on GitHub, with zero fabricated clients or claims.',
      viewCode: 'View source code on GitHub',
      viewDemo: 'View live demo',
      problemLabel: 'Problem solved',
      solutionLabel: 'Technical approach',
      roleLabel: 'Individual contribution',
      techLabel: 'Technologies used',
      items: [
        {
          id: 'salitre',
          index: '01',
          title: 'SALITRE',
          tagline: 'Underground maritime social network featuring an internal economy and neo-brutalist identity',
          desc: 'A social web platform inspired by the maritime culture of Santander port. Features the dynamic feed "La Marea", a gamified progression hierarchy (Stowaway to Sovereign), community standing, and a closed internal economy of 30,000 "Anchovies". Deliberately rejects generic commercial design patterns.',
          problem: 'Creating a digital community space connected to local humor through game mechanics and distinct graphic character.',
          role: 'Individually conceived and built from scratch: full architecture, bespoke editorial graphics, PostgreSQL schema in Supabase, and GSAP micro-animations.',
          tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase (PostgreSQL)', 'GSAP'],
          image: '/projects/salitre.png',
          github: 'https://github.com/Lominono/STDR_UNDERGROUND',
          demo: null,
          layoutVariant: 'featured-horizontal',
        },
        {
          id: 'smr2web',
          index: '02',
          title: 'SMR2 Class Portal',
          tagline: 'Collaborative real-time timetable and classroom hub for 2nd-year SMR students',
          desc: 'An interactive web portal built for students in the Computer Systems and Networks program at IES Augusto González de Linares. Centralizes daily session schedules, exam notices, attendance records, and internal workshop tools accessible on desktop and mobile devices.',
          problem: 'Preventing fragmented class announcements by providing a single real-time reference point for the classroom.',
          role: 'Lead frontend architect and UI designer, implementing real-time data sync with Supabase and web push notifications.',
          tech: ['Next.js', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase Realtime', 'Web Push'],
          image: '/projects/smr2.png',
          github: 'https://github.com/Lominono/smr2web',
          demo: null,
          layoutVariant: 'split-vertical',
        },
        {
          id: 'muudel',
          index: '03',
          title: 'muudel',
          tagline: 'Classroom attendance, streak tracking, and rewards app designed with Apple HIG clarity',
          desc: 'A focused application engineered to improve classroom attendance: timestamped check-in, automated daily streak calculation, symbolic reward redemption, and peer communication within a sober, distraction-free interface.',
          problem: 'Encouraging punctuality and classroom engagement through positive reinforcement without visual noise.',
          role: 'Designed and built single-handedly from the relational database model (`database.sql`) to the Express API and client React components.',
          tech: ['Vite', 'React', 'Tailwind CSS', 'Express', 'Supabase (PostgreSQL)'],
          image: '/projects/muudel.png',
          github: 'https://github.com/lominono/muudel',
          demo: null,
          layoutVariant: 'split-vertical',
        },
        {
          id: 'jfdelegado',
          index: '04',
          title: 'JUANFE DELEGADO',
          tagline: 'Interactive student delegate campaign web application with fanzine graphics and live polling',
          desc: 'A dynamic single-page web app built to present student union proposals transparently and directly. Features tactile fanzine / Neo-Brutalist graphic identity, interactive polls, and real-time sync with Firebase.',
          problem: 'Communicating academic proposals in an accessible, engaging format that caught the direct attention of classmates.',
          role: 'Entirely built by myself: visual layout, Vanilla JavaScript state handling, and Firebase Realtime Database integration.',
          tech: ['Semantic HTML5', 'Neo-Brutalist CSS3', 'Vanilla JavaScript', 'Firebase Realtime'],
          image: '/projects/jfdelegado.jpg',
          github: 'https://github.com/Lominono/JFDELEGADO',
          demo: null,
          layoutVariant: 'editorial-dense',
        },
      ],
      githubArchive: 'Inspect all open source repositories and commits on',
    },
    training: {
      sectionNum: '04',
      sectionTitle: 'Education',
      heading: 'Technical education roadmap',
      subheading:
        'Official vocational foundation at IES Augusto González de Linares augmented by a planned self-directed learning curriculum.',
      officialBadge: 'Official Vocational Degree · In Progress',
      officialTitle: 'Technician in Microcomputer Systems and Networks (SMR)',
      officialCenter: 'IES Augusto González de Linares · Santander, Cantabria, Spain',
      officialDesc:
        'Intermediate Spanish vocational degree (EQF Level 4) focused on computer assembly and hardware maintenance, network infrastructure cabling, Windows and Linux server management, and web services deployment.',
      officialModulesTitle: 'Core curriculum modules completed / in progress:',
      officialModules: [
        'Local Area Networks (Cabling, Subnetting, and Switching)',
        'Standalone Operating Systems (Windows & Linux CLI)',
        'Network Operating Systems (Windows Server, Active Directory, Domains)',
        'Hardware Assembly & Maintenance (Diagnostics, Components, Repair)',
        'Web Applications (Web servers, CMS platforms, and databases)',
        'Computer Security (Firewalls, Backup policies, Antivirus)',
        'Personal Itinerary for Employability (IPE II)',
      ],
      itineraryHeading: 'Planned MOOC curriculum roadmap',
      itineraryDesc:
        'Specialized technical coursework planned to complement official studies. None are claimed as completed certifications.',
      courses: [
        {
          platform: 'Cisco Networking Academy',
          name: 'CCNA: Introduction to Networks (ITN)',
          meta: 'Network protocols, OSI/TCP-IP models, IPv4/IPv6, switches and routers.',
          statusLabel: 'Planned in roadmap',
          href: 'https://www.netacad.com/courses/networking/ccna-introduction-networks',
        },
        {
          platform: 'freeCodeCamp',
          name: 'Responsive Web Design Certification',
          meta: 'Semantic HTML5, CSS Flexbox, CSS Grid, and web accessibility standards.',
          statusLabel: 'Planned in roadmap',
          href: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
        },
        {
          platform: 'Microsoft Learn',
          name: 'Microsoft Azure Fundamentals (AZ-900)',
          meta: 'Cloud computing concepts, core Azure architectural services, security, and governance.',
          statusLabel: 'Planned in roadmap',
          href: 'https://learn.microsoft.com/es-es/training/paths/az-900-describe-cloud-concepts/',
        },
        {
          platform: 'Google Cloud Skills Boost',
          name: 'Cloud Computing Fundamentals',
          meta: 'Cloud infrastructure, virtual machines, cloud storage, and virtual private clouds.',
          statusLabel: 'Planned in roadmap',
          href: 'https://www.cloudskillsboost.google/paths/36',
        },
        {
          platform: 'Coursera / Google',
          name: 'Google IT Support Professional Certificate',
          meta: 'Comprehensive IT support, Linux systems administration, security basics, and troubleshooting.',
          statusLabel: 'Planned in roadmap',
          href: 'https://www.coursera.org/professional-certificates/google-it-support',
        },
      ],
    },
    documents: {
      sectionNum: '05',
      sectionTitle: 'Documents',
      heading: 'Professional documents',
      subheading:
        'Curricular documents structured for workplace internship opportunities (FCT) and job applications. Currently in final preparation for PDF download.',
      pendingBadge: 'In preparation',
      skillsCv: {
        title: 'Skills & Competencies Resume',
        desc: 'Functional resume format emphasizing hands-on capabilities in systems administration, local networks, hardware troubleshooting, and web coding.',
        status: 'Document undergoing final draft. Will be available for direct PDF viewing and download.',
      },
      europassCv: {
        title: 'Europass Curriculum Vitae',
        desc: 'Official European Union standardized format detailing formal vocational credentials in SMR, language proficiencies, and organizational skills.',
        status: 'Document in preparation via the official Europass portal. Will be available as a downloadable PDF.',
      },
    },
    contact: {
      sectionNum: '06',
      sectionTitle: 'Contact',
      heading: "Let's connect",
      intro:
        'If you are considering my profile for an internship placement in SMR, would like to inquire about my projects, or discuss technology, feel free to reach out directly.',
      emailLabel: 'Professional email address',
      copyBtn: 'Copy address',
      copiedBtn: 'Copied!',
      directSend: 'Open in your email client →',
      channelsTitle: 'Professional profiles',
      locationLabel: 'Location',
      locationValue: 'Santander, Cantabria, Spain',
    },
    footer: {
      academic: 'Academic and professional portfolio · IPE II Module · SMR Vocational Program · IES Augusto González de Linares',
      standards: 'Designed following principles of clarity, hierarchy, and accessibility.',
      rights: '© 2026 Juan Fernando Ospina Tigreros · All rights reserved.',
    },
  },
};
