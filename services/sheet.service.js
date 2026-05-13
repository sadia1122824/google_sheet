const { Latest_WEB_APP_URL, previous_WEB_APP_URL, TOKEN, EXCEL_FILE_PATH } = require("../config/google");

const axios = require("axios");
const Latest_ClientCredentials = require("../models/latest_googlesheet_credentials");
const Previous_ClientCredentials = require("../models/previous_googlesheet_credentials");
const mongoose = require("mongoose");

class SheetService {
 constructor() {
    // ✅ Constructor mein runtime pe lo — startup pe load hone ka issue nahi
    this.latestWebAppUrl = process.env.Latest_WEB_APP_URL;
    this.previousWebAppUrl = process.env.previous_WEB_APP_URL;
    this.token = process.env.TOKEN;
    this.excelFilePath = process.env.EXCEL_FILE_PATH;

    // 🔍 Debug
    console.log("🔧 Latest URL:", this.latestWebAppUrl ? "✅ Set" : "❌ MISSING");
    console.log("🔧 Previous URL:", this.previousWebAppUrl ? "✅ Set" : "❌ MISSING");
    console.log("🔧 TOKEN:", this.token ? "✅ Set" : "❌ MISSING");
  }

  async authorize() {
    try {
      console.log("✅ Using Apps Script Web App, no Google API auth required");
      return true;
    } catch (error) {
      console.error("Authorization failed:", error.message);
      throw error;
    }
  }

 
 // ================================
// ✅ ADD ROWS — yearType ke hisaab se URL choose karo
// ================================


async addMultipleRows(rows, yearType = "latest", clientId = null, clientName = null) {  // ✅ NEW params
  try {
    await this.authorize();

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Invalid rows" };
    }

    const webAppUrl = yearType === "latest"
      ? this.latestWebAppUrl
      : this.previousWebAppUrl;

    console.log(`📍 Using ${yearType} URL:`, webAppUrl ? "✅ Set" : "❌ MISSING");
    console.log(`👤 Client: ${clientName || "N/A"} (ID: ${clientId || "N/A"})`);  // ✅ NEW

    console.log("📍 Getting next available row...");
    const rowRes = await axios.post(webAppUrl, {
      token: this.token,
      action: "getNextRow",
      sheetName: "Explotacion comparativa",
    });

    console.log("📊 Response from getNextRow:", JSON.stringify(rowRes.data, null, 2));

    if (!rowRes.data.success) {
      throw new Error(`Failed to get next row: ${rowRes.data.error || "Unknown error"}`);
    }

    const startRow = rowRes.data.insertRow;
    if (!startRow || typeof startRow !== "number") {
      throw new Error(`Invalid start row returned: ${startRow}`);
    }

    console.log("📍 Start inserting at row:", startRow);

    const processedRows = this.prepareRowsForGoogleSheets(rows, startRow);
    console.log(`✅ Prepared ${processedRows.length} rows`);

    console.log("📤 Sending rows to Google Sheets...");
    const response = await axios.post(webAppUrl, {
      token: this.token,
      action: "addRows",
      sheetName: "Explotacion comparativa",
      data: processedRows,
      startRow: startRow,
      monthColumns: [1, 2, 3],
      clientId:   clientId,    // ✅ NEW — Apps Script ko jayega
      clientName: clientName,  // ✅ NEW — file name mein lagega
    });

    console.log("✅ Insert response:", JSON.stringify(response.data, null, 2));
    const resData = response.data;

    console.log("🆔 ======= SPREADSHEET IDs =======");
    console.log("📄 Original Spreadsheet ID:", resData?.originalSheet?.spreadsheetId);
    console.log("📄 New (Copy) Spreadsheet ID:", resData?.newSpreadsheet?.spreadsheetId);
    console.log("🔗 Original Sheet URL:", resData?.originalSheetUrl);
    console.log("🔗 New Spreadsheet URL:", resData?.newSpreadsheetUrl);
    console.log("👤 Client Name in File:", resData?.newSpreadsheet?.clientName);  // ✅ NEW
    console.log("=================================");

    const credData = {
      originalSpreadsheetId: resData?.originalSheet?.spreadsheetId,
      newSpreadsheetId:      resData?.newSpreadsheet?.spreadsheetId,
      originalSheetUrl:      resData?.originalSheetUrl,
      newSpreadsheetUrl:     resData?.newSpreadsheetUrl,
      newSpreadsheetName:    resData?.newSpreadsheet?.fileName || null,
      clientId:              clientId   || null,   // ✅ NEW
      clientName:            clientName || null,   // ✅ NEW
    };

    if (yearType === "latest") {
      await this.saveLatestCredentials(credData);
      console.log("✅ Saved to Latest DB only");
    } else {
      await this.savePreviousCredentials(credData);
      console.log("✅ Saved to Previous DB only");
    }

    return {
      success:               true,
      originalSpreadsheetId: resData?.originalSheet?.spreadsheetId,
      newSpreadsheetId:      resData?.newSpreadsheet?.spreadsheetId,
      originalSheetUrl:      resData?.originalSheetUrl,
      newSpreadsheetUrl:     resData?.newSpreadsheetUrl,
      newSpreadsheetName:    resData?.newSpreadsheet?.fileName || null,
      insertedRows:          processedRows.length,
      startRow:              startRow,
      clientId:              clientId   || null,   // ✅ NEW
      clientName:            clientName || null,   // ✅ NEW
      sheetUrl:              resData?.newSpreadsheetUrl,  // ✅ frontend ke liye
    };

  } catch (error) {
    console.error("❌ Error sending to Google Sheets:", error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      console.error("Response status:", error.response.status);
    }
    return {
      success: false,
      error:   error.message,
      stack:   error.stack,
    };
  }
}

  // ================================
  // ✅ SAVE LATEST CREDENTIALS
  // ================================
async saveLatestCredentials(data) {
  try {
    const cred = new Latest_ClientCredentials({
      originalSpreadsheetId: data.originalSpreadsheetId,
      newSpreadsheetId:      data.newSpreadsheetId,
      originalSheetUrl:      data.originalSheetUrl,
      newSpreadsheetUrl:     data.newSpreadsheetUrl,
      newSpreadsheetName:    data.newSpreadsheetName,
      webAppUrl:             this.latestWebAppUrl,
      clientId:              data.clientId   || null,  // ✅ ADD
      clientName:            data.clientName || null,  // ✅ ADD
      createdAt:             new Date(),
    });
    await cred.save();
    console.log("✅ Latest credentials saved:", data.newSpreadsheetId);
  } catch (err) {
    console.error("❌ Failed to save latest credentials:", err.message);
  }
}

async savePreviousCredentials(data) {
  try {
    const cred = new Previous_ClientCredentials({
      originalSpreadsheetId: data.originalSpreadsheetId,
      newSpreadsheetId:      data.newSpreadsheetId,
      originalSheetUrl:      data.originalSheetUrl,
      newSpreadsheetUrl:     data.newSpreadsheetUrl,
      newSpreadsheetName:    data.newSpreadsheetName,
      webAppUrl:             this.previousWebAppUrl,
      clientId:              data.clientId   || null,  // ✅ ADD
      clientName:            data.clientName || null,  // ✅ ADD
      createdAt:             new Date(),
    });
    await cred.save();
    console.log("✅ Previous credentials saved:", data.newSpreadsheetId);
  } catch (err) {
    console.error("❌ Failed to save previous credentials:", err.message);
  }
}

 // ================================
// ✅ FETCH LATEST SHEET DATA
// ================================
async fetchLatestSheetData(clientId) {  // ✅ clientId parameter add
  try {
    if (!clientId) {
      return { success: false, error: "clientId is required" };
    }

    // ✅ Sirf is client ka latest record
    const record = await Latest_ClientCredentials
       .findOne({
        $or: [
          { clientId: clientId },        // "1234" ✅
          { clientId: clientId.toString() }
        ]
      })
      .sort({ createdAt: -1 });

    if (!record) {
      return { 
        success: false, 
        error: `No sheet found for client ${clientId}. Please upload a file first.` 
      };
    }

    const spreadsheetId = record.newSpreadsheetId;
    console.log(`🔍 Client ${clientId} → spreadsheetId: ${spreadsheetId}`);

    const response = await axios.get(this.latestWebAppUrl, {
      params: {
        token:         this.token,
        action:        "getSheetData",
        spreadsheetId: spreadsheetId,
      },
    });

    if (!response.data.success) {
      return { success: false, error: response.data.error || "Failed to fetch sheet data" };
    }

    const sheetData = response.data.data;
    console.log(`📊 Got ${sheetData.length} rows for client ${clientId}`);

    const result = await this.saveSheetDataToDB(sheetData, "explotacion_comparativa", clientId);  // ✅ clientId pass

    if (!result.success) return { success: false, error: result.error };

    return { success: true, data: sheetData, collection: result.collection };

  } catch (err) {
    console.error("❌ fetchLatestSheetData error:", err.message);
    return { success: false, error: err.message };
  }
}

// Same for fetchPreviousSheetData
async fetchPreviousSheetData(clientId) {  // ✅
  try {
    if (!clientId) return { success: false, error: "clientId is required" };

    const record = await Previous_ClientCredentials
      .findOne({
        $or: [
          { clientId: clientId },
          { clientId: clientId.toString() }
        ]
      })
      .sort({ createdAt: -1 });

    if (!record) {
      return { success: false, error: `No previous sheet found for client ${clientId}.` };
    }

    const spreadsheetId = record.newSpreadsheetId;
    const response = await axios.get(this.previousWebAppUrl, {
      params: { token: this.token, action: "getSheetData", spreadsheetId },
    });

    if (!response.data.success) {
      return { success: false, error: response.data.error };
    }

    const sheetData = response.data.data;
    const result = await this.saveSheetDataToDB(sheetData, "explotacion_comparativa", clientId);

    if (!result.success) return { success: false, error: result.error };

    return { success: true, data: sheetData, collection: result.collection };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

  // ================================
  // ✅ SAVE SHEET DATA TO DB (unchanged)
  // ================================
async saveSheetDataToDB(sheetData, baseCollectionName = "explotacion_comparativa", clientId = null) {
  if (!sheetData || sheetData.length === 0) {
    return { success: false, error: "No data to save" };
  }

  let yearsFound = [];
  for (let i = 0; i < Math.min(sheetData.length, 5); i++) {
    const rowValues = Object.values(sheetData[i]).map((val) => String(val).trim());
    const years = rowValues.filter((val) => /^20\d{2}$/.test(val)).map(Number);
    if (years.length > 0) {
      yearsFound = years;
      console.log(`📅 Years found in row ${i}:`, yearsFound);
      break;
    }
  }

  if (yearsFound.length === 0) {
    console.warn("⚠️ No years found in sheet data");
    return { success: false, error: "No years detected in sheet" };
  }

  const sheetMaxYear = Math.max(...yearsFound);
  console.log("📅 Sheet max year:", sheetMaxYear);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  // ✅ clientId ke saath prefix banao
  const collectionPrefix = clientId
    ? `${baseCollectionName}_${clientId}`
    : baseCollectionName;

  // ✅ Pattern bhi clientId wala check kare
  const pattern = clientId
    ? new RegExp(`^explotacion_comparativa_${clientId}_(\\d{4})_(\\d{4})$`)
    : /^explotacion_comparativa_(\d{4})_(\d{4})$/;

  const matched = names.filter((n) => pattern.test(n));
  console.log("📦 Existing matched collections:", matched);

  let targetCollection = null;
  for (const col of matched) {
    const parts = col.match(pattern);
    const endYear = parseInt(parts[parts.length - 1]); // last group = end year
    if (endYear === sheetMaxYear) {
      targetCollection = col;
      console.log(`✅ Matched existing collection: ${targetCollection}`);
      break;
    }
  }

  if (!targetCollection) {
    const sorted = [...new Set(yearsFound)].sort((a, b) => a - b);
    const suffix = sorted.length >= 2 ? sorted.join("_") : String(sorted[0]);
    targetCollection = `${collectionPrefix}_${suffix}`; // ✅ prefix use
    console.log(`🆕 New collection will be created: ${targetCollection}`);
  }

  const collectionExists = names.includes(targetCollection);
  if (collectionExists) {
    await db.collection(targetCollection).deleteMany({});
    console.log(`🗑️ Cleared old data from: ${targetCollection}`);
  } else {
    console.log(`🆕 New collection will be created: ${targetCollection}`);
  }

  const docsToInsert = sheetData.map((row) => ({
    ...row,
    _clientId: clientId,   // ✅ document mein bhi save
    _yearsInSheet: yearsFound,
    _syncedAt: new Date(),
  }));

  const result = await db.collection(targetCollection).insertMany(docsToInsert);
  console.log(`📥 Inserted ${result.insertedCount} rows into ${targetCollection}`);

  return {
    success: true,
    inserted: result.insertedCount,
    collection: targetCollection,
    yearsFound,
    sheetMaxYear,
    isNewCollection: !collectionExists,
  };
}

  // ================================
  // ✅ PREPARE ROWS (unchanged)
  // ================================
  prepareRowsForGoogleSheets(rows, startRow) {
    const validRows = rows.filter(
      (row) => Array.isArray(row) && row[1] && row[1].toString().trim() !== ""
    );

    console.log(`🔄 Preparing ${validRows.length} valid rows starting from sheet row ${startRow}`);

    const processedRows = validRows.map((row, index) => {
      const currentRow = startRow + index;
      console.log(`  ↳ Row ${index + 1} → Sheet row ${currentRow}`);

      const processedRow = new Array(30).fill("");
      processedRow[0] = "";
      processedRow[1] = row[1] ? row[1].toString().trim() : "";

      const monthGsCols = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
      monthGsCols.forEach((gsCol) => {
        processedRow[gsCol] = row[gsCol] !== null && row[gsCol] !== undefined ? row[gsCol] : "";
      });

      return processedRow;
    });

    return processedRows;
  }
}

module.exports = new SheetService();