export interface TabRegistration {
  id: string
  label: string
  slot: any
  visible: boolean
}

export type RegisterTabFunction = (tab: TabRegistration) => void
export type GetActiveTabFunction = () => string
export type SetActiveTabFunction = (tabId: string) => void

// the ids that tie a tab to the content it shows, for aria-controls and aria-labelledby
export const tabIdFor = (id: string) => `tab-${id}`
export const panelIdFor = (id: string) => `tabpanel-${id}`
