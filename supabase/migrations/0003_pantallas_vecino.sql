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
