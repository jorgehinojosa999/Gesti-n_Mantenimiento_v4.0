create table if not exists public.planilla_diaria_actividades (
 id bigint generated always as identity primary key,
 fecha date not null, orden text not null, ope text default '10', tipo text,
 codigo_area text, nombre_area text, equipo text, actividad text not null,
 ejecutante text, hora_inicio text, hora_fin text,
 estado text not null default 'PROGRAMADA' check (estado in ('PROGRAMADA','EN PROCESO','EJECUTADA','CANCELADA')),
 usuario_id uuid references auth.users(id),
 creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now()
);
alter table public.planilla_diaria_actividades enable row level security;
create policy "planilla_diaria_leer" on public.planilla_diaria_actividades for select to authenticated using (true);
create policy "planilla_diaria_crear" on public.planilla_diaria_actividades for insert to authenticated with check (usuario_id=auth.uid());
create policy "planilla_diaria_editar" on public.planilla_diaria_actividades for update to authenticated using (usuario_id=auth.uid()) with check (usuario_id=auth.uid());
-- El histórico se importará por separado, con IDs y fechas originales, después de validar la fuente.
