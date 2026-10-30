'use client';

import React, { useState, useEffect, useCallback } from 'react';
import NavMenu from './NavMenu';
import CinematicIntro from './CinematicIntro';
import { ScrollReveal, Stagger } from './ScrollReveal';
import { Language, translations } from './translations';

// ─── Precision Vector Icons (Apple HIG Lucid Style) ───────────────
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="16" height="16" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" width="14" height="14" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconArrowExternal() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" width="12" height="12" aria-hidden="true">
      <path d="M4 12L12 4M12 4H6M12 4V10" />
    </svg>
  );
}

export default function PortfolioApp() {
  const [lang, setLang] = useState<Language>('es');
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLang = localStorage.getItem('jfo_lang') as Language | null;
      if (savedLang === 'es' || savedLang === 'en') {
        setLang(savedLang);
      }
      const introSeen = sessionStorage.getItem('jfo_intro_seen');
      if (!introSeen) {
        setShowIntro(true);
      }
    } catch {}
  }, []);

  const handleSelectLanguage = useCallback((selected: Language) => {
    setLang(selected);
    try {
      localStorage.setItem('jfo_lang', selected);
      sessionStorage.setItem('jfo_intro_seen', 'true');
    } catch {}
  }, []);

  const handleToggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      try {
        localStorage.setItem('jfo_lang', next);
      } catch {}
      return next;
    });
  }, []);

  const handleReplayIntro = useCallback(() => {
    setShowIntro(true);
  }, []);

  const handleCloseIntro = useCallback(() => {
    setShowIntro(false);
    try {
      sessionStorage.setItem('jfo_intro_seen', 'true');
    } catch {}
  }, []);

  const handleCopyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText('juanfernandoospina005@gmail.com');
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2400);
    } catch {}
  }, []);

  const t = translations[lang];

  return (
    <>
      {/* ─── 00 INTRO CINEMATOGRÁFICA ─────────────────────────── */}
      {mounted && (
        <CinematicIntro
          currentLang={lang}
          onSelectLanguage={handleSelectLanguage}
          isOpen={showIntro}
          onClose={handleCloseIntro}
        />
      )}

      {/* ─── NAVEGACIÓN STICKY APPLE-GRADE ────────────────────── */}
      <NavMenu
        currentLang={lang}
        onToggleLang={handleToggleLang}
        onReplayIntro={handleReplayIntro}
      />

      <main id="main-content" className="main-content">
        {/* ──────────────────────────────────────────────────────────
            01 — IDENTIDAD Y PRESENTACIÓN (APPLE CLARITY & HIERARCHY)
        ────────────────────────────────────────────────────────── */}
        <section
          id="presentacion"
          className="hero-section"
          aria-label="Presentación e identidad profesional"
        >
          <div className="container">
            <div className="hero-layout">
              {/* Left Column: Typographic Narrative */}
              <div className="hero-editorial">
                <ScrollReveal delay={0}>
                  <p className="hero-eyebrow">{t.hero.eyebrow}</p>
                </ScrollReveal>

                <ScrollReveal delay={80}>
                  <h1 className="hero-name">
                    <span>{t.hero.nameFirst}</span>
                    <span className="hero-name-accent">{t.hero.nameLast}</span>
                  </h1>
                </ScrollReveal>

                <ScrollReveal delay={140}>
                  <p className="hero-meta-subtitle">{t.hero.ageLocation}</p>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                  <p className="hero-bio">{t.hero.bio}</p>
                </ScrollReveal>

                <ScrollReveal delay={260}>
                  <blockquote className="hero-manifesto">
                    <p>{t.hero.quote}</p>
                  </blockquote>
                </ScrollReveal>

                <ScrollReveal delay={320}>
                  <div className="hero-status-row">
                    <span className="status-live-dot" aria-hidden="true" />
                    <span className="status-live-text">{t.hero.availability}</span>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={380}>
                  <div className="hero-cta-cluster">
                    <a href="#proyectos" className="btn-apple btn-apple--primary">
                      {t.hero.ctaProjects}
                      <span className="btn-apple-arrow" aria-hidden="true">↓</span>
                    </a>

                    <a href="#contacto" className="btn-apple btn-apple--secondary">
                      {t.hero.ctaContact}
                    </a>

                    <div className="hero-social-links" aria-label="Canales directos">
                      <a
                        href="https://github.com/lominono"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn"
                        title="GitHub @lominono"
                        aria-label="Perfil de GitHub @lominono"
                      >
                        <IconGitHub />
                      </a>
                      <a
                        href="https://www.linkedin.com/in/juan-fernando-ospina-tigreros-74185b443/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-icon-btn"
                        title="LinkedIn"
                        aria-label="Perfil de LinkedIn de Juan Fernando Ospina Tigreros"
                      >
                        <IconLinkedIn />
                      </a>
                      <a
                        href="mailto:juanfernandoospina005@gmail.com"
                        className="social-icon-btn"
                        title="Correo electrónico"
                        aria-label="Enviar correo a juanfernandoospina005@gmail.com"
                      >
                        <IconMail />
                      </a>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Right Column: Apple-style Portrait Presentation */}
              <div className="hero-portrait-col">
                <ScrollReveal delay={160} direction="right">
                  <figure className="portrait-showcase">
                    <div className="portrait-image-wrapper">
                      <img
                        src="/foto-perfil.png"
                        alt="Juan Fernando Ospina Tigreros — Estudiante de Sistemas Microinformáticos y Redes"
                        className="portrait-actual-image"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                    <figcaption className="portrait-caption">
                      <span className="portrait-caption-label">{t.hero.photoCaption}</span>
                      <span className="portrait-caption-mark">JFO · SMR</span>
                    </figcaption>
                  </figure>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            02 — MATRIZ DE COMPETENCIAS (CLARITY & CLEAN CATEGORIES)
        ────────────────────────────────────────────────────────── */}
        <section
          id="competencias"
          className="section section--skills"
          aria-label="Matriz de competencias técnicas"
        >
          <div className="container">
            <ScrollReveal>
              <header className="section-heading-wrap">
                <span className="section-chapter">{t.skills.sectionNum} // 06</span>
                <h2 className="section-primary-title">{t.skills.heading}</h2>
                <p className="section-lead-text">{t.skills.subheading}</p>
              </header>
            </ScrollReveal>

            {/* Categorized Technical Matrix (4 Clear Categories) */}
            <div className="skills-editorial-grid">
              {t.skills.categories.map((cat, cIdx) => (
                <ScrollReveal key={cIdx} delay={cIdx * 60}>
                  <div className="skill-category-block">
                    <div className="skill-cat-header">
                      <span className="skill-cat-num">0{cIdx + 1}</span>
                      <h3 className="skill-cat-title">{cat.title}</h3>
                    </div>
                    <p className="skill-cat-desc">{cat.description}</p>

                    <div className="skill-rows-list">
                      {cat.skills.map((s, sIdx) => (
                        <div key={sIdx} className="skill-row-item">
                          <div className="skill-row-head">
                            <span className="skill-row-name">{s.name}</span>
                            <span className={`status-pill status-pill--${s.status}`}>
                              {s.status === 'applied' && (lang === 'es' ? 'En proyectos' : 'Applied')}
                              {s.status === 'learning' && (lang === 'es' ? 'En formación' : 'In study')}
                              {s.status === 'lab' && (lang === 'es' ? 'Laboratorio' : 'Hands-on Lab')}
                            </span>
                          </div>
                          <p className="skill-row-app">{s.application}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Transparency Note */}
            <ScrollReveal delay={120}>
              <div className="skills-transparency-bar">
                <span className="transparency-label">Nota</span>
                <p>{t.skills.transparencyNote}</p>
              </div>
            </ScrollReveal>

            {/* Soft Skills: Human Working Approach */}
            <ScrollReveal delay={160}>
              <div className="soft-skills-section">
                <div className="soft-skills-intro">
                  <h3 className="soft-title">{t.skills.softTitle}</h3>
                  <p className="soft-desc">{t.skills.softDesc}</p>
                </div>
                <div className="soft-skills-grid">
                  {t.skills.softItems.map((item, idx) => (
                    <div key={idx} className="soft-item-card">
                      <span className="soft-item-number" aria-hidden="true">0{idx + 1}</span>
                      <h4 className="soft-item-title">{item.title}</h4>
                      <p className="soft-item-desc">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            03 — PROYECTOS / PRESENTACIONES REALES INDIVIDUALES
        ────────────────────────────────────────────────────────── */}
        <section
          id="proyectos"
          className="section section--projects"
          aria-label="Presentación de proyectos reales de software"
        >
          <div className="container">
            <ScrollReveal>
              <header className="section-heading-wrap">
                <span className="section-chapter">{t.projects.sectionNum} // 06</span>
                <h2 className="section-primary-title">{t.projects.heading}</h2>
                <p className="section-lead-text">{t.projects.subheading}</p>
              </header>
            </ScrollReveal>

            {/* Individual Bespoke Project Showcases */}
            <div className="projects-showcase-stream">
              {t.projects.items.map((project, idx) => (
                <ScrollReveal key={project.id} delay={idx * 80}>
                  <article className={`project-showcase-item project-showcase--${project.layoutVariant}`}>
                    {/* Visual Preview Frame */}
                    <div className="project-display-frame">
                      <div className="project-viewport-window">
                        <div className="viewport-header" aria-hidden="true">
                          <span className="viewport-circle" />
                          <span className="viewport-circle" />
                          <span className="viewport-circle" />
                          <span className="viewport-address">{project.title.toLowerCase().replace(/[^a-z0-9]/g, '')}.local</span>
                        </div>
                        <div className="viewport-image-box">
                          <img
                            src={project.image}
                            alt={`Captura real de ${project.title}`}
                            className="viewport-screen-img"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Editorial Content & Details */}
                    <div className="project-narrative-col">
                      <div className="project-header-meta">
                        <span className="project-serial">{project.index}</span>
                        <span className="project-type-badge">Personal Project · Open Source</span>
                      </div>

                      <h3 className="project-main-title">{project.title}</h3>
                      <p className="project-standfirst">{project.tagline}</p>
                      <p className="project-body-desc">{project.desc}</p>

                      <div className="project-specs-table">
                        <div className="spec-row">
                          <span className="spec-label">{t.projects.problemLabel}</span>
                          <span className="spec-value">{project.problem}</span>
                        </div>
                        <div className="spec-row">
                          <span className="spec-label">{t.projects.roleLabel}</span>
                          <span className="spec-value">{project.role}</span>
                        </div>
                      </div>

                      <div className="project-tech-ribbon" aria-label="Tecnologías">
                        {project.tech.map((techItem, techIdx) => (
                          <span key={techIdx} className="tech-badge">
                            {techItem}
                          </span>
                        ))}
                      </div>

                      <div className="project-link-actions">
                        <a
                          href={project.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="apple-link-btn"
                          aria-label={`${t.projects.viewCode}: ${project.title}`}
                        >
                          <IconGitHub />
                          <span>{t.projects.viewCode}</span>
                          <IconArrowExternal />
                        </a>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={120}>
              <div className="github-archive-callout">
                <span>{t.projects.githubArchive}</span>
                <a
                  href="https://github.com/lominono"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="github-profile-link"
                >
                  github.com/lominono
                  <IconArrowExternal />
                </a>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            04 — FORMACIÓN Y APRENDIZAJE FUTURO (ROADMAP CLARO)
        ────────────────────────────────────────────────────────── */}
        <section
          id="formacion"
          className="section section--training"
          aria-label="Itinerario de formación oficial y complementaria"
        >
          <div className="container">
            <ScrollReveal>
              <header className="section-heading-wrap">
                <span className="section-chapter">{t.training.sectionNum} // 06</span>
                <h2 className="section-primary-title">{t.training.heading}</h2>
                <p className="section-lead-text">{t.training.subheading}</p>
              </header>
            </ScrollReveal>

            <div className="training-bipartite-layout">
              {/* Official Vocational Degree Card */}
              <ScrollReveal direction="left" delay={60}>
                <div className="official-degree-panel">
                  <div className="degree-tag-pill">
                    <span className="degree-live-indicator" aria-hidden="true" />
                    <span>{t.training.officialBadge}</span>
                  </div>

                  <h3 className="degree-title">{t.training.officialTitle}</h3>
                  <p className="degree-institute">{t.training.officialCenter}</p>
                  <p className="degree-summary">{t.training.officialDesc}</p>

                  <div className="degree-modules-wrapper">
                    <h4 className="modules-header-title">{t.training.officialModulesTitle}</h4>
                    <ul className="modules-checklist" role="list">
                      {t.training.officialModules.map((mod, modIdx) => (
                        <li key={modIdx} className="module-check-item">
                          <span className="module-bullet-mark" aria-hidden="true">—</span>
                          <span>{mod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>

              {/* Planned MOOC Course Roadmap */}
              <ScrollReveal direction="right" delay={120}>
                <div className="itinerary-panel">
                  <div className="itinerary-header">
                    <h3 className="itinerary-title">{t.training.itineraryHeading}</h3>
                    <p className="itinerary-desc">{t.training.itineraryDesc}</p>
                  </div>

                  <div className="courses-timeline" role="list">
                    {t.training.courses.map((course, cIdx) => (
                      <div key={cIdx} className="course-entry-row">
                        <div className="course-platform-name">{course.platform}</div>
                        <div className="course-main-info">
                          <h4 className="course-title-text">{course.name}</h4>
                          <p className="course-meta-text">{course.meta}</p>
                          <div className="course-action-line">
                            <span className="course-planned-badge">{course.statusLabel}</span>
                            <a
                              href={course.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="course-syll-link"
                              aria-label={`Temario oficial de ${course.name}`}
                            >
                              <span>{lang === 'es' ? 'Ver temario' : 'Syllabus'}</span>
                              <IconArrowExternal />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            05 — DOCUMENTOS PROFESIONALES (CLARIDAD Y HONESTIDAD)
        ────────────────────────────────────────────────────────── */}
        <section
          id="documentos"
          className="section section--documents"
          aria-label="Documentos de empleabilidad"
        >
          <div className="container">
            <ScrollReveal>
              <header className="section-heading-wrap">
                <span className="section-chapter">{t.documents.sectionNum} // 06</span>
                <h2 className="section-primary-title">{t.documents.heading}</h2>
                <p className="section-lead-text">{t.documents.subheading}</p>
              </header>
            </ScrollReveal>

            <div className="documents-pair-grid">
              {/* Document 1: Skills CV */}
              <ScrollReveal delay={60}>
                <div className="document-presentation-card">
                  <div className="doc-status-indicator">
                    <span className="doc-prep-dot" aria-hidden="true" />
                    <span>{t.documents.pendingBadge}</span>
                  </div>
                  <h3 className="doc-card-title">{t.documents.skillsCv.title}</h3>
                  <p className="doc-card-desc">{t.documents.skillsCv.desc}</p>
                  <div className="doc-notice-footer">
                    <p>{t.documents.skillsCv.status}</p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Document 2: Europass CV */}
              <ScrollReveal delay={120}>
                <div className="document-presentation-card">
                  <div className="doc-status-indicator">
                    <span className="doc-prep-dot" aria-hidden="true" />
                    <span>{t.documents.pendingBadge}</span>
                  </div>
                  <h3 className="doc-card-title">{t.documents.europassCv.title}</h3>
                  <p className="doc-card-desc">{t.documents.europassCv.desc}</p>
                  <div className="doc-notice-footer">
                    <p>{t.documents.europassCv.status}</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            06 — CONTACTO (PRECISIÓN Y TIPOGRAFÍA LIMPIA)
        ────────────────────────────────────────────────────────── */}
        <section
          id="contacto"
          className="section section--contact"
          aria-label="Información de contacto profesional"
        >
          <div className="container">
            <ScrollReveal>
              <header className="section-heading-wrap">
                <span className="section-chapter">{t.contact.sectionNum} // 06</span>
                <h2 className="section-primary-title">{t.contact.heading}</h2>
                <p className="section-lead-text">{t.contact.intro}</p>
              </header>
            </ScrollReveal>

            <div className="contact-pure-layout">
              {/* Primary Direct Email Channel */}
              <ScrollReveal delay={60}>
                <div className="contact-email-hero">
                  <span className="contact-field-label">{t.contact.emailLabel}</span>
                  <a
                    href="mailto:juanfernandoospina005@gmail.com"
                    className="contact-large-email"
                  >
                    juanfernandoospina005@gmail.com
                  </a>

                  <div className="contact-email-controls">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className={`btn-copy-address ${copiedEmail ? 'is-copied' : ''}`}
                      aria-label="Copiar dirección de correo electrónico al portapapeles"
                    >
                      {copiedEmail ? <IconCheck /> : <IconCopy />}
                      <span>{copiedEmail ? t.contact.copiedBtn : t.contact.copyBtn}</span>
                    </button>

                    <a
                      href="mailto:juanfernandoospina005@gmail.com"
                      className="email-client-link"
                    >
                      {t.contact.directSend}
                    </a>
                  </div>
                </div>
              </ScrollReveal>

              {/* Profiles & Location */}
              <ScrollReveal delay={120}>
                <div className="contact-secondary-strip">
                  <div className="contact-channel-item">
                    <span className="secondary-strip-label">GitHub</span>
                    <a
                      href="https://github.com/lominono"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-strip-link"
                    >
                      @lominono
                      <IconArrowExternal />
                    </a>
                  </div>

                  <div className="contact-channel-item">
                    <span className="secondary-strip-label">LinkedIn</span>
                    <a
                      href="https://www.linkedin.com/in/juan-fernando-ospina-tigreros-74185b443/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="secondary-strip-link"
                    >
                      Juan Fernando Ospina
                      <IconArrowExternal />
                    </a>
                  </div>

                  <div className="contact-channel-item">
                    <span className="secondary-strip-label">{t.contact.locationLabel}</span>
                    <span className="secondary-strip-static">{t.contact.locationValue}</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER EDITORIAL CON PRECISIÓN APPLE ─────────────── */}
      <footer className="apple-footer" role="contentinfo">
        <div className="container">
          <div className="footer-top-line">
            <span className="footer-identity-name">JUAN FERNANDO OSPINA TIGREROS</span>
            <span className="footer-vocation-note">{t.footer.academic}</span>
          </div>

          <div className="footer-bottom-line">
            <span className="footer-rights-text">{t.footer.rights}</span>
            <span className="footer-standards-text">{t.footer.standards}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
