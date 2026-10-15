-- Ejecutar una sola vez en Supabase > SQL Editor.
-- No elimina ni modifica registros existentes.
ALTER TABLE public.seguimiento_avisos
  ADD COLUMN IF NOT EXISTS linea TEXT,
  ADD COLUMN IF NOT EXISTS criticidad TEXT;

-- Validar niveles permitidos, dejando NULL para registros sin clasificación.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seguimiento_avisos_criticidad_check') THEN
    ALTER TABLE public.seguimiento_avisos
      ADD CONSTRAINT seguimiento_avisos_criticidad_check
      CHECK (criticidad IN ('Alta','Media','Baja') OR criticidad IS NULL);
  END IF;
END $$;

GRANT DELETE ON TABLE public.seguimiento_avisos TO authenticated;

-- El UUID debe coincidir con la cuenta compartida que ya autorizaste.
DROP POLICY IF EXISTS "Eliminar avisos portal" ON public.seguimiento_avisos;
CREATE POLICY "Eliminar avisos portal"
ON public.seguimiento_avisos
FOR DELETE TO authenticated
USING (auth.uid() = 'fd740d43-28e3-413b-be28-8385419d3c8d'::uuid);

-- El bucket privado ya dispone de una política DELETE de la configuración anterior.
-- Si la cuenta compartida cambia, actualizar todas las políticas RLS relacionadas.
