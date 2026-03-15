/**
 * Fiber Routes — 올 CRUD + 유사 노드 조회
 * v2: thought/reply 제거, born_from 추가
 */
var express = require('express');
var router = express.Router();
var db = require('../db');
var hint = require('../services/hint');

function _parseSourceRange(fiber) {
  if (fiber && fiber.source_range) {
    try { fiber.source_range = JSON.parse(fiber.source_range); } catch (e) { fiber.source_range = null; }
  }
}

// POST /api/fibers — 올 잡기
router.post('/', function(req, res) {
  try {
    var body = req.body;
    var text = body.text;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    var id = db.generateId('fb');
    var t = Math.max(1, Math.min(5, parseInt(body.tension) || 3));
    var validTones = ['resonance', 'friction', 'question'];
    var safeTone = validTones.indexOf(body.tone) >= 0 ? body.tone : 'resonance';
    var now = Date.now();

    db.getDB().run(
      'INSERT INTO fibers (id, text, source, source_id, source_title, tension, tone, caught_at, source_range, born_from_id, born_from_type) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, text.trim(), body.source || '', body.source_id || body.source_note_id || '', body.source_title || body.source_note_title || '', t, safeTone, now,
       body.source_range ? JSON.stringify(body.source_range) : null,
       body.born_from_id || null, body.born_from_type || null]
    );
    db.persist();

    var fiber = db.getOne('SELECT * FROM fibers WHERE id = ?', [id]);
    _parseSourceRange(fiber);
    res.status(201).json(fiber);

    // 비동기 임베딩 생성
    hint.saveEmbedding(id, text.trim()).catch(function(err) {
      console.error('[embedding] 생성 실패:', err.message);
    });
  } catch (err) {
    console.error('POST /api/fibers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fibers — 올 목록
router.get('/', function(req, res) {
  try {
    var sort = req.query.sort || 'caught_at';
    var order = req.query.order || 'DESC';
    var limit = Math.min(parseInt(req.query.limit) || 100, 500);
    var offset = parseInt(req.query.offset) || 0;

    var validSorts = ['caught_at', 'tension'];
    var sortCol = validSorts.indexOf(sort) >= 0 ? sort : 'caught_at';
    var sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    var fibers = db.getAll(
      'SELECT * FROM fibers ORDER BY ' + sortCol + ' ' + sortOrder + ' LIMIT ? OFFSET ?',
      [limit, offset]
    );
    fibers.forEach(_parseSourceRange);
    res.json(fibers);
  } catch (err) {
    console.error('GET /api/fibers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fibers/:id — 올 상세
router.get('/:id', function(req, res) {
  try {
    var fiber = db.getOne('SELECT * FROM fibers WHERE id = ?', [req.params.id]);
    if (!fiber) return res.status(404).json({ error: 'Not found' });
    _parseSourceRange(fiber);
    res.json(fiber);
  } catch (err) {
    console.error('GET /api/fibers/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/fibers/:id — 장력/결 변경
router.patch('/:id', function(req, res) {
  try {
    var fiber = db.getOne('SELECT * FROM fibers WHERE id = ?', [req.params.id]);
    if (!fiber) return res.status(404).json({ error: 'Not found' });

    var updates = [];
    var params = [];

    if (req.body.tension !== undefined) {
      var t = Math.max(1, Math.min(5, parseInt(req.body.tension) || 3));
      updates.push('tension = ?');
      params.push(t);
    }

    if (req.body.tone !== undefined) {
      var validTones = ['resonance', 'friction', 'question'];
      if (validTones.indexOf(req.body.tone) >= 0) {
        updates.push('tone = ?');
        params.push(req.body.tone);
      }
    }

    if (req.body.source_range !== undefined) {
      updates.push('source_range = ?');
      params.push(req.body.source_range ? JSON.stringify(req.body.source_range) : null);
    }

    if (updates.length === 0) return res.json(fiber);

    params.push(req.params.id);
    db.getDB().run('UPDATE fibers SET ' + updates.join(', ') + ' WHERE id = ?', params);
    db.persist();

    var updated = db.getOne('SELECT * FROM fibers WHERE id = ?', [req.params.id]);
    _parseSourceRange(updated);
    res.json(updated);
  } catch (err) {
    console.error('PATCH /api/fibers/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/fibers/:id
router.delete('/:id', function(req, res) {
  try {
    var fiber = db.getOne('SELECT * FROM fibers WHERE id = ?', [req.params.id]);
    if (!fiber) return res.status(404).json({ error: 'Not found' });

    // 관련 threads 삭제
    var relatedThreads = db.getAll(
      'SELECT id FROM threads WHERE fiber_a_id = ? OR fiber_b_id = ?',
      [req.params.id, req.params.id]
    );
    relatedThreads.forEach(function(th) {
      // thread에 연결된 stitches도 삭제
      db.getDB().run('DELETE FROM stitches WHERE thread_a_id = ? OR thread_b_id = ?', [th.id, th.id]);
      hint.deleteEmbedding(th.id);
    });
    db.getDB().run('DELETE FROM threads WHERE fiber_a_id = ? OR fiber_b_id = ?', [req.params.id, req.params.id]);

    // 교차 연결 삭제
    db.getDB().run('DELETE FROM connections WHERE node_a_id = ? OR node_b_id = ?', [req.params.id, req.params.id]);

    // 임베딩 삭제
    hint.deleteEmbedding(req.params.id);

    // 올 삭제
    db.getDB().run('DELETE FROM fibers WHERE id = ?', [req.params.id]);
    db.persist();

    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/fibers/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fibers/:id/hints — 유사 노드 조회
router.get('/:id/hints', function(req, res) {
  try {
    var result = hint.findSimilarNodes(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('GET /api/fibers/:id/hints error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
