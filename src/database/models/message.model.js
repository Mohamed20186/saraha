import mongoose from "mongoose";

export const messageSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
      minLength: 1,
      maxLength: 5000,
      required: function () {
        return !this.attachments?.length;
      },
    },
    attachments: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: true,
    strictQuery: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.index({ receiverId: 1, createdAt: -1 });

export const messageModel =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
