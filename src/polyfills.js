if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis
}

if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} }
} else if (!globalThis.process.env) {
  globalThis.process.env = {}
}
