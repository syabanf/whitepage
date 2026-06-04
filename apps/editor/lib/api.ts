// Server-only base URL for talking to the Go API.
// Override via API_BASE_URL env var.
export const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8080";

// Public base URL of this editor app — used to build magic-link redirect URLs.
export const APP_BASE = process.env.APP_BASE_URL ?? "http://localhost:3010";
