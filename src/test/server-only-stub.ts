// Test-only stand-in for the "server-only" package. In real Next.js
// builds, "server-only" throws if a Client Component's bundle imports it —
// that check relies on webpack's "react-server" condition, which doesn't
// exist under plain Node/Vitest. Without this alias, every test importing
// a file that begins with `import "server-only"` (a real, intentional
// safety guard — see src/lib/tokens.ts etc.) would fail for a reason
// that has nothing to do with the logic being tested. This stub makes
// the import a no-op in the test environment only; production behavior
// is untouched.
export {};
