// ─── Tipos serializados ───────────────────────────────────────────────────────
// Solo strings, numbers y booleans — seguros para pasar como props
// de Server Component a Client Component en Next.js

export type MovementStatus = "pending" | "processing" | "processed" | "failed";
export type MovementType   = "entry"   | "exit"        | "transfer";

export interface SerializedMovement {
  _id:          string;
  type:         MovementType;
  productId:    { _id: string; name: string; sku: string } | null;
  fromBranchId: { _id: string; name: string } | null;
  toBranchId:   { _id: string; name: string } | null;
  quantity:     number;
  status:       MovementStatus;
  createdAt:    string;
  updatedAt:    string;
  processedAt:  string | null;
}

export interface SerializedStock {
  _id:       string;
  productId: { _id: string; name: string; sku: string };
  branchId:  { _id: string; name: string };
  quantity:  number;
  updatedAt: string;
}

export interface SerializedBranch {
  _id:       string;
  name:      string;
  location:  string;
  createdAt: string;
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

const toISO = (d: unknown): string =>
  d instanceof Date ? d.toISOString() : new Date(d as string).toISOString();

const toISOorNull = (d: unknown): string | null =>
  d == null ? null : toISO(d);

// ─── Serializadores ───────────────────────────────────────────────────────────
// Aceptan documentos lean() de Mongoose — ObjectIds y Dates se convierten
// a strings antes de cruzar el boundary Server → Client

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeMovement(doc: any): SerializedMovement {
  return {
    _id:  doc._id.toString(),
    type: doc.type,
    productId: doc.productId
      ? { _id: doc.productId._id.toString(), name: doc.productId.name, sku: doc.productId.sku }
      : null,
    fromBranchId: doc.fromBranchId
      ? { _id: doc.fromBranchId._id.toString(), name: doc.fromBranchId.name }
      : null,
    toBranchId: doc.toBranchId
      ? { _id: doc.toBranchId._id.toString(), name: doc.toBranchId.name }
      : null,
    quantity:    doc.quantity,
    status:      doc.status,
    createdAt:   toISO(doc.createdAt),
    updatedAt:   toISO(doc.updatedAt),
    processedAt: toISOorNull(doc.processedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeStock(doc: any): SerializedStock {
  return {
    _id: doc._id.toString(),
    productId: {
      _id:  doc.productId._id.toString(),
      name: doc.productId.name,
      sku:  doc.productId.sku,
    },
    branchId: {
      _id:  doc.branchId._id.toString(),
      name: doc.branchId.name,
    },
    quantity:  doc.quantity,
    updatedAt: toISO(doc.updatedAt),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeBranch(doc: any): SerializedBranch {
  return {
    _id:       doc._id.toString(),
    name:      doc.name,
    location:  doc.location,
    createdAt: toISO(doc.createdAt),
  };
}
