import type { Slot } from 'vue'
import type { Publication } from '@/services'

export class PanelSlotIcon {
  constructor(
    public icon: string,
    public iconHover: string
  ) {}
}

export class PanelSlot {
  constructor(
    public selected: boolean,
    public plugin: string,
    public panel: Slot,
    public icon: PanelSlotIcon
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
 * resolves -- see PublishAndAwaitFunction for that.
 */
export type PublishFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string
) => Promise<number>

/**
 * starts a publication and resolves once it has actually finished, with the publication
 * itself. anything a plugin produced -- a URL, most of all -- is on its outcomes, and
 * only exists once the plugin has run.
 *
 * resolves with null if the wait was abandoned rather than completed, which happens when
 * the component owning it goes away mid-publish.
 */
export type PublishAndAwaitFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string
) => Promise<Publication | null>

export type IsPluginReadyFunction = (
  publishableType: string,
  id: number,
  context: any,
  plugin: string
) => Promise<boolean>

export type RegisterChildFunction = (child: PanelSlot) => void

export type GetPublicationContextFunction = () => PublicationContext
