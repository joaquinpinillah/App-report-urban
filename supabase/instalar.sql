-- VeredaViva: instalación completa para pegar en el SQL Editor de Supabase.
-- Generado a partir de supabase/migrations/. Ejecutar una sola vez en un proyecto nuevo.

-- ===== 0001_reportes.sql =====
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

-- ===== 0002_gamificacion.sql =====
-- Gamificación: puntos, niveles, avisos de impacto y progreso por barrio.
-- Cada vecino usa una sesión anónima de Supabase (su progreso vive en el
-- teléfono) y puede vincular un correo después para no perderlo.

-- Autoría de reportes y confirmaciones.
alter table reportes add column autor_id uuid default auth.uid() references auth.users on delete set null;
alter table confirmaciones add column autor_id uuid default auth.uid() references auth.users on delete set null;
-- Un vecino confirma cada reporte una sola vez.
alter table confirmaciones add constraint confirmaciones_una_por_vecino unique (reporte_id, autor_id);

-- Datos para el aviso de impacto (foto del antes y el después).
alter table reportes add column programado_en timestamptz;
alter table reportes add column reparado_en timestamptz;
alter table reportes add column foto_reparacion text;

drop policy "vecinos crean reportes nuevos" on reportes;
create policy "vecinos crean reportes nuevos" on reportes for insert
  with check (estado = 'nuevo' and gravedad_municipal is null and autor_id = auth.uid());

-- Nadie confirma su propio reporte (si no, podría verificarlo solo).
drop policy "vecinos confirman" on confirmaciones;
create policy "vecinos confirman" on confirmaciones for insert
  with check (
    autor_id = auth.uid()
    and not exists (select 1 from reportes r where r.id = reporte_id and r.autor_id = auth.uid())
  );

-- Sectores del piloto (centro de Viña). largo_calles_m se carga desde
-- OpenStreetMap y es la base del porcentaje de calles revisadas.
create table sectores (
  id serial primary key,
  nombre text not null unique,
  area geography(multipolygon, 4326) not null,
  largo_calles_m double precision not null check (largo_calles_m > 0)
);
create index sectores_area_idx on sectores using gist (area);

alter table reportes add column sector_id int references sectores;

create function sector_de(punto geography) returns int
language sql stable as $$
  select id from sectores where st_covers(area, punto) limit 1
$$;

create function asignar_sector() returns trigger
language plpgsql as $$
begin
  new.sector_id := sector_de(new.ubicacion);
  return new;
end $$;
create trigger reportes_sector before insert on reportes
for each row execute function asignar_sector();

-- Tramos que un vecino recorrió y marcó "sin daños".
create table tramos_sin_danos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid default auth.uid() references auth.users on delete set null,
  trazado geography(linestring, 4326) not null,
  creado_en timestamptz not null default now()
);
create index tramos_trazado_idx on tramos_sin_danos using gist (trazado);

-- Puntos. Reglas: +10 cuando un reporte propio queda verificado, +3 cuando
-- una confirmación coincide con la gravedad que fija la municipalidad,
-- +5 cuando un reporte propio se repara. Tope de 30 puntos por día.
create type motivo_puntos as enum ('reporte_verificado', 'confirmacion_acertada', 'reporte_reparado');

create table puntos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  motivo motivo_puntos not null,
  reporte_id uuid not null references reportes on delete cascade,
  puntos smallint not null check (puntos > 0),
  creado_en timestamptz not null default now(),
  -- El mismo motivo no se cobra dos veces por el mismo reporte (por
  -- ejemplo, si un reporte reparado se reabre y se vuelve a reparar).
  unique (user_id, motivo, reporte_id)
);
create index puntos_user_idx on puntos (user_id, creado_en);

create function otorgar_puntos(usuario uuid, m motivo_puntos, reporte uuid, cantidad int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  hoy_santiago date := (now() at time zone 'America/Santiago')::date;
  ganados_hoy int;
  a_dar int;
begin
  if usuario is null then return; end if;
  select coalesce(sum(p.puntos), 0) into ganados_hoy from puntos p
  where p.user_id = usuario and (p.creado_en at time zone 'America/Santiago')::date = hoy_santiago;
  a_dar := least(cantidad, 30 - ganados_hoy);
  if a_dar > 0 then
    insert into puntos (user_id, motivo, reporte_id, puntos)
    values (usuario, m, reporte, a_dar)
    on conflict (user_id, motivo, reporte_id) do nothing;
  end if;
end $$;

-- Avisos de impacto para el autor del reporte.
create type tipo_aviso as enum ('programado', 'reparado');

create table avisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  reporte_id uuid not null references reportes on delete cascade,
  tipo tipo_aviso not null,
  leido boolean not null default false,
  creado_en timestamptz not null default now()
);
create index avisos_user_idx on avisos (user_id, leido);

create function al_cambiar_reporte() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.estado is distinct from old.estado then
    if new.estado = 'verificado' and old.estado = 'nuevo' then
      perform otorgar_puntos(new.autor_id, 'reporte_verificado', new.id, 10);
    elsif new.estado = 'programado' then
      new.programado_en := now();
      if new.autor_id is not null then
        insert into avisos (user_id, reporte_id, tipo) values (new.autor_id, new.id, 'programado');
      end if;
    elsif new.estado = 'reparado' then
      new.reparado_en := now();
      perform otorgar_puntos(new.autor_id, 'reporte_reparado', new.id, 5);
      if new.autor_id is not null then
        insert into avisos (user_id, reporte_id, tipo) values (new.autor_id, new.id, 'reparado');
      end if;
    end if;
  end if;

  if new.gravedad_municipal is not null and old.gravedad_municipal is null then
    for c in select autor_id from confirmaciones
             where reporte_id = new.id and gravedad = new.gravedad_municipal loop
      perform otorgar_puntos(c.autor_id, 'confirmacion_acertada', new.id, 3);
    end loop;
  end if;
  new.actualizado_en := now();
  return new;
end $$;
create trigger reportes_cambios before update on reportes
for each row execute function al_cambiar_reporte();

-- Niveles: Vecino desde 0, Vigía desde 100, Guardián de barrio desde 300
-- (los mismos umbrales que src/lib/niveles.ts).
create view puntaje_vecinos with (security_invoker = true) as
select
  user_id,
  sum(puntos)::int as total,
  case
    when sum(puntos) >= 300 then 'guardian'
    when sum(puntos) >= 100 then 'vigia'
    else 'vecino'
  end as nivel
from puntos
group by user_id;

-- Progreso por barrio: % de calles revisadas (reportes + tramos sin daños,
-- sin contar dos veces el mismo tramo), % de daños reparados y días
-- promedio de respuesta de la municipalidad.
create view progreso_sectores as
select
  s.id, s.nombre,
  least(100, round((coalesce(st_length(t.revisado::geography), 0) / s.largo_calles_m * 100)::numeric, 0)) as pct_revisado,
  coalesce(r.reparados, 0) as reparados,
  coalesce(r.total, 0) as total_reportes,
  case when r.total > 0 then round(r.reparados * 100.0 / r.total, 0) else 0 end as pct_reparado,
  round(r.dias_respuesta::numeric, 1) as dias_respuesta_promedio
from sectores s
left join lateral (
  select st_union(tr.trazado::geometry) as revisado
  from tramos_sin_danos tr
  where st_intersects(tr.trazado, s.area)
) t on true
left join lateral (
  select
    count(*) filter (where estado <> 'descartado') as total,
    count(*) filter (where estado = 'reparado') as reparados,
    avg(extract(epoch from reparado_en - creado_en) / 86400) filter (where estado = 'reparado') as dias_respuesta
  from reportes where sector_id = s.id
) r on true;

alter table sectores enable row level security;
alter table tramos_sin_danos enable row level security;
alter table puntos enable row level security;
alter table avisos enable row level security;

create policy "ver sectores" on sectores for select using (true);
create policy "ver tramos" on tramos_sin_danos for select using (true);
create policy "vecinos marcan tramos" on tramos_sin_danos for insert with check (autor_id = auth.uid());
create policy "ver mis puntos" on puntos for select using (user_id = auth.uid());
create policy "ver mis avisos" on avisos for select using (user_id = auth.uid());
create policy "marcar mis avisos leídos" on avisos for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== 0003_pantallas_vecino.sql =====
-- Datos que necesitan las pantallas del vecino.

-- Foto opcional al confirmar ("tu foto se suma al reporte").
alter table confirmaciones add column foto text;

-- La vista pública suma las fechas del ciclo de vida y la foto de la
-- reparación (para el aviso de impacto). Las columnas nuevas van al final
-- para poder reemplazar la vista.
create or replace view reportes_publicos with (security_invoker = true) as
select
  r.id, r.categoria, r.gravedad_propuesta, r.gravedad_municipal, r.descripcion, r.fotos,
  st_y(r.ubicacion::geometry) as lat,
  st_x(r.ubicacion::geometry) as lng,
  r.estado, r.creado_en,
  coalesce(array_agg(c.gravedad) filter (where c.id is not null), '{}') as gravedades_confirmadas,
  r.programado_en, r.reparado_en, r.foto_reparacion, r.sector_id
from reportes r
left join confirmaciones c on c.reporte_id = r.id
group by r.id;

-- Reportes del vecino conectado, sin exponer autor_id en la vista pública.
create function mis_reportes() returns setof reportes_publicos
language sql stable as $$
  select p.* from reportes_publicos p
  join reportes r on r.id = p.id
  where r.autor_id = auth.uid()
  order by p.creado_en desc
$$;

-- ¿El vecino conectado ya confirmó este reporte?
create function ya_confirme(reporte uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from confirmaciones where reporte_id = reporte and autor_id = auth.uid())
$$;

-- Las confirmaciones siguen siendo públicas (la vista cuenta sus
-- gravedades), pero sin la columna autor_id.
revoke select on confirmaciones from anon, authenticated;
grant select (id, reporte_id, gravedad, sigue_roto, foto, creado_en) on confirmaciones to anon, authenticated;

-- ===== 0004_panel_municipal.sql =====
-- Datos del panel municipal: historial, notas internas e indicadores.

-- Fecha de verificación, para medir el tiempo de respuesta.
alter table reportes add column verificado_en timestamptz;

create function marcar_verificado() returns trigger
language plpgsql as $$
begin
  if new.estado = 'verificado' and old.estado is distinct from 'verificado' and new.verificado_en is null then
    new.verificado_en := now();
  end if;
  return new;
end $$;
create trigger reportes_verificado before update on reportes
for each row execute function marcar_verificado();

create or replace view reportes_publicos with (security_invoker = true) as
select
  r.id, r.categoria, r.gravedad_propuesta, r.gravedad_municipal, r.descripcion, r.fotos,
  st_y(r.ubicacion::geometry) as lat,
  st_x(r.ubicacion::geometry) as lng,
  r.estado, r.creado_en,
  coalesce(array_agg(c.gravedad) filter (where c.id is not null), '{}') as gravedades_confirmadas,
  r.programado_en, r.reparado_en, r.foto_reparacion, r.sector_id,
  r.verificado_en
from reportes r
left join confirmaciones c on c.reporte_id = r.id
group by r.id;

-- Historial de cambios hechos por funcionarios (estado y gravedad).
create table historial_reportes (
  id bigserial primary key,
  reporte_id uuid not null references reportes on delete cascade,
  funcionario_id uuid references auth.users on delete set null,
  detalle text not null,
  creado_en timestamptz not null default now()
);
create index historial_reporte_idx on historial_reportes (reporte_id, creado_en);

create function registrar_cambio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not es_funcionario() then return new; end if;
  if new.estado is distinct from old.estado then
    insert into historial_reportes (reporte_id, funcionario_id, detalle)
    values (new.id, auth.uid(), 'Estado: ' || old.estado || ' → ' || new.estado);
  end if;
  if new.gravedad_municipal is distinct from old.gravedad_municipal then
    insert into historial_reportes (reporte_id, funcionario_id, detalle)
    values (new.id, auth.uid(), 'Gravedad final: ' || coalesce(new.gravedad_municipal::text, 'sin fijar'));
  end if;
  return new;
end $$;
create trigger reportes_historial after update on reportes
for each row execute function registrar_cambio();

-- Notas internas: solo las ven los funcionarios (no van en la tabla
-- reportes, que es pública).
create table notas_internas (
  id bigserial primary key,
  reporte_id uuid not null references reportes on delete cascade,
  funcionario_id uuid default auth.uid() references auth.users on delete set null,
  texto text not null check (char_length(texto) between 1 and 1000),
  creado_en timestamptz not null default now()
);
create index notas_reporte_idx on notas_internas (reporte_id, creado_en);

-- Metros de calle revisados por vecinos (sin contar dos veces un tramo).
create view metros_revisados as
select coalesce(st_length(st_union(trazado::geometry)::geography), 0)::int as metros
from tramos_sin_danos;

alter table historial_reportes enable row level security;
alter table notas_internas enable row level security;
create policy "funcionarios ven historial" on historial_reportes for select using (es_funcionario());
create policy "funcionarios ven notas" on notas_internas for select using (es_funcionario());
create policy "funcionarios escriben notas" on notas_internas for insert
  with check (es_funcionario() and funcionario_id = auth.uid());
