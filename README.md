# VeredaViva

Aplicación para que los vecinos de Viña del Mar reporten baches, veredas rotas, problemas de accesibilidad y obras inconclusas, y para que la municipalidad pueda ubicarlos, priorizarlos y darles seguimiento.

Documento de requerimientos: https://claude.ai/artifact/7r6B3pt33gZAGyhA7fMokn

## Cómo correrlo

1. Instala dependencias: `npm install`
2. Crea un proyecto en [Supabase](https://supabase.com), ejecuta `supabase/migrations/0001_reportes.sql` en su editor SQL y copia `.env.example` a `.env.local` con la URL y la clave anónima del proyecto.
3. Levanta la app: `npm run dev`

`npm test` corre las pruebas y `npm run build` genera la versión instalable (PWA).

## Estructura

- `src/lib/gravedad.ts`: cálculo de la gravedad ajustada (propuesta del vecino + confirmaciones + mínimo por categoría; la municipalidad fija la final).
- `src/lib/tipos.ts`: categorías, estados y forma de un reporte.
- `supabase/migrations/`: tablas, permisos, detección de duplicados a 15 m y paso automático a "verificado" con 3 confirmaciones.
