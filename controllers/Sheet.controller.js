const sheetService = require("../services/sheet.service");
const Latest_ClientCredentials = require("../models/latest_googlesheet_credentials");
const Previous_ClientCredentials = require("../models/previous_googlesheet_credentials");
const axios = require("axios");
const XLSX = require("xlsx");
const mongoose = require("mongoose");




const dataUpload = async (request, reply) => {
  return reply.sendFile("admin/googleSheet.html");
};

function cleanNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleanStr = value
      .toString()
      .replace(/[€$,]/g, "")
      .replace(/\s/g, "")
      .trim();
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
    let selectedYear = "latest";

    for await (const part of parts) {
      if (part.type === "file") {
        const chunks = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        fileBuffer = Buffer.concat(chunks);
        fileName = part.filename;
        // ✅ break nahi — year bhi padhna hai
      } else if (part.type === "field" && part.fieldname === "year") {
        selectedYear = part.value;
        console.log(`📅 Selected Year: ${selectedYear}`);
      }
    }

    if (!fileBuffer) {
      return reply.code(400).send({ success: false, error: "Please upload an Excel file" });
    }

    console.log(`📁 Processing file: ${fileName}`);

    const workbook = XLSX.read(fileBuffer, {
      type: "buffer", cellDates: true, cellNF: false, cellText: false,
    });

    const sheetName = "C.Resultado";
    if (!workbook.SheetNames.includes(sheetName)) {
      return reply.code(400).send({
        success: false,
        error: `Sheet "${sheetName}" not found`,
        availableSheets: workbook.SheetNames,
      });
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, defval: null, raw: true, blankrows: false,
    });

    console.log(`📊 Sheet loaded: ${jsonData.length} total rows`);

    let headerRowIndex = -1;
    let excelHeaders = [];

    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 0) {
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (cell && typeof cell === "string" && (
            cell.includes("PERDIDAS Y GANANCIAS") ||
            cell.includes("CUENTA") ||
            cell.includes("DESCRIPCION") ||
            cell.includes("DESCRIPCIÓN")
          )) {
            headerRowIndex = i;
            excelHeaders = jsonData[i];
            break;
          }
        }
        if (headerRowIndex !== -1) break;
      }
    }

    if (headerRowIndex === -1) {
      return reply.code(400).send({ success: false, error: "Could not find header row" });
    }

    const monthNameMap = {
      ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3,
      may: 4, jun: 5, jul: 6, ago: 7, aug: 7,
      sep: 8, set: 8, oct: 9, nov: 10, dic: 11, dec: 11,
    };

    const gsColByMonthIndex = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
    const monthColIndices = new Array(12).fill(-1);

    excelHeaders.forEach((header, colIndex) => {
      if (!header) return;
      const key = header.toString().toLowerCase().trim();
      if (monthNameMap.hasOwnProperty(key)) {
        monthColIndices[monthNameMap[key]] = colIndex;
      }
    });

    let startDataRow = headerRowIndex + 1;
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && row.length > 1 && row[1] && row[1].toString().trim() !== "") {
        startDataRow = i;
        break;
      }
    }

    const rowsForGoogleSheets = [];

    for (let i = startDataRow; i < jsonData.length; i++) {
      const excelRow = jsonData[i];
      if (!excelRow || excelRow.length === 0 ||
        excelRow.every((cell) => cell === null || cell === "" || cell === undefined)) continue;

      if (!excelRow[1] || excelRow[1].toString().trim() === "") continue;

      const processedRow = new Array(30).fill("");
      processedRow[0] = "";
      processedRow[1] = excelRow[1].toString().trim();

      monthColIndices.forEach((excelCol, monthIndex) => {
        if (excelCol === -1) return;
        const gsCol = gsColByMonthIndex[monthIndex];
        if (excelCol < excelRow.length &&
          excelRow[excelCol] !== null &&
          excelRow[excelCol] !== undefined &&
          excelRow[excelCol] !== "") {
          processedRow[gsCol] = cleanNumber(excelRow[excelCol]);
        }
      });

      rowsForGoogleSheets.push(processedRow);
    }

    console.log(`✅ Total rows prepared: ${rowsForGoogleSheets.length}`);

    if (rowsForGoogleSheets.length === 0) {
      return reply.send({ success: true, message: "⚠️ No data rows found", importedRows: 0 });
    }

    // ✅ sheetService ko yearType pass karo — woh khud URL choose karega + DB mein save karega
    const result = await sheetService.addMultipleRows(rowsForGoogleSheets, selectedYear);

    if (!result.success) throw new Error(result.error);

    // ✅ Koi duplicate save nahi — sheetService ne already kiya

    return reply.send({
      success: true,
      message: `✅ Successfully imported ${rowsForGoogleSheets.length} rows to ${selectedYear} sheet`,
      importedRows: rowsForGoogleSheets.length,
      yearType: selectedYear,
      googleSheets: {
        startRow: result.startRow,
        insertedRows: result.insertedRows,
        sheetUrl: result.sheetUrl,
      },
    });

  } catch (error) {
    console.error("❌ Import error:", error);
    return reply.code(500).send({ success: false, error: error.message });
  }
};




//  ******************************** Live data in google sheet and show data in table  **************************************



// const getLatestSheetResult = async (req, reply) => {
//   try {
//     const latest = await ClientCredentials.findOne().sort({ createdAt: -1 });

//     if (!latest) {
//       return reply.send({ success: false, error: "No spreadsheet found" });
//     }

//     const response = await axios.get(process.env.WEB_APP_URL, {
//       params: {
//         token: process.env.TOKEN,
//         action: "getSheetData",
//         spreadsheetId: latest.newSpreadsheetId,
//         sheetName: "Explotacion comparativa",
//       },
//     });

//     if (response.data.success) {
//       const sheetData = response.data.data;

//       // ✅ class method ki tarah call karo
//       const saveResult = await sheetService.saveSheetDataToDB(
//         sheetData,
//         "explotacion_comparativa"
//       );

//       console.log("✅ Saved to DB:", saveResult);

//       return reply.send({
//         success: true,
//         saved: saveResult,
//         data: sheetData,
//       });
//     } else {
//       return reply.send({ success: false, error: response.data.error });
//     }
//   } catch (err) {
//     console.error("❌ ERROR:", err.message);
//     return reply.status(500).send({ success: false, error: err.message });
//   }
// };






// *********************************previous sheet data show in table  ***********************************




// ==============================
// ✅ Helper: Get all explotacion collections from DB
// ==============================




const LiveSheetData = async (req, reply) => {
  return reply.sendFile("users/Live_Sheet.html");
  
};


const getLatestSheetResult = async (req, reply) => {
  try {
    console.log("📊 Fetching latest sheet data...");
    const result = await sheetService.fetchLatestSheetData();

    if (!result.success) {
      return reply.send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      source: "latest_sheet",
      collection: result.collection,
      totalRows: result.data.length,
      data: result.data,
    });
  } catch (err) {
    console.error("❌ ERROR (latest):", err.message);
    return reply.status(500).send({ success: false, error: err.message });
  }
};


const previousSheetData = async (req, reply) => {
  return reply.sendFile("users/previous_sheet.html");
}
const getPreviousSheetResult = async (req, reply) => {
  try {
    console.log("📊 Fetching previous sheet data...");
    const result = await sheetService.fetchPreviousSheetData();

    if (!result.success) {
      return reply.send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      source: "previous_sheet",
      collection: result.collection,
      totalRows: result.data.length,
      data: result.data,
    });
  } catch (err) {
    console.error("❌ ERROR (previous):", err.message);
    return reply.status(500).send({ success: false, error: err.message });
  }
};









// **************************** AI Controller Logic ****************************

// const AI_chat = async (req, reply) => {
//   try {
//     const {
//       question,
//       jsResult,
//       history = [],
//       metric = null,
//       sheetContext = "",
//     } = req.body;

//     // ── No jsResult → General question (with full context)
//     if (!jsResult) {
//       try {
//         const conversationHistory = (history || []).slice(-8).map((m) => ({
//           role: m.role === "user" ? "user" : "model",
//           parts: [{ text: m.content }],
//         }));

//         const systemContext = `You are an expert financial analyst and AI assistant named "FinBot", embedded in a financial analytics dashboard.

// About yourself:
// - Your name is FinBot (or whatever name you want)
// - You are created to help with financial analysis AND general questions
// - You are friendly, helpful, and professional

// You can help with:
// 1. Sheet data analysis — use the provided sheet context for specific numbers
// 2. Financial concepts — P&L, income statements, ratios, accounting terms
// 3. General knowledge questions — history, science, math, etc.
// 4. Casual conversation — greetings, jokes, general chat
// 5. Urdu/Roman Urdu, English, Spanish — respond in user's language

// Sheet Data Context:
// ${sheetContext ? sheetContext.slice(0, 8000) : "No sheet data loaded yet."}

// Rules:
// - Be concise but thorough
// - Use **bold** for important numbers/terms
// - Never make up financial numbers — only use sheet context data
// - For general questions outside finance, answer freely and helpfully
// - Be conversational and friendly`;

//         const formatRes = await fetch(
//           `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               system_instruction: { parts: [{ text: systemContext }] },
//               contents: [
//                 ...conversationHistory,
//                 { role: "user", parts: [{ text: question }] },
//               ],
//               generationConfig: {
//                 temperature: 0.3,
//                 maxOutputTokens: 800,
//                 topP: 0.9,
//               },
//             }),
//           },
//         );

//         const formatData = await formatRes.json();
//         if (formatData.error)
//           throw new Error(formatData.error.message || "Gemini error");

//         const geminiAnswer =
//           formatData?.candidates?.[0]?.content?.parts?.[0]?.text;
//         return reply.send({
//           success: true,
//           answer:
//             geminiAnswer ||
//             "I couldn't generate an answer. Please try rephrasing your question.",
//           intent: { type: "general" },
//         });
//       } catch (err) {
//         console.error("Gemini general error:", err.message);
//         return reply.send({
//           success: true,
//           answer: `⚠️ AI connection issue: ${err.message}. Please try again or ask about a specific period (e.g., "What is income for January?")`,
//           intent: { type: "general" },
//         });
//       }
//     }

//     // ── jsResult error
//     if (jsResult.error) {
//       return reply.send({
//         success: true,
//         answer: `⚠️ ${jsResult.error}`,
//         intent: {},
//       });
//     }

//     // ── jsResult exists → build structured answer
//     const jsAnswer = buildAnswerFromJs(jsResult, question, metric);
//     return reply.send({ success: true, answer: jsAnswer, intent: {} });
//   } catch (err) {
//     console.error("AI_chat error:", err);
//     return reply.send({ success: false, error: err.message });
//   }
// };

const AI_chat = async (req, reply) => {
  try {
    const {
      question,
      jsResult,
      history = [],
      metric = null,
      sheetContext = "",
    } = req.body;

    if (!jsResult) {
      try {
        const conversationHistory = (history || []).slice(-8).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));

        const systemContext = `You are an expert financial analyst and AI assistant named "FinBot", embedded in a financial analytics dashboard.

About yourself:
- Your name is FinBot
- You are created to help with financial analysis AND general questions
- You are friendly, helpful, and professional

You can help with:
1. Sheet data analysis — use the provided sheet context for specific numbers
2. Financial concepts — P&L, income statements, ratios, accounting terms
3. General knowledge questions — history, science, math, etc.
4. Casual conversation — greetings, jokes, general chat
5. Urdu/Roman Urdu, English, Spanish — respond in user's language

Sheet Data Context:
${sheetContext ? sheetContext.slice(0, 8000) : "No sheet data loaded yet."}

Rules:
- Be concise but thorough
- Use **bold** for important numbers/terms
- Never make up financial numbers — only use sheet context data
- For general questions outside finance, answer freely and helpfully
- Be conversational and friendly`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 800,
            temperature: 0.3,
            messages: [
              { role: "system", content: systemContext },
              ...conversationHistory,
              { role: "user", content: question },
            ],
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        const answer = data?.choices?.[0]?.message?.content;
        return reply.send({
          success: true,
          answer: answer || "I couldn't generate an answer. Please try rephrasing.",
          intent: { type: "general" },
        });

      } catch (err) {
        console.error("OpenAI error:", err.message);
        return reply.send({
          success: true,
          answer: localFallback(question),
          intent: { type: "general" },
        });
      }
    }

    if (jsResult.error) {
      return reply.send({ success: true, answer: `⚠️ ${jsResult.error}`, intent: {} });
    }

    const jsAnswer = buildAnswerFromJs(jsResult, question, metric);
    return reply.send({ success: true, answer: jsAnswer, intent: {} });

  } catch (err) {
    console.error("AI_chat error:", err);
    return reply.send({ success: false, error: err.message });
  }
};

function localFallback(question) {
  const q = (question || "").toLowerCase();

  if (/^(hi|hello|hey|salam|hola)/i.test(q))
    return `👋 **Hello!** I'm FinBot. AI service is temporarily unavailable, but I can still help with sheet data!\n\nTry: *"What is income for January?"*`;

  if (/p&l|profit.{0,10}loss|income.{0,10}statement/i.test(q))
    return `**📊 P&L Statement**\n\nShows financial performance over a period:\n\n- **Revenue** — Total income earned\n- **Expenses** — Costs incurred (operations, salaries, interest)\n- **Net Result** = Revenue − Expenses\n  - Positive → **Profit** 📈\n  - Negative → **Loss** 📉`;

  if (/depreci|amortiz/i.test(q))
    return `**Depreciation**\n\nGradual reduction in asset value over time.\n\n**Example:** Machine worth $10,000 over 10 years = $1,000/year depreciation.\n\nIt's a non-cash expense recorded in P&L.`;

  if (/balance.sheet|assets|liabilit|equity/i.test(q))
    return `**Balance Sheet**\n\n- **Assets** = What company owns\n- **Liabilities** = What company owes\n- **Equity** = Assets − Liabilities\n\n\`Assets = Liabilities + Equity\` (always!)`;

  if (/cash.flow/i.test(q))
    return `**Cash Flow**\n\nTracks actual money movement:\n- **Operating** — Day-to-day business\n- **Investing** — Assets bought/sold\n- **Financing** — Loans, dividends\n\n💡 Profitable companies can still fail with negative cash flow!`;

  return `🤖 AI service temporarily unavailable.\n\nFor sheet data, try:\n- *"What is income for January?"*\n- *"Compare January vs February"*\n- *"Show trend analysis"*`;
}

function buildAnswerFromJs(jsResult, question, metric = null) {
  const q = (question || "").toLowerCase();

  const m =
    metric ||
    (/income|ingreso|importe|revenue/.test(q)
      ? "income"
      : /expense|gasto|explot/.test(q)
        ? "expense"
        : /profit|loss|resultado|ganancia/.test(q)
          ? "profit"
          : null);

  function f(n) {
    if (n === null || n === undefined || isNaN(n)) return "0.00";
    const abs = Math.abs(n);
    const str = abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return n < 0 ? "-" + str : str;
  }

  // ── SINGLE period ─────────────────────────────────────────────
  if (jsResult.period !== undefined) {
    const p = jsResult.period;

    if (m === "income")
      return `**${p} — Income**\n\nIncome: ${f(jsResult.income)}`;

    if (m === "expense")
      return `**${p} — Expense**\n\nExpense: ${f(jsResult.expense)}`;

    if (m === "profit") {
      if (jsResult.profit > 0)
        return `**${p} — Profit**\n\n**Final Profit: ${f(jsResult.profit)}**`;
      if (jsResult.loss < 0)
        return `**${p} — Loss**\n\n**Final Loss: ${f(jsResult.loss)}**`;
      return `**${p} — Result**\n\nBreak Even: 0.00`;
    }

    // No metric → full summary
    if (jsResult.profit > 0)
      return `**${p} — Result**\n\nIncome: ${f(jsResult.income)}\nExpense: ${f(jsResult.expense)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Profit: ${f(jsResult.profit)}**`;
    if (jsResult.loss < 0)
      return `**${p} — Result**\n\nIncome: ${f(jsResult.income)}\nExpense: ${f(jsResult.expense)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Loss: ${f(jsResult.loss)}**`;
    return `**${p} — Summary**\n\nIncome: ${f(jsResult.income)}\nExpense: ${f(jsResult.expense)}\nBank Interest: ${f(jsResult.bankInterest)}\n**Final Result: ${f(jsResult.finalResult)}**`;
  }

  // ── COMPARE two periods ───────────────────────────────────────
  if (jsResult.period1 && jsResult.period2 && jsResult.period1.label) {
    const p1 = jsResult.period1;
    const p2 = jsResult.period2;
    const d = jsResult.difference;

    if (m === "income")
      return (
        `**${p1.label} vs ${p2.label} — Income**\n\n` +
        `${p1.label}: ${f(p1.income)}\n` +
        `${p2.label}: ${f(p2.income)}\n` +
        `Change: ${d.income >= 0 ? "+" : ""}${f(d.income)}` +
        `${d.income_pct !== null ? ` (${d.income_pct}%)` : ""}`
      );

    if (m === "expense")
      return (
        `**${p1.label} vs ${p2.label} — Expense**\n\n` +
        `${p1.label}: ${f(p1.expense)}\n` +
        `${p2.label}: ${f(p2.expense)}\n` +
        `Change: ${d.expense >= 0 ? "+" : ""}${f(d.expense)}` +
        `${d.expense_pct !== null ? ` (${d.expense_pct}%)` : ""}`
      );

    if (m === "profit")
      return (
        `**${p1.label} vs ${p2.label} — Result**\n\n` +
        `${p1.label}: ${f(p1.finalResult)}\n` +
        `${p2.label}: ${f(p2.finalResult)}\n` +
        `Change: ${d.finalResult >= 0 ? "+" : ""}${f(d.finalResult)}` +
        `${d.finalResult_pct !== null ? ` (${d.finalResult_pct}%)` : ""}\n` +
        `Trend: **${d.direction}**`
      );

    // No metric → full compare
    return (
      `**Comparison: ${p1.label} vs ${p2.label}**\n\n` +
      `Income: ${f(p1.income)} → ${f(p2.income)} (${d.income >= 0 ? "+" : ""}${f(d.income)})\n` +
      `Expense: ${f(p1.expense)} → ${f(p2.expense)}\n` +
      `Final Result: ${f(p1.finalResult)} → ${f(p2.finalResult)}\n` +
      `Trend: **${d.direction}**`
    );
  }

  // ── TREND ─────────────────────────────────────────────────────
  if (jsResult.best) {
    return (
      `**Trend Analysis (${jsResult.periodsAnalyzed} periods)**\n\n` +
      `Best: ${jsResult.best.period} — ${f(jsResult.best.finalResult)}\n` +
      `Worst: ${jsResult.worst.period} — ${f(jsResult.worst.finalResult)}\n` +
      `Overall trend: **${jsResult.trend}**\n` +
      `Overall change: ${jsResult.overallChange_pct !== null ? jsResult.overallChange_pct + "%" : "N/A"}`
    );
  }

  return "Please ask about a specific period or metric.";
}

module.exports = {
  dataUpload,
  importExcelFile,
  getLatestSheetResult,
  LiveSheetData,
  previousSheetData,
  getPreviousSheetResult,
  AI_chat,
};
