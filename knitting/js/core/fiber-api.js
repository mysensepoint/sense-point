/**
 * Fiber API Client — v2
 * 올/실/코/편물/연결 API 호출. IIFE 패턴, vanilla fetch().
 * 의존: 없음
 */
var FiberAPI = (function () {
  'use strict';

  var BASE_URL = 'http://localhost:3001/api';

  function _request(method, path, body) {
    var opts = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(BASE_URL + path, opts).then(function (res) {
      if (res.status === 204) return null;
      if (!res.ok) throw new Error('API error: ' + res.status);
      return res.json();
    });
  }

  // ── 올 (Fibers) ──

  function catchFiber(data) {
    return _request('POST', '/fibers', data);
  }

  function listFibers(params) {
    var qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return _request('GET', '/fibers' + qs);
  }

  function getFiber(id) {
    return _request('GET', '/fibers/' + id);
  }

  function updateFiber(id, data) {
    return _request('PATCH', '/fibers/' + id, data);
  }

  function deleteFiber(id) {
    return _request('DELETE', '/fibers/' + id);
  }

  // ── 실 (Threads) — 올+올 연결 ──

  function createThread(data) {
    return _request('POST', '/threads', data);
  }

  function listThreads(fiberId) {
    var qs = fiberId ? '?fiber_id=' + fiberId : '';
    return _request('GET', '/threads' + qs);
  }

  function getThread(id) {
    return _request('GET', '/threads/' + id);
  }

  function deleteThread(id) {
    return _request('DELETE', '/threads/' + id);
  }

  // ── 코 (Stitches) — 실+실 연결 ──

  function createStitch(data) {
    return _request('POST', '/stitches', data);
  }

  function listStitches(threadId) {
    var qs = threadId ? '?thread_id=' + threadId : '';
    return _request('GET', '/stitches' + qs);
  }

  function getStitch(id) {
    return _request('GET', '/stitches/' + id);
  }

  function deleteStitch(id) {
    return _request('DELETE', '/stitches/' + id);
  }

  // ── 편물 (Fabrics) — 코들의 모임 ──

  function createFabric(data) {
    return _request('POST', '/fabrics', data);
  }

  function listFabrics() {
    return _request('GET', '/fabrics');
  }

  function getFabric(id) {
    return _request('GET', '/fabrics/' + id);
  }

  function updateFabric(id, data) {
    return _request('PATCH', '/fabrics/' + id, data);
  }

  function deleteFabric(id) {
    return _request('DELETE', '/fabrics/' + id);
  }

  // ── 교차 연결 (Connections) — 다른 층위 간 ──

  function createConnection(data) {
    return _request('POST', '/connections', data);
  }

  function listConnections(nodeId) {
    var qs = nodeId ? '?node_id=' + nodeId : '';
    return _request('GET', '/connections' + qs);
  }

  function deleteConnection(id) {
    return _request('DELETE', '/connections/' + id);
  }

  // ── 유사 노드 (Hints) — 범용 ──

  function getNodeHints(nodeId) {
    return _request('GET', '/nodes/' + nodeId + '/hints');
  }

  // ── 헬스체크 ──

  function isAvailable() {
    return fetch(BASE_URL + '/health', { method: 'GET' })
      .then(function () { return true; })
      .catch(function () { return false; });
  }

  return {
    // 올
    catchFiber: catchFiber, listFibers: listFibers,
    getFiber: getFiber, updateFiber: updateFiber, deleteFiber: deleteFiber,
    // 실
    createThread: createThread, listThreads: listThreads,
    getThread: getThread, deleteThread: deleteThread,
    // 코
    createStitch: createStitch, listStitches: listStitches,
    getStitch: getStitch, deleteStitch: deleteStitch,
    // 편물
    createFabric: createFabric, listFabrics: listFabrics,
    getFabric: getFabric, updateFabric: updateFabric, deleteFabric: deleteFabric,
    // 교차 연결
    createConnection: createConnection, listConnections: listConnections,
    deleteConnection: deleteConnection,
    // 힌트
    getNodeHints: getNodeHints,
    // 유틸
    isAvailable: isAvailable
  };
})();
