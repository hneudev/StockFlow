**Stack:** Node.js · React · MongoDB
**Tiempo de entrega:** 48 horas desde que recibes este documento
**Entrega:** Repositorio público en GitHub + deploy funcional en Vercel

---

## Contexto

Estamos construyendo un sistema interno de control de inventario multi-sucursal. Queremos evaluar cómo resuelves un problema que no es trivial pero tampoco requiere una semana: pasa por API, async, datos y un poco de frontend.

No buscamos perfección. Buscamos criterio. Este reto lo resuelves en 48 horas si sabes priorizar; si no, te va a comer el tiempo. Entrega lo que funcione bien antes de entregar todo a medias.

---

## El reto

Construye **StockFlow**: una mini-plataforma para manejar inventario de productos distribuidos en varias sucursales, con movimientos entre ellas.

### Entidades

- **Producto**: SKU, nombre, precio, categoría
- **Sucursal**: nombre, ubicación
- **Stock**: cuánto hay de cada producto en cada sucursal
- **Movimiento**: transferencia de stock entre sucursales, o entrada/salida (compra/venta)

### Requisitos funcionales

1. **CRUD de productos y sucursales** desde el frontend.
2. **Registro de movimientos** (entrada, salida, transferencia entre sucursales). Al registrar un movimiento:
   - Se valida que haya stock disponible en la sucursal origen (si aplica).
   - Se actualizan los stocks correspondientes.
   - Se genera un registro histórico del movimiento.
3. **Procesamiento asíncrono de movimientos**: al crear un movimiento el API responde rápido (estado `pending`), y un worker lo procesa después actualizando los stocks reales. El frontend muestra el cambio de estado. Esto simula el comportamiento real de sistemas que integran con ERPs lentos.
4. **Dashboard** con:
   - Lista de productos con stock total y stock por sucursal
   - Lista de movimientos con filtro por estado (`pending`, `processed`, `failed`) y por sucursal
   - Detalle de cada movimiento
5. **Reintentos**: si el procesamiento falla (por ejemplo, stock insuficiente detectado al procesar por concurrencia), debe reintentar al menos una vez antes de marcarlo `failed` con una razón legible.
6. **Reporte simple**: un endpoint y vista que muestre, para un rango de fechas, el total de movimientos por tipo y por sucursal.

### Stack

- **Backend:** Node.js (Express, Fastify, Nest… tu decisión)
- **Frontend:** React (Vite, Next.js, CRA… tu decisión)
- **DB:** MongoDB (Atlas free tier está bien)
- **Deploy:** El frontend debe estar en Vercel. Para el backend tienes dos caminos válidos:
  - **Recomendado:** usar **Next.js** (App Router o Pages Router) con API Routes / Route Handlers, para deployar frontend + backend juntos en Vercel en un solo proyecto. Simplifica el deploy y es lo que usamos internamente.
  - **Alternativa:** separar backend en su propio servicio (Railway, Render, Fly.io, etc.). Si eliges esta ruta, justifica por qué y asegúrate de que el CORS, las variables de entorno y el deploy estén bien resueltos.

### Opcionales que suman (no obligatorios)

- **RabbitMQ** (o BullMQ con Redis) para la cola de procesamiento. Si no lo usas, implementa la async de otra forma razonable y explica el trade-off.
- **Docker** / `docker-compose` para levantar local y, si tu backend va fuera de Vercel, para deployarlo en la plataforma que elijas. Si lo incluyes y el deploy del backend se hace vía contenedor (no solo para desarrollo local), **suma puntos extra** porque demuestra que sabes llevar servicios a producción de forma portable.
- Tests (al menos uno o dos que demuestren cómo piensas en testing).
- Autenticación básica (JWT o similar) — no obligatoria, pero si la agregas hazla bien.
- Manejo de concurrencia: ¿qué pasa si llegan dos movimientos del mismo producto al mismo tiempo?

### Restricciones

- Máximo **48 horas** desde que recibes este documento.
- Todo el código debe estar en un repositorio **público** de GitHub.
- El frontend debe estar **deployado en Vercel** y funcional (la URL se incluye en el README).
- Puedes usar cualquier herramienta, librería o recurso que uses normalmente en tu día a día.

---

## Entregables

1. **Repositorio GitHub** (público) con:
   - Código del frontend y backend (monorepo o dos repos, como prefieras)
   - `README.md` con: instrucciones de setup local, variables de entorno necesarias, decisiones de arquitectura y trade-offs
   - Al menos una sección del README explicando **qué harías diferente si tuvieras una semana en vez de 48h**
2. **URL de Vercel** con el frontend funcionando contra tu backend desplegado
3. **Un archivo `PROCESS.md` en la raíz del repo** con lo siguiente:
   - Cómo abordaste el problema: de qué partiste, qué decidiste primero, qué dejaste para el final
   - Qué herramientas usaste en tu flujo de trabajo (cualquiera: IDE, extensiones, servicios, lo que uses normalmente)
   - Un diagrama simple de la arquitectura (ASCII, Mermaid o imagen — lo que sea más claro)
   - Las 2-3 decisiones técnicas más importantes que tomaste y por qué

> El `PROCESS.md` pesa en la evaluación. No lo escribas al final en 5 minutos: es parte de lo que estamos evaluando.

---

## Criterios de evaluación

Evaluamos sobre 100 puntos distribuidos así:

| Categoría                                                                | Peso |
| ------------------------------------------------------------------------ | ---- |
| Arquitectura y decisiones técnicas                                       | 25   |
| Calidad del código (legibilidad, estructura, manejo de errores)          | 20   |
| Funcionalidad completa y deploy exitoso                                  | 15   |
| Modelado de datos en MongoDB                                             | 10   |
| Implementación del procesamiento async                                   | 10   |
| Claridad del `README.md` y `PROCESS.md`                                  | 10   |
| UX del dashboard (no tiene que ser bonito, tiene que ser claro)          | 5    |
| Extras (Docker, tests, auth, colas reales, concurrencia, observabilidad) | 5    |

**Descalifican automáticamente:**

- Commits en un solo push al final (queremos ver cómo trabajas, no solo el resultado)
- Variables sensibles commiteadas (tokens, API keys, connection strings)
- README genérico o ausente
- Deploy que no funciona al momento de la revisión

---

## Notas sobre cómo trabajamos

Trabajamos con herramientas modernas y esperamos que tú también. Usa las que te hagan productivo — no hay puntos por hacerlo "a mano" cuando existe una herramienta mejor. Tampoco hay puntos por usar todas las herramientas del mercado si no aportan.

Lo que nos importa es **entender por qué tomaste cada decisión**. Si te apoyas en algún recurso o herramienta para acelerar una parte, está perfecto; lo que queremos ver es que el resultado sea consistente, que entiendas lo que entregaste y que lo puedas defender en una entrevista técnica.

Los candidatos que mejor lo hacen suelen dedicar tiempo al inicio a **definir claramente qué van a construir antes de escribir código**: qué endpoints, qué modelos, qué flujos. Eso se nota en la entrega final y en el `PROCESS.md`.

---

## Siguiente paso

Si entregas a tiempo y pasas a la siguiente fase, te invitamos a una sesión de 30 minutos donde:

1. Nos muestras tu solución en vivo
2. Te pedimos **modificar algo pequeño de tu código en el momento** — por ejemplo, agregar un campo nuevo al modelo, cambiar un comportamiento del worker o refactorizar una función
3. Preguntas y conversación

Esta segunda parte es igual de importante que el código que entregues. Es una charla técnica normal: queremos ver cómo piensas cuando estás frente al código, no examinarte.

---

## Preguntas

Si tienes dudas sobre el alcance, escríbenos. Preferimos que preguntes antes de asumir.

**Suerte.**
