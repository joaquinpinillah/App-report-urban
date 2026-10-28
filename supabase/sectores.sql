-- Sectores del piloto. Generado por scripts/sectores/generar.py con datos de OpenStreetMap.
-- Se puede ejecutar más de una vez: actualiza los sectores que ya existen.
insert into sectores (nombre, area, largo_calles_m) values ('Centro', st_multi(st_geomfromtext('POLYGON ((-71.545 -33.023516, -71.545 -33.0285, -71.56 -33.0285, -71.56 -33.021182, -71.559408 -33.021453, -71.558815 -33.021683, -71.557545 -33.021964, -71.555175 -33.022191, -71.552086 -33.022627, -71.549717 -33.022979, -71.547571 -33.023282, -71.546576 -33.023368, -71.545 -33.023516))', 4326))::geography, 15839)
  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;
insert into sectores (nombre, area, largo_calles_m) values ('Población Vergara', st_multi(st_geomfromtext('POLYGON ((-71.56 -33.013, -71.545 -33.013, -71.545 -33.023516, -71.546576 -33.023368, -71.547571 -33.023282, -71.549717 -33.022979, -71.552086 -33.022627, -71.555175 -33.022191, -71.557545 -33.021964, -71.558815 -33.021683, -71.559408 -33.021453, -71.56 -33.021182, -71.56 -33.013))', 4326))::geography, 31426)
  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;
-- Asigna sector a los reportes que se hicieron antes de cargar los sectores.
update reportes set sector_id = sector_de(ubicacion) where sector_id is null;
