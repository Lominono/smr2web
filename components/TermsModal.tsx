'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Scale,
  Gamepad2,
  Lock,
  AlertTriangle,
  BookOpen,
  WineOff,
  UserCheck,
  Building2,
  Check,
  Search,
  Sparkles,
  Bot,
  Laugh,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

type TabType =
  | 'overview'
  | 'disclaimer'
  | 'satire'
  | 'gaming'
  | 'community'
  | 'privacy'
  | 'tech';

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = useMemo(
    () => [
      { id: 'overview' as TabType, label: 'Resumen Rápido', icon: Sparkles },
      { id: 'disclaimer' as TabType, label: '1. Deslinde del Instituto', icon: Building2 },
      { id: 'satire' as TabType, label: '2. Humor y Bromas', icon: Laugh },
      { id: 'gaming' as TabType, label: '3. Juegos y Ruleta Rusa', icon: Gamepad2 },
      { id: 'community' as TabType, label: '4. Convivencia y Respeto', icon: Shield },
      { id: 'privacy' as TabType, label: '5. Privacidad y RGPD', icon: Lock },
      { id: 'tech' as TabType, label: '6. IA y Responsabilidad', icon: Bot },
    ],
    []
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      className="fixed inset-0 z-[10050] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none font-sans animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90dvh] rounded-2xl shadow-2xl bg-neutral-950 border border-neutral-800 text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header con Búsqueda */}
        <div className="px-5 py-4 border-b border-neutral-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-neutral-300 shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 id="terms-title" className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Marco Legal, Descargos y Privacidad</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 rounded">
                  Blindaje Legal Total
                </span>
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                2º SMR · Aula: Ni puta idea · Proyecto Estudiantil Extraoficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Buscador en tiempo real */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cláusula..."
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Barra de Navegación Segmentada */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-neutral-900 bg-neutral-950 overflow-x-auto scrollbar-none text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 text-xs ${
                  isActive
                    ? 'bg-white text-neutral-950 font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Contenido Legal Extensivo */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-neutral-400 leading-relaxed flex-1 select-text">
          {/* TAB 0: RESUMEN RÁPIDO */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neutral-300" />
                  <span>En 30 segundos: ¿Qué es y qué NO es esta web?</span>
                </h3>
                <ul className="space-y-1.5 list-disc list-inside text-neutral-300 text-xs">
                  <li><strong>Web de alumnos:</strong> Proyecto extracurricular independiente creado por estudiantes de 2º SMR para consultar horarios, avisos y entretenerse en los descansos.</li>
                  <li><strong>Sin vínculo con el instituto:</strong> El centro educativo, su dirección y los profesores no tienen ninguna responsabilidad legal ni editorial sobre esta web.</li>
                  <li><strong>Humor y parodia:</strong> Las frases cómicas como <em>&quot;Aula: Ni puta idea&quot;</em> y bromas estudiantiles son pura sátira y no buscan ofender a nadie.</li>
                  <li><strong>Juegos 100% ficticios:</strong> No se juega dinero real, no se compran fichas ni se fomenta el juego ni las apuestas.</li>
                  <li><strong>Tus datos protegidos:</strong> Solo se guardan los datos mínimos para el inicio de sesión. No se venden ni comparten.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('disclaimer')}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-white font-medium text-xs">
                    <Building2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                    <span>Deslinde con el Instituto</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Aclaración sobre la independencia del IES, docentes y exámenes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('satire')}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-white font-medium text-xs">
                    <Laugh className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                    <span>Bromas, Parodia y Expresiones</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Amparo constitucional para el humor de clase y motes.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('gaming')}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-white font-medium text-xs">
                    <Gamepad2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                    <span>Juegos, Fichas y Ruleta Rusa</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Exención sobre apuestas y simulaciones recreativas lógicas.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('privacy')}
                  className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 text-left space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 text-white font-medium text-xs">
                    <Lock className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                    <span>Privacidad y RGPD</span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Tratamiento de credenciales, derecho de supresión y cookies.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: DESLINDE INSTITUCIONAL */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    1.1 Desvinculación Oficial y Extraoficialidad
                  </h3>
                </div>
                <p>
                  El portal <strong>SMR2 Web</strong> (<code className="font-mono text-neutral-300">smr2web.vercel.app</code>) es un aplicativo desarrollado por estudiantes de 2º de Sistemas Microinformáticos y Redes con fines puramente didácticos, técnicos y de uso interno para la convivencia del grupo.
                </p>
                <p>
                  <strong>NO es la sede electrónica, canal corporativo ni portal oficial</strong> de ningún Instituto de Educación Secundaria (IES), Consejería de Educación, Ministerio de Educación ni administración pública alguna. El centro docente, el equipo directivo y el cuerpo docente quedan <strong>plenamente exonerados</strong> de cualquier responsabilidad editorial, jurídica o técnica derivada de este sitio web.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    1.2 Horarios, Exámenes y Fechas Lectivas
                  </h3>
                </div>
                <p>
                  La información de horarios, entregas de trabajos y calendario de exámenes mostrada en la plataforma tiene un <strong>carácter puramente orientativo y no vinculante</strong>.
                </p>
                <p>
                  Prevalecen en todo momento las comunicaciones oficiales emitidas oralmente o por los canales institucionales del profesorado en el aula. Los desarrolladores no asumen responsabilidad por olvidos, faltas de asistencia o calificaciones derivadas de la consulta de esta agenda.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PARODIA, HUMOR Y LENGUAJE COLOQUIAL */}
          {activeTab === 'satire' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Laugh className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    2.1 Expresiones Coloquiales y la Coletilla &quot;Aula: Ni puta idea&quot;
                  </h3>
                </div>
                <p>
                  La frase humorística recurrente <em>&quot;Aula: Ni puta idea&quot;</em>, así como los apodos desenfadados o memes internos del aula que pudieran aparecer en la plataforma, constituyen <strong>expresiones espontáneas de humor estudiantil juvenil y parodia de aula</strong>.
                </p>
                <p>
                  De conformidad con el <strong>artículo 20.1 de la Constitución Española</strong> (libertad de expresión y de creación literaria/artística), tales manifestaciones no albergan intención vejatoria, injuriosa, difamatoria ni ánimo de ofender a profesores, compañeros ni instituciones. Se trata de modismos coloquiales propios de la convivencia entre compañeros de clase en un entorno informal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    2.2 Procedimiento de Notificación y Retirada Amistosa (Takedown)
                  </h3>
                </div>
                <p>
                  Si cualquier alumno, profesor o visitante considera que alguna expresión, chiste, avatar o referencia le resulta incómoda o excede el límite del humor sano entre compañeros, podrá solicitar su <strong>retirada inmediata e incondicional</strong> a través del apartado de Feedback o contactando directamente con los administradores, sin necesidad de trámites contenciosos.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: JUEGOS, RULETA RUSA Y FICHAS FICTICIAS */}
          {activeTab === 'gaming' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    3.1 Ausencia Total de Apuestas Reales (Exención Ley 13/2011)
                  </h3>
                </div>
                <p>
                  Todas las monedas, créditos y marcadores de juego son <strong>simulaciones algorítmicas puramente recreativas</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-neutral-300">
                  <li>No es posible ingresar dinero real, euros, criptomonedas ni bienes de ningún tipo.</li>
                  <li>No es posible canjear los puntos del juego por dinero ni recompensas físicas.</li>
                  <li>SMR2 Web no es un operador de juego y no requiere licencia de la Dirección General de Ordenación del Juego (DGOJ).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-amber-300 text-xs">
                    3.2 El Minijuego &quot;Ruleta Rusa&quot; como Ejercicio Lógico
                  </h3>
                </div>
                <p>
                  El minijuego multijugador denominado &quot;Ruleta Rusa&quot; es una <strong>mecánica lógica de probabilidad y eliminación por turnos</strong> en TypeScript / Next.js.
                </p>
                <p>
                  Bajo ninguna circunstancia promueve, incita, glorifica ni trivializa la violencia, el uso de armas de fuego ni las conductas autolíticas (suicidio), conductas tipificadas en el Código Penal. Se desaprueba enérgicamente cualquier forma de violencia real.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <WineOff className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    3.3 Sátira de &quot;El Botellón&quot; y Prevención de Adicciones
                  </h3>
                </div>
                <p>
                  El juego clicker de &quot;El Botellón&quot; es una ficción satírica juvenil. En estricto cumplimiento de la Ley 34/1988 y normativas sobre drogodependencias, los desarrolladores <strong>rechazan y no promueven el consumo de bebidas alcohólicas ni sustancias tóxicas</strong>, en particular entre menores de edad, y reprueban el consumo en el entorno escolar.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: CONVIVENCIA Y ANTI-BULLYING */}
          {activeTab === 'community' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    4.1 Política de Tolerancia Cero frente al Acoso Escolar (Anti-Bullying)
                  </h3>
                </div>
                <p>
                  Queda estrictamente vetado el uso de cualquier función de chat, publicación de notas o nombres de usuario para proferir insultos graves, amenazas, coacciones, difamaciones, filtración de datos privados (doxxing), o cualquier conducta constitutiva de acoso escolar presencial o telemático (cyberbullying).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    4.2 Responsabilidad Exclusiva del Usuario (Art. 16 LSSI-CE)
                  </h3>
                </div>
                <p>
                  De conformidad con el artículo 16 de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE), los administradores actúan como meros intermediarios técnicos de alojamiento. Cada usuario responde de manera personal y exclusiva de los mensajes y contenidos que vuelque en la plataforma.
                </p>
                <p>
                  Los administradores se reservan el derecho de moderar, censurar o revocar de forma inmediata la cuenta de cualquier usuario que incumpla las normas de convivencia básica.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACIDAD Y RGPD */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    5.1 Tratamiento de Datos (RGPD UE 2016/679 y LOPDGDD 3/2018)
                  </h3>
                </div>
                <p>
                  Los datos recabados en el registro (nombre de usuario, correo electrónico y contraseña cifrada) tienen como única base jurídica el <strong>consentimiento voluntario</strong> del usuario (Art. 6.1.a RGPD) para acceder al portal y a la tabla de líderes de la clase.
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-neutral-300">
                  <li><strong>Edad mínima:</strong> Declaras ser mayor de 14 años para consentir válidamente el tratamiento (Art. 7 LOPDGDD).</li>
                  <li><strong>Cifrado criptográfico:</strong> Las contraseñas se almacenan mediante funciones hash unidireccionales (SHA-256 / Supabase Auth).</li>
                  <li><strong>Sin venta a terceros:</strong> Tus datos jamás serán vendidos, transferidos ni utilizados para fines comerciales.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    5.2 Derechos ARCO y Derecho al Olvido
                  </h3>
                </div>
                <p>
                  Cualquier alumno puede solicitar la modificación o eliminación total e inmediata de sus datos (derecho al olvido) utilizando la función de restablecimiento local en Ajustes o contactando a los administradores para la purga definitiva de su cuenta en la base de datos.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: IA Y RESPONSABILIDAD TÉCNICA */}
          {activeTab === 'tech' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-white" />
                  <h3 className="font-semibold text-white text-xs">
                    6.1 Modelos de IA Generativa y Asistentes Virtuales
                  </h3>
                </div>
                <p>
                  Las respuestas generadas por los componentes de inteligencia artificial (asistentes lúdicos, simulaciones interactivas o avatares) son generadas automáticamente por modelos de lenguaje en tiempo real.
                </p>
                <p>
                  Los desarrolladores no garantizan la veracidad fáctica de las respuestas generadas por IA ni asumen responsabilidad por imprecisiones académicas o técnicas que el modelo pueda emitir (&quot;alucinaciones&quot;).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-2">
                <h3 className="font-semibold text-white text-xs">
                  6.2 Disponibilidad del Servicio &quot;Tal Cual&quot; (As-Is)
                </h3>
                <p>
                  El servicio se presta sin garantías de disponibilidad ininterrumpida (SLA). Los administradores podrán realizar tareas de mantenimiento, actualización o cierre temporal de la web sin previo aviso ni indemnización.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. Footer con Aceptación */}
        <div className="p-4 border-t border-neutral-800/90 bg-neutral-900/40 flex items-center justify-between gap-3">
          <div className="text-[10px] text-neutral-500 font-mono">
            Revisión oficial · Noviembre 2026 · SMR2 Legal Framework
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
                className="bg-white hover:bg-neutral-200 text-neutral-950 font-semibold text-xs rounded-xl px-4 py-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aceptar términos</span>
              </Button>
            )}

            <Button
              variant={showAcceptButton ? 'secondary' : 'primary'}
              size="sm"
              onClick={onClose}
              className="rounded-xl text-xs px-4 py-2"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
