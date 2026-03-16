// PoC: Junction Garmin integration — remove after evaluation

export interface JunctionPocConnection {
  id: string
  appUserId: string
  junctionUserId: string
  connectedAt: string
  status: 'active' | 'disconnected'
  disconnectedAt: string | null
}

export interface JunctionPocEvent {
  id: string
  junctionUserId: string
  svixEventId: string
  eventType: string
  payload: Record<string, unknown>
  receivedAt: string
}
