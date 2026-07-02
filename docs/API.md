# Agro Olam AI Agronom — Public API

Professional public API for AI agronomy chat. Mobile apps, Telegram bots, CRM systems, and other websites can integrate without custom backend code.

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://agroolam.uz` |
| Local | `http://localhost:3000` |

## Authentication

All requests to `POST /api/agronom/chat` require a Bearer token:

```
Authorization: Bearer YOUR_API_KEY
```

Get your API key from Agro Olam admin. On Vercel, set `AGRO_API_KEY` in Environment Variables.

**Never expose `AGRO_API_KEY` in frontend code or mobile app bundles.** Use a secure backend proxy if needed.

The Agro Olam website chat uses internal route `POST /api/chat` (no API key in browser).

---

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/agronom/health` | No | Health check |
| `POST` | `/api/agronom/chat` | Yes | AI agronom chat |
| `GET` | `/api/docs` | No | Swagger UI |
| `GET` | `/api/docs/openapi.json` | No | OpenAPI spec |

---

## Health Check

### `GET /api/agronom/health`

```bash
curl https://agroolam.uz/api/agronom/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "agro-olam-ai-agronom",
  "version": "1.0.0"
}
```

---

## Chat

### `POST /api/agronom/chat`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

**Request:**

```json
{
  "message": "Pomidor barglari sarg'aymoqda",
  "language": "auto",
  "sessionId": "optional-session-id"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User question (max 2000 chars) |
| `language` | string | No | `auto`, `uz`, `ru`, `en` |
| `sessionId` | string | No | Multi-turn conversation ID |

**Success response (200):**

```json
{
  "success": true,
  "answer": "Pomidor barglarining sarg'ayishi...",
  "language": "uz",
  "service": "agro-olam-ai-agronom"
}
```

**Error responses:**

```json
{ "success": false, "error": "Unauthorized" }
```

```json
{ "success": false, "error": "Too many requests. Please try again later." }
```

```json
{ "success": false, "error": "AI javob berishda muammo bo'ldi" }
```

---

## cURL Examples

**Agro question:**

```bash
curl -X POST https://agroolam.uz/api/agronom/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message":"Pomidor barglari sarg'\''aymoqda","language":"auto"}'
```

**Non-agro question (rejection):**

```bash
curl -X POST https://agroolam.uz/api/agronom/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message":"Messi kim?","language":"uz"}'
```

**With session:**

```bash
curl -X POST https://agroolam.uz/api/agronom/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"message":"Qaysi o'\''git yaxshi?","sessionId":"user-42"}'
```

---

## JavaScript (fetch)

```javascript
const API_URL = "https://agroolam.uz/api/agronom/chat";
const API_KEY = process.env.AGRO_API_KEY; // server-side only!

async function askAgronom(message, sessionId) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      message,
      language: "auto",
      sessionId,
    }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.answer;
}
```

---

## Telegram Bot Integration

```javascript
// webhook handler (Node.js)
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const res = await fetch("https://agroolam.uz/api/agronom/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AGRO_API_KEY}`,
    },
    body: JSON.stringify({
      message: text,
      language: "auto",
      sessionId: `telegram-${chatId}`,
    }),
  });

  const data = await res.json();
  bot.sendMessage(chatId, data.success ? data.answer : data.error);
});
```

---

## Mobile App Integration

1. Store `AGRO_API_KEY` securely (never in app binary — use your backend proxy)
2. Send `POST /api/agronom/chat` with Bearer token
3. Use `sessionId` per user for conversation history
4. Handle `429` rate limit with retry/backoff

**Flutter example (via your backend):**

```dart
final response = await http.post(
  Uri.parse('https://your-backend.com/agronom'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'message': userMessage, 'sessionId': userId}),
);
```

---

## CORS

Allowed origins (configurable via `ALLOWED_ORIGINS`):

- `http://localhost:3000`
- `https://agroolam.uz`
- `https://www.agroolam.uz`

---

## Rate Limiting

- **20 requests per minute** per IP + API key
- Returns `429` when exceeded

---

## Vercel Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key (server only) |
| `OPENAI_MODEL` | No | Default: `gpt-5.4-mini` |
| `AGRO_API_KEY` | Yes | Public API Bearer token |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |

---

## Interactive Docs

Open Swagger UI: `https://agroolam.uz/api/docs`

OpenAPI JSON: `https://agroolam.uz/api/docs/openapi.json`

---

## Security Notes

- API keys never appear in logs
- `.env.local` is gitignored
- Error responses never expose secrets
- Non-agro questions receive a polite rejection in user's language
