/**
 * SQLite Database Setup (sql.js — WebAssembly, no native deps)
 * v2: 올·실·코·편물 재설계
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'knitting.db');

let db = null;

function generateId(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

async function initDB() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // ── 올 (fiber) ──────────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS fibers (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    source TEXT DEFAULT '',
    source_id TEXT DEFAULT '',
    source_title TEXT DEFAULT '',
    tension INTEGER DEFAULT 3 CHECK(tension BETWEEN 1 AND 5),
    tone TEXT DEFAULT 'resonance',
    caught_at INTEGER NOT NULL,
    source_range TEXT DEFAULT NULL,
    born_from_id TEXT DEFAULT NULL,
    born_from_type TEXT DEFAULT NULL
  )`);

  // ── 실 (thread) — 올+올 연결 ────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    fiber_a_id TEXT NOT NULL,
    fiber_b_id TEXT NOT NULL,
    why TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  // ── 코 (stitch) — 실+실 연결 ────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS stitches (
    id TEXT PRIMARY KEY,
    thread_a_id TEXT NOT NULL,
    thread_b_id TEXT NOT NULL,
    why TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  // ── 편물 (fabric) — 코들의 모임 ──────────────────
  db.run(`CREATE TABLE IF NOT EXISTS fabrics (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT '',
    insight TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fabric_stitches (
    fabric_id TEXT NOT NULL,
    stitch_id TEXT NOT NULL,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (fabric_id, stitch_id)
  )`);

  // ── 교차 연결 — 다른 층위 간 ─────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    node_a_id TEXT NOT NULL,
    node_b_id TEXT NOT NULL,
    why TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  )`);

  // ── 임베딩 (통합) ───────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS embeddings (
    node_id TEXT PRIMARY KEY,
    embedding TEXT NOT NULL
  )`);

  // ── 노트 (소스 문서) ────────────────────────────
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'blank',
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    html_content TEXT DEFAULT '',
    answers TEXT DEFAULT NULL,
    bookshelf_id TEXT DEFAULT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);

  // ── 마이그레이션 ────────────────────────────────
  migrateV2();

  persist();
  return db;
}

/**
 * v1 → v2 마이그레이션
 * 기존 테이블이 존재하면 데이터를 새 구조로 변환
 */
function migrateV2() {
  // 마이그레이션 이미 완료됐는지 확인
  var migrated = false;
  try {
    var result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='_migration_v2_done'");
    if (result.length > 0 && result[0].values.length > 0) migrated = true;
  } catch (e) { /* ignore */ }
  if (migrated) return;

  // 구 fibers 테이블에 thought 컬럼이 있는지 확인
  var hasOldFibers = false;
  try {
    var cols = db.exec("PRAGMA table_info(fibers)");
    if (cols.length > 0) {
      var colNames = cols[0].values.map(function(r) { return r[1]; });
      hasOldFibers = colNames.indexOf('thought') >= 0;
    }
  } catch (e) { /* ignore */ }

  if (!hasOldFibers) {
    // 신규 설치 — 마이그레이션 불필요
    db.run("CREATE TABLE IF NOT EXISTS _migration_v2_done (done INTEGER)");
    db.run("INSERT INTO _migration_v2_done VALUES (1)");
    return;
  }

  console.log('[migration] v1 → v2 시작...');
  var now = Date.now();

  // ── 1단계: 모든 기존 데이터를 먼저 읽어둔다 ──
  var oldFibers = rowsToObjects(db.exec("SELECT * FROM fibers"));

  var oldReplies = [];
  try {
    oldReplies = rowsToObjects(db.exec("SELECT * FROM fiber_replies"));
  } catch (e) { /* fiber_replies 없으면 스킵 */ }

  var oldStitches = [];
  var hasOldStitchCols = false;
  try {
    var sCols = db.exec("PRAGMA table_info(stitches)");
    if (sCols.length > 0) {
      var sColNames = sCols[0].values.map(function(r) { return r[1]; });
      hasOldStitchCols = sColNames.indexOf('fiber_a_id') >= 0;
    }
    if (hasOldStitchCols) {
      oldStitches = rowsToObjects(db.exec("SELECT * FROM stitches"));
    }
  } catch (e) { /* ignore */ }

  var oldKnots = [];
  var oldKnotStitches = [];
  try {
    oldKnots = rowsToObjects(db.exec("SELECT * FROM knots"));
    oldKnotStitches = rowsToObjects(db.exec("SELECT * FROM knot_stitches"));
  } catch (e) { /* ignore */ }

  var oldEmbeddings = [];
  try {
    oldEmbeddings = rowsToObjects(db.exec("SELECT * FROM fiber_embeddings"));
  } catch (e) { /* ignore */ }

  // ── 2단계: fibers 테이블 재생성 (새 스키마) ──
  try {
    db.run("CREATE TABLE fibers_v2 (id TEXT PRIMARY KEY, text TEXT NOT NULL, source TEXT DEFAULT '', source_id TEXT DEFAULT '', source_title TEXT DEFAULT '', tension INTEGER DEFAULT 3, tone TEXT DEFAULT 'resonance', caught_at INTEGER NOT NULL, source_range TEXT DEFAULT NULL, born_from_id TEXT DEFAULT NULL, born_from_type TEXT DEFAULT NULL)");
    oldFibers.forEach(function(f) {
      db.run(
        "INSERT INTO fibers_v2 (id, text, source, source_id, source_title, tension, tone, caught_at, source_range, born_from_id, born_from_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [f.id, f.text, f.source || '', f.source_note_id || '', f.source_note_title || '', f.tension || 3, f.tone || 'resonance', f.caught_at, f.source_range || null, null, null]
      );
    });
    db.run("DROP TABLE fibers");
    db.run("ALTER TABLE fibers_v2 RENAME TO fibers");
  } catch (e) { console.log('[migration] fibers 테이블 재생성 실패:', e.message); }

  // ── 3단계: thought → 새 올 + 실 생성 ──
  oldFibers.forEach(function(f) {
    if (f.thought && f.thought.trim()) {
      var thoughtFiberId = generateId('fb');
      db.run(
        "INSERT INTO fibers (id, text, source, source_id, source_title, tension, tone, caught_at, born_from_id, born_from_type) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [thoughtFiberId, f.thought.trim(), 'thought', '', '', f.tension || 3, f.tone || 'resonance', f.spun_at || now, f.id, 'fiber']
      );

      var threadId = generateId('th');
      db.run(
        "INSERT INTO threads (id, fiber_a_id, fiber_b_id, why, created_at) VALUES (?,?,?,?,?)",
        [threadId, f.id, thoughtFiberId, '', f.spun_at || now]
      );
    }
  });

  // ── 4단계: fiber_replies → 새 올 + 실 생성 ──
  oldReplies.forEach(function(r) {
    var replyFiberId = generateId('fb');
    db.run(
      "INSERT INTO fibers (id, text, source, source_id, source_title, tension, tone, caught_at, born_from_id, born_from_type) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [replyFiberId, r.note, 'reply', '', '', 3, 'resonance', r.created_at || now, r.fiber_id, 'fiber']
    );

    var threadId = generateId('th');
    db.run(
      "INSERT INTO threads (id, fiber_a_id, fiber_b_id, why, created_at) VALUES (?,?,?,?,?)",
      [threadId, r.fiber_id, replyFiberId, '', r.created_at || now]
    );
  });

  // ── 5단계: 기존 stitches (올+올) → threads로 이전 ──
  var stitchToThread = {};
  if (hasOldStitchCols && oldStitches.length > 0) {
    oldStitches.forEach(function(s) {
      var threadId = generateId('th');
      stitchToThread[s.id] = threadId;
      db.run(
        "INSERT OR IGNORE INTO threads (id, fiber_a_id, fiber_b_id, why, created_at) VALUES (?,?,?,?,?)",
        [threadId, s.fiber_a_id, s.fiber_b_id, s.why || '', s.created_at || now]
      );
    });
  }

  // ── 6단계: knots → fabrics + connections ──
  oldKnots.forEach(function(k) {
    var fabricId = generateId('fa');
    db.run(
      "INSERT INTO fabrics (id, title, insight, created_at, updated_at) VALUES (?,?,?,?,?)",
      [fabricId, '', k.insight || '', k.created_at || now, k.created_at || now]
    );

    // knot_stitches → connections (기존 stitch→thread 매핑 활용)
    var knotLinks = oldKnotStitches.filter(function(ks) { return ks.knot_id === k.id; });
    knotLinks.forEach(function(ks) {
      var threadId = stitchToThread[ks.stitch_id];
      if (threadId) {
        var connId = generateId('cn');
        db.run(
          "INSERT INTO connections (id, node_a_id, node_b_id, why, created_at) VALUES (?,?,?,?,?)",
          [connId, fabricId, threadId, 'migrated from knot', now]
        );
      }
    });
  });

  // ── 7단계: stitches 테이블 재생성 (thread_a_id/thread_b_id 구조) ──
  if (hasOldStitchCols) {
    db.run("DROP TABLE IF EXISTS stitches");
    db.run("CREATE TABLE stitches (id TEXT PRIMARY KEY, thread_a_id TEXT NOT NULL, thread_b_id TEXT NOT NULL, why TEXT DEFAULT '', created_at INTEGER NOT NULL)");
  }

  // ── 8단계: fiber_embeddings → embeddings 이전 ──
  oldEmbeddings.forEach(function(e) {
    db.run(
      "INSERT OR IGNORE INTO embeddings (node_id, embedding) VALUES (?,?)",
      [e.fiber_id, e.embedding]
    );
  });

  // ── 9단계: 구 테이블 삭제 ──
  db.run("DROP TABLE IF EXISTS fiber_replies");
  db.run("DROP TABLE IF EXISTS fiber_embeddings");
  db.run("DROP TABLE IF EXISTS reply_embeddings");
  db.run("DROP TABLE IF EXISTS knots");
  db.run("DROP TABLE IF EXISTS knot_stitches");

  // 마이그레이션 완료 표시
  db.run("CREATE TABLE IF NOT EXISTS _migration_v2_done (done INTEGER)");
  db.run("INSERT INTO _migration_v2_done VALUES (1)");

  console.log('[migration] v1 → v2 완료');
}

function persist() {
  if (!db) return;
  var data = db.export();
  var buffer = Buffer.from(data);
  var tmpPath = DB_PATH + '.tmp';
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, DB_PATH);
}

function getDB() {
  return db;
}

function rowsToObjects(result) {
  if (!result || !result.length) return [];
  var stmt = result[0];
  return stmt.values.map(function(row) {
    var obj = {};
    stmt.columns.forEach(function(col, i) { obj[col] = row[i]; });
    return obj;
  });
}

function getOne(sql, params) {
  var rows = rowsToObjects(getDB().exec(sql, params));
  return rows.length ? rows[0] : null;
}

function getAll(sql, params) {
  return rowsToObjects(getDB().exec(sql, params));
}

module.exports = { initDB, getDB, persist, generateId, rowsToObjects, getOne, getAll };
