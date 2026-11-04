'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

type SectionKey =
  | 'deslinde'
  | 'humor'
  | 'juegos'
  | 'convivencia'
  | 'privacidad'
  | 'tecnico'
  | 'contacto';

interface Section {
  id: SectionKey;
  number: string;
  title: string;
  shortLabel: string;
}

const SECTIONS: Section[] = [
  {
    id: 'deslinde',
    number: '01',
    title: 'Naturaleza del Proyecto y Deslinde Institucional',
    shortLabel: '01. Deslinde del IES',
  },
  {
    id: 'humor',
    number: '02',
    title: 'Parodia, Humor de Aula y Expresiones Coloquiales',
    shortLabel: '02. Humor y Parodia',
  },
  {
    id: 'juegos',
    number: '03',
    title: 'Juegos Virtuales, Ruleta Rusa y Ausencia de Apuestas',
    shortLabel: '03. Ruleta y Juegos',
  },
  {
    id: 'convivencia',
    number: '04',
    title: 'Normas de Convivencia y Prevención del Acoso Escolar',
    shortLabel: '04. Anti-Bullying',
  },
  {
    id: 'privacidad',
    number: '05',
    title: 'Protección de Datos Personales (RGPD y LOPDGDD)',
    shortLabel: '05. Privacidad y RGPD',
  },
  {
    id: 'tecnico',
    number: '06',
    title: 'Componentes de Inteligencia Artificial y Garantías',
    shortLabel: '06. Asistencia por IA',
  },
  {
    id: 'contacto',
    number: '07',
    title: 'Retirada Amistosa de Contenidos y Contacto Directo',
    shortLabel: '07. Takedown y Contacto',
  },
];

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('deslinde');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll del fondo cuando el modal esté abierto
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Si no está abierto o no ha montado en cliente, no renderizar
  if (!isOpen || !mounted) return null;

  // Portaleado directamente a document.body para evitar compresión en contenedores padres
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-heading"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-md font-sans select-none animate-in fade-in duration-200"
    >
      {/* Fondo clicable para cerrar */}
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Modal con tamaño amplio y espacioso */}
      <div
        className="relative z-10 w-full max-w-3xl md:max-w-4xl h-[88dvh] max-h-[760px] rounded-2xl bg-[#09090b] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden text-neutral-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Principal */}
        <header className="px-5 sm:px-7 py-4 border-b border-neutral-800/80 flex items-center justify-between shrink-0 bg-[#09090b]">
          <div>
            <h2
              id="terms-modal-heading"
              className="text-base sm:text-lg font-semibold tracking-tight text-white"
            >
              Marco Legal y Condiciones de Uso
            </h2>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              2º SMR · Aula: Ni puta idea · Proyecto Estudiantil Extraoficial
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Barra de navegación superior con pestañas (Segmented Control amplio) */}
        <nav
          aria-label="Índice de Cláusulas"
          className="px-4 sm:px-6 py-2.5 border-b border-neutral-800/80 bg-neutral-950/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0"
        >
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                }`}
              >
                <span>{sec.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Área de Lectura Editorial a ancho completo (con espacio generoso) */}
        <main className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto space-y-6 text-sm text-neutral-300 select-text leading-relaxed font-sans">
          {/* SECCIÓN 1: DESLINDE */}
          {activeSection === 'deslinde' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 01
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Naturaleza del Proyecto y Deslinde Institucional
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  El portal <strong>SMR2 Web</strong> (accesible en{' '}
                  <code className="font-mono text-neutral-200 bg-neutral-900 px-1.5 py-0.5 rounded text-xs">
                    smr2web.vercel.app
                  </code>
                  ) es una plataforma creada, administrada y mantenida de manera
                  completamente independiente por estudiantes de 2º curso del Ciclo
                  Formativo de Grado Medio en Sistemas Microinformáticos y Redes (SMR).
                </p>

                <div className="border-l-2 border-neutral-700 pl-4 py-1.5 text-neutral-400 text-xs italic">
                  Finalidad didáctica: Este sitio web ha sido diseñado como un proyecto
                  extracurricular de aprendizaje práctico en desarrollo web moderno, redes y
                  gestión de servicios digitales.
                </div>

                <p>
                  <strong>Exoneración del Centro Educativo y Docentes:</strong> Este portal{' '}
                  <strong>NO constituye la sede electrónica, canal corporativo ni portal oficial</strong>{' '}
                  de ningún Instituto de Educación Secundaria (IES), Consejería de Educación,
                  Ministerio ni organismo público alguno. El centro docente, su equipo
                  directivo y el profesorado quedan total y expresamente exonerados de cualquier
                  responsabilidad jurídica, civil, penal o editorial derivada del uso, contenido,
                  mensajes o fallos técnicos de esta web.
                </p>

                <p>
                  <strong>Carácter Orientativo de Horarios y Fechas:</strong> La agenda, horarios
                  lectivos, fechas de exámenes y entregas mostradas en este portal se ofrecen con
                  carácter informativo y no vinculante. Prevalecen en todo momento las
                  comunicaciones verbales y oficiales emitidas por el profesorado en el aula.
                </p>
              </div>
            </article>
          )}

          {/* SECCIÓN 2: HUMOR Y PARODIA */}
          {activeSection === 'humor' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 02
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Parodia, Humor de Aula y la Expresión &quot;Aula: Ni puta idea&quot;
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  En el encabezado y diversas secciones de esta web aparece la frase humorística{' '}
                  <em>&quot;Aula: Ni puta idea&quot;</em>, así como motes amistosos y referencias
                  desenfadadas propias de la convivencia diaria en el aula.
                </p>

                <p>
                  <strong>Amparo Constitucional:</strong> De conformidad con el{' '}
                  <strong>artículo 20.1 de la Constitución Española</strong>, que consagra el
                  derecho fundamental a la libertad de expresión, creación artística y literaria,
                  estas expresiones constituyen parodia estudiantil sin intención vejatoria,
                  injuriosa ni difamatoria hacia ninguna persona, profesor o institución.
                </p>

                <p>
                  La coletilla humorística describe exclusivamente la anécdota recurrente del
                  alumnado al no recordar el número de aula asignada durante los cambios de
                  materia o desdobles de grupos de prácticas.
                </p>

                <div className="border-l-2 border-neutral-700 pl-4 py-1.5 text-neutral-400 text-xs italic">
                  Cláusula de Buena Fe: Cualquier estudiante, docente o miembro de la comunidad
                  escolar que considere que una broma, avatar o frase pueda causarle molestia,
                  podrá solicitar su modificación o eliminación inmediata mediante el protocolo
                  de retirada amistosa descrito en el Artículo 07.
                </div>
              </div>
            </article>
          )}

          {/* SECCIÓN 3: JUEGOS Y RULETA RUSA */}
          {activeSection === 'juegos' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 03
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Simulaciones Recreativas, Ruleta Rusa y Ausencia de Apuestas
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  Los minijuegos interactivos presentes en la web (Crash, Minas, Ruleta, Ruleta
                  Rusa, El Botellón y Angry Cable) son{' '}
                  <strong>simulaciones algorítmicas puramente recreativas</strong> programadas en
                  TypeScript y React.
                </p>

                <p>
                  <strong>Exención Total de la Ley 13/2011 de Regulación del Juego:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-2 text-neutral-300">
                  <li>
                    No se utiliza, apuesta ni admite dinero de curso legal, divisas ni
                    criptoactivos.
                  </li>
                  <li>
                    Las monedas o puntos virtuales son marcadores de ocio sin valor patrimonial ni
                    convertibilidad comercial o económica.
                  </li>
                  <li>
                    SMR2 Web no es un operador de juego y no requiere autorización de la
                    Dirección General de Ordenación del Juego (DGOJ).
                  </li>
                </ul>

                <p>
                  <strong>Naturaleza Lógica de la &quot;Ruleta Rusa&quot;:</strong> La mecánica
                  denominada &quot;Ruleta Rusa&quot; consiste exclusivamente en un juego por turnos
                  de eliminación probabilística abstracta. En ningún caso incita, promueve,
                  glorifica ni trivializa el uso de armas de fuego, la violencia física ni las
                  conductas autolíticas o de suicidio, las cuales se rechazan y condenan de forma
                  enérgica e inequívoca.
                </p>

                <p>
                  <strong>Sátira de &quot;El Botellón&quot;:</strong> El juego incremental de &quot;El
                  Botellón&quot; es una representación satírica de ficción. En cumplimiento de la
                  Ley 34/1988 y la legislación de salud pública, los administradores reprueban y
                  desaconsejan categóricamente el consumo de alcohol y sustancias nocivas, en
                  especial por personas menores de edad o en dependencias escolares.
                </p>
              </div>
            </article>
          )}

          {/* SECCIÓN 4: CONVIVENCIA Y ANTI-BULLYING */}
          {activeSection === 'convivencia' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 04
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Convivencia Escolar y Tolerancia Cero al Ciberacoso
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  <strong>Tolerancia Cero frente al Acoso Escolar (Anti-Bullying):</strong> Queda
                  terminantemente prohibido emplear cualquier canal de chat, publicación de notas
                  o perfiles de usuario para cometer actos de acoso escolar presencial o telemático
                  (ciberbullying), humillaciones, amenazas, coacciones, difamaciones o difusión no
                  autorizada de datos personales o imágenes íntimas (doxxing).
                </p>

                <p>
                  <strong>Régimen de Responsabilidad (Artículo 16 LSSI-CE):</strong> De conformidad
                  con el artículo 16 de la Ley 34/2002 de Servicios de la Sociedad de la Información
                  y de Comercio Electrónico (LSSI-CE), los administradores actúan como prestadores
                  de servicios de intermediación técnica y alojamiento.
                </p>

                <p>
                  Cada usuario es el único y exclusivo responsable legal de los comentarios,
                  mensajes o contenidos que emita a través de la plataforma. Los administradores
                  actuarán con la máxima diligencia para retirar cualquier contenido que infrinja
                  estas normas tan pronto como tengan conocimiento efectivo del mismo.
                </p>

                <p>
                  Los administradores se reservan el derecho irrevocable de suspender o eliminar
                  permanentemente la cuenta de cualquier usuario que contravenga las reglas de
                  respeto mutuo y convivencia.
                </p>
              </div>
            </article>
          )}

          {/* SECCIÓN 5: PRIVACIDAD Y RGPD */}
          {activeSection === 'privacidad' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 05
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Protección de Datos Personales (RGPD y LOPDGDD)
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  En cumplimiento del <strong>Reglamento General de Protección de Datos (RGPD UE 2016/679)</strong>{' '}
                  y de la <strong>Ley Orgánica 3/2018 (LOPDGDD)</strong>, se informa a los
                  usuarios sobre el tratamiento de sus datos:
                </p>

                <ul className="list-disc pl-5 space-y-2 text-neutral-300">
                  <li>
                    <strong>Legitimación:</strong> Consentimiento libre, específico e informado
                    otorgado por el usuario al registrarse (Art. 6.1.a RGPD).
                  </li>
                  <li>
                    <strong>Edad mínima de acceso:</strong> De acuerdo con el Art. 7 de la
                    LOPDGDD, el usuario declara ser mayor de 14 años para consentir el
                    tratamiento de sus datos en España.
                  </li>
                  <li>
                    <strong>Principio de Minimización:</strong> Únicamente se recaba el alias
                    (nombre de usuario), dirección de correo electrónico con fines de
                    identificación técnica, y la contraseña encriptada.
                  </li>
                  <li>
                    <strong>Seguridad Criptográfica:</strong> Las contraseñas se almacenan
                    utilizando algoritmos criptográficos hash unidireccionales (Argon2 / SHA-256),
                    siendo inaccesibles en texto plano para los administradores.
                  </li>
                  <li>
                    <strong>Sin Cesión Comercial:</strong> Los datos jamás serán comercializados,
                    cedidos ni compartidos con anunciantes ni terceras partes.
                  </li>
                </ul>

                <p>
                  <strong>Derechos ARCO y Derecho al Olvido:</strong> Cualquier usuario puede
                  ejercer sus derechos de acceso, rectificación y supresión definitiva (derecho
                  al olvido) borrando sus datos en la sección de Ajustes o solicitándolo
                  directamente a los administradores para la purga inmediata de sus registros.
                </p>
              </div>
            </article>
          )}

          {/* SECCIÓN 6: IA Y TÉCNICO */}
          {activeSection === 'tecnico' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 06
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Inteligencia Artificial y Disponibilidad Técnica
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  <strong>Modelos de Inteligencia Artificial Generativa:</strong> Cualquier
                  asistente conversacional o respuesta generada por IA dentro de la web es
                  producida por modelos de lenguaje automáticos y probabilísticos. Las respuestas
                  tienen carácter exclusivamente lúdico y no constituyen asesoramiento académico,
                  docente ni técnico vinculante.
                </p>

                <p>
                  <strong>Disponibilidad &quot;Tal Cual&quot; (As-Is):</strong> El portal se
                  ofrece sin compromisos de nivel de servicio (SLA). Los administradores podrán
                  actualizar, reiniciar o suspender temporal o definitivamente la infraestructura
                  por mantenimiento técnico sin que de ello se derive derecho a indemnización.
                </p>
              </div>
            </article>
          )}

          {/* SECCIÓN 7: TAKEDOWN Y CONTACTO */}
          {activeSection === 'contacto' && (
            <article className="space-y-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
                  Artículo 07
                </span>
                <h3 className="text-xl font-semibold tracking-tight text-white mt-1">
                  Protocolo de Retirada Amistosa y Contacto Directo
                </h3>
              </div>

              <div className="space-y-4">
                <p>
                  Este proyecto ha sido concebido desde el compañerismo y el respeto mutuo. Si
                  cualquier compañero de clase, profesor o persona interesada desea que se
                  modifique, oculte o elimine cualquier texto, chiste, imagen o referencia, nos
                  comprometemos a realizar la retirada de forma{' '}
                  <strong>inmediata, amistosa y sin ningún tipo de objeción</strong>.
                </p>

                <p>
                  Para tramitar cualquier petición de retirada o sugerencia, puedes recurrir a:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-neutral-300">
                  <li>El botón de Feedback / Buzón de sugerencias ubicado en el menú inferior.</li>
                  <li>Contacto directo y presencial con los administradores en el aula (JuanFe y David).</li>
                </ul>

                <div className="border-l-2 border-neutral-700 pl-4 py-1.5 text-neutral-400 text-xs italic">
                  Última actualización: Noviembre 2026. Revisado para garantizar la máxima
                  transparencia, independencia y protección jurídica de toda la comunidad de 2º
                  SMR.
                </div>
              </div>
            </article>
          )}
        </main>

        {/* Footer con Acciones */}
        <footer className="px-5 sm:px-7 py-3.5 border-t border-neutral-800/80 bg-neutral-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-neutral-500">
            Revisión oficial · Noviembre 2026
          </div>

          <div className="flex items-center gap-2">
            {showAcceptButton && onAccept && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="bg-white hover:bg-neutral-200 text-neutral-950 font-medium text-xs rounded-xl px-4 py-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                <span>Aceptar términos</span>
              </Button>
            )}

            <Button
              variant={showAcceptButton ? 'secondary' : 'primary'}
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs px-4 py-1.5 cursor-pointer"
            >
              Cerrar
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default TermsModal;
