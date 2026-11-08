import { vi } from 'vitest'

// importing src/services builds its singletons, and the notifications one asks the api for
// its Ably context straight away. there is no api under test, and jsdom's fetch turns down
// urql's AbortSignal anyway, so every test that imported services printed a network error
// and "notifications are disabled". a request that never settles leaves it parked instead,
// the same trick Notifications.spec.ts uses for the instances it builds itself.
vi.stubGlobal('fetch', () => new Promise(() => {}))
