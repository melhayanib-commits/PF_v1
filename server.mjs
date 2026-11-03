import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI from 'openai';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(x => x.trim()).filter(Boolean);
const allowGitHubPages = process.env.ALLOW_GITHUB_PAGES === 'true';
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes(origin) || (allowGitHubPages && /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin))) return cb(null, true);
    return cb(new Error('Origen no permitido'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600
}));
app.use(express.json({ limit: '32kb' }));
if (process.env.SERVE_FRONTEND === 'true') app.use(express.static(__dirname));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Has assolit el límit temporal. Espera un minut i torna-ho a provar.' }
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  }
});

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  configured: Boolean(client),
  model: client ? MODEL : null
}));

app.post('/api/focusia', limiter, upload.single('image'), async (req, res) => {
  try {
    if (!client) return res.status(503).json({ error: 'FocusIA no està configurat: falta OPENAI_API_KEY al backend.' });

    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const language = ['ca', 'es', 'en'].includes(req.body.language) ? req.body.language : 'ca';
    if (!message && !req.file) return res.status(400).json({ error: 'Escriu una pregunta o adjunta una imatge.' });
    if (message.length > 6000) return res.status(413).json({ error: 'El missatge és massa llarg.' });

    const lang = { ca: 'català', es: 'castellà', en: 'anglès' }[language];
    let conversation = '';
    try {
      const parsed = JSON.parse(typeof req.body.context === 'string' ? req.body.context : '{}');
      if (Array.isArray(parsed.conversation)) {
        conversation = parsed.conversation.slice(-10)
          .filter(m => ['user', 'assistant'].includes(m?.role) && typeof m?.content === 'string')
          .map(m => `${m.role === 'user' ? 'Usuari' : 'FocusIA'}: ${m.content.slice(0, 2500)}`)
          .join('\n');
      }
    } catch { /* context opcional */ }

    let userData = '';
    if (typeof req.body.userData === 'string') userData = req.body.userData.slice(0, 12000);

    const instructions = `
Ets FocusIA, un tutor educatiu clar, pacient i rigorós. Respon sempre en ${lang}.
No facis diagnòstics mèdics ni presentis puntuacions cognitives com a mesures d'intel·ligència, salut o capacitat personal.
Utilitza les dades de Pantalla Focus només com a observacions descriptives. No inventis dades que no hi siguin.
Si analitzes una imatge, explica només el que hi puguis observar i indica qualsevol incertesa.
Ajuda a aprendre: explica el raonament, ofereix passos i comprova la comprensió quan sigui útil.
Dades disponibles de Pantalla Focus:
${userData || 'cap'}
Historial recent de conversa:
${conversation || 'cap'}
`.trim();

    const content = [];
    if (message) content.push({ type: 'input_text', text: message });
    if (req.file) {
      const base64 = req.file.buffer.toString('base64');
      content.push({
        type: 'input_image',
        image_url: `data:${req.file.mimetype};base64,${base64}`,
        detail: 'auto'
      });
    }

    const response = await client.responses.create({
      model: MODEL,
      instructions,
      input: [{ role: 'user', content }],
      max_output_tokens: 1800
    });

    const answer = response.output_text?.trim();
    if (!answer) throw new Error('El model no ha retornat text.');
    return res.json({ answer, model: MODEL });
  } catch (err) {
    console.error('FocusIA request failed:', err?.status || err?.name || err?.message || 'error');
    const status = err?.status === 429 ? 429 : err?.status === 400 ? 400 : err?.status === 401 ? 503 : 500;
    const code = err?.code || err?.error?.code || '';
    const message = status === 429
      ? 'El servei d’IA ha arribat al límit de peticions o quota. Revisa l’ús i la facturació de l’API.'
      : status === 400
        ? `La petició no s’ha pogut processar (${code || 'paràmetres'}). Revisa el model configurat i el contingut.`
        : status === 503
          ? 'La clau API no és vàlida o no té accés al servei. Revisa OPENAI_API_KEY al backend.'
          : 'Error intern del backend. Revisa els logs del servidor per identificar-ne la causa.';
    return res.status(status).json({ error: message, code: code || undefined });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(413).json({ error: 'La imatge supera el límit de 5 MB.' });
  if (err) return res.status(400).json({ error: err.message === 'Origen no permitido' ? 'Origen no permès.' : 'Petició no vàlida.' });
  return res.status(500).json({ error: 'Error intern.' });
});

app.listen(PORT, () => console.log(`Pantalla Focus backend escoltant al port ${PORT} · model ${MODEL} · IA ${client ? 'configurada' : 'sense clau'}`));
