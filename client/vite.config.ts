import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API = "http://localhost:4000";

// The client talks to the Express API. In dev we proxy the API routes to the
// backend so the browser makes same-origin requests (no CORS surprises).
//
// `/students` is also a client-side route (`/students/:id`). To avoid the proxy
// swallowing a direct page load / refresh of that route, we only proxy actual
// data requests: `fetch` sends `Accept: */*`, while a browser navigation sends
// `Accept: text/html` — those we let fall through to the SPA (index.html).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/students": {
        target: API,
        bypass: (req) =>
          req.headers.accept?.includes("text/html") ? "/index.html" : undefined,
      },
      "/tasks": API,
      "/reset": API,
      "/events": API,
    },
  },
});
