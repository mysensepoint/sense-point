/**
 * Sense Point API Server — v2
 */
var express = require('express');
var cors = require('cors');
var db = require('./db');
var embedder = require('./services/embedder');
var hint = require('./services/hint');
var fiberRoutes = require('./routes/fibers');
var threadRoutes = require('./routes/threads');
var stitchRoutes = require('./routes/stitches');
var fabricRoutes = require('./routes/fabrics');
var connectionRoutes = require('./routes/connections');
var noteRoutes = require('./routes/notes');

var app = express();
var PORT = process.env.PORT || 3001;

var ALLOWED_ORIGINS = [
  'http://localhost:5500', 'http://127.0.0.1:5500',
  'http://localhost:5501', 'http://127.0.0.1:5501',
  'http://localhost:8080', 'http://127.0.0.1:8080',
  'http://localhost:3000', 'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    if (origin === 'null' && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.use('/api/fibers', fiberRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/stitches', stitchRoutes);
app.use('/api/fabrics', fabricRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notes', noteRoutes);

app.get('/api/health', function(req, res) { res.json({ ok: true }); });

// 유사 노드 범용 엔드포인트 (올/실/편물 공통)
app.get('/api/nodes/:id/hints', function(req, res) {
  try {
    var result = hint.findSimilarNodes(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('GET /api/nodes/:id/hints error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function start() {
  await db.initDB();
  app.listen(PORT, function() {
    console.log('Sense Point API v2 running on http://localhost:' + PORT);
  });

  // 임베딩 모델 로드 (백그라운드)
  embedder.initEmbedder()
    .then(function() { return hint.backfillEmbeddings(); })
    .catch(function(err) { console.error('[embedder] 초기화 실패:', err.message); });
}

start().catch(function(err) {
  console.error('Failed to start server:', err);
  process.exit(1);
});
