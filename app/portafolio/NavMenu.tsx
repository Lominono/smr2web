'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Language, translations } from './translations';

interface NavMenuProps {
  currentLang: Language;
  onToggleLang: () => void;
  onReplayIntro: () => void;
}

export default function NavMenu({
  currentLang,
  onToggleLang,
  onReplayIntro,
}: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const t = translations[currentLang].nav;

  const navLinks = [
    { href: '#presentacion', label: t.presentation },
    { href: '#competencias', label: t.skills },
    { href: '#proyectos', label: t.projects },
    { href: '#formacion', label: t.training },
    { href: '#documentos', label: t.documents },
    { href: '#contacto', label: t.contact },
  ];

  return (
    <header
      className={`nav-wrapper ${scrolled ? 'nav-wrapper--scrolled' : ''}`}
      role="banner"
    >
      <nav
        className="nav container"
        role="navigation"
        aria-label="Navegación principal / Main navigation"
      >
        <div className="nav__inner">
          {/* Logo / Monogram */}
          <a href="#presentacion" className="nav__logo" aria-label="Inicio / Home">
            <span className="nav__logo-mark">JFO</span>
            <span className="nav__logo-sub">Santander · 2026</span>
          </a>

          {/* Desktop links */}
          <ul className={`nav__links ${open ? 'is-open' : ''}`} role="list">
            {navLinks.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="nav__link"
                  onClick={close}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Action controls: Language switch & Intro replay & Hamburger */}
          <div className="nav__actions">
            {/* Replay Intro button */}
            <button
              type="button"
              onClick={onReplayIntro}
              className="nav__btn-intro"
              title="Volver a ver la animación inicial"
              aria-label={t.replayIntro}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="nav__intro-icon"
                aria-hidden="true"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              <span className="nav__intro-text">{t.replayIntro}</span>
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={onToggleLang}
              className="nav__lang-toggle"
              aria-label={`Cambiar idioma. Actual: ${currentLang.toUpperCase()}`}
            >
              <span className={`nav__lang-opt ${currentLang === 'es' ? 'is-active' : ''}`}>
                ES
              </span>
              <span className="nav__lang-sep">/</span>
              <span className={`nav__lang-opt ${currentLang === 'en' ? 'is-active' : ''}`}>
                EN
              </span>
            </button>

            {/* Hamburger button for mobile */}
            <button
              className="nav__toggle"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-controls="nav-links"
            >
              <span className={`nav__bar ${open ? 'nav__bar--top' : ''}`} />
              <span className={`nav__bar ${open ? 'nav__bar--mid' : ''}`} />
              <span className={`nav__bar ${open ? 'nav__bar--bot' : ''}`} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
