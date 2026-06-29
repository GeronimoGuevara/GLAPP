# Plan de accion de performance y fotos

Fecha: 2026-06-26

Objetivo: reducir latencia en consultas, acelerar subida/carga de fotos y corregir el flujo de fotos privadas cifradas sin romper datos existentes.

## Reglas de trabajo

- Hacer cambios pequenos y verificables.
- Mantener compatibilidad con fotos ya guardadas.
- No ejecutar migraciones destructivas.
- No borrar datos ni cambiar llaves de cifrado existentes.
- Despues de cada fase, correr `npm run build`.
- Si falta contexto o presupuesto de ejecucion, frenar dejando este archivo actualizado.

## Diagnostico resumido

- La app ejecuta `initializeTables()` desde React al iniciar, lo que dispara muchas consultas DDL/DML en cada apertura.
- Todas las consultas pasan por `/api/query`; cada request tambien ejecuta rate limit usando la base, agregando varias operaciones SQL por consulta real.
- Varias pantallas hacen consultas secuenciales que podrian ser paralelas o agregadas.
- La galeria trae todas las fotos de una categoria sin paginacion.
- Las fotos privadas se descargan y descifran completas en la grilla, una por una.
- Las fotos publicas se suben a Cloudinary sin compresion previa.
- Faltan indices para las consultas frecuentes por `couple_id`, `category`, fecha y juego.
- Algunas consultas mensuales usan `TO_CHAR(fecha)`, lo que dificulta usar indices.

## Fase 1 - Cambios inmediatos de bajo riesgo

- [x] Quitar la ejecucion automatica de `initializeTables()` en el arranque de React.
- [x] Dejar `initializeTables()` disponible solo para uso manual/migracion, no para runtime del usuario.
- [x] Paralelizar las consultas del Home (`getCycles`, `getCycleSettings`, `getIntimateMoments`).
- [x] Comprimir fotos publicas antes de subirlas a Cloudinary.
- [x] Evitar fugas de memoria en `EncryptedImage` revocando `URL.createObjectURL`.
- [x] Evitar que una imagen privada con descifrado fallido quede como `src=null` sin marcar error.
- [x] Verificar build.

## Fase 2 - Migracion segura de base de datos

- [x] Crear SQL de indices no destructivos.
- [x] Incluir indices para:
  - `couple_photos(couple_id, category, created_at DESC)`
  - `intimate_moments(couple_id, moment_date DESC)`
  - `menstrual_cycles(user_id, start_date DESC)`
  - `cycle_notes(note_date)`
  - `cycle_notes(user_id, note_date)`
  - `game_scores(couple_id, game_name, played_at DESC)`
  - `medication_logs(user_id, taken_at DESC)`
  - `api_rate_limits(ip)`
  - `api_rate_limits(reset_time)`
- [x] No ejecutar automaticamente el SQL desde la app.
- [x] Documentar como correrlo en Supabase SQL Editor.

## Fase 3 - Galeria escalable

- [x] Agregar paginacion a `getCouplePhotos(coupleId, category, limit, offset)`.
- [x] Cargar 24 fotos por pagina en la galeria.
- [x] Cargar solo 8 fotos publicas para el juego de memoria.
- [x] Agregar estado "cargar mas" en `PhotoGalleryModal`.
- [x] Evitar revalidaciones innecesarias de SWR en la galeria.

## Fase 4 - Fotos privadas cifradas

- [ ] Cambiar el modelo de subida privada para generar dos archivos cifrados:
  - thumbnail cifrado para grilla.
  - imagen completa cifrada para visor.
- [ ] Agregar columnas opcionales no destructivas:
  - `thumbnail_url`
  - `width`
  - `height`
  - `bytes`
- [ ] Mantener fallback: si una foto vieja no tiene `thumbnail_url`, usar `url`.
- [ ] Descifrar thumbnails en la grilla y foto completa solo al abrir.
- [ ] Cachear resultados descifrados por `url + encryptionKey`.

## Fase 5 - Consultas y endpoints profundos

- [ ] Reemplazar `/api/query` generico por modulos con interfaces mas profundas para casos frecuentes:
  - dashboard
  - galeria
  - resumen mensual
  - medicamentos
- [ ] Mover rate limit fuera de Postgres o hacerlo en una sola operacion atomica.
- [ ] Reescribir resumen mensual con rangos de fecha (`>= start` y `< end`) en vez de `TO_CHAR`.
- [ ] Consolidar queries N+1 de competencias en una consulta agregada.

## Fase 6 - Seguridad y mantenimiento

- [ ] Evaluar migracion real a Supabase client con RLS.
- [ ] Eliminar SQL arbitrario desde cliente cuando existan endpoints especificos.
- [ ] Rotar `JWT_SECRET` si alguna vez se uso el fallback hardcodeado.
- [ ] Revisar que Cloudinary use upload preset restringido.

## Estado de ejecucion

- Completado en repo: Fase 1 aplicada, Fase 2 creada como `database/2026-06-26-performance-indexes.sql`, Fase 3 inicial aplicada y build verificado. Pendiente ejecutar manualmente indices en Supabase.




