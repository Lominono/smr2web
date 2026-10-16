'use client';

import React, { useState } from 'react';
import { LogIn, UserPlus, Key, User, Terminal, Sparkles, X, Database } from 'lucide-react';
import { Profile } from '@/lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  onSetCustomUser: (user: Profile) => void;
  isSupabaseConfigured: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSetCustomUser,
  isSupabaseConfigured,
}) => {
  const [activeTab, setActiveTab] = useState<'alias' | 'supabase'>('alias');
  const [alias, setAlias] = useState(currentUser?.username || '');
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [rank, setRank] = useState(currentUser?.rank || 'Admin de DHCP');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const ranksList: Profile['rank'][] = [
    'Script Kiddie',
    'Crimpador Novato',
    'Admin de DHCP',
    'Master de Active Directory',
    'Root Supremo del Aula',
  ];

  const handleSaveAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias.trim()) return;

    const updatedUser: Profile = {
      id: currentUser?.id || `user-${Date.now()}`,
      username: alias.trim().toLowerCase().replace(/\s+/g, '_'),
      full_name: fullName.trim() || 'Sysadmin de Clase',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${alias.trim()}`,
      rank: rank,
      karma_points: currentUser?.karma_points || 120,
    };

    onSetCustomUser(updatedUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Terminal className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Identifícate en la Intranet</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Mote Rápido vs Supabase Auth */}
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('alias')}
            className={`flex-1 py-3 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'alias'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Mote & Perfil Rápido
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`flex-1 py-3 text-xs font-mono font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Auth</span>
          </button>
        </div>

        {/* Tab 1: Mote Rápido */}
        {activeTab === 'alias' && (
          <form onSubmit={handleSaveAlias} className="p-6 space-y-4">
            <p className="text-xs text-zinc-400">
              Elige tu mote de clase y tu rango de sysadmin para que aparezcan en los marrones y el muro.
            </p>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">
                Tu Mote / Alias *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs font-mono">@</span>
                <input
                  type="text"
                  required
                  placeholder="adri_debian, root_carlos, etc."
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">
                Nombre o apodo real (opcional)
              </label>
              <input
                type="text"
                placeholder="Adrián"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">
                Rango en el Aula
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value as Profile['rank'])}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              >
                {ranksList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md"
              >
                Guardar Mote
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Supabase Auth Info */}
        {activeTab === 'supabase' && (
          <div className="p-6 space-y-4">
            {isSupabaseConfigured ? (
              <div className="space-y-3">
                <p className="text-xs text-zinc-300">
                  Conexión con Supabase activa. Los usuarios pueden iniciar sesión con su correo o Google si lo tienes activado en tu panel de Supabase.
                </p>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Correo</label>
                  <input
                    type="email"
                    placeholder="alumno@instituto.es"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1">Contraseña</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    alert('Función de login lista para ejecutar con tu cliente Supabase!');
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors"
                >
                  Iniciar Sesión Oficial
                </button>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold">
                  <Database className="w-4 h-4" />
                  <span>Configuración en Supabase</span>
                </div>
                <p>
                  Para habilitar el registro con base de datos en la nube:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-300 font-mono text-[11px]">
                  <li>Crea un proyecto en <span className="text-emerald-400">supabase.com</span>.</li>
                  <li>Ejecuta el script <span className="text-emerald-400">supabase_schema.sql</span> en el SQL Editor.</li>
                  <li>Copia tus claves a <span className="text-emerald-400">.env.local</span> o a las variables de entorno de Vercel.</li>
                </ol>
                <p className="text-[11px] text-zinc-500 pt-1">
                  Mientras tanto, la web funciona al 100% en modo local/demo para que puedas probarla inmediatamente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
