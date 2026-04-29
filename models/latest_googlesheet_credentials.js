const mongoose = require("mongoose");

const latestCredentialsSchema = new mongoose.Schema(
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
const Latest_ClientCredentials = mongoose.model("Latest_ClientCredentials", latestCredentialsSchema);
module.exports = Latest_ClientCredentials;