import { Client } from '@urql/core'

export default class Mogul {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async user(): Promise<User> {
    const query = `
            query { 
             me { id,   name, email, givenName, familyName, timeZone  } 
            } 
    `
    const result = await this.client.query(query, {})
    const me = result.data['me']
    return new User(me.id as number, me.name, me.email, me.givenName, me.familyName, me.timeZone)
  }

  async setTimeZone(timeZone: string): Promise<boolean> {
    const mutation = `
         mutation ( $timeZone: String ) {
            setMogulTimeZone( timeZone: $timeZone )
         }
        `
    const result = await this.client.mutation(mutation, { timeZone: timeZone })
    return (await result.data['setMogulTimeZone']) as boolean
  }

  /**
   * a mogul_status is a calendar day, and which day a thing falls on depends on where
   * you are. the server runs in UTC, so without this everything published after 5pm
   * Pacific was filed under tomorrow.
   *
   * only offered when the server has none stored. picking up the browser's zone on
   * every load would silently re-file your days the moment you opened the app from
   * another timezone, which is a decision to make deliberately rather than by travelling.
   */
  async adoptBrowserTimeZoneIfUnset(user: User): Promise<void> {
    if (user.timeZone) {
      return
    }
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (browserTimeZone) {
      await this.setTimeZone(browserTimeZone)
    }
  }

  async todayStatus(): Promise<MogulStatus> {
    const query = `
            query { 
             mogulStatusToday { id, mogulId, date } 
            } 
    `
    const result = await this.client.query(query, {})
    const status = result.data['mogulStatusToday']
    return new MogulStatus(status.id as number, status.mogulId as number, status.date)
  }

  /**
   * the status for a day, created if there isn't one yet, so a day can be published about
   * before anything has happened on it. date is yyyy-mm-dd.
   */
  async statusForDate(date: string): Promise<MogulStatus> {
    const query = `
            query ( $date: String ) { 
             mogulStatusForDate( date: $date ) { id, mogulId, date } 
            } 
    `
    const result = await this.client.query(query, { date: date })
    const status = result.data['mogulStatusForDate']
    return new MogulStatus(status.id as number, status.mogulId as number, status.date)
  }

  async me(): Promise<string> {
    const query = `
            query { 
             me { name } 
            } 
    `
    const result = await this.client.query(query, {})
    return this.indexIntoQueryField(result, 'me')['name'] as string
  }

  private indexIntoQueryField(result: any, resultKey: string): any {
    return result.data[resultKey]
  }
}

export class User {
  name: string
  email: string
  givenName: string
  familyName: string
  id: number
  // IANA zone id, or null until the mogul has told us where they are
  timeZone: string | null

  // materialized view
  readonly displayName: string

  constructor(
    id: number,
    name: string,
    email: string,
    givenName: string,
    familyName: string,
    timeZone: string | null = null
  ) {
    this.name = name
    this.id = id
    this.email = email
    this.givenName = givenName
    this.familyName = familyName
    this.timeZone = timeZone
    this.displayName = this.givenName + ' ' + this.familyName + ' (' + this.email + ')'
  }
}

/**
 * a single day in the life of a mogul. this -- and not the mogul -- is what
 * publications attach to, so that they stay bounded to a day instead of piling up
 * against an identity that never ends.
 */
export class MogulStatus {
  readonly id: number
  readonly mogulId: number
  readonly date: string

  constructor(id: number, mogulId: number, date: string) {
    this.id = id
    this.mogulId = mogulId
    this.date = date
  }
}
