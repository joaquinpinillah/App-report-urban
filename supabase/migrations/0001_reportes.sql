-- Esquema inicial: reportes ciudadanos de daños urbanos en Viña del Mar.
create extension if not exists postgis;

create type categoria as enum (
  'calzada', 'vereda', 'accesibilidad', 'obra_inconclusa', 'senaletica_alumbrado', 'otro'
);
create type estado_reporte as enum ('nuevo', 'verificado', 'programado', 'reparado', 'descartado');

-- Funcionarios municipales que pueden cambiar estado y gravedad.
create table funcionarios (
  user_id uuid primary key references auth.users on delete cascade,
  nombre text not null
);

create table reportes (
  id uuid primary key default gen_random_uuid(),
  categoria categoria not null,
  -- 1 leve, 2 moderado, 3 peligroso
  gravedad_propuesta smallint not null check (gravedad_propuesta between 1 and 3),
  gravedad_municipal smallint check (gravedad_municipal between 1 and 3),
  descripcion text check (char_length(descripcion) <= 280),
  fotos text[] not null default '{}' check (cardinality(fotos) between 1 and 3),
  ubicacion geography(point, 4326) not null,
  estado estado_reporte not null default 'nuevo',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index reportes_ubicacion_idx on reportes using gist (ubicacion);
create index reportes_estado_idx on reportes (estado);

create table confirmaciones (
  id uuid primary key default gen_random_uuid(),
  reporte_id uuid not null references reportes on delete cascade,
  gravedad smallint not null check (gravedad between 1 and 3),
  -- "sigue roto" sobre un reporte reparado lo reabre (ver trigger).
  sigue_roto boolean not null default false,
  creado_en timestamptz not null default now()
);
create index confirmaciones_reporte_idx on confirmaciones (reporte_id);

-- Vista que usan el mapa y el panel: coordenadas planas y gravedades de
-- las confirmaciones, para calcular la gravedad ajustada en la app.
create view reportes_publicos with (security_invoker = true) as
select
  r.id, r.categoria, r.gravedad_propuesta, r.gravedad_municipal, r.descripcion, r.fotos,
  st_y(r.ubicacion::geometry) as lat,
  st_x(r.ubicacion::geometry) as lng,
  r.estado, r.creado_en,
  coalesce(array_agg(c.gravedad) filter (where c.id is not null), '{}') as gravedades_confirmadas
from reportes r
left join confirmaciones c on c.reporte_id = r.id
group by r.id;

-- Reportes abiertos de la misma categoría a menos de `radio_m` metros:
-- la app los ofrece para confirmar en vez de crear un duplicado.
create function reportes_cercanos(lat double precision, lng double precision, cat categoria, radio_m double precision default 15)
returns setof reportes_publicos
language sql stable as $$
  select p.* from reportes_publicos p
  join reportes r on r.id = p.id
  where r.categoria = cat
    and r.estado in ('nuevo', 'verificado', 'programado')
    and st_dwithin(r.ubicacion, st_makepoint(lng, lat)::geography, radio_m)
$$;

-- Con 3 confirmaciones un reporte nuevo pasa a verificado; una
-- confirmación de "sigue roto" reabre un reporte reparado.
create function al_confirmar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sigue_roto then
    update reportes set estado = 'verificado', actualizado_en = now()
    where id = new.reporte_id and estado = 'reparado';
  end if;
  update reportes set estado = 'verificado', actualizado_en = now()
  where id = new.reporte_id and estado = 'nuevo'
    and (select count(*) from confirmaciones where reporte_id = new.reporte_id) >= 3;
  return new;
end $$;
create trigger confirmaciones_estado after insert on confirmaciones
for each row execute function al_confirmar();

-- Permisos: cualquiera reporta y confirma sin cuenta; solo funcionarios editan.
alter table reportes enable row level security;
alter table confirmaciones enable row level security;
alter table funcionarios enable row level security;

create function es_funcionario() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from funcionarios where user_id = auth.uid())
$$;

create policy "ver reportes no descartados" on reportes for select
  using (estado <> 'descartado' or es_funcionario());
create policy "vecinos crean reportes nuevos" on reportes for insert
  with check (estado = 'nuevo' and gravedad_municipal is null);
create policy "funcionarios editan reportes" on reportes for update
  using (es_funcionario()) with check (es_funcionario());

create policy "ver confirmaciones" on confirmaciones for select using (true);
create policy "vecinos confirman" on confirmaciones for insert with check (true);

create policy "funcionarios se ven a sí mismos" on funcionarios for select
  using (user_id = auth.uid());

-- Fotos: lectura pública, subida anónima, máximo 5 MB por imagen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);
create policy "subir fotos" on storage.objects for insert with check (bucket_id = 'fotos');
