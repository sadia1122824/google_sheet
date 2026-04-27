const { WEB_APP_URL, TOKEN, EXCEL_FILE_PATH } = require("../config/google");

const axios = require("axios");
const ClientCredentials = require("../models/client_credentials");
const mongoose = require("mongoose");

//********************************* Add new rows excell sheet ********************************

class SheetService {
  constructor() {
    this.webAppUrl = WEB_APP_URL;
    this.token = TOKEN;
    this.excelFilePath = EXCEL_FILE_PATH;
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

  async addMultipleRows(rows) {
    try {
      await this.authorize();

      if (!Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: "Invalid rows" };
      }

      // 1️⃣ GET START ROW FROM SHEET
      console.log("📍 Getting next available row...");
      const rowRes = await axios.post(this.webAppUrl, {
        token: this.token,
        action: "getNextRow",
        sheetName: "Explotacion comparativa",
      });

      console.log(
        "📊 Response from getNextRow:",
        JSON.stringify(rowRes.data, null, 2),
      );

      if (!rowRes.data.success) {
        throw new Error(
          `Failed to get next row: ${rowRes.data.error || "Unknown error"}`,
        );
      }

      const startRow = rowRes.data.insertRow;

      if (!startRow || typeof startRow !== "number") {
        throw new Error(`Invalid start row returned: ${startRow}`);
      }

      console.log("📍 Start inserting at row:", startRow);

      // 2️⃣ PREPARE ROWS WITH FORMULAS
      console.log("🔄 Preparing rows with formulas...");
      const processedRows = this.prepareRowsForGoogleSheets(rows, startRow);
      console.log(`✅ Prepared ${processedRows.length} rows`);

      // 3️⃣ INSERT ROWS INTO GOOGLE SHEETS
      console.log("📤 Sending rows to Google Sheets...");
      const response = await axios.post(this.webAppUrl, {
        token: this.token,
        action: "addRows",
        sheetName: "Explotacion comparativa",
        data: processedRows,
        startRow: startRow,
        monthColumns: [1, 2, 3],
      });

      console.log(
        "✅ Insert response:",
        JSON.stringify(response.data, null, 2),
      );
      const resData = response.data;

      return {
        success: true,

        // ✅ clean fields
        originalSpreadsheetId: resData?.originalSheet?.spreadsheetId,
        newSpreadsheetId: resData?.newSpreadsheet?.spreadsheetId,

        originalSheetUrl: resData?.originalSheetUrl,
        newSpreadsheetUrl: resData?.newSpreadsheetUrl,
        // ✅ Copy spreadsheet name
        newSpreadsheetName: resData?.newSpreadsheet?.fileName || null,

        // optional
        insertedRows: processedRows.length,
        startRow: startRow,
      };
    } catch (error) {
      console.error("❌ Error sending to Google Sheets:", error.message);
      if (error.response) {
        console.error(
          "Response data:",
          JSON.stringify(error.response.data, null, 2),
        );
        console.error("Response status:", error.response.status);
      }
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

 



// async fetchLatestSheetData() {
//   try {
//     const latest = await ClientCredentials.findOne().sort({ createdAt: -1 });
//     if (!latest) return { success: false, error: "No spreadsheet found" };

//     const response = await axios.get(process.env.WEB_APP_URL, {
//       params: {
//         token: process.env.TOKEN,
//         action: "getSheetData",
//         spreadsheetId: latest.newSpreadsheetId,
//         sheetName: "Explotacion comparativa",
//       },
//     });

//     if (!response.data.success) {
//       return { success: false, error: response.data.error };
//     }

//     const sheetData = response.data.data;

//     const result = await this.saveSheetDataToDB(sheetData, "explotacion_comparativa");

//     console.log("✅ Saved to collection:", result.collection);
//     return { success: true, data: sheetData, collection: result.collection };

//   } catch (err) {
//     console.error(err);
//     return { success: false, error: err.message };
//   }
// }



async fetchLatestSheetData() {
  try {
    // ✅ Saare records lo sorted by createdAt desc
    const records = await ClientCredentials.find().sort({ createdAt: -1 });
    if (!records.length) return { success: false, error: "No spreadsheet found" };

    console.log(`📋 Total ClientCredentials records: ${records.length}`);

    // ✅ Har record ki copied sheet check karo — latest year wali dhundo
    let targetRecord = null;
    let targetYears = [];
    let targetMaxYear = 0;

    for (const record of records) {
      const spreadsheetId = record.newSpreadsheetId;
      if (!spreadsheetId) continue;

      console.log(`🔍 Checking spreadsheetId: ${spreadsheetId}`);

      try {
        const response = await axios.get(process.env.WEB_APP_URL, {
          params: {
            token: process.env.TOKEN,
            action: "getSheetData",
            spreadsheetId: spreadsheetId,
          },
        });

        if (!response.data.success) continue;

        const sheetData = response.data.data;

        // ✅ Years detect karo
        let yearsFound = [];
        for (let i = 0; i < Math.min(sheetData.length, 5); i++) {
          const rowValues = Object.values(sheetData[i]).map((val) => String(val).trim());
          const years = rowValues.filter((val) => /^20\d{2}$/.test(val)).map(Number);
          if (years.length > 0) {
            yearsFound = years;
            break;
          }
        }

        const maxYear = yearsFound.length > 0 ? Math.max(...yearsFound) : 0;
        console.log(`📅 SpreadsheetId ${spreadsheetId} → years: ${yearsFound}, maxYear: ${maxYear}`);

        // ✅ Sabse badi max year wala record = latest
        if (maxYear > targetMaxYear) {
          targetMaxYear = maxYear;
          targetRecord = record;
          targetYears = yearsFound;
        }

      } catch (err) {
        console.warn(`⚠️ Failed to fetch spreadsheetId ${spreadsheetId}:`, err.message);
        continue;
      }
    }

    if (!targetRecord) {
      return { success: false, error: "No valid sheet found with year data" };
    }

    console.log(`✅ Latest sheet identified: ${targetRecord.newSpreadsheetId}, maxYear: ${targetMaxYear}`);

    // ✅ Latest sheet ka full data fetch karo
    const finalResponse = await axios.get(process.env.WEB_APP_URL, {
      params: {
        token: process.env.TOKEN,
        action: "getSheetData",
        spreadsheetId: targetRecord.newSpreadsheetId,
      },
    });

    if (!finalResponse.data.success) {
      return { success: false, error: finalResponse.data.error };
    }

    const sheetData = finalResponse.data.data;
    const result = await this.saveSheetDataToDB(sheetData, "explotacion_comparativa");

    console.log("✅ Latest saved to collection:", result.collection);
    return { success: true, data: sheetData, collection: result.collection };

  } catch (err) {
    console.error("❌ fetchLatestSheetData error:", err.message);
    return { success: false, error: err.message };
  }
}

async fetchPreviousSheetData() {
  try {
    const records = await ClientCredentials.find().sort({ createdAt: -1 });
    if (!records.length) return { success: false, error: "No spreadsheet found" };

    console.log(`📋 Total ClientCredentials records: ${records.length}`);

    // ✅ Har record check karo — year ke sath store karo
    const recordsWithYears = [];

    for (const record of records) {
      const spreadsheetId = record.newSpreadsheetId;
      if (!spreadsheetId) continue;

      try {
        const response = await axios.get(process.env.WEB_APP_URL, {
          params: {
            token: process.env.TOKEN,
            action: "getSheetData",
            spreadsheetId: spreadsheetId,
          },
        });

        if (!response.data.success) continue;

        const sheetData = response.data.data;

        let yearsFound = [];
        for (let i = 0; i < Math.min(sheetData.length, 5); i++) {
          const rowValues = Object.values(sheetData[i]).map((val) => String(val).trim());
          const years = rowValues.filter((val) => /^20\d{2}$/.test(val)).map(Number);
          if (years.length > 0) {
            yearsFound = years;
            break;
          }
        }

        const maxYear = yearsFound.length > 0 ? Math.max(...yearsFound) : 0;
        console.log(`📅 SpreadsheetId ${spreadsheetId} → years: ${yearsFound}, maxYear: ${maxYear}`);

        recordsWithYears.push({ record, sheetData, yearsFound, maxYear });

      } catch (err) {
        console.warn(`⚠️ Failed to fetch ${spreadsheetId}:`, err.message);
        continue;
      }
    }

    if (recordsWithYears.length === 0) {
      return { success: false, error: "No valid sheets found" };
    }

    // ✅ Max year ke basis pe sort karo — descending
    recordsWithYears.sort((a, b) => b.maxYear - a.maxYear);

    console.log("📊 Records sorted by year:", recordsWithYears.map(r => ({
      id: r.record.newSpreadsheetId,
      maxYear: r.maxYear
    })));

    // ✅ Previous = index 1 (second highest year)
    // ✅ Agar sirf ek record hai — us sheet mein second year dhundo
    let previousSheetData = null;

    if (recordsWithYears.length >= 2) {
      previousSheetData = recordsWithYears[1].sheetData;
      console.log(`✅ Previous sheet: ${recordsWithYears[1].record.newSpreadsheetId}, maxYear: ${recordsWithYears[1].maxYear}`);
    } else {
      // ✅ Sirf ek record — sheet mein se min year wali rows nikalo
      const allYears = recordsWithYears[0].yearsFound;
      const sortedYears = [...new Set(allYears)].sort((a, b) => b - a);
      const previousYear = sortedYears[1] ?? sortedYears[0];

      console.log(`⚠️ Only one record — using previousYear: ${previousYear} from same sheet`);

      previousSheetData = recordsWithYears[0].sheetData.filter((row) => {
        const rowValues = Object.values(row).map((val) => String(val).trim());
        return rowValues.includes(String(previousYear));
      });
    }

    if (!previousSheetData || previousSheetData.length === 0) {
      return { success: false, error: "No previous year data found" };
    }

    const result = await this.saveSheetDataToDB(previousSheetData, "explotacion_comparativa");

    console.log("✅ Previous saved to collection:", result.collection);
    return { success: true, data: previousSheetData, collection: result.collection };

  } catch (err) {
    console.error("❌ fetchPreviousSheetData error:", err.message);
    return { success: false, error: err.message };
  }
}





async saveSheetDataToDB(sheetData, baseCollectionName = "explotacion_comparativa") {
  if (!sheetData || sheetData.length === 0) {
    return { success: false, error: "No data to save" };
  }

  // ✅ Step 1: Sheet se years detect karo
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

  // ✅ Step 2: Sheet ki max year nikalo
  const sheetMaxYear = Math.max(...yearsFound);
  console.log("📅 Sheet max year:", sheetMaxYear);

  // ✅ Step 3: DB mein existing collections lo
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const names = collections.map((c) => c.name);

  const pattern = /^explotacion_comparativa_(\d{4})_(\d{4})$/;
  const matched = names.filter((n) => pattern.test(n));

  console.log("📦 Existing matched collections:", matched);

  // ✅ Step 4: Existing collection mein end year match karo
  let targetCollection = null;
  for (const col of matched) {
    const endYear = parseInt(col.match(pattern)[2]);
    if (endYear === sheetMaxYear) {
      targetCollection = col;
      console.log(`✅ Matched existing collection: ${targetCollection}`);
      break;
    }
  }

  // ✅ Step 5: Match nahi mila — sheet ke years se dynamic collection name banao
  if (!targetCollection) {
    const sorted = [...new Set(yearsFound)].sort((a, b) => a - b);
    const suffix = sorted.length >= 2 ? sorted.join("_") : String(sorted[0]);
    targetCollection = `${baseCollectionName}_${suffix}`;
    console.log(`🆕 Collection nahi mili, nai banegi: ${targetCollection}`);
  }

  // ✅ Step 6: Agar collection exist karti hai toh clear karo, nahi karti toh MongoDB khud banayega
  const collectionExists = names.includes(targetCollection);
  if (collectionExists) {
    await db.collection(targetCollection).deleteMany({});
    console.log(`🗑️ Cleared old data from: ${targetCollection}`);
  } else {
    console.log(`🆕 New collection will be created: ${targetCollection}`);
  }

  // ✅ Step 7: Data insert karo
  const docsToInsert = sheetData.map((row) => ({
    ...row,
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
    isNewCollection: !collectionExists, // ✅ frontend ko bata sako
  };
}

  prepareRowsForGoogleSheets(rows, startRow) {
    // ✅ Filter rows that have a valid description in index 1
    const validRows = rows.filter(
      (row) => Array.isArray(row) && row[1] && row[1].toString().trim() !== "",
    );

    console.log(
      `🔄 Preparing ${validRows.length} valid rows starting from sheet row ${startRow}`,
    );

    const processedRows = validRows.map((row, index) => {
      const currentRow = startRow + index;
      console.log(`  ↳ Row ${index + 1} → Sheet row ${currentRow}`);

      const processedRow = new Array(30).fill("");

      // ✅ COLUMN A (index 0): Empty
      processedRow[0] = "";

      // ✅ COLUMN B (index 1): Description — comes from importExcelFile row[1]
      processedRow[1] = row[1] ? row[1].toString().trim() : "";

      // ✅ MONTHLY VALUES — dynamic gsCol mapping:
      // Jan=6, Feb=8, Mar=10, Apr=12, May=14, Jun=16,
      // Jul=18, Aug=20, Sep=22, Oct=24, Nov=26, Dec=28
      const monthGsCols = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

      monthGsCols.forEach((gsCol) => {
        processedRow[gsCol] =
          row[gsCol] !== null && row[gsCol] !== undefined ? row[gsCol] : "";
      });

      return processedRow;
    });

    return processedRows;
  }
}

module.exports = new SheetService();
