"""Calcula el largo de calles de cada sector con OpenStreetMap y escribe supabase/sectores.sql.

Uso: python scripts/sectores/generar.py  (requiere shapely, pyproj y acceso a Overpass)
"""
import json
import time
import pathlib
import urllib.parse
import urllib.request
from collections import Counter

from pyproj import Transformer
from shapely import wkt
from shapely.geometry import LineString, MultiLineString, Point, shape
from shapely.ops import linemerge, split, transform

RAIZ = pathlib.Path(__file__).resolve().parents[2]
# Servidores públicos de Overpass; si uno está saturado se prueba el siguiente.
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
# Calles donde se camina o se circula; se dejan fuera accesos privados y senderos.
TIPOS = "primary|secondary|tertiary|unclassified|residential|living_street|pedestrian"
A_METROS = Transformer.from_crs(4326, 32719, always_xy=True).transform
A_GRADOS = Transformer.from_crs(32719, 4326, always_xy=True).transform


def overpass(filtro, poligono):
    oeste, sur, este, norte = poligono.bounds
    consulta = f"[out:json][timeout:60];way{filtro}({sur},{oeste},{norte},{este});out geom;"
    datos = urllib.parse.urlencode({"data": consulta}).encode()
    cabeceras = {"User-Agent": "VeredaViva/0.1 (github.com/joaquinpinillah/App-report-urban)"}
    for intento in range(6):
        servidor = OVERPASS[intento % len(OVERPASS)]
        try:
            with urllib.request.urlopen(urllib.request.Request(servidor, data=datos, headers=cabeceras), timeout=90) as r:
                return json.load(r)["elements"]
        except OSError as e:
            print(f"{servidor}: {e}; reintentando")
            time.sleep(10 * (intento + 1))
    raise SystemExit("Overpass no respondió")


def calles_en(poligono):
    return overpass(f'["highway"~"^({TIPOS})$"]', poligono)


def recortar(area, cauce, punto):
    """Divide el área por un cauce (p. ej. un estero) y deja el lado que contiene el punto."""
    todas = overpass('["waterway"]', area)
    print("Cauces en el área:", sorted({v.get("tags", {}).get("name", "(sin nombre)") for v in todas}))
    vias = [v for v in todas if v.get("tags", {}).get("name", "").lower() == cauce.lower()]
    if not vias:
        raise SystemExit(f"No encontré {cauce} en OpenStreetMap")
    linea = linemerge(MultiLineString([[(p["lon"], p["lat"]) for p in v["geometry"]] for v in vias]))
    partes = list(split(area, linea).geoms)
    if len(partes) < 2:
        raise SystemExit(f"{cauce} no atraviesa el área")
    return next(p for p in partes if p.contains(Point(punto)))


def main():
    sectores = json.loads((RAIZ / "scripts/sectores/sectores.geojson").read_text())["features"]
    filas, informe = [], ["# Sectores del piloto", ""]
    for s in sectores:
        nombre = s["properties"]["nombre"]
        area = shape(s["geometry"])
        if "dividir_por" in s["properties"]:
            area = recortar(area, s["properties"]["dividir_por"], s["properties"]["punto"])
        area_m = transform(A_METROS, area)
        largo, nombres, latitudes = 0.0, Counter(), {}
        for via in calles_en(area):
            linea = transform(A_METROS, LineString([(p["lon"], p["lat"]) for p in via["geometry"]]))
            tramo = linea.intersection(area_m)
            if tramo.length > 0:
                calle = via.get("tags", {}).get("name", "(sin nombre)")
                largo += tramo.length
                nombres[calle] += tramo.length
                _, sur_t, _, norte_t = transform(A_GRADOS, tramo).bounds
                previo = latitudes.get(calle, (sur_t, norte_t))
                latitudes[calle] = (min(previo[0], sur_t), max(previo[1], norte_t))
        if largo == 0:
            raise SystemExit(f"{nombre}: no hay calles de OpenStreetMap dentro del polígono")
        filas.append((nombre, wkt.dumps(area, rounding_precision=6, trim=True), round(largo)))
        informe += [f"## {nombre}: {round(largo)} m de calles", ""]
        informe += [
            f"- {n}: {round(m)} m (lat {latitudes[n][0]:.4f} a {latitudes[n][1]:.4f})" for n, m in nombres.most_common()
        ]
        informe.append("")

    sql = [
        "-- Sectores del piloto. Generado por scripts/sectores/generar.py con datos de OpenStreetMap.",
        "-- Se puede ejecutar más de una vez: actualiza los sectores que ya existen.",
    ]
    for nombre, poligono, largo in filas:
        sql.append(
            "insert into sectores (nombre, area, largo_calles_m) values "
            f"('{nombre}', st_multi(st_geomfromtext('{poligono}', 4326))::geography, {largo})\n"
            "  on conflict (nombre) do update set area = excluded.area, largo_calles_m = excluded.largo_calles_m;"
        )
    sql.append("-- Asigna sector a los reportes que se hicieron antes de cargar los sectores.")
    sql.append("update reportes set sector_id = sector_de(ubicacion) where sector_id is null;")
    (RAIZ / "supabase/sectores.sql").write_text("\n".join(sql) + "\n")
    (RAIZ / "scripts/sectores/informe.md").write_text("\n".join(informe))


if __name__ == "__main__":
    main()
