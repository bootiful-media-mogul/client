import Mogul, { MogulStatus } from '@/mogul'
import mitt from 'mitt'
import { Client, type CombinedError, errorExchange, fetchExchange } from '@urql/core'
import { graphqlJson } from '@/graphql'
import router from '@/index'
import { marked } from 'marked'
import * as Ably from 'ably'
import { ErrorInfo, type TokenDetails, type TokenParams, type TokenRequest } from 'ably'
import { dateTimeToString } from '@/dates'

/**
 * only an expired or rejected session should send you back to the login flow. every
 * other GraphQL error -- a failed validation, a resolver blowing up -- is the caller's
 * to deal with.
 */
function isAuthenticationFailure(error: CombinedError): boolean {
  const status = (error as unknown as { response?: { status?: number } }).response?.status
  if (status === 401 || status === 403) {
    return true
  }
  return (error.graphQLErrors ?? []).some((graphQLError) => {
    const classification = `${graphQLError.extensions?.['classification'] ?? ''}`.toUpperCase()
    return classification === 'UNAUTHORIZED' || classification === 'FORBIDDEN'
  })
}

export const graphqlClient = new Client({
  url: '/api/graphql',
  // errorExchange first, fetchExchange last. fetchExchange is a *terminating* exchange:
  // anything listed after it never runs, so with the previous order this handler was
  // unreachable and every error was swallowed silently.
  exchanges: [
    errorExchange({
      onError: async (error) => {
        if (!error) {
          return
        }
        console.error('graphql error', error)
        // now that this actually runs, it has to be selective. redirecting on *any*
        // error would bounce you to the home page mid-edit whenever a mutation failed.
        if (isAuthenticationFailure(error)) {
          events.emit('unauthorized', error)
          await router.replace('/')
        }
      }
    }),
    fetchExchange
  ]
})

export async function resetNotesForNotable() {
  events.emit('reset-notes-for-notable-event')
}
export async function loadNotesForNotable(type: string, notableId: number, entityName: string) {
  events.emit('notes-for-notable-event', {
    type: type,
    notableId: notableId,
    entityName: entityName
  })
}

export function previewManagedFile(managedFileId: number) {
  events.emit('preview-managed-file-event', managedFileId)
}

export enum ResultType {
  Segment = 'segment',
  Note = 'note',
  Mogul = 'mogul',
  Episode = 'episode',
  Post = 'post'
}

export class NavigationContext {
  readonly name: string
  readonly params: Map<string, number>

  constructor(name: string, params: Map<string, number>) {
    this.name = name
    this.params = params
  }
}

export class Results {
  private readonly handlers = new Map<
    string,
    {
      navigation: (context: Map<string, number>) => NavigationContext
      deletion: (context: Map<string, number>) => void
    }
  >()

  readonly graphqlClient: Client

  constructor(gc: Client) {
    this.graphqlClient = gc

    this.entry(
      ResultType.Post,
      function (ctx: Map<string, number>): NavigationContext {
        return new NavigationContext('blogs/posts/post', ctx)
      },
      async function (ctx: Map<string, number>) {
        const postId = ctx.get('postId') as number
        if (postId) {
          await blogs.deletePost(postId)
        }
      }
    )

    this.entry(
      ResultType.Episode,
      function (ctx: Map<string, number>): NavigationContext {
        return new NavigationContext('podcasts/episodes/episode', ctx)
      },
      function (ctx: Map<string, number>) {}
    )

    this.entry(
      ResultType.Mogul,
      function (ctx: Map<string, number>) {
        return new NavigationContext('home', new Map<string, number>())
      },
      function (ctx: Map<string, number>) {}
    )

    this.entry(
      ResultType.Segment,
      function (context: Map<string, number>): NavigationContext {
        const map = new Map(
          Object.entries({
            podcastId: context.get('podcastId'),
            episodeId: context.get('episodeId')
          })
        ) as Map<string, number>

        return new NavigationContext('podcasts/episodes/episode', map)
      },
      async function (context: Map<string, number>) {
        const podcastEpisodeId = context.get('episodeId') as number
        if (podcastEpisodeId) {
          await podcasts.deletePodcastEpisode(podcastEpisodeId)
        }
      }
    )
  }

  deletion(type: ResultType | string): ((context: Map<string, number>) => void) | undefined {
    return this.handlers.get(type)?.deletion
  }
  navigation(type: ResultType | string): (context: Map<string, number>) => NavigationContext {
    const handler = this.handlers.get(type)
    return handler?.navigation!!
  }

  private entry(
    type: string,
    navigation: (context: Map<string, number>) => NavigationContext,
    deletion: (context: Map<string, number>) => void
  ): void {
    this.handlers.set(type, { navigation, deletion })
  }
}

export interface TranscriptEditEvent {
  readonly key: string
  readonly id: number
  readonly transcript: string
}

export interface TranscriptEditedEvent {
  readonly key: string
  readonly id: number
  readonly transcript: string
}

export class JobParam {
  readonly name: string
  readonly value: string

  constructor(name: string, value: string) {
    this.name = name
    this.value = value
  }
}

export class Job {
  readonly name: string
  readonly requiredContextAttributes: string[]

  constructor(name: string, requiredContextAttributes: string[]) {
    this.name = name
    this.requiredContextAttributes = requiredContextAttributes
  }
}

export class Jobs {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async launch(jobName: string, context: Map<string, object>): Promise<boolean> {
    context = context ?? new Map()
    const mutation = ` 
      mutation JobLaunch($jobName: String, $contextAsJson: String ){ 
        launchJob(jobName : $jobName , contextAsJson: $contextAsJson)
      }
    `

    const contextAsJson = JSON.stringify(Object.fromEntries(context))

    const result = await this.client.mutation(mutation, {
      jobName: jobName,
      contextAsJson: contextAsJson
    })
    return await result.data['JobLaunch']
  }

  // jobs that need a file to work on get one explicitly now. it used to arrive as a
  // side effect of reading the job list, back when the server kept a draft execution
  // per job; JobRunr has no such thing, so the client asks outright.
  async createManagedFile(jobName: string): Promise<number> {
    const mutation = `
      mutation CreateJobManagedFile($jobName: String) {
        createJobManagedFile(jobName: $jobName) { id }
      }
    `
    const result = await this.client.mutation(mutation, { jobName: jobName })
    return (await result.data['createJobManagedFile'])['id'] as number
  }

  async jobs(): Promise<Array<Job>> {
    const q = `
      query { 
        jobs { 
          name, 
          requiredContextAttributes
        } 
      }
    `
    const result = await this.client.query(q, {})
    return (await result.data['jobs']) as Array<Job>
  }
}

export class Podcast {
  readonly title: string
  readonly id: number
  readonly created: number

  constructor(id: number, title: string, created: number) {
    this.id = id
    this.title = title
    this.created = created
  }
}

export class Podcasts {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async createPodcastEpisodeSegment(podcastEpisodeId: number) {
    const mutation = ` 
      mutation ($podcastEpisodeId: Int ){ 
        createPodcastEpisodeSegment(podcastEpisodeId : $podcastEpisodeId  )
      }
    `
    await this.client.mutation(mutation, {
      podcastEpisodeId: podcastEpisodeId
    })
  }

  async updatePodcastEpisode(
    podcastEpisodeId: number,
    title: string,
    description: string,
    // null leaves the existing creation date alone, server-side
    created: Date | null = null
  ): Promise<PodcastEpisode> {
    const mutation = `
         mutation ($podcastEpisodeId: Int, $title: String, $description: String, $created: DateTime ){ 
          updatePodcastEpisode( podcastEpisodeId: $podcastEpisodeId, title: $title, description: $description, created: $created) 
         }
        `
    const result = await this.client.mutation(mutation, {
      podcastEpisodeId: podcastEpisodeId,
      title: title,
      description: description,
      created: created ? created.toISOString() : null
    })

    const res = await result.data['updatePodcastEpisode']
    return await this.podcastEpisodeById(podcastEpisodeId)
  }

  async podcastEpisodeById(podcastEpisodeId: number): Promise<PodcastEpisode> {
    const q = `
        query($podcastEpisodeId: Int ){
            podcastEpisodeById (podcastEpisodeId: $podcastEpisodeId) {
              created, 
              id, 
              title, 
              podcastId, 
              description, 
              complete,
              duration,
              producedAudio { id  },
              graphic { id  },
              segments {
                id, name, audio { id } , order , crossFadeDuration , duration ,
                transcript {
                 id, transcript
                }
              }
              descriptionComposition { 
                id,
                field ,
                attachments {
                  id,
                  caption,
                  managedFile { id }
                }
              }
              
              titleComposition { 
                id,
                field ,
                attachments {
                  id,
                  caption,
                  managedFile {  id }
                }                
              }
          }
        }
        `
    const res = await this.client.query(q, { podcastEpisodeId: podcastEpisodeId })

    return (await res.data['podcastEpisodeById']) as PodcastEpisode
  }

  async update(podcastId: number, title: string): Promise<Podcast> {
    const mutation = `
       mutation( $podcastId: Int , $title: String){ 
        updatePodcast(podcastId: $podcastId , title: $title) 
       }
    `
    const result = await this.client.mutation(mutation, {
      podcastId: podcastId,
      title: title
    })
    const res = (await result.data['updatePodcast']) as boolean
    return await this.podcastById(podcastId)
  }

  async create(title: string): Promise<Podcast> {
    const mutation = `
         mutation($title: String){ 
          createPodcast(title: $title) { 
           id, title
          }
         }
    `
    const result = await this.client.mutation(mutation, {
      title: title
    })
    return (await result.data['createPodcast']) as Podcast
  }

  async podcastEpisodesPreviews(podcastId: number): Promise<Array<PodcastEpisode>> {
    const q = `
        query GetPodcastEpisodesByPodcast( $podcastId:  Int ){
            podcastEpisodesByPodcast ( podcastId : $podcastId) {
                created, 
                id , 
                title, 
                description, 
                complete 
            }
        } 
    `
    const res = await this.client.query(q, { podcastId: podcastId })
    return (await res.data['podcastEpisodesByPodcast']) as Array<PodcastEpisode>
  }

  async podcastEpisodes(podcastId: number): Promise<Array<PodcastEpisode>> {
    const q = `
        query GetPodcastEpisodesByPodcast( $podcastId:  Int ){
            podcastEpisodesByPodcast ( podcastId : $podcastId) {
                created,
                id ,
                title,
                description,
                complete,
                duration,
                graphic { id  } ,

                segments {
                  id,
                  name,
                  audio { id } ,
                  order ,
                  crossFadeDuration,
                  duration,
                  transcript
                }
            }
        }
        `
    const res = await this.client.query(q, { podcastId: podcastId })
    return (await res.data['podcastEpisodesByPodcast']) as Array<PodcastEpisode>
  }

  // transcript
  async transcribePodcastEpisodeSegment(podcastEpisodeSegmentId: number): Promise<boolean> {
    const mutation = ` 
          mutation ($podcastEpisodeSegmentId :  Int  ){ 
            transcribePodcastEpisodeSegment ( podcastEpisodeSegmentId: $podcastEpisodeSegmentId   )  
          }
    `
    const refresh = await this.client.mutation(mutation, {
      podcastEpisodeSegmentId: podcastEpisodeSegmentId
    })
    return (await refresh.data['transcribePodcastEpisodeSegment']) as boolean
  }

  async deletePodcastEpisodeSegment(podcastEpisodeSegmentId: number) {
    const mutation = `
         mutation ($podcastEpisodeSegmentId:  Int  ){ 
          deletePodcastEpisodeSegment(podcastEpisodeSegmentId: $podcastEpisodeSegmentId)  
         }
        `
    const result = await this.client.mutation(mutation, {
      podcastEpisodeSegmentId: podcastEpisodeSegmentId
    })
    return (await result.data['deletePodcastEpisodeSegment']) as Number
  }

  async deletePodcastEpisode(podcastEpisodeId: number) {
    const mutation = `
         mutation ($podcastEpisodeId:  Int  ){ 
          deletePodcastEpisode( podcastEpisodeId: $podcastEpisodeId)  
         }
        `
    const result = await this.client.mutation(mutation, {
      podcastEpisodeId: podcastEpisodeId
    })
    return (await result.data['deletePodcastEpisode']) as Number
  }

  async deletePodcast(podcastId: number) {
    const mutation = `
       mutation($podcastId:  Int  ){ 
        deletePodcast(podcastId: $podcastId)  
       }
    `
    const result = await this.client.mutation(mutation, {
      podcastId: podcastId
    })
    return (await result.data['deletePodcast']) as Number
  }

  async podcasts() {
    const q = `
        query {
          podcasts  { 
           id, title ,created 
          }
         }
        `
    const result = await this.client.query(q, {})
    return (await result.data['podcasts']) as Array<Podcast>
  }

  async createPodcastEpisodeDraft(
    podcastId: number,
    title: string,
    description: string
  ): Promise<PodcastEpisode> {
    const mutation = `
         mutation   ($podcastId:  Int , $title: String, $description: String ){ 
          createPodcastEpisodeDraft( podcastId: $podcastId, title: $title, description: $description) { 
               id  
          }
         }
        `
    const result = await this.client.mutation(mutation, {
      podcastId: podcastId,
      title: title,
      description: description
    })

    const idBag = (await result.data['createPodcastEpisodeDraft'])['id']
    return await this.podcastEpisodeById(idBag)
  }

  async podcastById(podcastId: number): Promise<Podcast> {
    const q = `
      query( $podcastId: Int ){
          podcastById(podcastId: $podcastId) {
           id,
           title 
          }
      }
        `
    const result = await this.client.query(q, { podcastId: podcastId })
    return (await result.data['podcastById']) as Podcast
  }

  async movePodcastEpisodeSegmentDown(episodeId: number, episodeSegmentId: number) {
    const mutation = `
         mutation (
           $podcastEpisodeId: Int, 
           $podcastEpisodeSegmentId: Int    
         ){ 
            movePodcastEpisodeSegmentDown(
                podcastEpisodeId: $podcastEpisodeId, 
                podcastEpisodeSegmentId : $podcastEpisodeSegmentId  
            ) 
         }
        `
    // todo for some reason these are showing up as `strings` and causing issues when i send them to the server-side.
    //
    const result = await this.client.mutation(mutation, {
      podcastEpisodeId: episodeId,
      podcastEpisodeSegmentId: episodeSegmentId
    })
  }

  async movePodcastEpisodeSegmentUp(episodeId: number, episodeSegmentId: number) {
    const mutation = `
         mutation (
              $podcastEpisodeId: Int, 
              $podcastEpisodeSegmentId:Int
          ){ 
          movePodcastEpisodeSegmentUp(
             podcastEpisodeId: $podcastEpisodeId,
             podcastEpisodeSegmentId: $podcastEpisodeSegmentId 
           )  
         }
        `
    const result = await this.client.mutation(mutation, {
      podcastEpisodeId: episodeId,
      podcastEpisodeSegmentId: episodeSegmentId
    })
  }
}

export class Setting {
  name: string
  valid: boolean
  value: string
  required: boolean

  constructor(name: string, valid: boolean, value: string, required: boolean) {
    this.name = name
    this.valid = valid
    this.value = value
    this.required = required
  }
}

export class SettingsPage {
  valid: boolean
  category: string
  settings: Array<Setting>

  constructor(valid: boolean, category: string, settings: Array<Setting>) {
    this.valid = valid
    this.category = category
    this.settings = settings
  }
}

export class ManagedFile {
  id: number
  bucket: string
  folder: string
  filename: string
  size: number
  written: boolean
  visible: boolean
  contentType: string
  visibleUrl: string
  downloadableUrl: string
  url: string

  constructor(
    id: number,
    bucket: string,
    folder: string,
    filename: string,
    size: number,
    written: boolean,
    contentType: string,
    visible: boolean,
    publicUrl: string,
    url: string,
    downloadableVisibleUrl: string
  ) {
    this.id = id
    this.downloadableUrl = downloadableVisibleUrl
    this.bucket = bucket
    this.folder = folder
    this.filename = filename
    this.written = written
    this.size = size
    this.contentType = contentType
    this.visible = visible
    this.visibleUrl = publicUrl
    this.url = url
  }
}

export class Transcript {
  id: number
  transcript: string

  constructor(id: number, transcript: string) {
    this.id = id
    this.transcript = transcript
  }
}

export class PodcastEpisodeSegment {
  id: number
  name: string
  audio: ManagedFile
  order: number
  transcript: Transcript
  duration: number

  constructor(
    id: number,
    name: string,
    audio: ManagedFile,
    order: number,
    transcript: Transcript,
    duration: number
  ) {
    this.id = id
    this.name = name
    this.audio = audio
    this.order = order
    this.transcript = transcript
    this.duration = duration
  }
}

export class Publication {
  id: number
  plugin: string
  created: number
  published: number
  url: string
  publishing: boolean = false
  state: string
  outcomes: Array<PublicationOutcome>

  constructor(
    id: number,
    plugin: string,
    created: number,
    published: number,
    url: string,
    state: string,
    outcomes: Array<PublicationOutcome>
  ) {
    this.id = id
    this.url = url
    this.plugin = plugin
    this.created = created
    this.published = published
    this.state = state
    this.outcomes = outcomes
  }
}

export class PodcastEpisode {
  availablePlugins: Array<string>
  id: number
  title: string
  description: string
  podcastId: number
  graphic: ManagedFile
  producedAudio: ManagedFile
  complete: boolean = false
  created: string = ''
  duration: number = 0
  segments: Array<PodcastEpisodeSegment>
  publications: Array<Publication> //todo remove this i dont think its necessary any more.
  descriptionComposition?: Composition
  titleComposition?: Composition

  constructor(
    id: number,
    title: string,
    description: string,
    graphic: ManagedFile,
    complete: boolean,
    created: string,
    availablePlugins: Array<string>,
    segments: Array<PodcastEpisodeSegment>,
    publications: Array<Publication>,
    producedAudio: ManagedFile,
    podcastId: number,
    duration: number = 0,
    descriptionComposition?: Composition,
    titleComposition?: Composition
  ) {
    this.duration = duration
    this.podcastId = podcastId
    this.descriptionComposition = descriptionComposition
    this.titleComposition = titleComposition
    this.availablePlugins = availablePlugins
    this.id = id
    this.title = title
    this.description = description
    this.graphic = graphic
    this.complete = complete
    this.created = created
    this.producedAudio = producedAudio
    this.segments = segments
    this.publications = publications
  }
}

export class AblyTokenRequest {
  keyName: string
  nonce: string
  mac: string
  ttl: number
  capability: string
  timestamp: number

  constructor(
    keyName: string,
    nonce: string,
    mac: string,
    ttl: number,
    capability: string,
    timestamp: number
  ) {
    this.keyName = keyName
    this.nonce = nonce
    this.mac = mac
    this.ttl = ttl
    this.capability = capability
    this.timestamp = timestamp
  }
}

export class NotificationContext {
  ablyChannel: string
  ablyTokenRequest: AblyTokenRequest

  constructor(ablyChannel: string, ablyTokenRequest: AblyTokenRequest) {
    this.ablyChannel = ablyChannel
    this.ablyTokenRequest = ablyTokenRequest
  }
}

export class Notification {
  readonly when: Date
  readonly key: string
  readonly category: string
  readonly context: string
  readonly mogulId: number
  readonly modal: boolean
  readonly visible: boolean

  constructor(
    mogulId: number,
    key: string,
    context: string,
    category: string,
    when: Date,
    modal: boolean,
    visible: boolean
  ) {
    this.context = context
    this.mogulId = mogulId
    this.modal = modal
    this.category = category
    this.when = when
    this.visible = visible
    this.key = key
  }
}

/**
 * every listener in practice does IO, so returning a promise is normal. dispatch
 * doesn't wait on them, it just makes sure a rejection gets reported.
 */
export type NotificationListener = (notification: Notification) => void | Promise<void>

export class Notifications {
  private readonly client: Client

  private callbacks: Array<NotificationListener> = []

  private callbacksByCategory: Map<string, Array<NotificationListener>> = new Map()

  constructor(client: Client) {
    this.client = client
    this.startGraphql() // don't care that  ignored
  }

  async startGraphql() {
    const q = `
        query {
          notificationContext  { 
            ablyChannel
            ablyTokenRequest { 
              keyName
              nonce
              mac
              ttl
              capability
              timestamp
            }
          }
         }
        `
    // nobody awaits this, so report failures here or they become an unhandled
    // rejection and every notification goes quiet with nothing to explain why.
    try {
      const result = await this.client.query(q, {})
      const nc = (await result.data?.['notificationContext']) as NotificationContext
      if (!nc) {
        console.error('no notification context was returned; notifications are disabled')
        return
      }
      const ably = new Ably.Realtime({
        async authCallback(
          data: TokenParams,
          callback: (
            error: ErrorInfo | string | null,
            tokenRequestOrDetails: TokenDetails | TokenRequest | string | null
          ) => void
        ) {
          callback(null, nc.ablyTokenRequest as Ably.TokenRequest)
        }
      })
      const channel = ably.channels.get(nc.ablyChannel)
      await channel.subscribe(async (message) => await this.dispatch(message))
    } catch (e) {
      console.error('could not subscribe to notifications', e)
    }
  }

  async dispatch(message: Ably.InboundMessage) {
    let notification: Notification
    try {
      notification = JSON.parse(message.data) as Notification
    } catch (e) {
      console.error('could not parse the notification ' + message.data, e)
      return
    }

    // snapshot the listeners before invoking any of them: a listener is allowed to
    // unregister itself (or a sibling) while we're dispatching, and mutating the
    // live array mid-iteration would skip whoever slid into the vacated slot.
    const listeners = [
      ...this.callbacks,
      ...(this.callbacksByCategory.get(notification.category) ?? [])
    ]

    for (const listener of listeners) {
      // one broken listener shouldn't cost all the others their notification
      try {
        Promise.resolve(listener(notification)).catch((e) => this.listenerFailed(notification, e))
      } catch (e) {
        this.listenerFailed(notification, e)
      }
    }
  }

  private listenerFailed(notification: Notification, e: unknown) {
    console.error('a listener for the ' + notification.category + ' notification failed', e)
  }

  async notify(visible: boolean, modal: boolean) {
    const mutation = `
      mutation Notify($visible:Boolean, $modal:Boolean){ 
        notify(visible: $visible, modal: $modal)
      }
    `
    const result = await this.client.mutation(mutation, {
      visible: visible,
      modal: modal
    })
    return (await result.data['notify']) as boolean
  }

  /**
   * returns a function that unregisters the callback again. components that get
   * mounted more than once per session (anything inside an editor you can navigate
   * back into) should call it on unmount, or every remount leaves another live
   * copy of the callback behind and one notification ends up invoking all of them.
   */
  listenForCategory(category: string, callback: NotificationListener): () => void {
    if (!this.callbacksByCategory.has(category)) {
      this.callbacksByCategory.set(category, [])
    }
    const callbacks = this.callbacksByCategory.get(category)!
    callbacks.push(callback)
    return () => {
      const at = callbacks.indexOf(callback)
      if (at !== -1) {
        callbacks.splice(at, 1)
      }
    }
  }

  listen(callback: NotificationListener): () => void {
    if (this.callbacks.indexOf(callback) === -1) {
      this.callbacks.push(callback)
    }
    return () => {
      const at = this.callbacks.indexOf(callback)
      if (at !== -1) {
        this.callbacks.splice(at, 1)
      }
    }
  }
}

/**
 * handles updating and inspecting all the configuration values.
 */
export class Settings {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async updateSetting(category: string, name: string, value: string) {
    const mutation = `
      mutation UpdateSetting($category : String , $name:String, $value:String){ 
       updateSetting (  category: $category, name: $name, value: $value)
      }
    `
    const result = await this.client.mutation(mutation, {
      category: category,
      name: name,
      value: value
    })

    return (await result.data['updateSetting']) as boolean
  }

  async settings(): Promise<Array<SettingsPage>> {
    const q = `
            query {
                settings { 
                 valid 
                 category 
                 settings  {
                  name
                  valid
                  value
                  required
                 }
                }
            }
        `
    const json = await this.client.query(q, {})
    return json.data['settings']
  }
}

export class ManagedFiles {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async setManagedFileVisibility(managedFileId: number, visible: boolean) {
    const mutation = `
      mutation SetManagedFileVisibility( $managedFileId :  Int  , $visible:Boolean ){ 
       setManagedFileVisibility (  managedFileId: $managedFileId, visible: $visible )
      }
    `
    const result = await this.client.mutation(mutation, {
      managedFileId: managedFileId,
      visible: visible
    })
    return (await result.data['setManagedFileVisibility']) as boolean
  }

  async managedFileById(managedFileId: number): Promise<ManagedFile> {
    const q = `
        query ($managedFileId:  Int ) {
          managedFileById( managedFileId : $managedFileId )  { 
            id, bucket, folder, filename, size, written ,contentType, visible , url, visibleUrl , downloadableUrl
          }
        }
        `
    const result = await this.client.query(q, { managedFileId: managedFileId })
    const managedFileIdRes = await result.data['managedFileById']
    return managedFileIdRes as ManagedFile
  }
}

export class Ai {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  /* generate text responses */
  async chat(prompt: string): Promise<string> {
    const query = `
            query AiChatQuery ( $prompt: String) { 
             aiChat( prompt : $prompt ) 
            }
     `
    const result = await this.client.query(query, {
      prompt: prompt
    })
    return (await result['data']['aiChat']) as string
  }

  /** todo renders images given a prompt */
  render(prompt: string): string {
    return ''
  }

  /**
   * i think we'd have a little drag-and-drop panel in the AiClient where we'd be allowed to drop {@code .mp3} or
   * {@code .mp4} or {@code .wav} files,
   * */
  transcribe(path: string): string {
    return ''
  }
}

export class Compositions {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async deleteCompositionAttachment(compositionAttachmentId: number) {
    const mutation = `
         mutation ($compositionAttachmentId:  Int ) { 
          deleteCompositionAttachment( compositionAttachmentId: $compositionAttachmentId ) 
         }
        `
    const result = await this.client.mutation(mutation, {
      compositionAttachmentId: compositionAttachmentId
    })
    const idBag = (await result.data['deleteCompositionAttachment']) as Number
    return true
  }

  async createCompositionAttachment(compositionId: number) {
    const mutation = `
         mutation ($compositionId:  Int ){ 
          createCompositionAttachment(  compositionId: $compositionId ) { 
             id  
          }
         }
        `
    const result = await this.client.mutation(mutation, {
      compositionId: compositionId
    })
    const res = (await result.data['createCompositionAttachment'])['id']
    return true
  }

  async getCompositionById(id: number): Promise<Composition> {
    const q = `
        query ($id: Int ) {
          compositionById( compositionId : $id )  { 
            id, 
            field, 
            attachments { 
              id,
              caption, 
              markdown,
              managedFile {
                id 
              } 
            } 
          }
        }
        `
    const result = await this.client.query(q, { id: id })
    return (await result.data['compositionById']) as Composition
  }
}

// COMPOSITIONS
export class Attachment {
  readonly id: number
  readonly caption: string
  readonly managedFile: ManagedFile
  markdown: string

  constructor(id: number, caption: string, managedFile: ManagedFile, markdown: string) {
    this.caption = caption
    this.id = id
    this.managedFile = managedFile
    this.markdown = markdown
  }
}

export class AyrsharePublicationComposition {
  readonly composition: Composition
  readonly platform: string

  constructor(composition: Composition, platform: string) {
    this.composition = composition
    this.platform = platform
  }
}

export class Composition {
  readonly id: number
  readonly field: string
  readonly attachments: Array<Attachment>

  constructor(id: number, field: string, attachments: Array<Attachment>) {
    this.id = id
    this.attachments = attachments
    this.field = field
  }
}

export class Markdown {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async render(markdown: string): Promise<string> {
    return Promise.resolve(marked.parse(markdown, {}))
  }
}

export class Utils {
  confirmDeletion(msg: string): boolean {
    return window.confirm(msg)
  }
}

export class Transcripts {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async refreshTranscript(id: number): Promise<boolean> {
    const m = `
     mutation ($transcriptId: Int) {
      refreshTranscript(transcriptId: $transcriptId) 
     }
    `
    const result = await this.client.mutation(m, {
      transcriptId: id
    })
    return (await result.data['refreshTranscript']) as boolean
  }

  async writeTranscript(id: number, transcript: string): Promise<boolean> {
    const m = `
     mutation ($transcriptId: Int, $transcript: String) {
      writeTranscript(transcriptId: $transcriptId, transcript: $transcript) 
     }
    `
    const result = await this.client.mutation(m, {
      transcriptId: id,
      transcript: transcript
    })
    return (await result.data['writeTranscript']) as boolean
  }

  editTranscript(id: number, text: string) {
    events.emit('transcript-edit-event', {
      transcript: text,
      id: id
    } as TranscriptEditEvent)
  }

  async transcriptById(transcriptId: number): Promise<Transcript> {
    const q = `
        query ($transcriptId: Int ) {
          transcriptById( transcriptId : $transcriptId )  { 
            id, transcript 
          }
        }
        `
    const result = await this.client.query(q, { transcriptId: transcriptId })
    return (await result.data['transcriptById']) as Transcript
  }
}

export class Ayrshare {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async publicationCompositions(): Promise<Array<AyrsharePublicationComposition>> {
    const q = `
        query {
           ayrsharePublicationCompositions {
            platform 
            composition {
              id 
            }  
           }  
       }
     `
    const result = await this.client.query(q, {})
    return (await result.data[
      'ayrsharePublicationCompositions'
    ]) as Array<AyrsharePublicationComposition>
  }

  async platforms(): Promise<Array<string>> {
    const q = `
        query {
           ayrsharePlatforms      
       }
     `
    const result = await this.client.query(q, {})
    return (await result.data['ayrsharePlatforms']) as Array<string>
  }
}

export class PublicationOutcome {
  readonly id: number
  readonly success: boolean
  readonly url: string
  readonly key: string
  readonly serverErrorMessage: string
  readonly created: Date
  readonly preview: string | null

  constructor(
    id: number,
    success: boolean,
    url: string,
    key: string,
    serverErrorMessage: string,
    created: Date,
    preview: string | null = null
  ) {
    this.id = id
    this.success = success
    this.url = url
    this.key = key
    this.created = created
    this.serverErrorMessage = serverErrorMessage
    this.preview = preview
  }
}

/**
 * the publication fields we ask for, in the one place that defines them. asked for
 * against a single publishable, and again against each of the last N days.
 */
const PUBLICATION_FIELDS = `
  id,
  plugin,
  created,
  published,
  url,
  state,
  outcomes {
    id,
    created,
    success,
    url,
    key,
    serverErrorMessage,
    preview
  }
`

export function toPublication(pub: any): Publication {
  const outcomes = (pub['outcomes'] as Array<any>).map(
    (outcome: any) =>
      new PublicationOutcome(
        outcome['id'] as number,
        outcome['success'] as boolean,
        outcome['url'] as string,
        outcome['key'] as string,
        outcome['serverErrorMessage'] as string,
        outcome['created'] as Date,
        (outcome['preview'] as string) ?? null
      )
  )
  return new Publication(
    pub['id'] as number,
    pub['plugin'] as string,
    pub.created,
    pub.published,
    pub['url'] as string,
    pub['state'],
    outcomes
  )
}

/**
 * one of the mogul's days, together with everything published on it.
 */
export class MogulStatusPublications {
  readonly status: MogulStatus
  readonly publications: Array<Publication>

  constructor(status: MogulStatus, publications: Array<Publication>) {
    this.status = status
    this.publications = publications
  }
}

export class MogulStatuses {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  /**
   * the most recent days the mogul did something, newest first, each with its own
   * publications. the nesting is free: the server batch-loads every day's publications
   * in one query and their outcomes in one more, so asking for thirty days costs the
   * same number of round trips as asking for one.
   */
  async recent(limit: number): Promise<Array<MogulStatusPublications>> {
    const q = `
        query ( $limit: Int ) {
           mogulStatuses( limit: $limit ) {
              id,
              mogulId,
              date,
              publications { ${PUBLICATION_FIELDS} }
           }
       }
     `
    const result = await this.client.query(q, { limit: limit })
    const days = (result.data['mogulStatuses'] as Array<any>) || []
    return days.map(
      (day: any) =>
        new MogulStatusPublications(
          new MogulStatus(day['id'] as number, day['mogulId'] as number, day['date'] as string),
          ((day['publications'] as Array<any>) || []).map(toPublication)
        )
    )
  }
}

export class ServerTime {
  readonly instant: string
  readonly javaTimeZone: string
  readonly javaOffset: string
  readonly javaLocalTime: string
  readonly databaseTimeZone: string
  readonly databaseLocalTime: string

  constructor(
    instant: string,
    javaTimeZone: string,
    javaOffset: string,
    javaLocalTime: string,
    databaseTimeZone: string,
    databaseLocalTime: string
  ) {
    this.instant = instant
    this.javaTimeZone = javaTimeZone
    this.javaOffset = javaOffset
    this.javaLocalTime = javaLocalTime
    this.databaseTimeZone = databaseTimeZone
    this.databaseLocalTime = databaseLocalTime
  }
}

export class Diagnostics {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async serverTime(): Promise<ServerTime> {
    const q = `
        query {
           serverTime {
              instant, javaTimeZone, javaOffset, javaLocalTime, databaseTimeZone, databaseLocalTime
           }
       }
     `
    // deliberately goes around the urql client. this is a diagnostic, so when it fails
    // the useful thing is exactly what the server said -- a validation error naming an
    // unknown field reads very differently from a resolver blowing up, and both look
    // identical once they've been flattened into "no data".
    const body = await graphqlJson(q, new Map())
    const st = body?.data?.serverTime
    if (!st) {
      throw new Error(JSON.stringify(body?.errors ?? body))
    }
    return new ServerTime(
      st.instant,
      st.javaTimeZone,
      st.javaOffset,
      st.javaLocalTime,
      st.databaseTimeZone,
      st.databaseLocalTime
    )
  }
}

export class Publications {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async publications(id: number, type: string): Promise<Array<Publication>> {
    const q = `
        query ( 
          $type: String,   
          $id: Int
        ) {
           publicationsForPublishable( 
             id: $id, 
             type : $type  
           ){ ${PUBLICATION_FIELDS} }
       }
     `
    const result = await this.client.query(q, {
      id: id,
      type: type
    })
    const pubs = await result.data['publicationsForPublishable'] //as Array<Map<string,object>>
    return (pubs as Array<any>).map(toPublication)
  }

  async unpublish(publicationId: number): Promise<boolean> {
    const mutation = `
         mutation ( $publicationId: Int ){ 
            unpublish( publicationId: $publicationId )  
         }
        `
    const result = await this.client.mutation(mutation, {
      publicationId: publicationId
    })

    return (await result.data['unpublish']) as boolean
  }

  /**
   * resolves with the id of the publication that was started, not with whether it
   * succeeded: the server runs the plugin after answering, and for a podcast episode
   * that means re-rendering the audio first. wait for the publication-completed-event
   * carrying this id before reading anything the publication produced.
   */
  async publish(
    publishableType: string,
    id: number,
    contextJson: string,
    plugin: string
  ): Promise<number> {
    const q = `
        mutation ( 
             $publishableId: Int ,
             $publishableType: String, 
             $contextJson: String,
             $plugin: String
          ) {
           publish (  
             publishableId: $publishableId, 
             publishableType: $publishableType,
             contextJson: $contextJson, 
             plugin: $plugin 
           )   
        }
        `
    const result = await this.client.mutation(q, {
      publishableType: publishableType,
      publishableId: id,
      contextJson: contextJson,
      plugin: plugin
    })
    return (await result.data['publish']) as number
  }

  async canPublish(
    publishableId: number,
    publishableType: string,
    contextJson: string,
    plugin: string
  ): Promise<boolean> {
    const q = `
        query ( 
             $publishableId: Int ,
             $publishableType: String, 
             $contextJson: String,
             $plugin: String
          ) {
           canPublish(
             publishableId : $publishableId  ,
             publishableType: $publishableType,
             contextJson : $contextJson, 
             plugin : $plugin 
           )   
        }
        `
    const result = await this.client.query(q, {
      publishableType: publishableType,
      publishableId: publishableId,
      contextJson: contextJson,
      plugin: plugin
    })
    return (await result.data['canPublish']) as boolean
  }
}

export class SearchableResult {
  readonly searchableId: number
  readonly aggregateId: number
  readonly title: string
  readonly context: string // json from the server
  readonly description: string
  readonly type: string
  readonly rank: number
  readonly created: number

  static fromJson(obj: SearchableResult): SearchableResult {
    return new SearchableResult(
      obj.aggregateId,
      obj.searchableId,
      obj.title,
      obj.description,
      obj.type,
      obj.rank,
      obj.created,
      obj.context
    )
  }

  constructor(
    aggregateId: number,
    searchableId: number,
    title: string,
    description: string,
    type: string,
    rank: number,
    created: number,
    context: string
  ) {
    this.context = context
    this.searchableId = searchableId
    this.title = title
    this.type = type
    this.description = description
    this.aggregateId = aggregateId
    this.rank = rank
    this.created = created
  }

  public get contextMap(): Map<string, number> {
    return new Map<string, number>(Object.entries(JSON.parse(this.context)))
  }
}

export class Search {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async search(query: string): Promise<Array<SearchableResult>> {
    const q = `
          query($query: String, $metadata: JSON) {
            search(query: $query, metadata: $metadata) {
                created
                searchableId
                title
                aggregateId
                context
                type
            }
          } 
        `
    const result = await this.client.query(q, { query: query, metadata: {} })
    const data = (await result.data['search']) as Array<SearchableResult>
    if (data && data.length && data.length > 0)
      return data //
        .map((sr) => SearchableResult.fromJson(sr))
    return []
  }
}

export class Blog {
  readonly id: number
  readonly title: string
  readonly description: string
  readonly rssUrl: string | null
  readonly created: string | null

  constructor(
    id: number,
    title: string,
    description: string,
    rssUrl: string | null,
    created: string | null
  ) {
    this.id = id
    this.created = created
    this.title = title
    this.description = description
    this.rssUrl = rssUrl
  }
}

export class Post {
  readonly id: number
  readonly title: string
  readonly content: string
  readonly summary: string
  readonly rssSlug: string | null
  readonly complete: boolean
  readonly visible: boolean
  readonly created: string | null
  readonly descriptionComposition?: Composition

  constructor(
    id: number,
    title: string,
    content: string,
    summary: string,
    rssSlug: string | null,
    complete: boolean,
    visible: boolean,
    created: string | null,
    descriptionComposition?: Composition
  ) {
    this.descriptionComposition = descriptionComposition
    this.id = id
    this.title = title
    this.content = content
    this.summary = summary
    this.rssSlug = rssSlug
    this.complete = complete
    this.visible = visible
    this.created = created
  }
}

export class Blogs {
  readonly graphqlClient: Client

  constructor(graphqlClient: Client) {
    this.graphqlClient = graphqlClient
  }

  async deleteBlog(blogId: number): Promise<boolean> {
    const q = `
    mutation deleteBlog($blogId:Int) {
      deleteBlog(blogId:$blogId)
    }
   `
    const r = await blogs.graphqlClient.mutation(q, { blogId: blogId })
    const b = (await r.data['deleteBlog']) as boolean
    return Promise.resolve(b)
  }

  async deletePost(postId: number): Promise<boolean> {
    const q = `
    mutation deletePost($postId:Int) {
      deletePost(postId:$postId)
    }
   `
    const r = await blogs.graphqlClient.mutation(q, { postId: postId })
    const b = (await r.data['deletePost']) as boolean
    return Promise.resolve(b)
  }

  async blogById(blogId: number): Promise<Blog> {
    const q = `
          query blogById($blogId: Int) {
            blogById( blogId: $blogId ) {
                id
                title
                description
                rssUrl
                created
            }
          } 
    `
    const result = await this.graphqlClient.query(q, { blogId: blogId })
    const b = (await result.data['blogById']) as Blog
    return new Blog(b.id, b.title, b.description, b.rssUrl, dateTimeToString(b.created))
  }

  async createBlog(title: string, description: string): Promise<Blog> {
    const q = `
     mutation ($title:String, $description:String){
      createBlog(title:$title, description:$description) {
       id , title , description , rssUrl , created
      }
     }
    `
    const result = await this.graphqlClient.mutation(q, { title: title, description: description })
    const resultBlog = (await result.data['createBlog']) as Blog
    return await this.blogById(resultBlog.id)
  }

  async update(
    blogId: number,
    title: string,
    description: string,
    rssUrl: string | null
  ): Promise<boolean> {
    const q = `
     mutation ($blogId:Int, $title:String, $description:String, $rssUrl:String){
      updateBlog(blogId:$blogId, title:$title, description:$description, rssUrl:$rssUrl)
     }
    `
    const result = await this.graphqlClient.mutation(q, {
      blogId: blogId,
      title: title,
      description: description,
      rssUrl: rssUrl
    })

    return (await result.data['updateBlog']) as boolean
  }

  async blogs(): Promise<Array<Blog>> {
    const results = await this.graphqlClient.query(
      `
      query {
        blogs  {
          created
          id
          title
          description
          rssUrl
        }
      }
    `,
      {}
    )

    const data = (await results.data['blogs']) as Array<Blog>

    const newResults = []
    for (let i = 0; i < data.length; i++) {
      newResults.push(
        new Blog(
          data[i]['id'],
          data[i]['title'],
          data[i]['description'],
          data[i]['rssUrl'],
          data[i]['created']!!
        )
      )
    }
    return newResults
  }

  async updatePost(
    postId: number,
    title: string,
    description: string,
    summary: string,
    rssSlug: string | null,
    // null leaves the existing creation date alone, server-side
    created: Date | null = null
  ): Promise<boolean> {
    const q = `
     mutation ($postId:Int, $title:String, $description:String, $summary:String, $rssSlug:String, $created:DateTime){
      updatePost(postId:$postId, title:$title, description:$description, summary:$summary, rssSlug:$rssSlug, created:$created)
     }
    `
    const result = await this.graphqlClient.mutation(q, {
      postId: postId,
      title: title,
      description: description,
      summary: summary,
      rssSlug: rssSlug,
      created: created ? created.toISOString() : null
    })

    return (await result.data['updatePost']) as boolean
  }

  async setBlogPostVisibility(postId: number, visible: boolean): Promise<boolean> {
    const q = `
      mutation SetBlogPostVisibility($postId:Int, $visible:Boolean) {
        setBlogPostVisibility(postId:$postId, visible:$visible)
      }
    `
    const result = await this.graphqlClient.mutation(q, {
      postId: postId,
      visible: visible
    })
    return (await result.data['setBlogPostVisibility']) as boolean
  }

  async summarize(content: string): Promise<string> {
    const q = `
     mutation ($content:String){
      summarize(content:$content)
     }
    `
    const result = await this.graphqlClient.mutation(q, {
      content: content
    })

    return (await result.data['summarize']) as string
  }

  async blogPostPreviewsByBlog(blogId: number): Promise<Array<Post>> {
    const q = `
      query blogPostsByBlog($blogId: Int) {
        blogPostsByBlog(blogId: $blogId) {
          id
          title
          content
          summary
          rssSlug
          complete
          visible
          created
        }
      }
    `
    const result = await this.graphqlClient.query(q, { blogId: blogId })
    const posts = (await result.data['blogPostsByBlog']) as Array<Post>
    console.log('loading blog post previews # ' + blogId)
    return posts.map(
      (p) =>
        new Post(
          p.id,
          p.title,
          p.content,
          p.summary,
          p.rssSlug,
          p.complete,
          p.visible,
          dateTimeToString(p.created)
        )
    )
  }

  async blogPostsByBlog(blogId: number): Promise<Array<Post>> {
    const q = `
      query blogPostsByBlog($blogId: Int) {
        blogPostsByBlog(blogId: $blogId) {
          id
          title
          content
          summary
          rssSlug
          complete
          visible
          created
         descriptionComposition { 
          id,
          field ,
          attachments {
            id,
            caption,
            managedFile { id }
          }
        }
          
          
        }
      }
    `
    const result = await this.graphqlClient.query(q, { blogId: blogId })
    const posts = (await result.data['blogPostsByBlog']) as Array<Post>
    return posts.map(
      (p) =>
        new Post(
          p.id,
          p.title,
          p.content,
          p.summary,
          p.rssSlug,
          p.complete,
          p.visible,
          dateTimeToString(p.created)
        )
    )
  }

  async postById(postId: number): Promise<Post> {
    const q = `
      query postById($postId: Int) {
        postById(postId: $postId) {
          id
          title
          content
          summary
          rssSlug
          complete
          visible
          created
          descriptionComposition { 
            id,
            field ,
            attachments {
              id,
              caption,
              managedFile { id }
            }
          }
        }
      }
    `
    const result = await this.graphqlClient.query(q, { postId: postId })
    const p = (await result.data['postById']) as Post

    return new Post(
      p.id,
      p.title,
      p.content,
      p.summary,
      p.rssSlug,
      p.complete,
      p.visible,
      // deliberately NOT formatted for display here. the post editor parses this back
      // into a Date for the creation-date picker, and a formatted string has already
      // lost its seconds -- every save then wrote the truncated value back. the list
      // queries above still format, because nothing parses those.
      p.created,
      p.descriptionComposition
    )
  }

  async createPost(
    blogId: number,
    title: string,
    content: string,
    summary: string,
    rssSlug: string | null = null
  ): Promise<Post> {
    const q = `
     mutation ($blogId:Int, $title:String, $content:String, $summary:String, $rssSlug:String){
      createPost(blogId:$blogId, title:$title, content:$content, summary:$summary, rssSlug:$rssSlug) {
       id, title, content, summary, rssSlug, complete, visible, created ,
          
          descriptionComposition { 
            id,
            field ,
            attachments {
              id,
              caption,
              managedFile { id }
            }
          } 
          
      }
     }
    `
    const result = await this.graphqlClient.mutation(q, {
      blogId: blogId,
      title: title,
      content: content,
      summary: summary,
      rssSlug: rssSlug
    })
    const resultPost = (await result.data['createPost']) as Post
    return await this.postById(resultPost.id)
  }
}

export class Note {
  readonly id: number
  readonly note: string
  readonly type: string
  readonly created: string
  readonly done?: string | null

  constructor(id: number, note: string, type: string, created: string, done?: string | null) {
    this.id = id
    this.note = note
    this.type = type
    this.created = created
    this.done = done
  }
}

export class Notes {
  readonly client: Client

  constructor(gc: Client) {
    this.client = gc
  }

  async deleteNote(id: number): Promise<boolean> {
    const mutation = ` 
      mutation DeleteNote( $id: Int  ){  
        deleteNote( id : $id)
      }
    `
    const result = await this.client.mutation(mutation, {
      id: id
    })
    return await result.data['deleteNote']
  }

  async updateNote(id: number, note: string): Promise<boolean> {
    const mutation = ` 
      mutation UpdateNote( $id:Int,$note:String  ){  
        updateNote(id:$id, note:$note)
      }
    `
    const result = await this.client.mutation(mutation, {
      note: note,
      id: id
    })
    return await result.data['updateNote']
  }

  async setNoteDone(id: number, done: boolean): Promise<boolean> {
    const mutation = `
      mutation SetNoteDone( $id:Int,$done:Boolean  ){
        setNoteDone(id:$id, done:$done)
      }
    `
    const result = await this.client.mutation(mutation, {
      done: done,
      id: id
    })
    return await result.data['setNoteDone']
  }

  async createNote(type: string, id: number, note: string): Promise<boolean> {
    const mutation = ` 
      mutation CreateNote( $type : String, $id : Int , $note : String){  
        createNote( type : $type, id : $id, note : $note)
      }
    `
    const result = await this.client.mutation(mutation, {
      note: note,
      id: id,
      type: type
    })
    return await result.data['createNote']
  }

  async notesForNotable(
    id: number,
    type: string,
    includeDone: boolean = true
  ): Promise<Array<Note>> {
    const results = await this.client.query(
      `
      query($type: String, $id : Int, $includeDone: Boolean ) {
        notesForNotable(type: $type, id: $id, includeDone: $includeDone ) {
          created
          done
          id 
          note 
          type
        }
      }  
    `,
      { type: type, id: id, includeDone: includeDone }
    )
    return (await results.data['notesForNotable']) as Array<Note>
  }
}

export class EntityContext {
  readonly resolvedType: string
  readonly context: Map<string, number>

  constructor(resolvedType: string, context: Map<string, number>) {
    this.resolvedType = resolvedType
    this.context = context
  }
}

export class EntityContexts {
  readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async buildEntityContextFor(type: string, id: number): Promise<EntityContext> {
    const results = await this.client.query(
      `      
      query($type: String, $id : Int ) {
        entityContext(type: $type, id: $id ) {
          resolvedType
          context 
        }
      }  
    `,
      { type: type, id: id }
    )
    const entityContext = (await results.data['entityContext']) as any
    const resolvedType = entityContext['resolvedType']
    const context = JSON.parse(entityContext['context'])
    const contextMap = new Map<string, number>(Object.entries(context))
    const nc = new EntityContext(resolvedType, contextMap)
    return Promise.resolve(nc)
  }
}

export class WordPress {
  readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  async wordPressStatus(): Promise<WordPressStatus> {
    const results = await this.client.query(
      `
            query {
              wordPressStatus {
                  connected, id, displayName
              }
            }  
         `,
      {}
    )
    const data = await results.data['wordPressStatus']
    return new WordPressStatus(
      data['displayName'] as string,
      data['connected'] as boolean,
      data['id'] as number
    )
  }
}

export class WordPressStatus {
  readonly displayName: string
  readonly connected: boolean
  readonly id: number
  constructor(displayName: string, connected: boolean, id: number) {
    this.displayName = displayName
    this.connected = connected
    this.id = id
  }
}
export const wordpress = new WordPress(graphqlClient)
export const events = mitt()
export const blogs = new Blogs(graphqlClient)
export const search = new Search(graphqlClient)
export const jobs = new Jobs(graphqlClient)
export const publications = new Publications(graphqlClient)
export const utils = new Utils()
export const markdown = new Markdown(graphqlClient)
export const ai = new Ai(graphqlClient)
export const notifications = new Notifications(graphqlClient)
export const mogul = new Mogul(graphqlClient)
export const diagnostics = new Diagnostics(graphqlClient)
export const mogulStatuses = new MogulStatuses(graphqlClient)
export const podcasts = new Podcasts(graphqlClient)
export const managedFiles = new ManagedFiles(graphqlClient)
export const settings = new Settings(graphqlClient)
export const compositions = new Compositions(graphqlClient)
export const ayrshare = new Ayrshare(graphqlClient)
export const transcripts = new Transcripts(graphqlClient)
export const notes = new Notes(graphqlClient)
// i think these two things should be more closely aligned? are they really separate concerns now?
export const results = new Results(graphqlClient)
export const entityNavigationContexts = new EntityContexts(graphqlClient)
