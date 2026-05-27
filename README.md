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

- `VITE_API_URL` — optional API base URL used by the frontend.
  - Example: `https://api.example.com/api`
  - If not set, the frontend will default to `/api`.

## Deployment notes

- For a separate backend deployment, set `VITE_API_URL` to the backend API URL.
- If the backend is served from the same domain, leave `VITE_API_URL` unset and the frontend will send requests to `/api`.
- If hosted on Vercel, configure `VITE_API_URL` under project environment variables.
- Ensure the backend `FRONTEND_ORIGINS` or `CORS_ORIGINS` environment variable includes the frontend URL.

## Notes

- The frontend client sends credentials with requests (`withCredentials: true`), so the backend must allow cookies and CORS credentials.
- Static deployment works for Vite builds on platforms like Vercel, Netlify, or any static host.
