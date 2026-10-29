# Aether: Zero-Cost AI Chat & Interactive Artifacts Studio

**Aether** is a modern, full-stack AI chat web application featuring an interactive **Artifacts Side Panel** (live HTML, SVG, Mermaid, React, and code preview), **Projects with a Knowledge Base (RAG)**, and streaming responses with automatic multi-provider fallback.

> **HARD ARCHITECTURAL CONSTRAINT: ZERO COST ($0.00)**  
> Aether is engineered strictly to run with zero paid subscriptions, zero credit card requirements, and zero recurring cloud costs. Every layer leverages generous free tiers, local in-memory fallbacks, or open-source local models.

---

## Key Features

1. **Warm Editorial Design System**
   - Palette inspired by editorial typography: Light (`#FAF8F5`), Dark (`#1A1915`), and Sepia reading mode.
   - Typography: **Fraunces** (headings), **Inter** (UI), and **JetBrains Mono** (code blocks), served free via Google Fonts.
   - Strict WCAG AA contrast compliance with `#B35639` high-contrast interactive buttons.

2. **Artifacts Side Panel (Live Preview & Sandboxing)**
   - Streaming state machine parser: captures `<artifact>` tags across chunk boundaries and tolerates unclosed tags or out-of-order attributes.
   - Lenient fallback: detects raw code blocks and automatically offers them as interactive artifacts.
   - **Preview Sandbox**: strictly isolated `iframe` with `sandbox="allow-scripts"` ONLY (never combining with `allow-same-origin` to prevent privilege escalation).
   - Console logs & runtime error capture with a one-click **"Fix with AI"** button.
   - Version history tree (`v1`, `v2`, `v3`) with one-click restore and diff viewing.
   - Export options: download as single file, JSON, Markdown, or copy to clipboard.

3. **Projects & Knowledge Base (RAG)**
   - Workspace isolation for domain-specific context.
   - Multi-format ingestion: PDF, DOCX, TXT, MD, CSV, JSON, and source code.
   - Recursive chunking (500–800 tokens with 100-token overlap).
   - **Free Local Embeddings**: `@xenova/transformers` running `all-MiniLM-L6-v2` locally (384 dimensions) at zero API cost.
   - **Hybrid Retrieval**: Combines Reciprocal Rank Fusion (RRF) with vector similarity.
   - **SSRF-Protected URL Ingestion**: Validates DNS resolution to strictly block private IPv4/IPv6 ranges (e.g., 10.0.0.0/8, 127.0.0.0/8, 169.254.169.254).
   - Indirect prompt injection defense: All retrieved knowledge is wrapped in `<untrusted_project_reference_material>` blocks.

4. **Multi-Provider LLM Abstraction with Automatic Fallback**
   - Unified streaming interface supporting:
     - **Google Gemini** (Free tier: 15 RPM, 1M TPM, 1,500 RPD)
     - **Groq** (Free tier: 30 RPM, 14.4k RPD via Llama 3.3/3.1)
     - **OpenRouter** (Free catalog models ending with `:free`)
     - **Ollama** (100% offline on-device local execution)
   - Resilient failover: If a provider returns `429 Too Many Requests` or errors, Aether applies a short jitter backoff and seamlessly switches to the next provider in `FALLBACK_PROVIDERS`.

5. **Safety, Privacy & Free-Tier Quota Protection**
   - Server-enforced daily message caps (`100/day`) and token limits (`150k/day`).
   - UI Usage Meter updating in real time.
   - Admin Telemetry Dashboard (`/admin`) displaying provider request counts, 429 rates, and fallback statistics.
   - Emergency **Global AI Kill-Switch** (`AI_KILL_SWITCH="true"`).
   - User Data Controls: One-click "Delete All Chats" and "Purge Account & Embeddings".
   - Transparent Model Training notices with direct links to external provider policies.

6. **Voice & Accessibility**
   - Browser Web Speech API for voice input (SpeechRecognition) and message read-aloud (SpeechSynthesis).
   - Keyboard navigation: `Ctrl+K` (Search), `Ctrl+Shift+O` (New Chat), `?` (Shortcuts), `Esc` (Stop/Close).
   - Bilingual UI strings: English and Hinglish/Hindi.

---

## Tech Stack (100% Free / Open-Source)

| Component | Technology | Free Tier Notes |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) + TypeScript | React 18, Server Components & Route Handlers |
| **Styling** | Tailwind CSS + Lucide Icons | Warm editorial design tokens |
| **Panels** | `react-resizable-panels` | Horizontal split-screen with draggable separator |
| **Database** | PostgreSQL + pgvector (or Neon / Supabase free) | Drizzle ORM |
| **Embeddings** | `@xenova/transformers` (`all-MiniLM-L6-v2`) | 384 dimensions, runs locally via ONNX Runtime |
| **Rate Limiter** | In-memory LRU cache + optional Upstash Redis free tier | Zero Redis costs required |
| **Syntax & Math** | `react-markdown`, `remark-math`, `rehype-katex` | Zero-dependency safe rendering |

---

## Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Reference Table

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `gemini` | Primary provider: `gemini`, `groq`, `openrouter`, or `ollama`. |
| `FALLBACK_PROVIDERS` | `groq,openrouter,ollama` | Comma-separated fallback chain on 429/error. |
| `GEMINI_API_KEY` | `""` | Free Google AI Studio API key. |
| `GEMINI_MODEL_FAST` | `gemini-1.5-flash` | Free model used for fast tasks & titles. |
| `GEMINI_MODEL_SMART` | `gemini-1.5-flash` | Free model used for complex reasoning & code. |
| `GROQ_API_KEY` | `""` | Free Groq Cloud API key. |
| `GROQ_MODEL_FAST` | `llama-3.1-8b-instant` | Groq fast model. |
| `GROQ_MODEL_SMART` | `llama-3.3-70b-versatile` | Groq high-intelligence model. |
| `OPENROUTER_API_KEY`| `""` | Optional OpenRouter key for free `:free` models. |
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Local Ollama endpoint. |
| `EMBEDDING_PROVIDER`| `local` | `local` (transformers.js) or `ollama`. |
| `EMBEDDING_DIM` | `384` | Must match model dimensions (384 for all-MiniLM-L6-v2). |
| `DATABASE_URL` | `postgresql://...` | Connection string for Postgres with pgvector. |
| `REDIS_URL` | `""` | Optional Upstash Redis URL (leave empty for in-memory LRU). |
| `AI_KILL_SWITCH` | `false` | Emergency global toggle to halt all LLM calls. |
| `DAILY_USER_MESSAGE_LIMIT` | `100` | Max messages allowed per IP/user per day. |

---

## How to Obtain Free API Keys ($0.00 Required)

### 1. Google Gemini (Recommended Primary)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your standard Google account (no credit card required).
3. Click **"Get API key"** and create a key in a new project.
4. Set in `.env.local`:
   ```env
   LLM_PROVIDER="gemini"
   GEMINI_API_KEY="your-gemini-key"
   ```

### 2. Groq (High-Speed Backup)
1. Visit [Groq Console](https://console.groq.com/).
2. Sign up with GitHub or Google.
3. Navigate to **API Keys** and generate a free API key.
4. Set in `.env.local`:
   ```env
   GROQ_API_KEY="your-groq-key"
   ```

### 3. OpenRouter (Zero-Cost Models)
1. Register at [OpenRouter](https://openrouter.ai/).
2. Navigate to **Keys** and create a key.
3. Access free tier models ending in `:free` (e.g., `meta-llama/llama-3.2-3b-instruct:free`).

### 4. Ollama (100% Offline & Private)
1. Download and install [Ollama](https://ollama.com/).
2. Pull free models:
   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```
3. Start the daemon: `ollama serve`. Set in `.env.local`:
   ```env
   LLM_PROVIDER="ollama"
   ```

---

## Local Development Setup

### Option A: Standard Setup (No Docker Required)
1. Ensure Node.js 18.17+ is installed.
2. Clone and install dependencies:
   ```bash
   git clone <repo-url>
   cd aether
   npm install
   ```
3. If running without a database, Aether gracefully uses memory fallback for daily rate limits and chat streaming.
4. Start development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

### Option B: Local PostgreSQL with pgvector via Docker
1. Start a local Postgres container with pgvector:
   ```bash
   docker run -d \
     --name aether-postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=aether \
     -p 5432:5432 \
     pgvector/pgvector:pg16
   ```
2. Set in `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aether"
   ```
3. Push schema:
   ```bash
   npx drizzle-kit push
   ```

---

## Free Tier Hosting & Cold Start Notes

- **Vercel Hobby Tier**: Serverless routes have a 10s default execution timeout on Hobby. Aether's SSE streaming sends immediate periodic keep-alive deltas to ensure streams never stall.
- **Render / Supabase Free Tiers**: Free databases may sleep after periods of inactivity. Aether includes automatic reconnect retry logic and falls back gracefully to in-memory state during initial wake-up.
- **Provider Quota Backoff**: If any free endpoint hits a `429`, Aether introduces a 150–300ms randomized jitter delay before dispatching to the next provider, preventing cascading failures.

---

## Accessibility Audit Summary

- **Contrast**: Button text meets the strict WCAG AA 4.5:1 ratio using custom `#B35639` button tokens.
- **Keyboard Navigation**:
  - `Ctrl + K`: Open conversation search dialog.
  - `Ctrl + Shift + O`: Start new chat.
  - `?`: Open keyboard shortcuts cheat-sheet.
  - `Esc`: Instantly abort streaming generation or dismiss open modals.
  - `Enter`: Send message; `Shift + Enter`: Insert newline.
- **Aria Attributes**: All interactive buttons, icon buttons, and dialogs feature descriptive `aria-label` tags.

---

## Running Automated Tests

```bash
cd aether
npm test
```

Runs 9 automated unit tests verifying:
- Rate limiter windowing, quota enforcement, and emergency kill-switch blocking.
- Artifact stream parser chunk-boundary detection, arbitrary attribute orders, nested code fences, and unclosed stream tolerances.

---

## Production Build Verification

```bash
cd aether
npm run build
```

Compiles all 16 static and dynamic application routes with zero TypeScript and ESLint errors.
