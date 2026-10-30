import NavMenu from './NavMenu';
import { ScrollReveal, Stagger } from './ScrollReveal';

// ─── Datos de competencias ──────────────────────────────────────
const HARD_SKILLS = [
  { name: 'Sistemas operativos Windows', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Sistemas operativos Linux', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Administración básica de sistemas', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Redes informáticas', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Protocolos TCP/IP', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Direccionamiento IPv4', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Subnetting', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'VLAN', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Virtualización', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'Hardware y mantenimiento', level: 'En aprendizaje', variant: 'learning' as const },
  { name: 'HTML / CSS', level: 'Editable ✎', variant: 'neutral' as const },
  { name: 'JavaScript', level: 'Editable ✎', variant: 'neutral' as const },
];

const SOFT_SKILLS = [
  'Trabajo en equipo',
  'Resolución de problemas',
  'Aprendizaje autónomo',
  'Organización',
  'Adaptabilidad',
  'Gestión del tiempo',
];

// ─── Datos de proyectos ─────────────────────────────────────────
// Nota: sin acceso a la API de GitHub en tiempo de compilación,
// estas fichas están basadas en información públicamente verificable.
// Actualiza las descripciones cuando revises los repositorios.
const PROJECTS = [
  {
    index: '01',
    title: 'Portal SMR2',
    desc:
      'Plataforma web colaborativa desarrollada para la clase de 2.º de SMR del IES Augusto González de Linares. Incluye horario lectivo interactivo, sistema de usuarios, tabla de clasificación y paneles de administración. Construida con Next.js y Supabase.',
    tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Supabase'],
    problem:
      'Centralizar la gestión de información y actividades de la clase en un único portal accesible desde cualquier dispositivo.',
    href: 'https://github.com/lominono',
    demo: null,
    placeholder: false,
  },
  {
    index: '02',
    title: 'Repositorio pendiente de revisar',
    desc:
      'Ficha pendiente de completar. Visita mi perfil de GitHub para ver todos los repositorios públicos disponibles y añadir aquí los detalles correctos.',
    tech: [],
    problem: '',
    href: 'https://github.com/lominono',
    demo: null,
    placeholder: true,
  },
];

// ─── Datos de formación ─────────────────────────────────────────
const COURSES = [
  {
    platform: 'Cisco',
    name: 'Introduction to Networks (ITN)',
    meta: 'CCNA 1 · Networking Academy',
    status: 'planned' as const,
    statusLabel: 'Previsto',
    href: 'https://www.netacad.com/courses/networking/ccna-introduction-networks',
  },
  {
    platform: 'freeCodeCamp',
    name: 'Responsive Web Design',
    meta: 'Desarrollo web · Certificación gratuita',
    status: 'planned' as const,
    statusLabel: 'Previsto',
    href: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/',
  },
  {
    platform: 'Microsoft Learn',
    name: 'Fundamentos de Azure (AZ-900)',
    meta: 'Cloud computing · Itinerario de aprendizaje',
    status: 'planned' as const,
    statusLabel: 'Previsto',
    href: 'https://learn.microsoft.com/es-es/training/paths/az-900-describe-cloud-concepts/',
  },
  {
    platform: 'Google Cloud',
    name: 'Cloud Computing Fundamentals',
    meta: 'Google Cloud Skills Boost · Inglés',
    status: 'planned' as const,
    statusLabel: 'Previsto',
    href: 'https://www.cloudskillsboost.google/paths/36',
  },
  {
    platform: 'Coursera',
    name: 'Google IT Support Certificate',
    meta: 'Google · 6 meses · Inglés',
    status: 'planned' as const,
    statusLabel: 'Previsto',
    href: 'https://www.coursera.org/professional-certificates/google-it-support',
  },
];

const SUBJECTS = [
  'Redes locales',
  'Implantación de SO',
  'Fundamentos de hardware',
  'Aplicaciones web',
  'Servicios en red',
  'Seguridad informática',
];

// ─── Iconos SVG inline ──────────────────────────────────────────
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ width: 14, height: 14 }}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ─── Componente principal ───────────────────────────────────────
export default function PortafolioPage() {
  return (
    <>
      {/* NAVEGACIÓN */}
      <NavMenu />

      <main id="main-content">
        {/* ─────────────────────────────────────────
            01 HERO / PRESENTACIÓN
        ───────────────────────────────────────── */}
        <section
          id="presentacion"
          className="hero container"
          aria-label="Presentación personal"
        >
          <div className="hero__grid">
            {/* Texto */}
            <div>
              <ScrollReveal delay={0}>
              <p className="hero__meta">
                Estudiante SMR · Santander, España
              </p>
              </ScrollReveal>

              <ScrollReveal delay={80}>
              <h1 className="hero__name">
                Juan Fernando<br />
                <em>Ospina</em> Tigreros
              </h1>
              </ScrollReveal>

              <ScrollReveal delay={160}>
              <p className="hero__tagline">
                Tengo 18 años y estoy estudiando Sistemas Microinformáticos y Redes
                en el IES Augusto González de Linares. Me interesan las redes, los
                sistemas operativos y el desarrollo web, y me gusta resolver problemas
                técnicos aprendiendo por mi cuenta.
              </p>
              </ScrollReveal>

              <ScrollReveal delay={220}>
              <p className="hero__identity">
                Aprender haciendo — esa es mi forma de trabajar.
              </p>
              </ScrollReveal>

              <ScrollReveal delay={280}>
              <div className="hero__links">
                <a
                  href="https://github.com/lominono"
                  className="hero__link hero__link--primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver perfil de GitHub @lominono"
                >
                  <IconGitHub />
                  @lominono
                </a>
                <a
                  href="#contacto"
                  className="hero__link hero__link--secondary"
                  aria-label="Ir a la sección de contacto"
                >
                  Contacto
                </a>
              </div>
              </ScrollReveal>

              {/* Indicador de disponibilidad — edita el texto según tu situación */}
              <ScrollReveal delay={340}>
              <div className="availability" role="status" aria-label="Estado de disponibilidad">
                <span className="availability__dot" aria-hidden="true" />
                Disponible para prácticas · 2025
                {/* ✏️ Edita este texto cuando cambie tu disponibilidad */}
              </div>
              </ScrollReveal>
            </div>

            {/* Foto */}
            <div className="hero__photo-wrap" aria-hidden="true">
              <div className="hero__photo">
                {/* 📷 Para añadir tu foto:
                    1. Guarda la imagen en /public/foto-perfil.jpg
                    2. Reemplaza el bloque de abajo por:
                    <Image src="/foto-perfil.jpg" alt="Juan Fernando Ospina Tigreros" fill style={{ objectFit: 'cover' }} />
                    y añade: import Image from 'next/image'; al principio del archivo
                */}
                <div className="hero__photo-placeholder">
                  <IconUser />
                  <span>Añadir foto<br />profesional</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            02 COMPETENCIAS
        ───────────────────────────────────────── */}
        <section
          id="competencias"
          className="section section--alt"
          aria-label="Matriz de competencias"
        >
          <div className="container">
            <ScrollReveal>
            <div className="section-label">
              <span className="section-label__num">02</span>
              <span className="section-label__line" aria-hidden="true" />
              <span className="section-label__title">Competencias</span>
            </div>

            <h2 className="section-heading">Qué sé hacer</h2>
            <p className="section-sub">
              Materias del ciclo de SMR que estoy trabajando actualmente.
              Los niveles se actualizarán conforme avance el curso.
            </p>
            </ScrollReveal>

            <div className="skills-grid">
              {/* Hard skills */}
              <ScrollReveal delay={60} direction="left">
              <div>
                <h3 className="skills-col__heading">Hard skills — Técnicas</h3>
                <Stagger staggerMs={50} threshold={0.05}>
                <ul role="list" aria-label="Competencias técnicas">
                  {HARD_SKILLS.map(({ name, level, variant }) => (
                    <li key={name} className="skill-item">
                      <span className="skill-item__name">{name}</span>
                      <span
                        className={`skill-item__level${variant === 'learning' ? ' skill-item__level--learning' : ''}`}
                      >
                        {level}
                      </span>
                    </li>
                  ))}
                </ul>
                </Stagger>

                <div className="skills-note" role="note">
                  <p>
                    Los niveles mostrados reflejan mi situación actual como estudiante de primer/segundo
                    curso de SMR. Las competencias marcadas como <strong>Editable ✎</strong> deben
                    confirmarse según el dominio real adquirido.
                  </p>
                </div>
              </div>
              </ScrollReveal>

              {/* Soft skills */}
              <ScrollReveal delay={120} direction="right">
              <div>
                <h3 className="skills-col__heading">Soft skills — Transversales</h3>
                <Stagger staggerMs={60} direction="up" threshold={0.05}>
                <ul className="soft-skills" role="list" aria-label="Competencias transversales">
                  {SOFT_SKILLS.map((s) => (
                    <li key={s} className="soft-chip">{s}</li>
                  ))}
                </ul>
                </Stagger>
              </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            03 PROYECTOS
        ───────────────────────────────────────── */}
        <section
          id="proyectos"
          className="projects"
          aria-label="Proyectos y escaparate técnico"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-label">
                <span className="section-label__num">03</span>
                <span className="section-label__line" aria-hidden="true" />
                <span className="section-label__title">Proyectos</span>
              </div>

              <h2 className="section-heading">Lo que he construido</h2>
              <p className="section-sub">
                Repositorios públicos de mi perfil de GitHub. Visita{' '}
                <a
                  href="https://github.com/lominono"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'underline' }}
                >
                  github.com/lominono
                </a>{' '}
                para ver el trabajo completo.
              </p>
            </ScrollReveal>

            <Stagger staggerMs={120} threshold={0.08}>
              <ul className="projects-list" role="list" aria-label="Lista de proyectos">
                {PROJECTS.map((p) => (
                  <li
                    key={p.index}
                    className={`project-card${p.placeholder ? ' project-card--placeholder' : ''}`}
                  >
                    <span className="project-card__index" aria-hidden="true">{p.index}</span>

                    <h3 className="project-card__title">{p.title}</h3>

                    <p className="project-card__desc">{p.desc}</p>

                    {p.tech.length > 0 && (
                      <ul className="project-card__tech" role="list" aria-label="Tecnologías">
                        {p.tech.map((t) => (
                          <li key={t} className="tech-tag">{t}</li>
                        ))}
                      </ul>
                    )}

                    <div className="project-card__links">
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link project-link--accent"
                        aria-label={`Ver repositorio de ${p.title} en GitHub`}
                      >
                        GitHub →
                      </a>
                      {p.demo && (
                        <a
                          href={p.demo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="project-link"
                          aria-label={`Ver demo de ${p.title}`}
                        >
                          Demo →
                        </a>
                      )}
                      {p.placeholder && (
                        <span className="project-link" style={{ opacity: 0.4, cursor: 'default' }}>
                          Ficha por completar
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Stagger>

            <ScrollReveal delay={150}>
              <p className="projects-github-note">
                Todos los proyectos están disponibles en{' '}
                <a href="https://github.com/lominono" target="_blank" rel="noopener noreferrer">
                  github.com/lominono
                </a>
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            04 FORMACIÓN
        ───────────────────────────────────────── */}
        <section
          id="formacion"
          className="section"
          aria-label="Formación y aprendizaje"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-label">
                <span className="section-label__num">04</span>
                <span className="section-label__line" aria-hidden="true" />
                <span className="section-label__title">Formación</span>
              </div>

              <h2 className="section-heading">Dónde estoy aprendiendo</h2>
              <p className="section-sub">
                Formación reglada actual y cursos que tengo previstos para seguir
                creciendo. Los cursos marcados como «Previsto» aún no han sido realizados.
              </p>
            </ScrollReveal>

            <div className="training-grid">
              {/* Formación actual */}
              <ScrollReveal direction="left" delay={50}>
                <div>
                  <div className="training-current">
                    <span className="training-current__badge">
                      <span aria-hidden="true">◉</span>
                      En curso
                    </span>
                    <h3 className="training-current__title">
                      Técnico en Sistemas Microinformáticos y Redes
                    </h3>
                    <p className="training-current__center">
                      IES Augusto González de Linares · Santander, Cantabria
                    </p>
                    <p className="training-current__desc">
                      Ciclo Formativo de Grado Medio orientado a la instalación,
                      configuración y mantenimiento de sistemas informáticos y
                      redes de datos. Incluye módulos de hardware, sistemas
                      operativos, redes, seguridad y aplicaciones web.
                    </p>
                    <ul className="training-current__subjects" role="list" aria-label="Módulos del ciclo">
                      {SUBJECTS.map((s) => (
                        <li key={s} className="subject-tag">{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>

              {/* Itinerario de cursos */}
              <ScrollReveal direction="right" delay={100}>
                <div>
                  <h3 className="courses-col__title">
                    Itinerario de formación complementaria
                  </h3>
                  <Stagger staggerMs={60} threshold={0.05}>
                    <ul role="list" aria-label="Cursos previstos y en progreso">
                      {COURSES.map((c) => (
                        <li key={c.name} className="course-card">
                          <span className="course-card__platform">{c.platform}</span>
                          <div className="course-card__content">
                            <p className="course-card__name">{c.name}</p>
                            <p className="course-card__meta">{c.meta}</p>
                            <a
                              href={c.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`course-card__status course-card__status--${c.status}`}
                              aria-label={`${c.name} — Estado: ${c.statusLabel}. Ver curso`}
                            >
                              {c.statusLabel}
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Stagger>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            05 DOCUMENTACIÓN
        ───────────────────────────────────────── */}
        <section
          id="documentos"
          className="section section--alt"
          aria-label="Documentación profesional"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-label">
                <span className="section-label__num">05</span>
                <span className="section-label__line" aria-hidden="true" />
                <span className="section-label__title">Documentación</span>
              </div>

              <h2 className="section-heading">Documentos profesionales</h2>
              <p className="section-sub">
                Currículos disponibles para descarga. Los documentos se incorporarán
                cuando estén listos. Las rutas están configuradas para añadir los PDF
                en la carpeta <code style={{ fontSize: '0.85em', background: '#eee', padding: '1px 5px', borderRadius: 3 }}>/public/docs/</code>.
              </p>
            </ScrollReveal>

            <Stagger staggerMs={120} threshold={0.08}>
              <div className="docs-grid">
                {/* CV Habilidades */}
                <article className="doc-card" aria-label="Currículum Vitae de Habilidades">
                  <div className="doc-card__icon" aria-hidden="true">
                    <IconDoc />
                  </div>
                  <p className="doc-card__type">Currículum</p>
                  <h3 className="doc-card__title">CV de Habilidades</h3>
                  <p className="doc-card__desc">
                    Currículum funcional centrado en competencias técnicas y transversales.
                    Diseñado para destacar lo que sé hacer por encima de la experiencia
                    laboral formal, adecuado para búsqueda de prácticas.
                  </p>
                  <p className="doc-card__status">
                    Documento pendiente de añadir
                  </p>
                  <div className="doc-card__actions">
                    <span className="doc-btn doc-btn--view" aria-disabled="true" role="button">
                      Ver documento
                    </span>
                    <span className="doc-btn doc-btn--download" aria-disabled="true" role="button">
                      Descargar PDF
                    </span>
                  </div>
                </article>

                {/* CV Europass */}
                <article className="doc-card" aria-label="Currículum Vitae Europass">
                  <div className="doc-card__icon" aria-hidden="true">
                    <IconDoc />
                  </div>
                  <p className="doc-card__type">Europass</p>
                  <h3 className="doc-card__title">Currículum Europass</h3>
                  <p className="doc-card__desc">
                    Formato estándar europeo de currículum. Compatible con plataformas
                    de empleo europeas y portales de prácticas. Generado a través del
                    portal oficial de Europass de la Unión Europea.
                  </p>
                  <p className="doc-card__status">
                    Documento pendiente de añadir
                  </p>
                  <div className="doc-card__actions">
                    <span className="doc-btn doc-btn--view" aria-disabled="true" role="button">
                      Ver documento
                    </span>
                    <span className="doc-btn doc-btn--download" aria-disabled="true" role="button">
                      Descargar PDF
                    </span>
                  </div>
                </article>
              </div>
            </Stagger>
          </div>
        </section>

        {/* ─────────────────────────────────────────
            06 CONTACTO
        ───────────────────────────────────────── */}
        <section
          id="contacto"
          className="section contact"
          aria-label="Contacto y redes profesionales"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-label">
                <span className="section-label__num">06</span>
                <span className="section-label__line" aria-hidden="true" />
                <span className="section-label__title">Contacto</span>
              </div>

              <h2 className="section-heading">Hablemos</h2>
            </ScrollReveal>

            <div className="contact-grid">
              <ScrollReveal direction="left" delay={50}>
                <div>
                  <p className="contact-left__text">
                    Si tienes alguna pregunta sobre mis proyectos, quieres revisar
                    mi trabajo o te interesa contactar para prácticas o colaboraciones,
                    puedes escribirme por cualquiera de estos canales.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal direction="right" delay={100}>
                <div>
                  <Stagger staggerMs={70} threshold={0.05}>
                    <ul className="contact-links" role="list" aria-label="Canales de contacto">
                      {/* GitHub */}
                      <li>
                        <a
                          href="https://github.com/lominono"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contact-link"
                          aria-label="GitHub: @lominono"
                        >
                          <div className="contact-link__left">
                            <div className="contact-link__icon" aria-hidden="true">
                              <IconGitHub />
                            </div>
                            <div>
                              <p className="contact-link__platform">GitHub</p>
                              <p className="contact-link__value">@lominono</p>
                            </div>
                          </div>
                          <span className="contact-link__arrow" aria-hidden="true">→</span>
                        </a>
                      </li>

                      {/* Email */}
                      <li>
                        <span
                          className="contact-link contact-link--disabled"
                          aria-label="Correo electrónico: pendiente de añadir"
                          role="group"
                        >
                          <div className="contact-link__left">
                            <div className="contact-link__icon" aria-hidden="true">
                              <IconMail />
                            </div>
                            <div>
                              <p className="contact-link__platform">Correo electrónico</p>
                              <p className="contact-link__value" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                Añadir dirección de email ✏️
                              </p>
                            </div>
                          </div>
                        </span>
                      </li>

                      {/* LinkedIn */}
                      <li>
                        <span
                          className="contact-link contact-link--disabled"
                          aria-label="LinkedIn: perfil pendiente de añadir"
                          role="group"
                        >
                          <div className="contact-link__left">
                            <div className="contact-link__icon" aria-hidden="true">
                              <IconLinkedIn />
                            </div>
                            <div>
                              <p className="contact-link__platform">LinkedIn</p>
                              <p className="contact-link__value" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                Añadir perfil de LinkedIn ✏️
                              </p>
                            </div>
                          </div>
                        </span>
                      </li>
                    </ul>
                  </Stagger>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer" role="contentinfo">
        <ScrollReveal>
          <div className="container footer__inner">
            <span className="footer__name">
              Juan Fernando Ospina Tigreros
            </span>
            <span className="footer__year" aria-label="Año 2026">
              © 2026
            </span>
            <div className="footer__right">
              <p>SMR2 · IES Augusto González de Linares</p>
              <p>Santander, Cantabria, España</p>
            </div>
          </div>
        </ScrollReveal>
      </footer>
    </>
  );
}
