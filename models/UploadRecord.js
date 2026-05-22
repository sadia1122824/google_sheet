// models/UploadRecord.js
const mongoose = require("mongoose");

const uploadSchema = new mongoose.Schema({
  staffId:      { type: String, required: true, index: true },
  clientId:     { type: String, required: true, index: true },
  clientName:   { type: String },
  fileName:     { type: String },
  importedRows: { type: Number, default: 0 },
  failedRows:   { type: Number, default: 0 },
  year:         { type: String },
  status:       { type: String, enum: ["success","pending","error"], default: "success" },
  sheetUrl:     { type: String },
}, { timestamps: true }); // ✅ createdAt auto banta hai

const UploadRecord = mongoose.model("UploadRecord", uploadSchema);

module.exports = UploadRecord;