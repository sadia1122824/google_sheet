const mongoose = require("mongoose");

const sheetSchema = new mongoose.Schema({
  originalSpreadsheetId: String,
  newSpreadsheetId: String,
  originalSheetUrl: String,
  newSpreadsheetUrl: String,
  newSpreadsheetName: String,
  createdAt: { type: Date, default: Date.now }
});

const ClientCredentials = mongoose.model("ClientCredentials", sheetSchema);
module.exports = ClientCredentials;