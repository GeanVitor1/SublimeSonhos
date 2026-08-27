/* =========================================================================
   SUBLIME SONHOS — AUTENTICAÇÃO DO PAINEL ADMIN (Vercel Serverless)
   =========================================================================
   A senha NÃO fica no front-end: ela vem da variável de ambiente
   ADMIN_PASSWORD (secreta, configurada no painel da Vercel). Esta função
   compara a senha com timing-safe e limita tentativas por IP, impedindo
   brute-force offline e reduzindo o online.

   Variáveis de ambiente (opcionais):
   - ADMIN_PASSWORD       (obrigatória) senha de acesso ao painel
   - ADMIN_SESSION_SECRET (opcional)    segredo p/ assinar o token de sessão
   ========================================================================= */
const crypto = require('crypto');

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;   // 15 min
const LOCK_MS = 15 * 60 * 1000;     // trava por 15 min após exceder

// Melhor esforço: estado em memória por instância (reseta em cold start).
const failures = new Map();

function getIp(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) ? req.socket.remoteAddress : 'unknown';
}

function isLocked(ip) {
  const rec = failures.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) { failures.delete(ip); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function registerFailure(ip) {
  const now = Date.now();
  const rec = failures.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) failures.set(ip, { count: 1, first: now });
  else rec.count += 1;
}

function clearFailures(ip) { failures.delete(ip); }

function passwordMatches(input, expected) {
  const ha = crypto.createHash('sha256').update(String(input)).digest();
  const hb = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || (process.env.ADMIN_PASSWORD || '') + ':sublime-sonhos-session';
}

function sign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function readBody(req) {
  if (req.body !== undefined && req.body !== null) return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
    });
  });
}

module.exports = async function login(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, erro: 'Método não permitido.' });
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(503).json({ ok: false, erro: 'Autenticação não configurada. Defina a variável de ambiente ADMIN_PASSWORD na Vercel.' });
    return;
  }

  const ip = getIp(req);
  if (isLocked(ip)) {
    res.status(429).json({ ok: false, erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    return;
  }

  const body = await readBody(req);
  const tentativa = String((body && body.password) || '');

  if (!tentativa) {
    res.status(400).json({ ok: false, erro: 'Informe a senha.' });
    return;
  }

  if (!passwordMatches(tentativa, password)) {
    registerFailure(ip);
    res.status(401).json({ ok: false, erro: 'Senha incorreta.' });
    return;
  }

  clearFailures(ip);
  const exp = Date.now() + 24 * 60 * 60 * 1000; // token válido por 24h
  const token = sign('admin:' + exp, getSessionSecret());
  res.status(200).json({ ok: true, token, exp });
};
