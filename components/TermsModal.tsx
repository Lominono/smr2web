'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  Scale,
  Gamepad2,
  Lock,
  AlertTriangle,
  FileCheck2,
  BookOpen,
  WineOff,
  UserCheck,
  Building2,
  Check,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { Button } from '@/components/ui/Button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  showAcceptButton = false,
}) => {
  const [activeTab, setActiveTab] = useState<'disclaimer' | 'gaming' | 'community' | 'privacy'>('disclaimer');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] animate-in fade-in duration-200"
    >
      <div
        className="fixed inset-0"
        onClick={() => {
          sound.tap();
          onClose();
        }}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[92dvh] rounded-t-3xl sm:rounded-2xl shadow-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 id="terms-title" className="text-sm font-semibold tracking-tight">
                Aviso Legal, Condiciones y Privacidad
              </h2>
              <p className="text-[11px] text-neutral-500 font-mono">
                Marco normativo y descargos de responsabilidad · 2º SMR · Aula: Ni puta idea
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              sound.tap();
            }}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer active:scale-95 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-neutral-200 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-950 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'disclaimer', label: '1. Deslinde Institucional', icon: Building2 },
            { id: 'gaming', label: '2. Juegos y Fichas Ficticias', icon: Gamepad2 },
            { id: 'community', label: '3. Normas y Anti-Acoso', icon: Shield },
            { id: 'privacy', label: '4. Privacidad y RGPD', icon: Lock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  sound.tap();
                }}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 touch-manipulation ${
                  isActive
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans text-neutral-600 dark:text-neutral-400 leading-relaxed flex-1">
          {/* TAB 1: DESLINDE INSTITUCIONAL Y EDUCATIVO */}
          {activeTab === 'disclaimer' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    1.1 Naturaleza Privada, Extraoficial y Sin Ánimo de Lucro
                  </h3>
                </div>
                <p>
                  El portal web <strong>SMR2 Web</strong> (alojado en <code className="font-mono text-neutral-800 dark:text-neutral-200">smr2web.vercel.app</code>) es un proyecto colaborativo, técnico y experimental desarrollado de forma estrictamente privada e independiente por alumnos del segundo curso del Ciclo Formativo de Grado Medio en Sistemas Microinformáticos y Redes. Carece de cualquier finalidad comercial o económica.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 space-y-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-600 dark:text-red-400 text-xs">
                    1.2 Exención Total de Vinculación con el Centro Educativo y el Profesorado
                  </h3>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300">
                  Esta plataforma <strong>NO es una sede oficial ni un canal corporativo</strong> de ningún Instituto de Educación Secundaria (IES), centro educativo, Consejería de Educación ni organismo de la Administración Pública. Ni el centro docente, ni su equipo directivo, ni el profesorado tienen responsabilidad editorial, técnica, jurídica ni supervisora sobre el contenido de esta web.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    1.3 Carácter Informativo y No Vinculante de Horarios y Exámenes
                  </h3>
                </div>
                <p>
                  Los horarios lectivos, fechas de exámenes, entregas de prácticas y anotaciones de asignaturas (Sistemas Operativos en Red, Seguridad Informática, Servicios en Red, etc.) son introducidos por delegados o compañeros con fines meramente orientativos. <strong>Prevalecen siempre y en todo momento las comunicaciones directas, orales u oficiales que dicte el profesorado en clase.</strong> Los desarrolladores no asumen responsabilidad por retrasos, faltas de asistencia o calificaciones derivadas del uso de esta agenda orientativa.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                  1.4 Uso de Marcas y Materiales Docentes (Fair Use)
                </h3>
                <p>
                  Las menciones a marcas registradas de terceros (tales como Microsoft, Windows, Debian, Linux, Cisco, Minecraft, etc.) se realizan con fines exclusivamente pedagógicos, descriptivos y de referencia técnica dentro del temario formativo reglado de informática, de conformidad con el artículo 32 del Real Decreto Legislativo 1/1996 (Ley de Propiedad Intelectual). Pertenecen íntegramente a sus legítimos titulares.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: JUEGOS Y AZAR SIMULADO */}
          {activeTab === 'gaming' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    2.1 Moneda Virtual sin Valor Monetario (Exención Ley 13/2011 de Regulación del Juego)
                  </h3>
                </div>
                <p>
                  Todas las monedas, fichas, botes y puntos presentes en la plataforma (en juegos como Ruleta, Ruleta Rusa, Minas, Crash, Granja, etc.) constituyen <strong>simulaciones numéricas recreativas 100% ficticias</strong>.
                </p>
                <ul className="list-disc list-inside space-y-1 pt-1 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                  <li>Las fichas carecen de valor monetario, financiero o bursátil real.</li>
                  <li>No es posible comprar fichas con dinero real ni canjear fichas por euros ni bienes tangibles.</li>
                  <li>La plataforma no utiliza pasarelas de pago, TPVs, criptodivisas ni microtransacciones de pago.</li>
                  <li>SMR2 Web no es un operador de juego de azar ni requiere licencia de la Dirección General de Ordenación del Juego (DGOJ).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center gap-2">
                  <WineOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="font-semibold text-amber-600 dark:text-amber-400 text-xs">
                    2.2 Deslinde y Rechazo al Fomento del Consumo de Alcohol ("El Botellón")
                  </h3>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300">
                  El minijuego incremental y las gráficas paródicas denominadas &quot;El Botellón&quot; son una <strong>sátira de humor estudiantil y una obra de ficción paródica</strong>.
                </p>
                <p>
                  De conformidad con la Ley 34/1988 General de Publicidad y las normativas sobre prevención de drogodependencias, los desarrolladores <strong>no promueven, incitan, recomiendan ni publicitan el consumo de bebidas alcohólicas ni de sustancias tóxicas</strong>, especialmente entre menores de edad. Se reprueba expresamente el consumo de alcohol en espacios públicos y centros educativos.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                  2.3 Carácter Lúdico de Descanso Escolar
                </h3>
                <p>
                  Las utilidades recreativas están destinadas exclusivamente al entretenimiento en los minutos de descanso o recreo. Los logros y fichas acumulados no tienen ninguna repercusión académica o evaluativa en las materias del curso.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: NORMAS DE COMUNIDAD Y ANTI-BULLYING */}
          {activeTab === 'community' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-600 dark:text-red-400 text-xs">
                    3.1 Tolerancia Cero con el Acoso Escolar (Anti-Bullying) y Difamaciones
                  </h3>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300">
                  Queda terminantemente prohibido utilizar el feed, chat, alias o notas para verter insultos, amenazas, coacciones, conductas de acoso escolar (bullying / cyberbullying), difamaciones hacia compañeros o miembros del cuerpo docente, contenidos racistas, machistas, xenófobos o que vulneren el honor y la intimidad personal (Ley Orgánica 1/1982).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    3.2 Responsabilidad Exclusiva del Usuario (Art. 16 Ley 34/2002 LSSI-CE)
                  </h3>
                </div>
                <p>
                  SMR2 Web actúa exclusivamente como prestador de servicios de intermediación técnica y alojamiento de datos (hosting). En virtud del artículo 16 de la Ley 34/2002 (LSSI-CE), los administradores de la plataforma <strong>no se hacen responsables de las opiniones, publicaciones, enlaces o contenidos volcados por los usuarios</strong> en el feed en tiempo real. Cada usuario asume de forma única y personal toda la responsabilidad civil, administrativa o penal derivada de sus publicaciones.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                  3.3 Facultad de Moderación, Retirada y Expulsión Inmediata
                </h3>
                <p>
                  Los administradores se reservan el derecho irrestricto de moderar, editar, ocultar o eliminar cualquier mensaje, así como de suspender o revocar de forma inmediata el acceso a cualquier usuario que infrinja las normas de convivencia, sin que ello genere derecho a reclamación ni indemnización.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACIDAD, RGPD Y COOKIES */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    4.1 Tratamiento de Datos (Reglamento UE 2016/679 RGPD y LOPDGDD 3/2018)
                  </h3>
                </div>
                <p>
                  Los datos solicitados (nombre de usuario, correo electrónico, nombre real, número de estudiante / NIA y contraseña) son tratados exclusivamente para la gestión de acceso, prevención de duplicidades y visualización en la clasificación comunitaria del aula.
                </p>
                <ul className="list-disc list-inside space-y-1 pt-1 text-neutral-700 dark:text-neutral-300 font-mono text-[11px]">
                  <li><strong>Base jurídica:</strong> Consentimiento explícito al marcar la casilla de registro (Art. 6.1.a RGPD).</li>
                  <li><strong>Edad mínima:</strong> Declaras expresamente tener <strong>14 años o más</strong> para prestar válidamente tu consentimiento (Art. 7 LOPDGDD).</li>
                  <li><strong>Contraseñas seguras:</strong> Las claves se almacenan mediante algoritmos de dispersión criptográfica unidireccional (hash SHA-256 con salt y pepper).</li>
                  <li><strong>No comercialización:</strong> Tus datos jamás serán comercializados, cedidos ni transferidos a empresas publicitarias o terceros.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                    4.2 Ejercicio de Derechos ARCO y Derecho al Olvido
                  </h3>
                </div>
                <p>
                  Puedes acceder a tus datos, modificarlos en los Ajustes de la cuenta o ejercer tu derecho de supresión total (&quot;derecho al olvido&quot;) haciendo clic en el botón de <em>Restablecer Datos Locales</em> o solicitándolo directamente a los administradores del grupo para la eliminación completa de tus registros en la base de datos.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">
                  4.3 Política de Cookies Estrictamente Técnicas
                </h3>
                <p>
                  La plataforma utiliza únicamente cookies y almacenamiento local técnico esencial (<code className="font-mono text-neutral-800 dark:text-neutral-200">smr2_user_session</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">smr2_remember_me</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">smr2_theme</code>) estrictamente necesarios para mantener la sesión autenticada y tus preferencias visuales. No se utilizan cookies de rastreo publicitario de terceros.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between gap-3">
          <div className="text-[10px] text-neutral-500 font-mono">
            Última revisión: Octubre 2026 · Versión 2.6
          </div>

          <div className="flex items-center gap-2">
            {showAcceptButton && onAccept && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onAccept();
                  onClose();
                  sound.coinWin();
                }}
                className="rounded-xl text-xs px-4"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aceptar términos</span>
              </Button>
            )}

            <Button
              variant={showAcceptButton ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => {
                onClose();
                sound.tap();
              }}
              className="rounded-xl text-xs px-4"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
