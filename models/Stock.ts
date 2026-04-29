import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IStock extends Document {
  productId: Types.ObjectId;
  branchId: Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const stockSchema = new Schema<IStock>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    // quantity nunca puede ser negativo — la atomicidad de los updates lo garantiza
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Índice único compuesto — permite updates atómicos sin race conditions entre check y update
stockSchema.index({ productId: 1, branchId: 1 }, { unique: true });

const Stock: Model<IStock> =
  mongoose.models.Stock ?? mongoose.model<IStock>("Stock", stockSchema);

export default Stock;
