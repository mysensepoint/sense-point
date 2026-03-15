/**
 * Hint Service — 하이브리드 스코어링 기반 유사 노드 찾기
 *
 * 2가지 신호:
 *   1. 임베딩 유사도 — 표면적 의미 비교 (바닥 깔개)
 *   2. 그래프 근접도 — 사용자의 연결 패턴 (1-hop, 2-hop, 공통 이웃)
 *
 * 적응형 가중치 (코잡기 → 뜨개질 전환):
 *   - 코잡기 단계: 임베딩 85%, 그래프 15%
 *   - 뜨개질 단계: 임베딩 40%, 그래프 60%
 *
 * 결 대비 보너스: 올끼리만 적용 (공명↔마찰 = 15% 부스팅)
 *
 * 대상 노드 타입: 올(fb_), 실(th_), 편물(fa_)
 * 코(st_)는 관계 자체라 독립적 의미가 부족하여 유사 후보에서 제외
 */

var embedder = require('./embedder');
var db = require('../db');

// ─── 임베딩 인메모리 캐시 ───
// DB에서 매번 JSON.parse 하는 비용을 줄이기 위해 파싱된 벡터를 메모리에 캐싱
var embeddingCache = new Map();  // node_id -> number[]
var cacheLoaded = false;

function _loadCache() {
  if (cacheLoaded) return;
  var database = db.getDB();
  if (!database) return;
  var rows = db.rowsToObjects(
    database.exec('SELECT node_id, embedding FROM embeddings')
  );
  for (var i = 0; i < rows.length; i++) {
    embeddingCache.set(rows[i].node_id, JSON.parse(rows[i].embedding));
  }
  cacheLoaded = true;
}

function _getCachedEmbedding(nodeId) {
  _loadCache();
  return embeddingCache.get(nodeId) || null;
}

function _getAllCachedEmbeddings() {
  _loadCache();
  return embeddingCache;
}

// ─── 노드 타입 판별 ───

function _nodeType(nodeId) {
  if (!nodeId) return null;
  var prefix = nodeId.substring(0, 3);
  if (prefix === 'fb_') return 'fiber';
  if (prefix === 'th_') return 'thread';
  if (prefix === 'st_') return 'stitch';
  if (prefix === 'fa_') return 'fabric';
  if (prefix === 'cn_') return 'connection';
  return null;
}

// ─── 임베딩 관리 ───

async function saveEmbedding(nodeId, text) {
  if (!embedder.isReady()) return;
  var vector = await embedder.embed(text);
  if (!vector) return;

  var database = db.getDB();
  database.run(
    'INSERT OR REPLACE INTO embeddings (node_id, embedding) VALUES (?, ?)',
    [nodeId, JSON.stringify(vector)]
  );
  db.persist();
  embeddingCache.set(nodeId, vector);
}

function deleteEmbedding(nodeId) {
  var database = db.getDB();
  database.run('DELETE FROM embeddings WHERE node_id = ?', [nodeId]);
  embeddingCache.delete(nodeId);
}

// ─── 그래프 근접도 ───

/**
 * 노드의 이웃 집합을 반환
 * - 올: threads를 통해 연결된 다른 올
 * - 실: stitches를 통해 연결된 다른 실
 * - 모든 노드: connections를 통한 교차 연결
 */
function getNeighbors(nodeId) {
  var database = db.getDB();
  var neighbors = new Set();
  var type = _nodeType(nodeId);

  if (type === 'fiber') {
    // 올의 이웃: threads를 통해 연결된 다른 올
    var threadRows = db.rowsToObjects(
      database.exec(
        'SELECT fiber_a_id, fiber_b_id FROM threads WHERE fiber_a_id = ? OR fiber_b_id = ?',
        [nodeId, nodeId]
      )
    );
    for (var i = 0; i < threadRows.length; i++) {
      if (threadRows[i].fiber_a_id !== nodeId) neighbors.add(threadRows[i].fiber_a_id);
      if (threadRows[i].fiber_b_id !== nodeId) neighbors.add(threadRows[i].fiber_b_id);
    }
  } else if (type === 'thread') {
    // 실의 이웃: stitches를 통해 연결된 다른 실
    var stitchRows = db.rowsToObjects(
      database.exec(
        'SELECT thread_a_id, thread_b_id FROM stitches WHERE thread_a_id = ? OR thread_b_id = ?',
        [nodeId, nodeId]
      )
    );
    for (var j = 0; j < stitchRows.length; j++) {
      if (stitchRows[j].thread_a_id !== nodeId) neighbors.add(stitchRows[j].thread_a_id);
      if (stitchRows[j].thread_b_id !== nodeId) neighbors.add(stitchRows[j].thread_b_id);
    }
  }

  // 교차 연결 (모든 노드 타입)
  var connRows = db.rowsToObjects(
    database.exec(
      'SELECT node_a_id, node_b_id FROM connections WHERE node_a_id = ? OR node_b_id = ?',
      [nodeId, nodeId]
    )
  );
  for (var k = 0; k < connRows.length; k++) {
    if (connRows[k].node_a_id !== nodeId) neighbors.add(connRows[k].node_a_id);
    if (connRows[k].node_b_id !== nodeId) neighbors.add(connRows[k].node_b_id);
  }

  return neighbors;
}

/**
 * 그래프 근접도 점수 (0~1)
 * - 1-hop 직접 연결: 1.0
 * - 2-hop 간접 연결: 0.5
 * - 공통 이웃 비율: 공통 수 / max(이웃A, 이웃B)
 * - 최종: max(hop 점수, 공통이웃 비율)
 */
function calcGraphScore(targetId, candidateId, targetNeighbors) {
  // 1-hop: 직접 연결
  if (targetNeighbors.has(candidateId)) return 1.0;

  var candidateNeighbors = getNeighbors(candidateId);

  // 공통 이웃
  var common = 0;
  targetNeighbors.forEach(function(n) {
    if (candidateNeighbors.has(n)) common++;
  });

  var maxNeighbors = Math.max(targetNeighbors.size, candidateNeighbors.size);
  var commonRatio = maxNeighbors > 0 ? common / maxNeighbors : 0;

  // 2-hop: target의 이웃이 candidate와 연결
  var hopScore = 0;
  targetNeighbors.forEach(function(n) {
    if (candidateNeighbors.has(n)) hopScore = 0.5;
  });

  return Math.max(hopScore, commonRatio);
}

// ─── 적응형 가중치 ───

/**
 * 현재 단계의 가중치 반환
 * density = thread 수 / fiber 수
 * - < 1.0: 코잡기 단계 (임베딩 중심)
 * - 1.0~2.0: 전환 구간 (선형 보간)
 * - ≥ 2.0: 뜨개질 단계 (그래프 중심)
 */
function getWeights() {
  var database = db.getDB();

  var fiberCount = db.rowsToObjects(
    database.exec('SELECT COUNT(*) as cnt FROM fibers')
  )[0]?.cnt || 0;
  var threadCount = db.rowsToObjects(
    database.exec('SELECT COUNT(*) as cnt FROM threads')
  )[0]?.cnt || 0;

  if (fiberCount === 0) {
    return { embedding: 0.85, graph: 0.15, phase: 'casting-on', density: 0 };
  }

  var density = threadCount / fiberCount;

  // 코잡기 단계
  var castOn = { embedding: 0.85, graph: 0.15 };
  // 뜨개질 단계
  var knitting = { embedding: 0.40, graph: 0.60 };

  if (density < 1.0) {
    return { embedding: castOn.embedding, graph: castOn.graph, phase: 'casting-on', density: density };
  }
  if (density >= 2.0) {
    return { embedding: knitting.embedding, graph: knitting.graph, phase: 'knitting', density: density };
  }

  // 전환 구간: 선형 보간
  var t = (density - 1.0) / (2.0 - 1.0); // 0~1
  return {
    embedding: castOn.embedding + t * (knitting.embedding - castOn.embedding),
    graph: castOn.graph + t * (knitting.graph - castOn.graph),
    phase: 'transition',
    density: density
  };
}

// ─── 결 대비 ───

var TONE_BOOST = 0.15; // 최대 15% 부스팅

/**
 * 두 결 사이의 대비 점수 (0~1)
 * 공명↔마찰 = 1.0, 물음+어느결 = 0.5, 같은 결 = 0
 */
function _toneContrast(toneA, toneB) {
  if (!toneA || !toneB || toneA === toneB) return 0;
  if ((toneA === 'resonance' && toneB === 'friction') ||
      (toneA === 'friction' && toneB === 'resonance')) return 1.0;
  return 0.5; // question + 어느 결이든
}

// ─── 하이브리드 유사 노드 찾기 ───

/**
 * 유사 노드 찾기 (하이브리드 스코어링)
 * @param {string} targetId — 어떤 노드든 (fb_, th_, fa_)
 * @returns {object} { hints, phase, density }
 */
function findSimilarNodes(targetId) {
  var database = db.getDB();

  // 캐시에서 대상 임베딩 조회
  var targetVec = _getCachedEmbedding(targetId);
  if (!targetVec) return { hints: [], phase: 'casting-on', density: 0 };

  // 캐시에서 모든 임베딩 조회 (대상 제외)
  var allEmbeddings = _getAllCachedEmbeddings();
  if (allEmbeddings.size <= 1) return { hints: [], phase: 'casting-on', density: 0 };

  // 가중치
  var weights = getWeights();
  var threshold = weights.phase === 'knitting' ? 0.3 : 0.25;

  // target의 이웃 (그래프 점수용, 한 번만 계산)
  var targetNeighbors = getNeighbors(targetId);

  // 대상 노드 타입
  var targetType = _nodeType(targetId);

  // 결 대비용: 올의 tone 미리 조회 (올끼리만 적용)
  var toneMap = {};
  var targetTone = null;
  if (targetType === 'fiber') {
    var toneRows = db.rowsToObjects(database.exec('SELECT id, tone FROM fibers'));
    for (var i = 0; i < toneRows.length; i++) {
      toneMap[toneRows[i].id] = toneRows[i].tone || 'resonance';
    }
    targetTone = toneMap[targetId] || 'resonance';
  }

  // 하이브리드 점수 계산
  var scored = [];
  allEmbeddings.forEach(function(candidateVec, nodeId) {
    if (nodeId === targetId) return;

    var embeddingScore = embedder.cosineSimilarity(targetVec, candidateVec);
    var graphScore = calcGraphScore(targetId, nodeId, targetNeighbors);

    var hybrid = weights.embedding * embeddingScore
      + weights.graph * graphScore;

    // 결 대비 보너스 (올끼리만)
    var candidateType = _nodeType(nodeId);
    var contrast = 0;
    if (targetType === 'fiber' && candidateType === 'fiber') {
      contrast = _toneContrast(targetTone, toneMap[nodeId]);
      hybrid = hybrid * (1 + TONE_BOOST * contrast);
    }

    if (hybrid > threshold) {
      scored.push({
        node_id: nodeId,
        type: candidateType,
        score: hybrid,
        signals: {
          embedding: Math.round(embeddingScore * 100),
          graph: Math.round(graphScore * 100),
          tone: Math.round(contrast * 100)
        }
      });
    }
  });

  scored.sort(function(a, b) { return b.score - a.score; });
  var top = scored.slice(0, 7);

  if (!top.length) return { hints: [], phase: weights.phase, density: weights.density };

  // 노드 상세 정보 조회
  var hints = [];
  for (var j = 0; j < top.length; j++) {
    var s = top[j];
    var detail = _getNodeDetail(s.node_id, s.type);
    if (detail) {
      hints.push({
        node_id: s.node_id,
        type: s.type,
        detail: detail,
        similarity: Math.round(s.score * 100),
        signals: s.signals
      });
    }
  }

  return { hints: hints, phase: weights.phase, density: weights.density };
}

/**
 * 노드 상세 정보 조회 (타입별)
 */
function _getNodeDetail(nodeId, type) {
  var database = db.getDB();

  if (type === 'fiber') {
    return db.rowsToObjects(
      database.exec('SELECT * FROM fibers WHERE id = ?', [nodeId])
    )[0] || null;
  }

  if (type === 'thread') {
    var thread = db.rowsToObjects(
      database.exec('SELECT * FROM threads WHERE id = ?', [nodeId])
    )[0];
    if (!thread) return null;
    // 양쪽 올 정보 포함
    thread.fiber_a = db.rowsToObjects(
      database.exec('SELECT id, text, tension, tone FROM fibers WHERE id = ?', [thread.fiber_a_id])
    )[0] || null;
    thread.fiber_b = db.rowsToObjects(
      database.exec('SELECT id, text, tension, tone FROM fibers WHERE id = ?', [thread.fiber_b_id])
    )[0] || null;
    return thread;
  }

  if (type === 'fabric') {
    var fabric = db.rowsToObjects(
      database.exec('SELECT * FROM fabrics WHERE id = ?', [nodeId])
    )[0];
    if (!fabric) return null;
    // 포함된 코 ID 목록
    var links = db.rowsToObjects(
      database.exec('SELECT stitch_id FROM fabric_stitches WHERE fabric_id = ?', [nodeId])
    );
    fabric.stitch_ids = links.map(function(l) { return l.stitch_id; });
    return fabric;
  }

  return null;
}

// ─── 일괄 처리 ───

/**
 * 임베딩이 없는 모든 노드(올, 실, 편물)에 일괄 임베딩 생성
 */
async function backfillEmbeddings() {
  if (!embedder.isReady()) return;
  var database = db.getDB();
  var count = 0;

  // 올: text 기반
  var fibers = db.rowsToObjects(
    database.exec(
      'SELECT f.id, f.text FROM fibers f LEFT JOIN embeddings e ON f.id = e.node_id WHERE e.node_id IS NULL'
    )
  );
  if (fibers.length) {
    console.log('[hint] 임베딩 없는 올 ' + fibers.length + '개 처리...');
    for (var i = 0; i < fibers.length; i++) {
      await saveEmbedding(fibers[i].id, fibers[i].text);
      count++;
    }
  }

  // 실: why + 양쪽 올 텍스트
  var threads = db.rowsToObjects(
    database.exec(
      'SELECT t.id, t.why, t.fiber_a_id, t.fiber_b_id FROM threads t LEFT JOIN embeddings e ON t.id = e.node_id WHERE e.node_id IS NULL'
    )
  );
  if (threads.length) {
    console.log('[hint] 임베딩 없는 실 ' + threads.length + '개 처리...');
    for (var j = 0; j < threads.length; j++) {
      var th = threads[j];
      var parts = [];
      if (th.why) parts.push(th.why);
      var fa = db.rowsToObjects(
        database.exec('SELECT text FROM fibers WHERE id = ?', [th.fiber_a_id])
      )[0];
      var fb = db.rowsToObjects(
        database.exec('SELECT text FROM fibers WHERE id = ?', [th.fiber_b_id])
      )[0];
      if (fa) parts.push(fa.text);
      if (fb) parts.push(fb.text);
      if (parts.length > 0) {
        await saveEmbedding(th.id, parts.join(' '));
        count++;
      }
    }
  }

  // 편물: title + insight
  var fabrics = db.rowsToObjects(
    database.exec(
      'SELECT f.id, f.title, f.insight FROM fabrics f LEFT JOIN embeddings e ON f.id = e.node_id WHERE e.node_id IS NULL'
    )
  );
  if (fabrics.length) {
    console.log('[hint] 임베딩 없는 편물 ' + fabrics.length + '개 처리...');
    for (var k = 0; k < fabrics.length; k++) {
      var fab = fabrics[k];
      var text = [fab.title || '', fab.insight || ''].filter(Boolean).join(' ');
      if (text.trim()) {
        await saveEmbedding(fab.id, text.trim());
        count++;
      }
    }
  }

  if (count > 0) {
    console.log('[hint] 일괄 임베딩 완료: ' + count + '개');
  } else {
    console.log('[hint] 모든 노드에 임베딩이 있습니다.');
  }
}

module.exports = {
  findSimilarNodes: findSimilarNodes,
  saveEmbedding: saveEmbedding,
  deleteEmbedding: deleteEmbedding,
  backfillEmbeddings: backfillEmbeddings
};
