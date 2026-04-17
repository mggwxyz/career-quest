// Vitest mock for the `server-only` package.
// The real package throws at runtime if imported outside a server context;
// in unit tests we just want a no-op so imports resolve cleanly.
export {}
