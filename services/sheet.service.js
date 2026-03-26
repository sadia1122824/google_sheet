const { WEB_APP_URL, TOKEN, EXCEL_FILE_PATH } = require("../config/google");

const axios = require("axios");
const ClientCredentials = require("../models/client_credentials");

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

 


async  fetchLatestSheetData() {
  try {
    const latest = await ClientCredentials.findOne().sort({ createdAt: -1 });
    if (!latest) return { success: false, error: "No spreadsheet found" };

    const response = await axios.get(process.env.WEB_APP_URL, {
      params: {
        token: process.env.TOKEN,
        action: "getSheetData",
        spreadsheetId: latest.newSpreadsheetId,
        sheetName: "Explotacion comparativa", // fixed tab
      },
    });

    if (response.data.success) {
      return { success: true, data: response.data.data };
    } else {
      return { success: false, error: response.data.error };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
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
