const mongoose = require("mongoose");

// ================================================================
//  deptSheet — Structured Block Storage
//
//  MongoDB document structure per block:
//  {
//    _clientId:   "C001",
//    _fileName:   "debtors_2026.xlsx",
//    _syncedAt:   Date,
//    mainHeader:  "DEBTORS",             ← main section name
//    columns:     ["Name","Amount","Date"], ← identified column headers
//    rows: [                              ← data rows mapped to columns
//      { Name: "Ali",   Amount: 5000, Date: "01-01-2026" },
//      { Name: "Ahmed", Amount: 7000, Date: "02-01-2026" },
//    ]
//  }
//
//  One document = one block (one main-header section).
//  Collection name: Extracto_<clientId>_<year>
// ================================================================

class deptSheet {
  constructor() {
    console.log("✅ deptSheet service ready — structured block storage");
  }

  // ============================================================
  //  SAVE STRUCTURED BLOCKS TO DB
  //  Called by importDebtFile after parsing
  // ============================================================
  async saveStructuredBlocksToDB(
    blocks,
    yearType  = "latest",
    clientId  = null,
    clientName = null,
  ) {
    try {
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return { success: false, error: "No blocks to save" };
      }
      if (!clientId) {
        return { success: false, error: "clientId is required" };
      }

      console.log(`👤 Client: ${clientName || "N/A"} (ID: ${clientId})`);
      console.log(`📅 Year type: ${yearType}`);

      // ── Determine target year ───────────────────────────────────────
      const currentYear = new Date().getFullYear();
      let targetYear;

      if (/^\d{4}$/.test(yearType)) {
        targetYear = parseInt(yearType);
      } else if (yearType === "previous") {
        targetYear = currentYear - 1;
      } else {
        // "latest" — try to detect from data
        targetYear = this._detectYearFromBlocks(blocks) || currentYear;
      }

      console.log(`📅 Target year resolved: ${targetYear}`);

      // ── Build collection name ───────────────────────────────────────
      const collectionName = `Extracto_${clientId}_${targetYear}`;

      const db = mongoose.connection.db;

      // ── Drop old data for this year ─────────────────────────────────
      const existing = await db.listCollections({ name: collectionName }).toArray();
      if (existing.length > 0) {
        await db.collection(collectionName).deleteMany({});
        console.log(`🗑️  Cleared old data from: ${collectionName}`);
      } else {
        console.log(`🆕 New collection: ${collectionName}`);
      }

      // ── Build documents to insert ───────────────────────────────────
      const docs = blocks.map((block, idx) => ({
        _clientId:   clientId,
        _clientName: clientName,
        _syncedAt:   new Date(),
        _year:       targetYear,
        _blockIndex: idx,                          // preserve original order
        mainHeader:  block.mainHeader || "UNKNOWN",
        columns:     (block.columns || []).filter(Boolean), // drop null column slots
        rows:        block.rows || [],
      }));

      const result = await db.collection(collectionName).insertMany(docs);
      console.log(`📥 Inserted ${result.insertedCount} block(s) into ${collectionName}`);

      return {
        success:       true,
        insertedBlocks: result.insertedCount,
        collection:    collectionName,
        year:          targetYear,
        clientId,
        clientName,
      };

    } catch (error) {
      console.error("❌ saveStructuredBlocksToDB error:", error.message);
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  //  GET ALL BLOCKS FOR A CLIENT (latest year by default)
  // ============================================================
  async getClientBlocks(clientId, year = null) {
    try {
      if (!clientId) return { success: false, error: "clientId is required" };

      const db          = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const names       = collections.map((c) => c.name);

      const prefix  = `Extracto_${clientId}_`;
      const matched = names.filter((n) => n.startsWith(prefix));

      if (matched.length === 0) {
        return { success: false, error: `No data found for client ${clientId}` };
      }

      let targetCollection;

      if (year) {
        targetCollection = matched.find((n) => n.includes(String(year)));
        if (!targetCollection) {
          return { success: false, error: `No data for client ${clientId} year ${year}` };
        }
      } else {
        // Pick highest year
        const withYears = matched.map((n) => {
          const years = (n.match(/\d{4}/g) || []).map(Number);
          return { name: n, maxYear: years.length ? Math.max(...years) : 0 };
        });
        withYears.sort((a, b) => b.maxYear - a.maxYear);
        targetCollection = withYears[0].name;
      }

      console.log(`🔍 Client ${clientId} → collection: ${targetCollection}`);

      const blocks = await db
        .collection(targetCollection)
        .find({})
        .sort({ _blockIndex: 1 })   // restore original order
        .toArray();

      return { success: true, blocks, collection: targetCollection };

    } catch (err) {
      console.error("❌ getClientBlocks error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // ============================================================
  //  GET A SPECIFIC BLOCK BY mainHeader NAME
  //  e.g. getBlockByHeader("C001", "DEBTORS")
  // ============================================================
  async getBlockByHeader(clientId, mainHeader, year = null) {
    try {
      const res = await this.getClientBlocks(clientId, year);
      if (!res.success) return res;

      const block = res.blocks.find(
        (b) => b.mainHeader?.toLowerCase() === mainHeader?.toLowerCase(),
      );

      if (!block) {
        return { success: false, error: `Block "${mainHeader}" not found` };
      }

      return { success: true, block, collection: res.collection };

    } catch (err) {
      console.error("❌ getBlockByHeader error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // ============================================================
  //  GET PREVIOUS YEAR BLOCKS
  // ============================================================
  async fetchPreviousBlocks(clientId) {
    try {
      if (!clientId) return { success: false, error: "clientId is required" };

      const db          = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const names       = collections.map((c) => c.name);

      const prefix  = `Extracto_${clientId}_`;
      const matched = names.filter((n) => n.startsWith(prefix));

      if (matched.length === 0) {
        return { success: false, error: `No data for client ${clientId}` };
      }

      const withYears = matched.map((n) => {
        const years = (n.match(/\d{4}/g) || []).map(Number);
        return { name: n, maxYear: years.length ? Math.max(...years) : 0 };
      });
      withYears.sort((a, b) => b.maxYear - a.maxYear);

      // Second highest = previous year
      const targetCollection = withYears.length >= 2 ? withYears[1].name : withYears[0].name;
      console.log(`🔍 Previous collection for ${clientId}: ${targetCollection}`);

      const blocks = await db
        .collection(targetCollection)
        .find({})
        .sort({ _blockIndex: 1 })
        .toArray();

      return { success: true, blocks, collection: targetCollection };

    } catch (err) {
      console.error("❌ fetchPreviousBlocks error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // ============================================================
  //  DELETE ALL BLOCKS FOR A CLIENT
  // ============================================================
  async deleteBlocksByClientId(clientId) {
    try {
      const db          = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      const names       = collections.map((c) => c.name);

      const pattern = new RegExp(`^Extracto_${clientId}_`);
      const matched = names.filter((n) => pattern.test(n));

      let totalDeleted = 0;
      for (const colName of matched) {
        await db.collection(colName).drop();
        console.log(`🗑️  Dropped collection: ${colName}`);
        totalDeleted++;
      }

      return {
        success: true,
        message: `${totalDeleted} collection(s) deleted for client ${clientId}`,
        deletedCollections: matched,
      };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  //  PRIVATE: detect year from block data (date values)
  // ============================================================
  _detectYearFromBlocks(blocks) {
    for (const block of blocks) {
      for (const row of (block.rows || [])) {
        for (const val of Object.values(row)) {
          if (typeof val === "string") {
            const m = val.match(/\b(20\d{2})\b/);
            if (m) return parseInt(m[1]);
          }
        }
      }
    }
    return null;
  }
}

module.exports = new deptSheet();