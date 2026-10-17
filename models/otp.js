const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
  role: { type: String, required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

otpSchema.index({ accountId: 1, role: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto delete

module.exports = mongoose.model("Otp", otpSchema);