<h1 align="center">MetaStore Frontend</h1>

Next.js 16 application for browsing buckets, approving uploads, and managing share links.  
Built with App Router, React Query, Zustand, and Tailwind CSS (v4).

---

## 🖥️ Features

- Auth flows (login, invite acceptance) backed by cookie-based JWTs
- Dashboard overview with recent files and share links
- Explorer for uploading files directly to MinIO via presigned URLs
- Admin sections for moderation queue & invite lifecycle
- Share link management UI with toggle & password support
- Public share-link landing page with password challenge UX

---

## 🔧 Configuration

Environment variable required at build/run time:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Set it in your shell (`export`) or copy into a `.env.local` file (not committed).

---

## 🚀 Development

```bash
npm install
npm run dev
```

Open <http://localhost:3000> to access the UI.  
The dev server expects the backend API to be available at `NEXT_PUBLIC_API_URL`.

---

## 🧱 Project Structure

```
app/
  (auth)/               # auth-only routes
  (dashboard)/          # authenticated app shell & screens
  share/[token]/        # public share link handler
components/             # UI primitives & layouts
lib/
  api-client.ts         # fetch wrapper with cookie support
  hooks/                # shared client hooks (auth, current user, etc.)
  services/             # API service helpers
  stores/               # Zustand stores
  time.ts               # formatting utilities
types/                  # shared API contracts
```

---

## 🐳 Docker

The top-level `docker-compose.yml` builds a production image.  
For hot reload development with Docker volumes, use:

```bash
docker compose -f ../docker-compose.dev.yml up frontend
```

---

## ✅ Planned Enhancements

- File previewers (images, pdfs, text)
- Share-link password caching for smoother UX
- Offline-first caching for explorer views
- Tight integration with realtime notifications

---

Made with ❤️ using Next.js 16.
