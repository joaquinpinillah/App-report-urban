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
