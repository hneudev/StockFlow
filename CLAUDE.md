# StockFlow — Contexto para Claude Code

## Qué es este proyecto

Sistema de control de inventario multi-sucursal con procesamiento asíncrono de movimientos.
Prueba técnica con restricción de 48 horas. El criterio de evaluación más pesado es
arquitectura y decisiones técnicas (25pts), seguido de calidad de código (20pts).

## Stack

- **Next.js 14** con App Router y TypeScript — monorepo en Vercel
- **MongoDB Atlas** + Mongoose — conexión vía singleton en `lib/db.ts`
- **Zod** — validación en todas las API routes, schemas en `lib/schemas/`
- **TailwindCSS** + **shadcn/ui** — componentes UI
- **Vercel Cron** — dispara `POST /api/worker/process` cada minuto

## Estructura de carpetas

```
app/
  (dashboard)/          # páginas del frontend
  api/
    products/
    branches/
    stock/
    movements/
    worker/
      process/          # worker principal — requiere WORKER_SECRET
      trigger/          # trigger interno desde el cliente
    reports/
lib/
  db.ts                 # singleton MongoDB — siempre importar connectDB() de aquí
  worker.ts             # lógica de procesamiento — separada del route handler
  schemas/              # schemas Zod compartidos
models/                 # modelos Mongoose
components/
  ui/                   # componentes shadcn/ui — no modificar manualmente
```

## Convenciones de código

- **Comentarios en español**, nombres de variables/funciones/archivos en inglés
- Cada API route valida input con Zod antes de tocar la base de datos
- Los errores siempre retornan `{ error: string }` con el status HTTP correcto
- Nunca usar `any` en TypeScript — si el tipo no es claro, definirlo explícitamente
- Los modelos Mongoose exportan tanto el modelo como el tipo inferido de Mongoose

## Modelos de datos

### Stock — colección separada (decisión crítica de arquitectura)

```ts
// índice único compuesto { productId: 1, branchId: 1 }
// permite updates atómicos con precondición de cantidad sin race conditions
Stock.findOneAndUpdate(
	{ productId, branchId, quantity: { $gte: requestedQty } },
	{ $inc: { quantity: -requestedQty } },
	{ new: true }
);
// null → stock insuficiente, sin ventana entre check y update
```

### Movement — máquina de estados

```
pending → processing → processed
                    → failed
processing → pending  (stale recovery si updatedAt > 5 minutos)
```

Campos relevantes: `status`, `attempts`, `failReason`, `processedAt`, `updatedAt`

## Worker — lógica central

El worker en `lib/worker.ts` sigue este flujo en cada ciclo:

1. **Stale recovery** — resetea a `pending` los movimientos en `processing` con `updatedAt > 5min`
2. **Claim atómico** — `findOneAndUpdate` de `pending → processing` con `$inc attempts`
3. **Procesamiento** según `movement.type` (entry / exit / transfer)
4. **Resolución** — `classifyError()` decide entre `retryable` y `non-retryable`

El endpoint `POST /api/worker/process` verifica `Authorization: Bearer $WORKER_SECRET`.
El endpoint `POST /api/worker/trigger` es interno — llama al worker con el secret del servidor.

## Puntos de extensión (relevante para la entrevista técnica)

- Nuevo tipo de movimiento → solo `lib/worker.ts` y `lib/schemas/movement.schema.ts`
- Nuevo campo en Movement → `models/Movement.ts` + `lib/schemas/movement.schema.ts`
- Cambio en lógica de reintentos → solo `lib/worker.ts` (`classifyError`, `retryOrFail`)
- Cambio de intervalo del cron → solo `vercel.json`

## Variables de entorno

```
MONGODB_URI          # connection string Atlas — solo servidor
WORKER_SECRET        # protege POST /api/worker/process — solo servidor
NEXT_PUBLIC_APP_URL  # URL base — disponible en cliente
```

## Lo que NO hacer

- No usar `localStorage` o `sessionStorage` — no aplica en este contexto
- No importar `connectDB()` desde fuera de `lib/db.ts`
- No poner lógica de negocio en los route handlers — va en `lib/worker.ts` o helpers
- No exponer `WORKER_SECRET` al cliente — usar `/api/worker/trigger` como intermediario
- No commitear `.env.local`

## URLs importantes

- Local: http://localhost:3000
- Producción: https://stockflow-hneudev.vercel.app
