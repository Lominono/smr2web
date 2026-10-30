'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Language, translations } from './translations';

interface CinematicIntroProps {
  currentLang: Language;
  onSelectLanguage: (lang: Language) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function CinematicIntro({
  currentLang,
  onSelectLanguage,
  isOpen,
  onClose,
}: CinematicIntroProps) {
  // Phase 1: 'name', Phase 2: 'lang', Phase 3: 'exit'
  const [phase, setPhase] = useState<'name' | 'lang' | 'exit'>('name');
  const [nameStep, setNameStep] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  const handleChooseLang = useCallback(
    (lang: Language) => {
      onSelectLanguage(lang);
      setPhase('exit');
      setTimeout(() => {
        onClose();
      }, 550);
    },
    [onSelectLanguage, onClose]
  );

  const handleSkip = useCallback(() => {
    onSelectLanguage(currentLang);
    setPhase('exit');
    setTimeout(() => {
      onClose();
    }, 350);
  }, [currentLang, onSelectLanguage, onClose]);

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(media.matches);
      if (media.matches) {
        // If reduced motion, jump straight to language selection
        setPhase('lang');
        return;
      }
    }

    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setNameStep(1), 150));
    timers.push(setTimeout(() => setNameStep(2), 650));
    timers.push(setTimeout(() => setNameStep(3), 1150));
    timers.push(setTimeout(() => setNameStep(4), 1650));
    timers.push(
      setTimeout(() => {
        setPhase('lang');
      }, 2900)
    );

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSkip]);

  if (!isOpen) return null;

  const t = translations[currentLang].intro;

  return (
    <div
      className={`intro-overlay ${phase === 'exit' ? 'intro-overlay--exit' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Introducción cinematográfica y selección de idioma"
    >
      {/* Background ambient geometry */}
      <div className="intro-bg" aria-hidden="true">
        <div className="intro-grid-line intro-grid-line--h" />
        <div className="intro-grid-line intro-grid-line--v" />
        <div className="intro-glow" />
      </div>

      {/* Top right skip button */}
      <div className="intro-skip-bar">
        <span className="intro-tag">JUAN FERNANDO OSPINA TIGREROS · 2026</span>
        <button
          type="button"
          onClick={handleSkip}
          className="intro-skip-btn"
          aria-label="Omitir presentación"
        >
          {t.skip}
        </button>
      </div>

      {/* PHASE 1: TYPOGRAPHIC NAME REVEAL */}
      <div
        className={`intro-stage intro-stage--name ${
          phase === 'name' ? 'is-active' : 'is-faded'
        }`}
      >
        <div className="intro-typography">
          <div className="intro-line-wrap">
            <span
              className={`intro-word intro-word--1 ${
                nameStep >= 1 ? 'is-revealed' : ''
              }`}
            >
              JUAN FERNANDO
            </span>
          </div>

          <div className="intro-line-wrap">
            <span
              className={`intro-word intro-word--2 ${
                nameStep >= 2 ? 'is-revealed' : ''
              }`}
            >
              OSPINA
            </span>
          </div>

          <div className="intro-line-wrap">
            <span
              className={`intro-word intro-word--3 ${
                nameStep >= 3 ? 'is-revealed' : ''
              }`}
            >
              TIGREROS
            </span>
          </div>
        </div>

        <div
          className={`intro-sub-block ${nameStep >= 4 ? 'is-revealed' : ''}`}
        >
          <div className="intro-sub-rule" aria-hidden="true" />
          <p className="intro-sub-meta">
            SISTEMAS MICROINFORMÁTICOS Y REDES · SANTANDER, ESPAÑA
          </p>
        </div>
      </div>

      {/* PHASE 2: MINIMALIST LANGUAGE SELECTION */}
      <div
        className={`intro-stage intro-stage--lang ${
          phase === 'lang' ? 'is-active' : 'is-hidden'
        }`}
      >
        <div className="intro-lang-card">
          <div className="intro-lang-header">
            <span className="intro-lang-badge">00 // ENTRADA</span>
            <h2 className="intro-lang-prompt">{t.chooseLanguage}</h2>
            <p className="intro-lang-hint">
              Selecciona tu idioma preferido · Select your preferred language
            </p>
          </div>

          <div className="intro-lang-options" role="group" aria-label="Selector de idioma">
            <button
              type="button"
              onClick={() => handleChooseLang('es')}
              className={`intro-lang-btn ${currentLang === 'es' ? 'is-selected' : ''}`}
              aria-label="Seleccionar Español"
            >
              <div className="intro-lang-btn__top">
                <span className="intro-lang-code">ES</span>
                <span className="intro-lang-dot" aria-hidden="true" />
              </div>
              <span className="intro-lang-name">Español</span>
              <span className="intro-lang-sub">Idioma oficial · España</span>
              <span className="intro-lang-arrow" aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={() => handleChooseLang('en')}
              className={`intro-lang-btn ${currentLang === 'en' ? 'is-selected' : ''}`}
              aria-label="Select English"
            >
              <div className="intro-lang-btn__top">
                <span className="intro-lang-code">EN</span>
                <span className="intro-lang-dot" aria-hidden="true" />
              </div>
              <span className="intro-lang-name">English</span>
              <span className="intro-lang-sub">International view · Global</span>
              <span className="intro-lang-arrow" aria-hidden="true">→</span>
            </button>
          </div>

          <div className="intro-lang-footer">
            <span className="intro-lang-note">
              Puedes cambiar el idioma en cualquier momento desde la barra superior.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
