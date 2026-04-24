const sheetService = require("../services/sheet.service");
const ClientCredentials = require("../models/client_credentials");
const axios = require("axios");

const XLSX = require("xlsx");

const dataUpload = async (request, reply) => {
  return reply.sendFile("admin/googleSheet.html");
};

// **************************** Add raw data excell to google sheet ****************************

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleanStr = value
      .toString()
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
      ene: 0,
      jan: 0,
      feb: 1,
      mar: 2,
      abr: 3,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      ago: 7,
      aug: 7,
      sep: 8,
      set: 8,
      oct: 9,
      nov: 10,
      dic: 11,
      dec: 11,
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
      console.warn(
        `⚠️ Could not find columns for month indices: ${missingMonths}`,
      );
    }

    // Find where actual data starts
    let startDataRow = headerRowIndex + 1;

    for (
      let i = headerRowIndex + 1;
      i < Math.min(headerRowIndex + 10, jsonData.length);
      i++
    ) {
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

    console.log(
      `🔍 Processing rows ${startDataRow + 1} to ${jsonData.length} for Google Sheets...`,
    );

    for (let i = startDataRow; i < jsonData.length; i++) {
      const excelRow = jsonData[i];

      // Skip empty rows
      if (
        !excelRow ||
        excelRow.length === 0 ||
        excelRow.every(
          (cell) => cell === null || cell === "" || cell === undefined,
        )
      ) {
        continue;
      }

      // Check if this row has description
      const hasDescription =
        excelRow[1] && excelRow[1].toString().trim() !== "";
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

    console.log(
      `✅ Total rows for Google Sheets: ${rowsForGoogleSheets.length}`,
    );

    if (rowsForGoogleSheets.length === 0) {
      return reply.send({
        success: true,
        message: "⚠️ No data rows found",
        importedRows: 0,
      });
    }

    // Send to Google Sheets
    console.log(
      `📤 Sending ${rowsForGoogleSheets.length} rows to Google Sheets...`,
    );
    const result = await sheetService.addMultipleRows(rowsForGoogleSheets);

    if (!result.success) {
      throw new Error(result.error);
    }

    // ✅ ab response fully aa chuka hai
    if (result.originalSpreadsheetId && result.newSpreadsheetId) {
      await ClientCredentials.create({
        originalSpreadsheetId: result.originalSpreadsheetId,
        newSpreadsheetId: result.newSpreadsheetId,
        originalSheetUrl: result.originalSheetUrl,
        newSpreadsheetUrl: result.newSpreadsheetUrl,
        newSpreadsheetName: result.newSpreadsheetName,
        createdAt: new Date(),
      });

      console.log("✅ IDs saved in DB");
    } else {
      console.log("❌ IDs missing in response", result);
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

// ******************************** get ids from db and show data in table  **************************************

const spreadsheetData = async (req, reply) => {
  return reply.sendFile("users/clients_details.html");
};

const getLatestSheetResult = async (req, reply) => {
  try {
    const latest = await ClientCredentials.findOne().sort({ createdAt: -1 });

    if (!latest) {
      return reply.send({ success: false, error: "No spreadsheet found" });
    }

    console.log("📌 DB Spreadsheet ID:", latest.newSpreadsheetId);

    const response = await axios.get(process.env.WEB_APP_URL, {
      params: {
        token: process.env.TOKEN,
        action: "getSheetData",
        spreadsheetId: latest.newSpreadsheetId,
        sheetName: "Explotacion comparativa",
      },
    });

    // 🔥 FULL DEBUG
    console.log("📊 GOOGLE RESPONSE:");
    console.log(JSON.stringify(response.data, null, 2));

    return reply.send(response.data);
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    return reply.status(500).send({ success: false, error: err.message });
  }
};

// **************************** AI Controller Logic ****************************

const AI_chat = async (req, reply) => {
  try {
    const { question, jsResult, history = [], metric = null } = req.body;

    // ── No jsResult → general question
 // ── No jsResult → general question (UPDATED with better AI answer)
if (!jsResult) {
  try {
    const conversationHistory = (history || [])
      .slice(-6)
      .map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));

    // 🆕 System context add karo taake AI samjhe ye financial tool hai
    const systemContext = `You are a helpful financial assistant for a business analytics tool. 
You help users understand financial concepts, accounting terms, and general questions.
If asked about specific data from the sheet, say you need them to ask with specific period names.
Answer clearly and concisely in the same language the user writes in (English, Spanish, or Urdu).`;

    const formatRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemContext }] }, // 🆕
          contents: [
            ...conversationHistory, 
            { role: "user", parts: [{ text: question }] }
          ],
          generationConfig: { 
            temperature: 0.4,      // 🆕 thoda zyada natural answers
            maxOutputTokens: 500   // 🆕 longer answers allowed
          }
        })
      }
    );
    const formatData = await formatRes.json();
    if (formatData.error) throw new Error("Gemini quota");
    const geminiAnswer = formatData?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply.send({ 
      success: true, 
      answer: geminiAnswer || "I couldn't answer that. Please try rephrasing.", 
      intent: { type: "general" } 
    });
  } catch {
    return reply.send({ 
      success: true, 
      answer: "I'm having trouble connecting to AI right now. For financial data questions, please mention a specific period (month/year).", 
      intent: { type: "general" } 
    });
  }
}

    // ── jsResult error
    if (jsResult.error) {
      return reply.send({ success: true, answer: `⚠️ ${jsResult.error}`, intent: {} });
    }

    // ── jsResult exists → ALWAYS use JS answer directly, skip Gemini
    const jsAnswer = buildAnswerFromJs(jsResult, question, metric);
    return reply.send({ success: true, answer: jsAnswer, intent: {} });

  } catch (err) {
    console.error("AI_chat error:", err);
    return reply.send({ success: false, error: err.message });
  }
};

function buildAnswerFromJs(jsResult, question, metric = null) {
  const q = (question || "").toLowerCase();

  // Detect metric from passed value OR question keywords
  const m = metric || (
    /income|ingreso|importe|revenue/.test(q) ? "income" :
    /expense|gasto|explot/.test(q)           ? "expense" :
    /profit|loss|resultado|ganancia/.test(q) ? "profit"  :
    null
  );

  function f(n) {
    if (n === null || n === undefined || isNaN(n)) return "0.00";
    const abs = Math.abs(n);
    const str = abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return n < 0 ? "-" + str : str;
  }

  // ── SINGLE period ─────────────────────────────────────────────
  if (jsResult.period !== undefined) {
    const p = jsResult.period;

    if (m === "income")
      return `**${p} — Income**\n\nIncome: ${f(jsResult.income)}`;

    if (m === "expense")
      return `**${p} — Explotación**\n\nExplotación: ${f(jsResult.explotacion)}`;

    if (m === "profit") {
      if (jsResult.profit > 0)
        return `**${p} — Profit**\n\n**Final Profit: ${f(jsResult.profit)}**`;
      if (jsResult.loss < 0)
        return `**${p} — Loss**\n\n**Final Loss: ${f(jsResult.loss)}**`;
      return `**${p} — Result**\n\nBreak Even: 0.00`;
    }

    // No metric → full summary
    if (jsResult.profit > 0)
      return `**${p} — Result**\n\nIncome: ${f(jsResult.income)}\nExplotación: ${f(jsResult.explotacion)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Profit: ${f(jsResult.profit)}**`;
    if (jsResult.loss < 0)
      return `**${p} — Result**\n\nIncome: ${f(jsResult.income)}\nExplotación: ${f(jsResult.explotacion)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Loss: ${f(jsResult.loss)}**`;
    return `**${p} — Summary**\n\nIncome: ${f(jsResult.income)}\nExplotación: ${f(jsResult.explotacion)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Result: ${f(jsResult.finalResult)}**`;
  }

  // ── COMPARE two periods ───────────────────────────────────────
  if (jsResult.period1 && jsResult.period2 && jsResult.period1.label) {
    const p1 = jsResult.period1;
    const p2 = jsResult.period2;
    const d  = jsResult.difference;

    if (m === "income")
      return `**${p1.label} vs ${p2.label} — Income**\n\n` +
        `${p1.label}: ${f(p1.income)}\n` +
        `${p2.label}: ${f(p2.income)}\n` +
        `Change: ${d.income >= 0 ? "+" : ""}${f(d.income)}` +
        `${d.income_pct !== null ? ` (${d.income_pct}%)` : ""}`;

    if (m === "expense")
      return `**${p1.label} vs ${p2.label} — Explotación**\n\n` +
        `${p1.label}: ${f(p1.explotacion)}\n` +
        `${p2.label}: ${f(p2.explotacion)}\n` +
        `Change: ${d.explotacion >= 0 ? "+" : ""}${f(d.explotacion)}` +
        `${d.explotacion_pct !== null ? ` (${d.explotacion_pct}%)` : ""}`;

    if (m === "profit")
      return `**${p1.label} vs ${p2.label} — Result**\n\n` +
        `${p1.label}: ${f(p1.finalResult)}\n` +
        `${p2.label}: ${f(p2.finalResult)}\n` +
        `Change: ${d.finalResult >= 0 ? "+" : ""}${f(d.finalResult)}` +
        `${d.finalResult_pct !== null ? ` (${d.finalResult_pct}%)` : ""}\n` +
        `Trend: **${d.direction}**`;

    // No metric → full compare
    return `**Comparison: ${p1.label} vs ${p2.label}**\n\n` +
      `Income: ${f(p1.income)} → ${f(p2.income)} (${d.income >= 0 ? "+" : ""}${f(d.income)})\n` +
      `Explotación: ${f(p1.explotacion)} → ${f(p2.explotacion)}\n` +
      `Final Result: ${f(p1.finalResult)} → ${f(p2.finalResult)}\n` +
      `Trend: **${d.direction}**`;
  }

  // ── TREND ─────────────────────────────────────────────────────
  if (jsResult.best) {
    return `**Trend Analysis (${jsResult.periodsAnalyzed} periods)**\n\n` +
      `Best: ${jsResult.best.period} — ${f(jsResult.best.finalResult)}\n` +
      `Worst: ${jsResult.worst.period} — ${f(jsResult.worst.finalResult)}\n` +
      `Overall trend: **${jsResult.trend}**\n` +
      `Overall change: ${jsResult.overallChange_pct !== null ? jsResult.overallChange_pct + "%" : "N/A"}`;
  }

  return "Please ask about a specific period or metric.";
}







module.exports = {
  dataUpload,
  importExcelFile,
  getLatestSheetResult,
  spreadsheetData,
  AI_chat,
};
