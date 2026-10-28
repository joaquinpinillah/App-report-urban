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
