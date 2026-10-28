# VeredaViva

Aplicación para que los vecinos de Viña del Mar reporten baches, veredas rotas, problemas de accesibilidad y obras inconclusas, y para que la municipalidad pueda ubicarlos, priorizarlos y darles seguimiento.

Documento de requerimientos: https://claude.ai/artifact/7r6B3pt33gZAGyhA7fMokn

## Cómo correrlo

1. Instala dependencias: `npm install`
2. Crea un proyecto en [Supabase](https://supabase.com), pega `supabase/instalar.sql` en su editor SQL (reúne todas las migraciones), activa los ingresos anónimos (Authentication → Sign In / Providers → Allow anonymous sign-ins) y copia `.env.example` a `.env.local` con la URL y la clave anónima del proyecto.
3. Levanta la app: `npm run dev`

Sin el paso 2 la app abre en **modo demo**: datos de ejemplo alrededor de Plaza Vergara que se reinician al recargar. Sirve para recorrer las pantallas sin backend.

## Publicar en GitHub Pages

El flujo `.github/workflows/publicar.yml` publica la app en `https://<usuario>.github.io/App-report-urban/` con cada cambio en `main`. Una sola vez:

1. Settings → Pages → Source: **GitHub Actions**.
2. La URL y la clave anónima del proyecto del piloto están en el flujo. Para otro proyecto, créalas como variables en Settings → Secrets and variables → Actions → Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Ambas son públicas por diseño; nunca uses la clave `service_role`.
3. En Supabase, Authentication → URL Configuration: pon la dirección de GitHub Pages como Site URL.

Si `supabase/migrations/` cambia, regenera `instalar.sql` concatenando los archivos en orden.

## Panel municipal

Está en `/panel`. Para dar acceso a un funcionario:

1. Crea su usuario en Supabase (Authentication → Users → Add user, con correo y clave).
2. Regístralo como funcionario en el editor SQL:

   ```sql
   insert into funcionarios (user_id, nombre)
   select id, 'Nombre Apellido' from auth.users where email = 'funcionario@munivina.cl';
   ```

Para el progreso por barrio, pega `supabase/sectores.sql` en el editor SQL. Trae los sectores del piloto (Centro y Población Vergara, separados por el Estero Marga-Marga) con el largo de calles medido en OpenStreetMap. Para cambiar los límites, edita `scripts/sectores/sectores.geojson`: el flujo `Sectores` recalcula el SQL y deja el detalle por calle en `scripts/sectores/informe.md`.

En modo demo el panel acepta cualquier correo y clave.

`npm test` corre las pruebas y `npm run build` genera la versión instalable (PWA).

## Estructura

- `src/lib/gravedad.ts`: cálculo de la gravedad ajustada (propuesta del vecino + confirmaciones + mínimo por categoría; la municipalidad fija la final).
- `src/lib/tipos.ts`: categorías, estados y forma de un reporte.
- `src/pages/`: pantallas del vecino (mapa, detalle, reportar en 3 pasos, mi aporte, mi barrio, aviso de impacto).
- `src/pages/panel/`: panel municipal (reportes por prioridad con edición, mapa de puntos y calor, indicadores de respuesta).
- `src/lib/api.ts`: lo que las pantallas piden al backend; `apiSupabase.ts` es la implementación real y `apiDemo.ts` la de ejemplo.
- `supabase/migrations/`: tablas, permisos, detección de duplicados a 15 m y paso automático a "verificado" con 3 confirmaciones.
