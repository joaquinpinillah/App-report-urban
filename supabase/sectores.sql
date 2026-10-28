-- Sectores del piloto. Generado por scripts/sectores/generar.py con datos de OpenStreetMap.
-- Se puede ejecutar más de una vez: actualiza los sectores que ya existen.
insert into sectores (nombre, area, largo_calles_m) values ('Centro', st_multi(st_geomfromtext('POLYGON ((-71.56 -33.0218, -71.544 -33.0218, -71.544 -33.028, -71.56 -33.028, -71.56 -33.0218))', 4326))::geography, 20471)
  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;
insert into sectores (nombre, area, largo_calles_m) values ('Población Vergara', st_multi(st_geomfromtext('POLYGON ((-71.5585 -33.013, -71.547 -33.013, -71.547 -33.0212, -71.5585 -33.0212, -71.5585 -33.013))', 4326))::geography, 20397)
  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;
-- Asigna sector a los reportes que se hicieron antes de cargar los sectores.
update reportes set sector_id = sector_de(ubicacion) where sector_id is null;
