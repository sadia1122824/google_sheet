const sheetService = require("../services/sheet.service");

const XLSX = require("xlsx");

const dataUpload = async (request, reply) => {
  return reply.sendFile("admin/googleSheet.html");
};

// **************************** Add raw data excell to google sheet ****************************




// function cleanNumber(value) {
//   if (value === null || value === undefined || value === "") return "";
//   if (typeof value === "number") return value;
//   if (typeof value === "string") {
//     const cleanStr = value.toString()
//       .replace(/[€$,]/g, "")
//       .replace(/\s/g, "")
//       .trim();
    
//     // Handle negative numbers in parentheses: (123) = -123
//     if (cleanStr.startsWith("(") && cleanStr.endsWith(")")) {
//       const numStr = cleanStr.substring(1, cleanStr.length - 1);
//       const num = parseFloat(numStr);
//       return isNaN(num) ? "" : -num;
//     }
    
//     const num = parseFloat(cleanStr);
//     return isNaN(num) ? "" : num;
//   }
//   return "";
// }

// const importExcelFile = async (request, reply) => {
//   try {
//     const parts = request.parts();
//     let fileBuffer = null;
//     let fileName = null;

//     // Extract file
//     for await (const part of parts) {
//       if (part.type === "file") {
//         const chunks = [];
//         for await (const chunk of part.file) {
//           chunks.push(chunk);
//         }
//         fileBuffer = Buffer.concat(chunks);
//         fileName = part.filename;
//         break;
//       }
//     }

//     if (!fileBuffer) {
//       return reply.code(400).send({
//         success: false,
//         error: "Please upload an Excel file",
//       });
//     }

//     console.log(`📁 Processing file: ${fileName}`);

//     // Parse Excel file
//     const workbook = XLSX.read(fileBuffer, {
//       type: "buffer",
//       cellDates: true,
//       cellNF: false,
//       cellText: false,
//     });

//     // Get the "C.Resultado" sheet
//     const sheetName = "C.Resultado";
//     if (!workbook.SheetNames.includes(sheetName)) {
//       return reply.code(400).send({
//         success: false,
//         error: `Sheet "${sheetName}" not found in the Excel file`,
//         availableSheets: workbook.SheetNames,
//       });
//     }

//     const worksheet = workbook.Sheets[sheetName];

//     // Get ALL data
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//       header: 1,
//       defval: null,
//       raw: true,
//       blankrows: false,
//     });

//     console.log(`📊 Sheet loaded: ${jsonData.length} total rows found`);

//     // Find the header row
//     let headerRowIndex = -1;
//     let excelHeaders = [];

//     for (let i = 0; i < Math.min(20, jsonData.length); i++) {
//       const row = jsonData[i];
//       if (row && row.length > 0) {
//         for (let j = 0; j < row.length; j++) {
//           const cell = row[j];
//           if (
//             cell &&
//             typeof cell === "string" &&
//             (cell.includes("PERDIDAS Y GANANCIAS") ||
//               cell.includes("CUENTA") ||
//               cell.includes("DESCRIPCION") ||
//               cell.includes("DESCRIPCIÓN"))
//           ) {
//             headerRowIndex = i;
//             excelHeaders = jsonData[i];
//             console.log(`✅ Found header row at row ${i + 1}`);
//             break;
//           }
//         }
//         if (headerRowIndex !== -1) break;
//       }
//     }

//     if (headerRowIndex === -1) {
//       return reply.code(400).send({
//         success: false,
//         error: "Could not find header row",
//       });
//     }

//     // Find where actual data starts
//     let startDataRow = headerRowIndex + 1;
    
//     for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, jsonData.length); i++) {
//       const row = jsonData[i];
//       if (row && row.length > 1 && row[1] && row[1].toString().trim() !== "") {
//         startDataRow = i;
//         console.log(`✅ Found first data row at row ${startDataRow + 1}`);
//         break;
//       }
//     }

//     console.log(`📊 Data extraction will start from row: ${startDataRow + 1}`);

//     // Process for Google Sheets
//     const rowsForGoogleSheets = [];

//     console.log(`🔍 Processing rows ${startDataRow + 1} to ${jsonData.length} for Google Sheets...`);

//     for (let i = startDataRow; i < jsonData.length; i++) {
//       const excelRow = jsonData[i];

//       // Skip empty rows
//       if (!excelRow || excelRow.length === 0 || 
//           excelRow.every(cell => cell === null || cell === "" || cell === undefined)) {
//         continue;
//       }

//       // Check if this row has description
//       const hasDescription = excelRow[1] && excelRow[1].toString().trim() !== "";
      
//       if (!hasDescription) {
//         continue;
//       }

//       // Create Google Sheets row (30 columns A-AD)
//       const processedRow = new Array(30).fill("");
      
//       // **COLUMN A: EMPTY** (Index 0)
//       processedRow[0] = "";
      
//       // **COLUMN B: Description** (Index 1)
//       processedRow[1] = excelRow[1].toString().trim();
      
//       // **COPY MONTHLY VALUES FROM EXCEL**
//       // Excel columns: D=Jan, E=Feb, F=Mar, G=Apr, H=May, I=Jun, J=Jul, K=Aug, L=Sep, M=Oct, N=Nov, O=Dec
//       const monthlyMapping = [
//         { excelCol: 3, gsCol: 6 },   // Excel D → Google G (Jan)
//         { excelCol: 4, gsCol: 8 },   // Excel E → Google I (Feb)
//         { excelCol: 5, gsCol: 10 },  // Excel F → Google K (Mar)
//         { excelCol: 6, gsCol: 12 },  // Excel G → Google M (Apr)
//         { excelCol: 7, gsCol: 14 },  // Excel H → Google O (May)
//         { excelCol: 8, gsCol: 16 },  // Excel I → Google Q (Jun)
//         { excelCol: 9, gsCol: 18 },  // Excel J → Google S (Jul)
//         { excelCol: 10, gsCol: 20 }, // Excel K → Google U (Aug)
//         { excelCol: 11, gsCol: 22 }, // Excel L → Google W (Sep)
//         { excelCol: 12, gsCol: 24 }, // Excel M → Google Y (Oct)
//         { excelCol: 13, gsCol: 26 }, // Excel N → Google AA (Nov)
//         { excelCol: 14, gsCol: 28 }, // Excel O → Google AC (Dec)
//       ];
      
//       // Copy monthly values
//       monthlyMapping.forEach(({ excelCol, gsCol }) => {
//         if (excelCol < excelRow.length && 
//             excelRow[excelCol] !== null && 
//             excelRow[excelCol] !== undefined) {
          
//           const value = excelRow[excelCol];
//           if (value !== "" && value !== null) {
//             const cleanValue = cleanNumber(value);
//             processedRow[gsCol] = cleanValue;
//           }
//         }
//       });
      
//       rowsForGoogleSheets.push(processedRow);
//     }

//     console.log(`✅ Total rows for Google Sheets: ${rowsForGoogleSheets.length}`);

//     if (rowsForGoogleSheets.length === 0) {
//       return reply.send({
//         success: true,
//         message: "⚠️ No data rows found",
//         importedRows: 0,
//       });
//     }

//     // Send to Google Sheets
//     console.log(`📤 Sending ${rowsForGoogleSheets.length} rows to Google Sheets...`);
//     const result = await sheetService.addMultipleRows(rowsForGoogleSheets);

//     if (!result.success) {
//       throw new Error(`Google Sheets error: ${result.error}`);
//     }

//     return reply.send({
//       success: true,
//       message: `✅ Successfully imported ${rowsForGoogleSheets.length} rows`,
//       importedRows: rowsForGoogleSheets.length,
//       googleSheets: {
//         startRow: result.startRow,
//         insertedRows: result.insertedRows,
//         sheetUrl: result.sheetUrl,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Import error:", error);
//     return reply.code(500).send({
//       success: false,
//       error: error.message,
//     });
//   }
// };

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleanStr = value.toString()
      .replace(/[€$,]/g, "")
      .replace(/\s/g, "")
      .trim();
    
    // Handle negative numbers in parentheses: (123) = -123
    if (cleanStr.startsWith("(") && cleanStr.endsWith(")")) {
      const numStr = cleanStr.substring(1, cleanStr.length - 1);
      const num = parseFloat(numStr);
      return isNaN(num) ? "" : -num;
    }
    
    const num = parseFloat(cleanStr);
    return isNaN(num) ? "" : num;
  }
  return "";
}

const importExcelFile = async (request, reply) => {
  try {
    const parts = request.parts();
    let fileBuffer = null;
    let fileName = null;

    // Extract file
    for await (const part of parts) {
      if (part.type === "file") {
        const chunks = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
        fileName = part.filename;
        break;
      }
    }

    if (!fileBuffer) {
      return reply.code(400).send({
        success: false,
        error: "Please upload an Excel file",
      });
    }

    console.log(`📁 Processing file: ${fileName}`);

    // Parse Excel file
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    // Get the "C.Resultado" sheet
    const sheetName = "C.Resultado";
    if (!workbook.SheetNames.includes(sheetName)) {
      return reply.code(400).send({
        success: false,
        error: `Sheet "${sheetName}" not found in the Excel file`,
        availableSheets: workbook.SheetNames,
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    // Get ALL data
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });

    console.log(`📊 Sheet loaded: ${jsonData.length} total rows found`);

    // Find the header row
    let headerRowIndex = -1;
    let excelHeaders = [];

    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (
            cell &&
            typeof cell === "string" &&
            (cell.includes("PERDIDAS Y GANANCIAS") ||
              cell.includes("CUENTA") ||
              cell.includes("DESCRIPCION") ||
              cell.includes("DESCRIPCIÓN"))
          ) {
            headerRowIndex = i;
            excelHeaders = jsonData[i];
            console.log(`✅ Found header row at row ${i + 1}`);
            break;
          }
        }
        if (headerRowIndex !== -1) break;
      }
    }

    if (headerRowIndex === -1) {
      return reply.code(400).send({
        success: false,
        error: "Could not find header row",
      });
    }

    // ✅ DYNAMIC MONTH COLUMN DETECTION
    // Maps Spanish/English month abbreviations → month index (0=Jan ... 11=Dec)
    const monthNameMap = {
      "ene": 0, "jan": 0,
      "feb": 1,
      "mar": 2,
      "abr": 3, "apr": 3,
      "may": 4,
      "jun": 5,
      "jul": 6,
      "ago": 7, "aug": 7,
      "sep": 8, "set": 8,
      "oct": 9,
      "nov": 10,
      "dic": 11, "dec": 11,
    };

    // Google Sheets target columns for each month (Jan=index 0 → gsCol 6, Feb → 8, etc.)
    const gsColByMonthIndex = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];

    // Build dynamic mapping: monthIndex → excelColIndex
    const monthColIndices = new Array(12).fill(-1);

    excelHeaders.forEach((header, colIndex) => {
      if (!header) return;
      const key = header.toString().toLowerCase().trim();
      if (monthNameMap.hasOwnProperty(key)) {
        const monthIndex = monthNameMap[key];
        monthColIndices[monthIndex] = colIndex;
      }
    });

    console.log(`📅 Detected month columns (0=Jan..11=Dec):`, monthColIndices);

    // Warn if any months are missing
    const missingMonths = monthColIndices
      .map((col, i) => (col === -1 ? i : null))
      .filter((i) => i !== null);
    if (missingMonths.length > 0) {
      console.warn(`⚠️ Could not find columns for month indices: ${missingMonths}`);
    }

    // Find where actual data starts
    let startDataRow = headerRowIndex + 1;

    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 1 && row[1] && row[1].toString().trim() !== "") {
        startDataRow = i;
        console.log(`✅ Found first data row at row ${startDataRow + 1}`);
        break;
      }
    }

    console.log(`📊 Data extraction will start from row: ${startDataRow + 1}`);

    // Process for Google Sheets
    const rowsForGoogleSheets = [];

    console.log(`🔍 Processing rows ${startDataRow + 1} to ${jsonData.length} for Google Sheets...`);

    for (let i = startDataRow; i < jsonData.length; i++) {
      const excelRow = jsonData[i];

      // Skip empty rows
      if (
        !excelRow ||
        excelRow.length === 0 ||
        excelRow.every((cell) => cell === null || cell === "" || cell === undefined)
      ) {
        continue;
      }

      // Check if this row has description
      const hasDescription = excelRow[1] && excelRow[1].toString().trim() !== "";
      if (!hasDescription) {
        continue;
      }

      // Create Google Sheets row (30 columns A-AD)
      const processedRow = new Array(30).fill("");

      // COLUMN A: EMPTY (Index 0)
      processedRow[0] = "";

      // COLUMN B: Description (Index 1)
      processedRow[1] = excelRow[1].toString().trim();

      // ✅ COPY MONTHLY VALUES USING DYNAMIC MAPPING
      monthColIndices.forEach((excelCol, monthIndex) => {
        if (excelCol === -1) return; // Month column not found in this file, skip

        const gsCol = gsColByMonthIndex[monthIndex];

        if (
          excelCol < excelRow.length &&
          excelRow[excelCol] !== null &&
          excelRow[excelCol] !== undefined &&
          excelRow[excelCol] !== ""
        ) {
          processedRow[gsCol] = cleanNumber(excelRow[excelCol]);
        }
      });

      rowsForGoogleSheets.push(processedRow);
    }

    console.log(`✅ Total rows for Google Sheets: ${rowsForGoogleSheets.length}`);

    if (rowsForGoogleSheets.length === 0) {
      return reply.send({
        success: true,
        message: "⚠️ No data rows found",
        importedRows: 0,
      });
    }

    // Send to Google Sheets
    console.log(`📤 Sending ${rowsForGoogleSheets.length} rows to Google Sheets...`);
    const result = await sheetService.addMultipleRows(rowsForGoogleSheets);

    if (!result.success) {
      throw new Error(`Google Sheets error: ${result.error}`);
    }

    return reply.send({
      success: true,
      message: `✅ Successfully imported ${rowsForGoogleSheets.length} rows`,
      importedRows: rowsForGoogleSheets.length,
      googleSheets: {
        startRow: result.startRow,
        insertedRows: result.insertedRows,
        sheetUrl: result.sheetUrl,
      },
    });
  } catch (error) {
    console.error("❌ Import error:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  dataUpload,
  importExcelFile,
  
};
