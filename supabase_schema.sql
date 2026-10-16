-- ==============================================================
-- SCHEMA SUPABASE: PORTAL DE CLASE 2º SMR ("LA INTRANET DE CLASE")
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase
-- ==============================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA DE PERFILES (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  rank TEXT DEFAULT 'Script Kiddie',
  karma_points INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Trigger para crear perfil automáticamente al registrarse en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, rank, karma_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', 'Alumno de SMR'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id),
    'Crimpador Novato',
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABLA DE MARRONES Y EXÁMENES (DEADLINES)
CREATE TABLE IF NOT EXISTS public.deadlines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  panic_level TEXT DEFAULT 'medio' CHECK (panic_level IN ('chill', 'medio', 'marron', 'f')),
  description TEXT,
  classroom TEXT DEFAULT 'Aula 204',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABLA DE CHULETAS Y RECURSOS
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('chuleta', 'apuntes', 'script_bash', 'script_ps', 'packet_tracer', 'examen_viejo')),
  description TEXT NOT NULL,
  command TEXT,
  link_url TEXT,
  upvotes INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABLA DE FRASES CÉLEBRES (QUOTES DE PROFES)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  context TEXT,
  date TEXT DEFAULT 'Reciente',
  upvotes INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABLA DE VOTOS DE QUOTES (Para no votar 80 veces)
CREATE TABLE IF NOT EXISTS public.quote_votes (
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (quote_id, user_id)
);

-- 7. TABLA DE MURO / EL PING DE CLASE
CREATE TABLE IF NOT EXISTS public.wall_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_rank TEXT DEFAULT 'Alumno de SMR',
  content TEXT NOT NULL,
  tag TEXT DEFAULT 'aviso' CHECK (tag IN ('aviso', 'queja', 'meme', 'duda')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ==============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wall_messages ENABLE ROW LEVEL SECURITY;

-- Lectura pública para todos los compañeros
CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Lectura pública de deadlines" ON public.deadlines FOR SELECT USING (true);
CREATE POLICY "Lectura pública de recursos" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Lectura pública de frases" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Lectura pública de votos" ON public.quote_votes FOR SELECT USING (true);
CREATE POLICY "Lectura pública de muro" ON public.wall_messages FOR SELECT USING (true);

-- Escritura permitida a usuarios autenticados
CREATE POLICY "Usuarios autenticados crean deadlines" ON public.deadlines FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados crean recursos" ON public.resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados suben frases" ON public.quotes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados votan frases" ON public.quote_votes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuarios autenticados escriben en muro" ON public.wall_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuarios editan su perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Permitir upvotes en quotes y recursos
CREATE OR REPLACE FUNCTION public.increment_quote_upvote(quote_row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.quotes
  SET upvotes = upvotes + 1
  WHERE id = quote_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_resource_upvote(resource_row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.resources
  SET upvotes = upvotes + 1
  WHERE id = resource_row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================
-- DATOS SEMILLA (Seed Data)
-- ==============================================================
INSERT INTO public.deadlines (title, subject, due_date, panic_level, description, classroom, creator_name)
VALUES
  ('Práctica Servidor DNS BIND9 con Zona Inversa', 'SR', now() + interval '2 days', 'marron', 'Configurar dos zonas maestras en Debian, reenviadores a 1.1.1.1 y comprobación con dig y nslookup.', 'Aula 204 (Taller Redes)', 'adri_debian'),
  ('Examen de Active Directory: GPOs y Migración de Usuarios', 'SOR', now() + interval '5 days', 'f', 'Entra crear UOs por departamentos, aplicar políticas de bloqueo de panel de control y montar script logon.', 'Aula 204', 'root_carlos'),
  ('Laboratorio Firewall con iptables y DMZ', 'SI', now() + interval '8 days', 'marron', 'Montar topología en GNS3 o VirtualBox con 3 tarjetas de red en Debian: WAN, LAN y DMZ.', 'Taller 2', 'laura_hack'),
  ('Entrega Plan de Viabilidad y Nóminas (EIE)', 'EIE', now() + interval '12 days', 'medio', 'Subir el Excel con el cálculo de bases de cotización y retenciones IRPF.', 'Aula Magna', 'lucas_sl')
ON CONFLICT DO NOTHING;

INSERT INTO public.resources (title, subject, category, description, command, upvotes, creator_name)
VALUES
  ('Comandos salvavidas para reiniciar servicios de red en Linux', 'SR', 'chuleta', 'Para cuando Bind9 o ISC-DHCP no levantan y no sabes qué has roto en la sintaxis.', 'sudo systemctl restart bind9 && sudo named-checkconf -z /etc/bind/named.conf.local', 42, 'root_carlos'),
  ('Sacar usuarios y grupos de Active Directory por PowerShell', 'SOR', 'script_ps', 'Te ahorra 20 minutos de clicks en la interfaz de Windows Server.', 'Get-ADUser -Filter * -Properties DisplayName,Department | Select DisplayName,Department | Out-GridView', 38, 'adri_debian'),
  ('Resetear reglas de iptables y permitir solo SSH y tráfico establecido', 'SI', 'chuleta', 'La chuleta de oro para cuando te quedas fuera del servidor por meter mal un DROP.', 'sudo iptables -F && sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT && sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT', 61, 'laura_hack')
ON CONFLICT DO NOTHING;

INSERT INTO public.quotes (quote, teacher_name, subject, context, date, upvotes, creator_name)
VALUES
  ('Si veo a alguien más crimpar un cable directo con los colores de la bandera de España en vez de la norma B568, le pongo un 0 directo en la práctica.', 'Profe de Redes', 'SR', 'Viendo a David intentar meter el cable con tijeras de cocina.', '14 de Octubre', 49, 'adri_debian'),
  ('A ver los del fondo, dejad de jugar al Counter-Strike que la tarjeta de red del switch de clase está echando humo con el broadcast.', 'Profe de Sistemas', 'SOR', 'En mitad de la explicación de cómo promocionar un controlador de dominio secundario.', '8 de Octubre', 53, 'laura_hack'),
  ('¿Qué hacéis configurando la IP 192.168.1.1 en tres máquinas virtuales a la vez? Estáis haciendo un campeonato de colisiones.', 'Profe de Seguridad', 'SI', 'Nadie tenía internet en el aula durante hora y media porque chocaban las IPs.', '2 de Octubre', 37, 'marcos_ip')
ON CONFLICT DO NOTHING;

INSERT INTO public.wall_messages (author_name, author_rank, content, tag)
VALUES
  ('adri_debian', 'Root Supremo del Aula', 'Ojo chavales: el profe de Redes ha dicho que mañana revisa las carpetas compartidas de Samba. Que nadie tenga permisos 777 a lo loco.', 'aviso'),
  ('marcos_ip', 'Crimpador Novato', 'Acabo de meter una regla DROP en iptables sin meter el ACCEPT previo de SSH. Me he quedado sin máquina virtual en el servidor. F.', 'meme')
ON CONFLICT DO NOTHING;
