# PROCESS.md

---

## Resumen ejecutivo

Tres decisiones definen la arquitectura de este sistema:

1. **`Stock` como colección separada** — habilita updates atómicos con precondición de cantidad sin locks explícitos, la única forma de evitar race conditions en stock bajo concurrencia.
2. **Worker con claim atómico `pending → processing`** — garantiza single-consumer aunque Vercel Cron dispare invocaciones solapadas; los errores se clasifican como `retryable` o `non-retryable` para no gastar intentos en fallos definitivos.
3. **Polling en cliente cada 5s** — decisión honesta para el entorno serverless donde WebSockets y SSE requieren infraestructura adicional no justificada en este scope.

---

## Cómo abordé el problema

### Punto de partida

Los primeros 30 minutos los dediqué exclusivamente a diseño en papel, sin abrir el editor.

El primer artefacto que produje no fue un diagrama de arquitectura sino una máquina de estados para el ciclo de vida de un movimiento: qué transiciones son válidas, qué las dispara, qué puede fallar en cada paso y qué garantías ofrece el sistema ante cada tipo de fallo. Todo lo demás —CRUD, dashboard, reportes— es estándar. La complejidad real está en garantizar que el procesamiento async sea correcto bajo concurrencia, incluso en un entorno serverless sin estado compartido entre invocaciones.

Con ese modelo claro, las decisiones de stack se volvieron consecuencias, no elecciones: Next.js en Vercel elimina fricción de deploy y CORS; `Stock` como colección separada es la única forma de hacer updates atómicos sin locks explícitos; Vercel Cron es el mecanismo de scheduling disponible cuando no hay proceso long-running.

El approach de desarrollo fue **feature-driven por vertical slices**: cada feature se termina de modelo a UI antes de pasar a la siguiente. En 48 horas, tener el backend completo y el frontend a medias es un fracaso; tener el core funcionando end-to-end con features secundarias en buen estado es una entrega defendible.

### Endpoints definidos antes de escribir código

| Método   | Ruta                  | Descripción                                               |
| -------- | --------------------- | --------------------------------------------------------- |
| `GET`    | `/api/products`       | Listar productos (paginado: `?page&limit`)                |
| `POST`   | `/api/products`       | Crear producto                                            |
| `PUT`    | `/api/products/[id]`  | Editar producto                                           |
| `DELETE` | `/api/products/[id]`  | Eliminar producto                                         |
| `GET`    | `/api/branches`       | Listar sucursales                                         |
| `POST`   | `/api/branches`       | Crear sucursal                                            |
| `PUT`    | `/api/branches/[id]`  | Editar sucursal                                           |
| `DELETE` | `/api/branches/[id]`  | Eliminar sucursal                                         |
| `GET`    | `/api/stock`          | Stock total y por sucursal (`?branchId&productId`)        |
| `POST`   | `/api/movements`      | Crear movimiento → responde `201 { status: 'pending' }`   |
| `GET`    | `/api/movements`      | Listar con filtros (`?status&branchId&page&limit`)        |
| `GET`    | `/api/movements/[id]` | Detalle de movimiento                                     |
| `POST`   | `/api/worker/process` | Trigger interno del worker (no público — ver decisión #2) |
| `GET`    | `/api/reports`        | Reporte agregado por rango de fechas, tipo y sucursal     |

**Nota sobre el worker:** El endpoint del worker usa `POST`, no `GET`. Un `GET` con side-effects viola la semántica HTTP — los GETs deben ser seguros e idempotentes. El worker modifica estado (toma ownership de jobs, actualiza stocks), por lo que `POST` es el método correcto. El endpoint está protegido con `Authorization: Bearer $WORKER_SECRET` verificado en el handler; el secret vive únicamente en variables de entorno del servidor, nunca en el cliente.

**Nota sobre el trigger manual desde el frontend:** El frontend puede disparar el worker inmediatamente al crear un movimiento (para no esperar el cron). Este trigger va a través de un endpoint separado `/api/worker/trigger` — una ruta interna de Next.js que tiene acceso al secret del servidor y llama al worker directamente, sin exponer el token al navegador.

### Qué prioricé primero

1. Schema completo y conexión a DB — define las garantías del sistema antes del primer handler
2. Máquina de estados del movimiento y el worker — el core del reto; todo lo demás depende de esto
3. CRUD de productos y sucursales — necesario para que el flujo de movimiento tenga datos reales
4. Dashboard con polling — lo que el evaluador verá en vivo
5. Reportes — read-only, no bloquea ningún otro flujo

### Qué dejé para el final

- Polish visual y estados de error en UI
- Esta documentación (ensamblada desde notas tomadas durante el desarrollo)

### Estrategia de commits

Los commits fueron planeados antes de escribir código. Cada uno representa un estado funcional del sistema:

```
docs: project planning, architecture decisions, and challenge description
feat: initial Next.js setup + MongoDB connection + env validation
feat: product and branch models + CRUD routes + zod schemas
feat: stock model with compound index { productId, branchId }
feat: movement model with status state machine
feat: POST /api/movements — accepts and returns pending immediately
feat: worker core — atomic ownership claim + stock update
feat: retry logic — retryable vs non-retryable error classification
feat: transfer movement — two-phase update with compensation
feat: dashboard UI with status polling
feat: reports endpoint and view
test: worker happy path + insufficient stock + idempotency
docs: complete README and PROCESS.md
```

## Herramientas utilizadas

| Herramienta           | Propósito                                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VS Code + Claude Code | Editor principal — Claude Code usado para generación de boilerplate (modelos, schemas Zod, estructura de componentes) y debugging. El razonamiento de arquitectura y las decisiones de diseño fueron propias; la IA aceleró la ejecución. |
| MongoDB Atlas         | DB cloud en free tier — cluster configurado antes de escribir código                                                                                                                                                                      |
| Vercel                | Deploy — conectado a GitHub, auto-deploy en push a `main`                                                                                                                                                                                 |
| shadcn/ui             | Componentes UI — `Badge`, `Table`, `Select` para el dashboard                                                                                                                                                                             |
| Thunder Client        | Testing manual de API durante el desarrollo del backend                                                                                                                                                                                   |
| GitHub                | Control de versiones — commits atómicos y planeados                                                                                                                                                                                       |

**Sobre testing:** Se eligió no hacer TDD dado el tiempo disponible y la velocidad con que el schema evolucionó en las primeras horas. Los tests se escribieron después de que el worker estuvo estable, enfocados en tres casos: happy path, stock insuficiente como error non-retryable, e idempotencia del worker ante invocaciones duplicadas. Estos tres casos cubren el comportamiento más crítico del sistema sin gastar tiempo en cobertura superficial.

**Sobre navegabilidad del código:** El código está estructurado para ser modificable bajo presión, no solo legible. El worker vive en `lib/worker.ts` completamente separado del route handler. Las funciones tienen nombres que expresan intención (`claimMovement`, `validateAndDeductStock`, `classifyError`, `retryOrFail`). Los comentarios existen donde la lógica no es obvia —especialmente en el pattern de ownership atómico y la compensación de transferencias.
