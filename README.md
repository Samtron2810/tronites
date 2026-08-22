# mini-social-media Frontend

This frontend is a Vite-powered React application for the mini-social-media project. It provides the UI for authentication, post creation, comments, notifications, chat, and profile browsing.

## Tech stack

- React 19
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- Socket.IO client
- Framer Motion
- React Hot Toast

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

## Environment variables

- `VITE_API_URL` — API base URL used by the frontend.
  - Example: `https://api.example.com/api`
  - **Required in production.** If not set, the frontend falls back to `http://localhost:5000/api` (see `src/services/api.js`), which will not work once deployed.

## Deployment notes

- Always set `VITE_API_URL` to the deployed backend's API URL — there is no same-domain `/api` default.
- If hosted on Vercel, configure `VITE_API_URL` under project environment variables.
- Ensure the backend `FRONTEND_ORIGINS` or `CORS_ORIGINS` environment variable includes the frontend URL.

## Notes

- The frontend client sends credentials with requests (`withCredentials: true`), so the backend must allow cookies and CORS credentials.
- Static deployment works for Vite builds on platforms like Vercel, Netlify, or any static host.
