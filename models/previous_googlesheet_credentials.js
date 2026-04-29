const mongoose = require("mongoose");

const previousCredentialsSchema = new mongoose.Schema(
  {
    originalSpreadsheetId: { type: String },
    newSpreadsheetId: { type: String },
    originalSheetUrl: { type: String },
    newSpreadsheetUrl: { type: String },
    newSpreadsheetName: { type: String },
    webAppUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ Model export hona chahiye — NOT instance
const Previous_ClientCredentials = mongoose.model("Previous_ClientCredentials", previousCredentialsSchema);
module.exports = Previous_ClientCredentials;