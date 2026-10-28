"""Calcula el largo de calles de cada sector con OpenStreetMap y escribe supabase/sectores.sql.

Uso: python scripts/sectores/generar.py  (requiere shapely, pyproj y acceso a Overpass)
"""
import json
import pathlib
import urllib.parse
import urllib.request
from collections import Counter

from pyproj import Transformer
from shapely.geometry import LineString, shape
from shapely.ops import transform

RAIZ = pathlib.Path(__file__).resolve().parents[2]
OVERPASS = "https://overpass-api.de/api/interpreter"
# Calles donde se camina o se circula; se dejan fuera accesos privados y senderos.
TIPOS = "primary|secondary|tertiary|unclassified|residential|living_street|pedestrian"
A_METROS = Transformer.from_crs(4326, 32719, always_xy=True).transform


def calles_en(poligono):
    oeste, sur, este, norte = poligono.bounds
    consulta = f'[out:json][timeout:60];way["highway"~"^({TIPOS})$"]({sur},{oeste},{norte},{este});out geom;'
    pedido = urllib.request.Request(
        OVERPASS,
        data=urllib.parse.urlencode({"data": consulta}).encode(),
        headers={"User-Agent": "VeredaViva/0.1 (github.com/joaquinpinillah/App-report-urban)"},
    )
    with urllib.request.urlopen(pedido, timeout=90) as r:
        return json.load(r)["elements"]


def main():
    sectores = json.loads((RAIZ / "scripts/sectores/sectores.geojson").read_text())["features"]
    filas, informe = [], ["# Sectores del piloto", ""]
    for s in sectores:
        nombre = s["properties"]["nombre"]
        area = shape(s["geometry"])
        area_m = transform(A_METROS, area)
        largo, nombres = 0.0, Counter()
        for via in calles_en(area):
            linea = transform(A_METROS, LineString([(p["lon"], p["lat"]) for p in via["geometry"]]))
            dentro = linea.intersection(area_m).length
            if dentro > 0:
                largo += dentro
                nombres[via.get("tags", {}).get("name", "(sin nombre)")] += dentro
        if largo == 0:
            raise SystemExit(f"{nombre}: no hay calles de OpenStreetMap dentro del polígono")
        filas.append((nombre, area.wkt, round(largo)))
        informe += [f"## {nombre}: {round(largo)} m de calles", ""]
        informe += [f"- {n}: {round(m)} m" for n, m in nombres.most_common()]
        informe.append("")

    sql = [
        "-- Sectores del piloto. Generado por scripts/sectores/generar.py con datos de OpenStreetMap.",
        "-- Se puede ejecutar más de una vez: actualiza los sectores que ya existen.",
    ]
    for nombre, wkt, largo in filas:
        sql.append(
            "insert into sectores (nombre, area, largo_calles_m) values "
            f"('{nombre}', st_multi(st_geomfromtext('{wkt}', 4326))::geography, {largo})\n"
            "  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;"
        )
    sql.append("-- Asigna sector a los reportes que se hicieron antes de cargar los sectores.")
    sql.append("update reportes set sector_id = sector_de(ubicacion) where sector_id is null;")
    (RAIZ / "supabase/sectores.sql").write_text("\n".join(sql) + "\n")
    (RAIZ / "scripts/sectores/informe.md").write_text("\n".join(informe))


if __name__ == "__main__":
    main()
