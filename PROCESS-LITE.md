# StockFlow — Resumen técnico

## Qué es

Sistema de control de inventario multi-sucursal con procesamiento asíncrono de movimientos de stock (entradas, salidas, transferencias). Construido en Next.js 14 App Router + MongoDB Atlas, deployado en Vercel con Vercel Cron como scheduler.

## Stack

| Capa          | Tecnología                     | Por qué                                                           |
| ------------- | ------------------------------ | ----------------------------------------------------------------- |
| Frontend      | Next.js 14 App Router + React  | Server Components + deploy zero-config en Vercel                  |
| Base de datos | MongoDB Atlas + Mongoose       | Updates atómicos con `$inc` + `findOneAndUpdate` para stock       |
| Validación    | Zod                            | Tipos runtime y compile-time desde el mismo schema                |
| UI            | TailwindCSS + shadcn/ui        | Componentes accesibles sin setup                                  |
| Scheduling    | Vercel Cron                    | Sin infra adicional; fire-and-forget desde el cliente como backup |
| Testing       | Vitest                         | Compatible con ESM; mocks nativos sin config extra                |

## Las 7 decisiones técnicas

| #  | Decisión                               | Razón                                                             | Trade-off                                          |
| -- | -------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- |
| 1  | `Stock` como colección separada        | `findOneAndUpdate` atómico con precondición de cantidad           | Query de stock total requiere lookup               |
| 2  | Worker con claim atómico               | Single-consumer aunque el cron solape invocaciones               | Latencia de hasta 1 min si falla el trigger de UX  |
| 3  | Polling cada 5s                        | Serverless no soporta conexiones persistentes                     | Mayor carga de requests vs SSE                     |
| 4  | Transfer con compensación manual       | Sin transactions en free tier de Atlas                            | Ventana de inconsistencia si falla la compensación |
| 5  | Zod en todas las routes                | Errores estructurados y tipos TypeScript exactos en runtime       | Duplicación parcial con validaciones de Mongoose   |
| 6  | Server Component para fetch inicial    | Datos reales en el HTML del cold start — sin tabla vacía inicial  | Requiere serialización manual `ObjectId` → `string`|
| 7  | Imports explícitos de modelos          | `serverComponentsExternalPackages` crea bundles separados         | Boilerplate en cada route que usa `.populate()`    |

## Flujo de un movimiento

```
POST /api/movements
  → { status: "pending", attempts: 0 }  — responde 201 de inmediato
  → fire-and-forget a /api/worker/trigger

/api/worker/process (o Vercel Cron como safety net)
  → stale recovery: processing > 5min → pending
  → claim atómico: findOneAndUpdate pending → processing, $inc attempts
  → Stock.findOneAndUpdate con precondición { quantity: { $gte: qty } }
      null → InsufficientStockError (non-retryable, falla en 1 intento)
  → movement.save() → "processed" | "failed"

Cliente
  → polling GET /api/movements cada 5s
  → badge con animate-pulse en pending / processing
```

## Qué funciona

- ✅ CRUD completo de productos y sucursales
- ✅ Movimientos: entry, exit, transfer con validación por `discriminatedUnion`
- ✅ Worker con claim atómico, retry clasificado y stale job recovery
- ✅ Compensación en transfers (revierte fase 1 si falla fase 2)
- ✅ Dashboard con polling, filtros por estado y sucursal, Server Component
- ✅ Reportes agregados por tipo y sucursal con filtro de rango de fechas
- ✅ Logs estructurados en JSON para cada evento del worker
- ✅ 7 tests unitarios del worker (happy path, stock insuficiente, idempotencia)
- ✅ Script de seed idempotente (`npm run seed`) con datos de demo realistas
- ✅ Deploy en producción: https://stockflow-hneudev.vercel.app

## Qué no se implementó y por qué

- ❌ **Auth JWT** — requiere 3-4h de setup; se documentaría como middleware de Next.js con `jose` + cookie httpOnly
- ❌ **BullMQ + Redis** — overkill sin infraestructura ya levantada; Vercel Cron + claim atómico cubre el caso de uso
- ❌ **MongoDB transactions** — no disponibles en free tier de Atlas sin replica set; compensación manual como trade-off explícito
- ❌ **WebSockets / SSE** — serverless no mantiene estado entre invocaciones; requeriría Pusher u otro servicio externo

## Cómo correr el proyecto

```bash
npm install
cp .env.example .env.local   # completar MONGODB_URI, WORKER_SECRET, NEXT_PUBLIC_APP_URL
npm run seed                  # puebla la DB con datos de demo
npm run dev
```
