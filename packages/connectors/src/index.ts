import { FilingEventSchema, type FilingEvent } from '@investment-helper/contracts'

export type ConnectorContext = {
  opendartApiKey: string
}

export interface Connector {
  source: 'opendart' | 'private-api'
  poll: (ctx: ConnectorContext) => Promise<FilingEvent[]>
}

export const openDartConnector: Connector = {
  source: 'opendart',
  async poll(_ctx) {
    const sample: FilingEvent = {
      id: `opendart-${Date.now()}`,
      source: 'opendart',
      companyCode: '005930',
      publishedAt: new Date().toISOString(),
      summary: 'Sample disclosure event from OpenDART connector scaffold.'
    }

    return [FilingEventSchema.parse(sample)]
  }
}
