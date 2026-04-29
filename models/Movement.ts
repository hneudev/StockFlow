import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type MovementType = "entry" | "exit" | "transfer";
export type MovementStatus = "pending" | "processing" | "processed" | "failed";

export interface IMovement extends Document {
  type: MovementType;
  productId: Types.ObjectId;
  fromBranchId: Types.ObjectId | null;
  toBranchId: Types.ObjectId | null;
  quantity: number;
  status: MovementStatus;
  attempts: number;
  failReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const movementSchema = new Schema<IMovement>(
  {
    type: {
      type: String,
      enum: ["entry", "exit", "transfer"] satisfies MovementType[],
      required: true,
    },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    // null en entry (no tiene origen)
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    // null en exit (no tiene destino)
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", default: null },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "processing", "processed", "failed"] satisfies MovementStatus[],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    failReason: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Movement: Model<IMovement> =
  mongoose.models.Movement ?? mongoose.model<IMovement>("Movement", movementSchema);

export default Movement;
