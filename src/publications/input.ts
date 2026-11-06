import type { Slot } from 'vue'
import type { Publication } from '@/services'

export class PanelSlotIcon {
  constructor(
    public icon: string,
    public iconHover: string
  ) {}
}

/**
 * what the publish and schedule buttons beneath a panel need from it. the buttons belong
 * to the section, so they look and sit the same under every plugin; the panel only says
 * what they're called, when they can be pressed, and what pressing them does. these are
 * functions, not values, so they read the panel's props each time and stay current.
 */
export interface PanelAction {
  /** the main button's text; the section falls back to 'Publish' */
  label: () => string | undefined
  enabled: () => boolean
  /** false for the panels for which a later date makes no sense, like a download */
  schedulable: () => boolean
  /** null means right now */
  publish: (scheduled: Date | null) => Promise<unknown>
}

export class PanelSlot {
  constructor(
    public selected: boolean,
    public plugin: string,
    public panel: Slot,
    public icon: PanelSlotIcon,
    public action?: PanelAction
  ) {}
}

export class PublicationContext {
  constructor(
    public publishableId: number,
    public type: string
  ) {
    this.type = type
    this.publishableId = publishableId
  }
}

/**
 * starts a publication and resolves with its id. it is not finished when this
 * resolves -- see PublishAndAwaitFunction for that. every publication waits its turn on
 * the server's job queue; given a `scheduled` date, its turn comes then.
 */
export type PublishFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string,
  scheduled?: Date | null
) => Promise<number>

/**
 * starts a publication and resolves once it has actually finished, with the publication
 * itself. anything a plugin produced -- a URL, most of all -- is on its outcomes, and
 * only exists once the plugin has run.
 *
 * resolves with null if the wait was abandoned rather than completed, which happens when
 * the component owning it goes away mid-publish.
 *
 * a scheduled publication isn't waited on -- that could be days -- so given a
 * `scheduled` date this resolves as soon as it's been scheduled, with the
 * publication still pending.
 */
export type PublishAndAwaitFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string,
  scheduled?: Date | null
) => Promise<Publication | null>

export type IsPluginReadyFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string
) => Promise<boolean>

export type RegisterChildFunction = (child: PanelSlot) => void

export type GetPublicationContextFunction = () => PublicationContext
