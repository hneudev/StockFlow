# StockFlow

Sistema de control de inventario multi-sucursal con procesamiento asíncrono de movimientos.

**Demo en vivo:** _[URL disponible tras el deploy]_

---

## Stack tecnológico

| Capa          | Tecnología                                                     |
| ------------- | -------------------------------------------------------------- |
| Framework     | Next.js 14 (App Router)                                        |
| Base de datos | MongoDB Atlas + Mongoose                                       |
| UI            | TailwindCSS + shadcn/ui                                        |
| Validación    | Zod                                                            |
| Deploy        | Vercel — monorepo, frontend + backend en un solo proyecto      |
| Worker        | Vercel Cron (cada minuto) + trigger inmediato desde el cliente |

---

## Setup local

### Prerequisitos

- Node.js 18+
- Cuenta en MongoDB Atlas (free tier es suficiente)
- Cuenta en Vercel conectada a GitHub

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/hneudev/StockFlow
cd StockFlow
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable              | Descripción                                 | Requerida en   |
| --------------------- | ------------------------------------------- | -------------- |
| `MONGODB_URI`         | Connection string de MongoDB Atlas          | Local + Vercel |
| `WORKER_SECRET`       | Secret para proteger el endpoint del worker | Local + Vercel |
| `NEXT_PUBLIC_APP_URL` | URL base de la app                          | Local + Vercel |

Generar el `WORKER_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Correr en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

> **Nota sobre el worker en local:** En producción el worker es disparado por Vercel Cron cada minuto. En desarrollo local puede dispararse manualmente haciendo `POST /api/worker/process` con el header `Authorization: Bearer <WORKER_SECRET>`.

### 4. Datos de prueba (opcional)

```bash
npm run seed
```

Crea productos, sucursales y entradas de stock de ejemplo para explorar el dashboard sin configuración manual.

---

## Modelos de datos

### Product

```ts
{
	sku: string; // único — identificador de negocio del producto
	name: string;
	price: number;
	category: string;
	createdAt: Date;
}
```

### Branch

```ts
{
	name: string;
	location: string;
	createdAt: Date;
}
```

### Stock

```ts
{
	productId: ObjectId; // ref: Product
	branchId: ObjectId; // ref: Branch
	quantity: number; // nunca negativo — validado a nivel de DB y de worker
	updatedAt: Date;
}
// índice único compuesto: { productId: 1, branchId: 1 }
// Este índice es la clave del modelo — ver decisiones de arquitectura
```

### Movement

```ts
{
	type: "entry" | "exit" | "transfer";
	productId: ObjectId; // ref: Product
	fromBranchId: ObjectId | null; // null si type = 'entry'
	toBranchId: ObjectId | null; // null si type = 'exit'
	quantity: number;
	status: "pending" | "processing" | "processed" | "failed";
	attempts: number; // incrementa en cada intento del worker
	failReason: string | null; // mensaje legible cuando status = 'failed'
	processedAt: Date | null; // guard de idempotencia
	createdAt: Date;
	updatedAt: Date; // usado para detectar stale jobs en 'processing'
}
```

**Máquina de estados:**

```
[POST /api/movements]
        │
        ▼
     pending  ◄─── stale recovery (si lleva > 5min en processing)
        │
        │  worker claim — findOneAndUpdate atómico
        ▼
   processing
    /        \
[éxito]    [error]
   │            │
   ▼            ├─ non-retryable ──────────────► failed
processed       │
                └─ retryable AND attempts < MAX ► pending
                   retryable AND attempts >= MAX ► failed
```

---

## Estructura del proyecto

```
stockflow/
├── app/
│   ├── (dashboard)/              # Páginas del frontend
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── products/page.tsx     # CRUD de productos
│   │   ├── branches/page.tsx     # CRUD de sucursales
│   │   ├── movements/page.tsx    # Lista de movimientos con filtros
│   │   └── reports/page.tsx      # Reporte por rango de fechas
│   └── api/                      # API Routes (backend)
│       ├── products/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/route.ts     # PUT, DELETE
│       ├── branches/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/route.ts     # PUT, DELETE
│       ├── stock/route.ts        # GET — stock por producto y sucursal
│       ├── movements/
│       │   ├── route.ts          # GET con filtros, POST
│       │   └── [id]/route.ts     # GET detalle
│       ├── worker/
│       │   ├── process/route.ts  # POST — worker principal (requiere WORKER_SECRET)
│       │   └── trigger/route.ts  # POST — trigger interno desde el cliente
│       └── reports/route.ts      # GET — reporte agregado
├── lib/
│   ├── db.ts                     # Singleton de conexión a MongoDB
│   ├── worker.ts                 # Lógica de procesamiento (claimMovement, processMovement, retryOrFail)
│   └── schemas/                  # Schemas Zod compartidos entre routes y worker
│       ├── product.schema.ts
│       ├── branch.schema.ts
│       └── movement.schema.ts
├── models/                       # Modelos Mongoose
│   ├── Product.ts
│   ├── Branch.ts
│   ├── Stock.ts
│   └── Movement.ts
├── components/                   # Componentes React
│   ├── ui/                       # Componentes shadcn/ui generados
│   ├── dashboard/
│   ├── movements/
│   ├── products/
│   └── branches/
├── vercel.json                   # Configuración del cron
├── .env.example                  # Variables de entorno requeridas
├── CHALLENGE.md                  # Descripción original de la prueba técnica
└── PROCESS.md                    # Proceso de desarrollo y decisiones de arquitectura
```

---

## Referencia de API

| Método   | Endpoint              | Descripción                                                          |
| -------- | --------------------- | -------------------------------------------------------------------- |
| `GET`    | `/api/products`       | Listar productos (`?page&limit`)                                     |
| `POST`   | `/api/products`       | Crear producto                                                       |
| `PUT`    | `/api/products/[id]`  | Editar producto                                                      |
| `DELETE` | `/api/products/[id]`  | Eliminar producto                                                    |
| `GET`    | `/api/branches`       | Listar sucursales                                                    |
| `POST`   | `/api/branches`       | Crear sucursal                                                       |
| `PUT`    | `/api/branches/[id]`  | Editar sucursal                                                      |
| `DELETE` | `/api/branches/[id]`  | Eliminar sucursal                                                    |
| `GET`    | `/api/stock`          | Stock por producto y sucursal (`?branchId&productId`)                |
| `POST`   | `/api/movements`      | Crear movimiento — responde `201 { status: 'pending' }` de inmediato |
| `GET`    | `/api/movements`      | Listar movimientos con filtros                                       |
| `GET`    | `/api/movements/[id]` | Detalle de movimiento                                                |
| `POST`   | `/api/worker/process` | Ejecutar ciclo del worker (requiere `Authorization: Bearer`)         |
| `POST`   | `/api/worker/trigger` | Trigger interno — llamado por el cliente tras crear un movimiento    |
| `GET`    | `/api/reports`        | Reporte agregado por tipo, sucursal y rango de fechas                |

### Filtros de movimientos

```
GET /api/movements?status=pending&branchId=xxx&page=1&limit=20
```

| Parámetro  | Valores posibles                            | Default |
| ---------- | ------------------------------------------- | ------- |
| `status`   | `pending` `processing` `processed` `failed` | todos   |
| `branchId` | ObjectId                                    | todos   |
| `page`     | número                                      | `1`     |
| `limit`    | número                                      | `20`    |

### Reporte por rango de fechas

```
GET /api/reports?from=2024-01-01&to=2024-01-31&branchId=xxx
```

```json
{
	"byType": { "entry": 12, "exit": 8, "transfer": 5 },
	"byBranch": [{ "branchId": "...", "name": "Sucursal Centro", "total": 14 }],
	"total": 25,
	"dateRange": { "from": "2024-01-01", "to": "2024-01-31" }
}
```

---

## Decisiones de arquitectura

### Next.js monorepo en Vercel

Un solo repositorio, un solo deploy, cero configuración de CORS. Las API Routes de Next.js son suficientes para este scope. En un sistema de producción con requerimientos más pesados (colas dedicadas, workers long-running, WebSockets), el backend iría en un servicio separado.

### Stock como colección separada

`Stock` no está embebido en `Product`. Vive en su propia colección con índice único compuesto `{ productId, branchId }`. Esto habilita el único patrón que garantiza corrección bajo concurrencia sin locks explícitos:

```js
// Una sola operación valida Y actualiza de forma atómica
const result = await Stock.findOneAndUpdate(
	{ productId, branchId, quantity: { $gte: requestedQty } },
	{ $inc: { quantity: -requestedQty } },
	{ new: true }
);
// null → stock insuficiente, sin ventana de race condition entre check y update
```

### Worker via Vercel Cron + trigger desde el cliente

En entornos serverless no hay proceso always-on. `setTimeout` tras enviar la respuesta no está garantizado — el proceso muere con la función. El Vercel Cron (plan Hobby — una vez al día) actúa como safety net para movimientos que no fueron procesados. El cliente dispara el worker inmediatamente tras crear un movimiento para reducir la latencia percibida.

El `WORKER_SECRET` vive únicamente en variables de entorno del servidor. El trigger del cliente va a `/api/worker/trigger`, una ruta interna de Next.js que tiene acceso al secret del servidor y llama al worker directamente — el token nunca se expone al navegador.

### Puntos de extensión naturales

El sistema está diseñado para ser modificable con cambios localizados:

- **Agregar un tipo de movimiento nuevo** → solo `lib/worker.ts` en la función `processMovement` y el schema Zod en `lib/schemas/movement.schema.ts`
- **Agregar un campo al modelo `Movement`** → `models/Movement.ts` + `lib/schemas/movement.schema.ts`; los route handlers no cambian
- **Cambiar el comportamiento de reintentos** → solo `lib/worker.ts` en `retryOrFail` y `classifyError`
- **Cambiar el intervalo del cron** → solo `vercel.json`

### Polling en lugar de WebSockets

Las serverless functions terminan al enviar la respuesta y no pueden mantener conexiones persistentes. WebSockets requeriría un servicio externo (Pusher, Ably). Polling cada 5 segundos es la decisión honesta para este entorno: predecible, sin dependencias adicionales, suficiente para un dashboard interno.

---

## Qué haría diferente con una semana

**Infraestructura:**

- **BullMQ + Redis** en lugar de Vercel Cron — retry con backoff exponencial, dead-letter queues, visibilidad de la cola, workers long-running sin latencia de hasta 1 minuto
- **MongoDB transactions** (`session.withTransaction()`) para transferencias — elimina la lógica de compensación manual
- **Redlock** para locking distribuido bajo alta concurrencia con múltiples workers paralelos

**API y contrato:**

- **OpenAPI/Swagger** generado desde los schemas Zod — documentación siempre sincronizada con el comportamiento real
- **Cursor-based pagination** en lugar de offset — el offset tiene comportamiento inconsistente cuando el dataset cambia entre páginas
- **Webhooks outbound** en cambios de estado — elimina la necesidad de polling en integraciones externas

**Calidad y seguridad:**

- **Autenticación JWT** con autorización a nivel de sucursal — un branch manager solo ve y opera su propia sucursal
- **Job de reconciliación** periódico — verifica que `SUM(stock por sucursal)` sea consistente con el historial de movimientos procesados
- **Rate limiting** en `POST /api/movements` — previene flooding accidental o intencional de la cola
- **Suite de tests más amplia** — integración del ciclo completo de movimiento y tests de concurrencia
