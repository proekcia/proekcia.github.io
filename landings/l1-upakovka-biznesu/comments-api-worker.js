/* ============================================================================
   CLOUDFLARE WORKER — спільний приймач для режиму коментування.

   Цей файл НЕ деплоїться через git/GitHub Pages (GitHub Pages — чиста
   статика, серверний код там не виконується). Його потрібно вручну вставити
   в дашборді Cloudflare (Workers & Pages → Create Worker → Quick Edit →
   вставити цей код замість заготовки → Deploy).

   Потрібні прив'язки (Worker → Settings → Variables):
     • KV Namespace binding: назва змінної в коді — COMMENTS_KV
       (створити namespace: Workers & Pages → KV → Create namespace)
     • Secret: ADMIN_KEY — пароль для перегляду ВСІХ коментарів і зміни
       статусів (значення дав розробник окремо, не з git).

   Після деплою Worker матиме публічну адресу на кшталт
   https://<назва-воркера>.<твій-субдомен>.workers.dev — цю адресу треба
   вписати в comments-widget.js (константа API_BASE).
   ============================================================================ */

const ALLOWED_ORIGINS = [
  'https://proekcia.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000'
];

function corsHeaders(origin) {
  var allow = ALLOWED_ORIGINS.indexOf(origin) !== -1 ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders(origin))
  });
}

function cap(s, n) {
  return (typeof s === 'string' ? s : '').slice(0, n);
}

function keyFor(id) {
  return 'comment:' + id;
}

async function listAll(env, page) {
  var out = [];
  var cursor;
  do {
    var res = await env.COMMENTS_KV.list({ prefix: 'comment:', cursor: cursor });
    for (var i = 0; i < res.keys.length; i++) {
      var val = await env.COMMENTS_KV.get(res.keys[i].name);
      if (val) {
        try {
          var obj = JSON.parse(val);
          if (!page || obj.page === page) out.push(obj);
        } catch (e) { /* побитий запис — пропускаємо, не валимо решту */ }
      }
    }
    cursor = res.cursor;
  } while (cursor && !res.list_complete);
  out.sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });
  return out;
}

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';
    var url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // GET /comments?page=...&deviceId=...      → свої коментарі на сторінці
    // GET /comments?page=...&key=ADMIN_KEY      → УСІ коментарі на сторінці
    if (url.pathname === '/comments' && request.method === 'GET') {
      var page = url.searchParams.get('page') || '';
      var deviceId = url.searchParams.get('deviceId') || '';
      var key = url.searchParams.get('key') || '';
      var all = await listAll(env, page);
      if (env.ADMIN_KEY && key === env.ADMIN_KEY) {
        return json(all, 200, origin);
      }
      var mine = all.filter(function (c) { return c.deviceId === deviceId; });
      return json(mine, 200, origin);
    }

    // POST /comments  — створити новий коментар (публічно, від будь-якого
    // відвідувача; довжини обрізаються на сервері про всяк випадок).
    if (url.pathname === '/comments' && request.method === 'POST') {
      var body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'bad json' }, 400, origin);
      }
      if (!body || !body.id || !body.text || !body.author || !body.deviceId) {
        return json({ error: 'missing fields' }, 400, origin);
      }
      var a = body.anchor || {};
      var comment = {
        id: cap(body.id, 100),
        page: cap(body.page, 300),
        build: cap(body.build, 100),
        createdAt: body.createdAt || new Date().toISOString(),
        author: cap(body.author, 80),
        deviceId: cap(body.deviceId, 100),
        text: cap(body.text, 2000),
        anchor: {
          id: cap(a.id, 200) || null,
          quote: cap(a.quote, 300),
          context: cap(a.context, 500),
          path: cap(a.path, 500),
          offsetXPct: Number(a.offsetXPct) || 50,
          offsetYPct: Number(a.offsetYPct) || 50
        },
        status: 'new',
        reply: ''
      };
      await env.COMMENTS_KV.put(keyFor(comment.id), JSON.stringify(comment));
      return json({ ok: true, id: comment.id }, 200, origin);
    }

    var idMatch = url.pathname.match(/^\/comments\/([^/]+)$/);

    // PATCH /comments/:id?key=ADMIN_KEY  — оновити статус/відповідь (тільки
    // з адмін-ключем — це і є «прибрати відповідь» без ручного вставляння).
    if (idMatch && request.method === 'PATCH') {
      var key2 = url.searchParams.get('key') || '';
      if (!env.ADMIN_KEY || key2 !== env.ADMIN_KEY) {
        return json({ error: 'forbidden' }, 403, origin);
      }
      var existingRaw = await env.COMMENTS_KV.get(keyFor(idMatch[1]));
      if (!existingRaw) return json({ error: 'not found' }, 404, origin);
      var existing = JSON.parse(existingRaw);
      var patchBody = {};
      try { patchBody = await request.json(); } catch (e) { /* порожнє тіло — ок */ }
      if (patchBody.status) existing.status = cap(patchBody.status, 20);
      if (typeof patchBody.reply === 'string') existing.reply = cap(patchBody.reply, 2000);
      await env.COMMENTS_KV.put(keyFor(idMatch[1]), JSON.stringify(existing));
      return json({ ok: true }, 200, origin);
    }

    // DELETE /comments/:id?deviceId=...   — власник видаляє свій коментар
    // DELETE /comments/:id?key=ADMIN_KEY  — адмін видаляє будь-який
    if (idMatch && request.method === 'DELETE') {
      var key3 = url.searchParams.get('key') || '';
      var deviceId2 = url.searchParams.get('deviceId') || '';
      var raw = await env.COMMENTS_KV.get(keyFor(idMatch[1]));
      if (!raw) return json({ ok: true }, 200, origin); // вже видалено — ок
      var obj2 = JSON.parse(raw);
      var isAdmin = env.ADMIN_KEY && key3 === env.ADMIN_KEY;
      var isOwner = obj2.deviceId === deviceId2;
      if (!isAdmin && !isOwner) return json({ error: 'forbidden' }, 403, origin);
      await env.COMMENTS_KV.delete(keyFor(idMatch[1]));
      return json({ ok: true }, 200, origin);
    }

    return json({ error: 'not found' }, 404, origin);
  }
};
