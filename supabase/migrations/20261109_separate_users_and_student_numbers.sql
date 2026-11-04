-- Migración: Separación estricta de usuarios y números de estudiante (NIA)
-- Asegura que ningún alumno comparta NIA ni usuario, y añade soporte para ficha de estudiante oficial

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS student_number TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS pc_seat TEXT DEFAULT 'PC-01',
  ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS biggest_win INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT 'emerald',
  ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0;

-- Índices únicos para garantizar que número y usuario se separen definitivamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_student_number 
  ON profiles (student_number) 
  WHERE student_number IS NOT NULL AND student_number <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles (LOWER(username));
