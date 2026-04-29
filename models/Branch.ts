import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBranch extends Document {
  name: string;
  location: string;
  createdAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Branch: Model<IBranch> =
  mongoose.models.Branch ?? mongoose.model<IBranch>("Branch", branchSchema);

export default Branch;
