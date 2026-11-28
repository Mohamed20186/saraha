# Saraha frontend

React + Vite + Tailwind. Arabic/English, light/dark.

```
cp .env.example .env
npm install
npm run dev
```
Start the backend on http://localhost:3000. In dev, `/api/*` is proxied to it (the backend has no CORS yet).
For production set `VITE_API_URL` to the backend URL and add CORS to the backend.

Real endpoints: /auth/* and /user/*. Anonymous messages are still mocked in `src/api.js` (`messages`) until the backend has /message routes.
