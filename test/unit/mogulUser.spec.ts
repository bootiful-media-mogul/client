import { describe, expect, it } from 'vitest'
import { User } from '@/mogul'

// a GitHub login often has no email, and only a name, so no family name. the studio used
// to treat a mogul without an email as signed out, and rendered nothing at all
describe('a mogul without an email or family name', () => {
  it('names them without the missing parts', () => {
    expect(new User(17, 'github|54473', null, 'Josh', null).displayName).toBe('Josh')
    expect(new User(17, 'github|54473', null, 'Josh', 'Long').displayName).toBe('Josh Long')
  })

  it('still shows the email when there is one', () => {
    expect(new User(1, 'google-oauth2|1', 'josh@example.com', 'Josh', 'Long').displayName).toBe(
      'Josh Long (josh@example.com)'
    )
  })
})
