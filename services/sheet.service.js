const { WEB_APP_URL, TOKEN, EXCEL_FILE_PATH } = require("../config/google");

const axios = require("axios");

//********************************* Add new rows excell sheet ********************************



class SheetService {
  constructor() {
    // ✅ NOW these will work properly
    this.webAppUrl = WEB_APP_URL;
    this.token = TOKEN;
    this.excelFilePath = EXCEL_FILE_PATH;

  }

  // ✅ Connection test method
  // async testConnection() {
  //   try {
  //     console.log("🔍 Testing Apps Script connection...");
  //     console.log("📤 Web App URL:", this.webAppUrl);

  //     // Since we only have doPost, we need to test with POST
  //     const testData = [["", "Connection Test", new Date().toISOString()]];

  //     const payload = {
  //       token: this.token,
  //       sheetName: "Explotacion comparativa",
  //       startRow: 999, // Very high row for testing
  //       data: testData,
  //     };

  //     const response = await axios.post(this.webAppUrl, payload, {
  //       headers: {
  //         "Content-Type": "application/json",
  //         "User-Agent": "Connection Test",
  //       },
  //       timeout: 15000,
  //     });

  //     console.log("✅ Connection test response:", response.data);
  //     return { success: true, data: response.data };
  //   } catch (error) {
  //     console.error("❌ Connection test failed:", error.message);

  //     if (error.response) {
  //       console.error("❌ Response status:", error.response.status);
  //       console.error("❌ Response data:", error.response.data);
  //     } else if (error.request) {
  //       console.error("❌ No response received");
  //     }

  //     return {
  //       success: false,
  //       error: error.message,
  //     };
  //   }
  // }

  async authorize() {
    try {
      console.log("✅ Using Apps Script Web App, no Google API auth required");
      return true;
    } catch (error) {
      console.error("❌ Authorization failed:", error.message);
      throw error;
    }
  }


async addMultipleRows(rows) {
  try {
    await this.authorize();

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Invalid rows data" };
    }

   

    // 🔹 1️⃣ GET START ROW FROM SHEET
    console.log(" Getting next available row...");
    const rowRes = await axios.post(this.webAppUrl, {
      token: this.token,
      action: "getNextRow",
      sheetName: "Explotacion comparativa",
    });

    console.log("📊 Response from getNextRow:", JSON.stringify(rowRes.data, null, 2));
    
    if (!rowRes.data.success) {
      throw new Error(`Failed to get next row: ${rowRes.data.error || 'Unknown error'}`);
    }

    const startRow = rowRes.data.insertRow;
    
    if (!startRow || typeof startRow !== 'number') {
      throw new Error(`Invalid start row returned: ${startRow}`);
    }

    console.log(" Start inserting at row:", startRow);

    // 🔹 2️⃣ PREPARE FORMULAS WITH REAL ROW NUMBER
    console.log("🔄 Preparing rows with formulas...");
    const processedRows = this.prepareRowsForGoogleSheets(rows, startRow);
    console.log(`✅ Prepared ${processedRows.length} rows with formulas`);

    // 🔹 3️⃣ INSERT ROWS WITH MONTH COLUMNS CONFIG
    console.log(" Sending rows to Google Sheets...");
    const response = await axios.post(this.webAppUrl, {
      token: this.token,
      action: "addRows",
      sheetName: "Explotacion comparativa",
      data: processedRows,
      startRow: startRow,
      monthColumns: [1, 2, 3], // ✅ Specify month columns A, B, C
    });

    console.log(" Insert response:", JSON.stringify(response.data, null, 2));

    return {
      success: true,
      insertedRows: processedRows.length,
      startRow: startRow,
      details: response.data,
    };
  } catch (error) {
    console.error("❌ Error sending to Google Sheets:", error.message);
    if (error.response) {
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      console.error("Response status:", error.response.status);
    }
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

prepareRowsForGoogleSheets(rows, startRow) {
  const validRows = rows.filter(
    (row) => Array.isArray(row) && row[1] && row[1].toString().trim() !== ""
  );

  console.log(` Preparing ${validRows.length} valid rows starting from row ${startRow}`);

  const processedRows = validRows.map((row, index) => {
    const currentRow = startRow + index;
    
    console.log(` Processing row ${index + 1} -> Sheet row ${currentRow}`);
    
    const processedRow = new Array(30).fill("");

    // ✅ MONTH COLUMNS - Column A, B, C (indices 0, 1, 2)
    processedRow[0] = row[0] || "";  // Column A - Month value 1
    processedRow[1] = row[1] || "";  // Column B - Description or Month value 2
    processedRow[2] = row[2] || "";  // Column C - Month value 3

    // Monthly VALUES (other columns)
    processedRow[6]  = row[6]  ?? "";
    processedRow[8]  = row[8]  ?? "";
    processedRow[10] = row[10] ?? "";
    processedRow[12] = row[12] ?? "";
    processedRow[14] = row[14] ?? "";
    processedRow[16] = row[16] ?? "";
    processedRow[18] = row[18] ?? "";
    processedRow[20] = row[20] ?? "";
    processedRow[22] = row[22] ?? "";
    processedRow[24] = row[24] ?? "";
    processedRow[26] = row[26] ?? "";
    processedRow[27] = row[27] ?? "";
    processedRow[28] = row[28] ?? "";
    
    return processedRow;
  });

  return processedRows;
}


}

module.exports = new SheetService();
