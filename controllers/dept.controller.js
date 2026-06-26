const deptSheet = require("../services/dept.sheet");
const UploadRecord = require("../models/UploadRecord");
const axios = require("axios");
const XLSX = require("xlsx");
const mongoose = require("mongoose");

// ******************* Loan Tracker Logics ***************************

const loanSheet = async (req, reply) => {
  return reply.sendFile("staff/Loan_Tracker.html");
};

// ============================================================
//  importDebtFile — Structured Block Parser
//  Saves data as: { mainHeader, columns[], rows[] } per block
// ============================================================

const importDebtFile = async (request, reply) => {
  try {
    const parts = request.parts();
    let fileBuffer = null;
    let fileName    = null;
    let selectedYear = "latest";
    let clientId    = null;
    let clientName  = null;
    let staffId     = null;

    // ── Parse multipart fields ──────────────────────────────────────────
    for await (const part of parts) {
      if (part.type === "file") {
        const chunks = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        fileName   = part.filename;
      } else if (part.type === "field") {
        if (part.fieldname === "year")       selectedYear = part.value;
        if (part.fieldname === "clientId")   clientId     = part.value;
        if (part.fieldname === "clientName") clientName   = part.value;
        if (part.fieldname === "staffId")    staffId      = part.value;
      }
    }

    // ── Validation ──────────────────────────────────────────────────────
    if (!fileBuffer) {
      return reply.code(400).send({ success: false, error: "Please upload an Excel file" });
    }
    if (!clientId || !clientName) {
      return reply.code(400).send({ success: false, error: "clientId and clientName are required" });
    }

    // ── Resolve actual clientId if MongoDB _id was passed ───────────────
    let actualClientId = clientId;
    if (clientId.length === 24 && /^[a-f0-9]+$/i.test(clientId)) {
      const clientRecord = await ClientRecord.findById(clientId).select("clientId");
      if (clientRecord?.clientId) {
        actualClientId = clientRecord.clientId;
        console.log(`✅ Converted MongoDB _id → clientId: ${actualClientId}`);
      }
    }

    console.log(`📁 File: ${fileName} | Client: ${clientName} (${actualClientId}) | Year: ${selectedYear}`);

    // ── Parse workbook ──────────────────────────────────────────────────
    const workbook = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    const SHEET_NAME = "Extracto";
    if (!workbook.SheetNames.includes(SHEET_NAME)) {
      return reply.code(400).send({
        success: false,
        error: `Sheet "${SHEET_NAME}" not found`,
        availableSheets: workbook.SheetNames,
      });
    }

    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[SHEET_NAME], {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });

    console.log(`📊 Sheet loaded: ${jsonData.length} total rows`);

    // ── Helper: Excel serial → "DD-MM-YYYY" ────────────────────────────
    const toDate = (v) => {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) {
    return `${v.getUTCMonth() + 1}/${v.getUTCDate()}/${v.getUTCFullYear()}`;
  }
  if (typeof v === "number" && v > 40000 && v < 60000) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  }
  return v.toString().trim();
};

    // ── Helper: Safe number parse ───────────────────────────────────────
    const toNum = (v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") {
        const r = Math.round(v * 100) / 100;
        return Math.abs(r) < 1e-9 ? 0 : r;
      }
      if (typeof v === "string") {
        const s = v.replace(/[€$,]/g, "").replace(/\s/g, "").trim();
        if (s.startsWith("(") && s.endsWith(")")) {
          const n = parseFloat(s.slice(1, -1));
          return isNaN(n) ? null : -n;
        }
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
      }
      return null;
    };

    // ── Helper: Get first non-null value from a row ─────────────────────
    const firstVal = (row) => row.find((c) => c !== null && c !== undefined && c !== "");

    // ── Helper: Check if a row is completely empty ──────────────────────
    const isEmptyRow = (row) => row.every((c) => c === null || c === undefined || c === "");

    // ── Helper: Normalize cell value ────────────────────────────────────
const normalizeCell = (v) => {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return toDate(v);
  }
  if (typeof v === "number") {
    // Could be a date serial
    if (v > 40000 && v < 60000) return toDate(v);
    return toNum(v);
  }
  const s = v.toString().trim();
  return s === "" || s === "null" ? null : s;
};

  
    // Detectors ─────────────────────────────────────────────────────────

    // Is this row a "separator" (dashes, equals, underscores)?
    const isSeparatorRow = (row) => {
      const nonNull = row.filter((c) => c !== null && c !== undefined && c !== "");
      if (nonNull.length === 0) return false;
      return nonNull.every((c) => /^[-=_*#]{2,}$/.test(c.toString().trim()));
    };

    // Is this a column header row?
    // Column header rows: most cells are short strings, no mix of numbers and text
    const isColumnHeaderRow = (row) => {
      const nonNull = row.filter((c) => c !== null && c !== undefined && c !== "");
      if (nonNull.length < 2) return false;
      const allStrings = nonNull.every((c) => typeof c === "string" || typeof c === "number");
      const mostAreStrings = nonNull.filter((c) => typeof c === "string").length >= nonNull.length * 0.6;
      const noLargeNumbers = nonNull.every((c) => typeof c !== "number" || (c > 1900 && c < 2100)); // allow years
      return allStrings && mostAreStrings && noLargeNumbers;
    };

    // Is this row a "main header"?
    // Main headers: sparse (1-3 non-null cells), all string, no numeric data
    const isMainHeaderRow = (row) => {
      const nonNull = row.filter((c) => c !== null && c !== undefined && c !== "");
      if (nonNull.length === 0 || nonNull.length > 3) return false;
      const allStrings = nonNull.every((c) => typeof c === "string");
      if (!allStrings) return false;
      // Must not look like a date or a tiny label that belongs to data
      const val = nonNull[0].toString().trim();
      if (val.length < 2) return false;
      // Avoid matching things like "CUENTA: 430.001" — those are already handled
      // Here we keep it generic: any short string row with ≤3 filled cells
      return true;
    };

    // ── PARSE BLOCKS ───────────────────────────────────────────────────
    const blocks = [];      // Final output
    let state = "SEEK_HEADER";  // States: SEEK_HEADER | SEEK_COLUMNS | COLLECT_ROWS
    let currentBlock = null;
    let pendingHeaderRow = null;  // The row we think might be a main header

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      if (isEmptyRow(row)) continue;
      if (isSeparatorRow(row)) {
        // Separator ends current block
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        state = "SEEK_HEADER";
        continue;
      }

      if (state === "SEEK_HEADER") {
        if (isMainHeaderRow(row)) {
          pendingHeaderRow = row;
          state = "SEEK_COLUMNS";
        } else if (isColumnHeaderRow(row)) {
          // Column row found without a prior main header — create a nameless block
          currentBlock = {
            mainHeader: "UNKNOWN",
            columns: [],
            rows: [],
          };
          // Use this row as column header
          const cols = row.map((c) => (c !== null && c !== undefined && c !== "" ? c.toString().trim() : null));
          currentBlock.columns = cols;
          state = "COLLECT_ROWS";
        }
        continue;
      }

      if (state === "SEEK_COLUMNS") {
        // We have a pending main header — looking for the column row
        if (isColumnHeaderRow(row)) {
          // Commit the pending header and start a new block
          if (currentBlock) blocks.push(currentBlock);
          const headerVal = pendingHeaderRow
            .filter((c) => c !== null && c !== undefined && c !== "")
            .map((c) => c.toString().trim())
            .join(" ");
          currentBlock = {
            mainHeader: headerVal,
            columns: row.map((c) => (c !== null && c !== undefined && c !== "" ? c.toString().trim() : null)),
            rows: [],
          };
          pendingHeaderRow = null;
          state = "COLLECT_ROWS";
        } else if (isMainHeaderRow(row)) {
          // Another main header before we found columns — treat previous as standalone label
          pendingHeaderRow = row;
          // (keep state as SEEK_COLUMNS)
        } else {
          // Not a column row — maybe the "main header" was actually a data row
          // Fall back: treat pendingHeaderRow as data, look for real header again
          pendingHeaderRow = null;
          state = "SEEK_HEADER";
          i--; // re-process this row
        }
        continue;
      }

      if (state === "COLLECT_ROWS") {
        // Check if this row starts a NEW main header
        if (isMainHeaderRow(row)) {
          // Peek ahead: is the next non-empty row a column row?
          let nextNonEmpty = null;
          for (let j = i + 1; j < jsonData.length; j++) {
            if (!isEmptyRow(jsonData[j]) && !isSeparatorRow(jsonData[j])) {
              nextNonEmpty = jsonData[j];
              break;
            }
          }
          if (nextNonEmpty && isColumnHeaderRow(nextNonEmpty)) {
            // Yes — this IS a new main header; end current block
            if (currentBlock) blocks.push(currentBlock);
            currentBlock = null;
            pendingHeaderRow = row;
            state = "SEEK_COLUMNS";
            continue;
          }
          // Otherwise treat as a data/total row and fall through
        }

        // Map this row to column names
        const cols = currentBlock.columns;
        const dataObj = {};
        let hasData = false;

        for (let c = 0; c < cols.length; c++) {
          const colName = cols[c];
          if (!colName) continue;
          const rawVal = row[c] !== undefined ? row[c] : null;
          const val = normalizeCell(rawVal);
          dataObj[colName] = val;
          if (val !== null && val !== "") hasData = true;
        }

        if (hasData) {
          currentBlock.rows.push(dataObj);
        }
      }
    }

    // Push last block
    if (currentBlock) blocks.push(currentBlock);

    console.log(`✅ Structured blocks parsed: ${blocks.length}`);
    blocks.forEach((b, idx) => {
      console.log(`  Block ${idx + 1}: "${b.mainHeader}" | cols: [${b.columns.filter(Boolean).join(", ")}] | rows: ${b.rows.length}`);
    });

    if (blocks.length === 0) {
      return reply.send({
        success: true,
        message: "⚠️ No structured blocks found in file",
        importedBlocks: 0,
      });
    }

    // ── Save to DB ──────────────────────────────────────────────────────
    const result = await deptSheet.saveStructuredBlocksToDB(
      blocks,
      selectedYear,
      actualClientId,
      clientName,
    );

    if (!result.success) throw new Error(result.error);

    // ── Upload record ───────────────────────────────────────────────────
    await UploadRecord.create({
      staffId:      staffId && staffId !== "null" ? String(staffId) : "unknown",
      clientId:     String(actualClientId),
      clientName,
      fileName,
      importedRows: blocks.reduce((sum, b) => sum + b.rows.length, 0),
      failedRows:   0,
      year:         selectedYear,
      status:       "success",
    });

    return reply.send({
      success: true,
      message: `✅ Imported ${blocks.length} blocks`,
      importedBlocks: blocks.length,
      totalRows:      blocks.reduce((sum, b) => sum + b.rows.length, 0),
      collection:     result.collection,
      clientId:       actualClientId,
      clientName,
    });

  } catch (error) {
    console.error("❌ Import error:", error);
    return reply.code(500).send({ success: false, error: error.message });
  }
};



const showLatestdept = async (req, reply) => {
  return reply.sendFile("users/dept_latestSheet.html");
}

const getLatestdeptResult = async (req, reply) => {
  try {
    const clientId = req.headers["x-client-id"];

    if (!clientId) {
      return reply.status(401).send({ success: false, error: "clientId missing" });
    }

    const result = await deptSheet.getClientBlocks(clientId); // ✅ correct method

    if (!result.success) {
      return reply.send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      source: "latest_sheet",
      collection: result.collection,
      totalBlocks: result.blocks.length,
      data: result.blocks, // ✅ .blocks not .data
    });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

const showPreviousdept = async (req, reply) => {
  return reply.sendFile("users/dept_previousSheet.html");
}

const getPreviousdeptResult = async (req, reply) => {
  try {
    const clientId = req.headers["x-client-id"];

    if (!clientId) {
      return reply.status(401).send({ success: false, error: "clientId missing" });
    }

    const result = await deptSheet.fetchPreviousBlocks(clientId); // ✅ correct method

    if (!result.success) {
      return reply.send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      source: "previous_sheet",
      collection: result.collection,
      totalBlocks: result.blocks.length,
      data: result.blocks, // ✅ .blocks not .data
    });
  } catch (err) {
    return reply.status(500).send({ success: false, error: err.message });
  }
};

module.exports = {
   loanSheet,
   importDebtFile,
   showLatestdept,
   getLatestdeptResult,
   showPreviousdept,
   getPreviousdeptResult
}