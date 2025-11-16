# Quick Setup Guide with Bun

## Prerequisites
- Bun installed: `curl -fsSL https://bun.sh/install | bash`

## Setup Steps

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your API keys:
   - `GROQ_API_KEY` - Get from https://console.groq.com
   - `SUPERMEMORY_API_KEY` - Get from Supermemory (if using)
   - `CLOUDFLARE_WEBHOOK_SECRET` - Your webhook secret (optional)

3. **Start development server:**
   ```bash
   bun run dev
   ```

4. **Open in browser:**
   - Navigate to http://localhost:3000

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Troubleshooting

### If dependencies fail to install:
```bash
rm -rf node_modules bun.lockb
bun install
```

### If port 3000 is already in use:
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9
# Or change the port in .env
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### If you see module errors:
```bash
# Clear Next.js cache
rm -rf .next
bun install
bun run dev
```

