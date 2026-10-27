-- Ejecutar en Supabase > SQL Editor, antes de importar.
-- No borra datos ni modifica políticas de acceso existentes.
ALTER TABLE public.planilla_diaria_actividades
 ADD COLUMN IF NOT EXISTS nombre_area TEXT,
 ADD COLUMN IF NOT EXISTS equipo TEXT,
 ADD COLUMN IF NOT EXISTS actividad TEXT,
 ADD COLUMN IF NOT EXISTS ejecutante TEXT,
 ADD COLUMN IF NOT EXISTS hora_programada_1 NUMERIC,
 ADD COLUMN IF NOT EXISTS tiempo_real_asignado NUMERIC,
 ADD COLUMN IF NOT EXISTS hora_inicio TEXT,
 ADD COLUMN IF NOT EXISTS hora_fin TEXT,
 ADD COLUMN IF NOT EXISTS total_hh_min NUMERIC,
 ADD COLUMN IF NOT EXISTS supervisor_asignado TEXT,
 ADD COLUMN IF NOT EXISTS import_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS planilla_diaria_actividades_import_key_uidx
 ON public.planilla_diaria_actividades (import_key);
NOTIFY pgrst, 'reload schema';
