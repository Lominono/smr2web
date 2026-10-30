'use client';

import { useState, useCallback } from 'react';

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const close = useCallback(() => setOpen(false), []);

  return (
    <nav className="nav" role="navigation" aria-label="Navegación principal">
      <div className="container nav__inner">
        <span className="nav__logo">JFO</span>

        <ul className={`nav__links${open ? ' is-open' : ''}`} role="list">
          {[
            ['#presentacion', 'Presentación'],
            ['#competencias', 'Competencias'],
            ['#proyectos', 'Proyectos'],
            ['#formacion', 'Formación'],
            ['#documentos', 'Documentos'],
            ['#contacto', 'Contacto'],
          ].map(([href, label]) => (
            <li key={href}>
              <a
                href={href}
                className="nav__link"
                onClick={close}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <button
          className="nav__toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-controls="nav-links"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
