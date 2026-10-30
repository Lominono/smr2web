'use client';

import React, { useState, useEffect, useCallback } from 'react';
import NavMenu from './NavMenu';
import CinematicIntro from './CinematicIntro';
import { ScrollReveal, Stagger } from './ScrollReveal';
import { Language, translations } from './translations';

// ─── Inline Clean SVGs ───────────────────────────────────────────
function IconGitHub() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20" aria-hidden="true">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
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
    // Read saved language or default
    try {
      const savedLang = localStorage.getItem('jfo_lang') as Language | null;
      if (savedLang === 'es' || savedLang === 'en') {
        setLang(savedLang);
      }
      const introSeen = sessionStorage.getItem('jfo_intro_seen');
      if (!introSeen) {
        setShowIntro(true);
      }
    } catch {
      // localStorage fallback
    }
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
    } catch {
      // fallback
    }
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

      {/* ─── NAVEGACIÓN STICKY EDITORIAL ──────────────────────── */}
      <NavMenu
        currentLang={lang}
        onToggleLang={handleToggleLang}
        onReplayIntro={handleReplayIntro}
      />

      <main id="main-content" className="main-content">
        {/* ──────────────────────────────────────────────────────────
            01 — IDENTIDAD PROFESIONAL / PRESENTACIÓN
        ────────────────────────────────────────────────────────── */}
        <section
          id="presentacion"
          className="hero-section"
          aria-label="Presentación e identidad profesional"
        >
          <div className="container hero-container">
            <div className="hero-grid">
              {/* Left Column: Typographic composition */}
              <div className="hero-content">
                <ScrollReveal delay={0}>
                  <div className="hero-meta-badge">
                    <span className="hero-meta-dot" aria-hidden="true" />
                    <span>{t.hero.meta}</span>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={100}>
                  <h1 className="hero-title">
                    <span className="hero-title__first">{t.hero.nameFirst}</span>
                    <span className="hero-title__last">
                      <em>{t.hero.nameLast}</em>
                    </span>
                  </h1>
                </ScrollReveal>

                <ScrollReveal delay={200}>
                  <p className="hero-tagline">{t.hero.tagline}</p>
                </ScrollReveal>

                <ScrollReveal delay={280}>
                  <blockquote className="hero-quote">
                    <p>«{t.hero.statement}»</p>
                  </blockquote>
                </ScrollReveal>

                <ScrollReveal delay={340}>
                  <div className="hero-availability" role="status">
                    <span className="availability-pulse" aria-hidden="true" />
                    <span>{t.hero.availability}</span>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={400}>
                  <div className="hero-actions">
                    <a href="#proyectos" className="btn btn--primary">
                      {t.hero.ctaProjects}
                      <span className="btn-arrow" aria-hidden="true">↓</span>
                    </a>

                    <a href="#contacto" className="btn btn--secondary">
                      {t.hero.ctaContact}
                    </a>

                    <a
                      href="https://github.com/lominono"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--ghost"
                      aria-label="GitHub @lominono"
                    >
                      <IconGitHub />
                      <span>@lominono</span>
                    </a>
                  </div>
                </ScrollReveal>
              </div>

              {/* Right Column: Architectural portrait frame */}
              <div className="hero-aside">
                <ScrollReveal delay={220} direction="right">
                  <div className="portrait-frame">
                    <div className="portrait-box">
                      <img
                        src="/foto-perfil.png"
                        alt="Juan Fernando Ospina Tigreros — Estudiante de Sistemas Microinformáticos y Redes"
                        className="portrait-img"
                        loading="eager"
                        decoding="async"
                      />
                      <div className="portrait-corner-badge" aria-hidden="true">
                        <span>SMR // 2026</span>
                      </div>
                    </div>

                    <div className="portrait-caption">
                      <span className="portrait-caption__num">01 / ID</span>
                      <span className="portrait-caption__text">
                        Juan Fernando Ospina Tigreros · 18 años
                      </span>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            02 — MATRIZ DE COMPETENCIAS
        ────────────────────────────────────────────────────────── */}
        <section
          id="competencias"
          className="section section--light"
          aria-label="Matriz de competencias técnicas y personales"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-header">
                <span className="section-num">{t.skills.sectionNum} // 06</span>
                <span className="section-tag">{t.skills.sectionTitle}</span>
              </div>
              <h2 className="section-title">{t.skills.heading}</h2>
              <p className="section-desc">{t.skills.subheading}</p>
            </ScrollReveal>

            <div className="skills-grid">
              {/* Hard Skills Column */}
              <ScrollReveal direction="left" delay={80}>
                <div className="skills-card">
                  <div className="skills-card__head">
                    <h3 className="skills-card__title">{t.skills.hardHeading}</h3>
                    <span className="skills-card__tag">SMR + Web</span>
                  </div>

                  <ul className="hard-skills-list" role="list">
                    {t.skills.items.map((skill, idx) => (
                      <li key={idx} className="hard-skill-item">
                        <span className="hard-skill-name">{skill.name}</span>
                        <span
                          className={`skill-badge skill-badge--${skill.variant}`}
                        >
                          {skill.level}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="skills-disclaimer">
                    <span className="disclaimer-icon" aria-hidden="true">ℹ</span>
                    <p>{t.skills.note}</p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Soft Skills Column */}
              <ScrollReveal direction="right" delay={140}>
                <div className="skills-card skills-card--secondary">
                  <div className="skills-card__head">
                    <h3 className="skills-card__title">{t.skills.softHeading}</h3>
                    <span className="skills-card__tag">Metodología</span>
                  </div>

                  <div className="soft-skills-cluster">
                    {t.skills.softSkills.map((soft, idx) => (
                      <div key={idx} className="soft-skill-chip">
                        <span className="soft-skill-index" aria-hidden="true">
                          0{idx + 1}
                        </span>
                        <span className="soft-skill-name">{soft}</span>
                      </div>
                    ))}
                  </div>

                  {/* Vocational Context Callout */}
                  <div className="vocational-callout">
                    <h4 className="vocational-title">IES Augusto González de Linares</h4>
                    <p className="vocational-body">
                      {lang === 'es'
                        ? 'Formación práctica intensiva en talleres de montaje, aulas de telecomunicaciones y laboratorios de sistemas bajo entorno Windows Server y distribuciones Linux.'
                        : 'Intensive hands-on training in hardware assembly labs, telecommunication facilities, and systems laboratories working with Windows Server and Linux environments.'}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            03 — PROYECTOS / ESCAPARATE TÉCNICO
        ────────────────────────────────────────────────────────── */}
        <section
          id="proyectos"
          className="section section--dark"
          aria-label="Escaparate de proyectos técnicos"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-header section-header--dark">
                <span className="section-num">{t.projects.sectionNum} // 06</span>
                <span className="section-tag">{t.projects.sectionTitle}</span>
              </div>
              <h2 className="section-title section-title--dark">
                {t.projects.heading}
              </h2>
              <p className="section-desc section-desc--dark">
                {t.projects.subheading}
              </p>
            </ScrollReveal>

            <div className="projects-grid">
              {t.projects.items.map((proj, idx) => (
                <ScrollReveal key={proj.id} delay={idx * 80}>
                  <article
                    className={`project-panel ${
                      proj.featured ? 'project-panel--featured' : ''
                    }`}
                  >
                    <div className="project-panel__top">
                      <span className="project-panel__index">{proj.index}</span>
                      <span className="project-panel__repo-badge">
                        GitHub Open Source
                      </span>
                    </div>

                    <h3 className="project-panel__title">{proj.title}</h3>
                    <p className="project-panel__tagline">{proj.tagline}</p>
                    <p className="project-panel__desc">{proj.desc}</p>

                    <div className="project-details">
                      <div className="project-detail-row">
                        <strong className="detail-label">
                          {t.projects.problemLabel}:
                        </strong>
                        <span className="detail-value">{proj.problem}</span>
                      </div>

                      <div className="project-detail-row">
                        <strong className="detail-label">
                          {t.projects.roleLabel}:
                        </strong>
                        <span className="detail-value">{proj.role}</span>
                      </div>
                    </div>

                    <div className="project-tech-tags" aria-label="Tecnologías">
                      {proj.tech.map((tech, tIdx) => (
                        <span key={tIdx} className="tech-chip">
                          {tech}
                        </span>
                      ))}
                    </div>

                    <div className="project-panel__footer">
                      <a
                        href={proj.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-action-link"
                        aria-label={`Ver código de ${proj.title} en GitHub`}
                      >
                        <IconGitHub />
                        <span>{t.projects.visitGithub}</span>
                        <IconExternal />
                      </a>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={200}>
              <div className="projects-all-callout">
                <p>
                  {t.projects.allReposNote}{' '}
                  <a
                    href="https://github.com/lominono"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-inline"
                  >
                    github.com/lominono
                  </a>
                </p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            04 — FORMACIÓN Y APRENDIZAJE FUTURO
        ────────────────────────────────────────────────────────── */}
        <section
          id="formacion"
          className="section section--light"
          aria-label="Formación reglada y aprendizaje futuro"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-header">
                <span className="section-num">{t.training.sectionNum} // 06</span>
                <span className="section-tag">{t.training.sectionTitle}</span>
              </div>
              <h2 className="section-title">{t.training.heading}</h2>
              <p className="section-desc">{t.training.subheading}</p>
            </ScrollReveal>

            <div className="training-layout">
              {/* Left Column: Official Vocational Degree */}
              <ScrollReveal direction="left" delay={60}>
                <div className="training-primary-card">
                  <div className="training-status-tag">
                    <span className="status-indicator-dot" aria-hidden="true" />
                    {t.training.currentBadge}
                  </div>

                  <h3 className="training-primary-title">
                    {t.training.currentTitle}
                  </h3>
                  <p className="training-primary-center">
                    {t.training.currentCenter}
                  </p>
                  <p className="training-primary-body">
                    {t.training.currentDesc}
                  </p>

                  <div className="training-subjects-block">
                    <h4 className="subjects-heading">
                      {t.training.subjectsTitle}
                    </h4>
                    <ul className="subjects-list" role="list">
                      {t.training.subjects.map((sub, sIdx) => (
                        <li key={sIdx} className="subject-item">
                          <span className="subject-bullet" aria-hidden="true">
                            ▪
                          </span>
                          <span>{sub}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right Column: Planned MOOC Itinerary */}
              <ScrollReveal direction="right" delay={120}>
                <div className="training-secondary-card">
                  <h3 className="training-itinerary-title">
                    {t.training.itineraryHeading}
                  </h3>

                  <div className="courses-list" role="list">
                    {t.training.courses.map((c, cIdx) => (
                      <div key={cIdx} className="course-row">
                        <div className="course-platform-badge">{c.platform}</div>
                        <div className="course-content">
                          <h4 className="course-name">{c.name}</h4>
                          <p className="course-meta">{c.meta}</p>
                          <div className="course-footer">
                            <span className="course-status-pill">
                              {c.statusLabel}
                            </span>
                            <a
                              href={c.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="course-info-link"
                              aria-label={`Información del curso ${c.name}`}
                            >
                              {lang === 'es' ? 'Ver temario' : 'View syllabus'} →
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
            05 — DOCUMENTACIÓN PROFESIONAL
        ────────────────────────────────────────────────────────── */}
        <section
          id="documentos"
          className="section section--alt"
          aria-label="Documentación profesional de empleabilidad"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-header">
                <span className="section-num">{t.documents.sectionNum} // 06</span>
                <span className="section-tag">{t.documents.sectionTitle}</span>
              </div>
              <h2 className="section-title">{t.documents.heading}</h2>
              <p className="section-desc">{t.documents.subheading}</p>
            </ScrollReveal>

            <div className="docs-dual-grid">
              {/* Card 1: CV Habilidades */}
              <ScrollReveal delay={80}>
                <article className="document-card">
                  <div className="document-card__icon" aria-hidden="true">
                    <IconDoc />
                  </div>
                  <span className="document-card__type">
                    {t.documents.skillsCv.type}
                  </span>
                  <h3 className="document-card__title">
                    {t.documents.skillsCv.title}
                  </h3>
                  <p className="document-card__desc">
                    {t.documents.skillsCv.desc}
                  </p>

                  <div className="document-card__status">
                    <span className="status-dot-pending" aria-hidden="true" />
                    <span>{t.documents.pendingNote}</span>
                  </div>

                  <div className="document-card__actions">
                    <a
                      href="/docs/cv-habilidades.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-doc btn-doc--view"
                      aria-label="Visualizar CV de Habilidades en PDF"
                    >
                      {t.documents.viewBtn}
                    </a>
                    <a
                      href="/docs/cv-habilidades.pdf"
                      download="CV-Juan-Fernando-Ospina.pdf"
                      className="btn-doc btn-doc--download"
                      aria-label="Descargar archivo PDF del CV de Habilidades"
                    >
                      {t.documents.downloadBtn}
                    </a>
                  </div>
                </article>
              </ScrollReveal>

              {/* Card 2: CV Europass */}
              <ScrollReveal delay={160}>
                <article className="document-card">
                  <div className="document-card__icon" aria-hidden="true">
                    <IconDoc />
                  </div>
                  <span className="document-card__type">
                    {t.documents.europassCv.type}
                  </span>
                  <h3 className="document-card__title">
                    {t.documents.europassCv.title}
                  </h3>
                  <p className="document-card__desc">
                    {t.documents.europassCv.desc}
                  </p>

                  <div className="document-card__status">
                    <span className="status-dot-pending" aria-hidden="true" />
                    <span>{t.documents.pendingNote}</span>
                  </div>

                  <div className="document-card__actions">
                    <a
                      href="/docs/cv-europass.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-doc btn-doc--view"
                      aria-label="Visualizar CV Europass en PDF"
                    >
                      {t.documents.viewBtn}
                    </a>
                    <a
                      href="/docs/cv-europass.pdf"
                      download="Europass-Juan-Fernando-Ospina.pdf"
                      className="btn-doc btn-doc--download"
                      aria-label="Descargar archivo PDF del CV Europass"
                    >
                      {t.documents.downloadBtn}
                    </a>
                  </div>
                </article>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            06 — CONTACTO Y REDES PROFESIONALES
        ────────────────────────────────────────────────────────── */}
        <section
          id="contacto"
          className="section section--contact"
          aria-label="Contacto directo y redes profesionales"
        >
          <div className="container">
            <ScrollReveal>
              <div className="section-header">
                <span className="section-num">{t.contact.sectionNum} // 06</span>
                <span className="section-tag">{t.contact.sectionTitle}</span>
              </div>
              <h2 className="section-title">{t.contact.heading}</h2>
            </ScrollReveal>

            <div className="contact-grid">
              {/* Left Column: Personal Message */}
              <ScrollReveal direction="left" delay={60}>
                <div className="contact-message-panel">
                  <p className="contact-intro">{t.contact.intro}</p>

                  <div className="contact-meta-box">
                    <div className="meta-row">
                      <span className="meta-label">
                        {t.contact.locationLabel}:
                      </span>
                      <strong className="meta-value">
                        {t.contact.locationValue}
                      </strong>
                    </div>
                    <p className="contact-avail-note">
                      {t.contact.availabilityNotice}
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right Column: Direct Channels */}
              <ScrollReveal direction="right" delay={120}>
                <div className="contact-channels" role="list">
                  {/* Channel: Email with Quick Copy */}
                  <div className="contact-channel-card">
                    <div className="channel-icon-wrap" aria-hidden="true">
                      <IconMail />
                    </div>
                    <div className="channel-body">
                      <span className="channel-type">
                        {lang === 'es' ? 'Correo Electrónico Directo' : 'Direct Email Address'}
                      </span>
                      <a
                        href="mailto:juanfernandoospina005@gmail.com"
                        className="channel-value channel-value--link"
                      >
                        juanfernandoospina005@gmail.com
                      </a>
                    </div>
                    <div className="channel-actions">
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className={`btn-copy ${copiedEmail ? 'is-copied' : ''}`}
                        aria-label="Copiar correo electrónico al portapapeles"
                      >
                        {copiedEmail ? <IconCheck /> : <IconCopy />}
                        <span>
                          {copiedEmail
                            ? t.contact.copiedEmail
                            : t.contact.copyEmail}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Channel: LinkedIn */}
                  <a
                    href="https://www.linkedin.com/in/juan-fernando-ospina-tigreros-74185b443/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-channel-card contact-channel-card--interactive"
                    aria-label="Perfil de LinkedIn de Juan Fernando Ospina Tigreros"
                  >
                    <div className="channel-icon-wrap" aria-hidden="true">
                      <IconLinkedIn />
                    </div>
                    <div className="channel-body">
                      <span className="channel-type">LinkedIn</span>
                      <span className="channel-value">
                        linkedin.com/in/juan-fernando-ospina-tigreros-74185b443
                      </span>
                    </div>
                    <span className="channel-arrow" aria-hidden="true">→</span>
                  </a>

                  {/* Channel: GitHub */}
                  <a
                    href="https://github.com/lominono"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-channel-card contact-channel-card--interactive"
                    aria-label="Perfil de GitHub @lominono"
                  >
                    <div className="channel-icon-wrap" aria-hidden="true">
                      <IconGitHub />
                    </div>
                    <div className="channel-body">
                      <span className="channel-type">GitHub</span>
                      <span className="channel-value">github.com/lominono</span>
                    </div>
                    <span className="channel-arrow" aria-hidden="true">→</span>
                  </a>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER EDITORIAL ─────────────────────────────────── */}
      <footer className="footer-bar" role="contentinfo">
        <div className="container footer-container">
          <div className="footer-left">
            <span className="footer-brand">JUAN FERNANDO OSPINA TIGREROS</span>
            <p className="footer-academic">{t.footer.academicNote}</p>
          </div>
          <div className="footer-right">
            <p className="footer-meta">Santander, Cantabria, España · 2026</p>
            <p className="footer-rights">{t.footer.rights}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
