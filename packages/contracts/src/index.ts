import { z } from 'zod'

export const FilingEventSchema = z.object({
  id: z.string(),
  source: z.enum(['opendart', 'private-api']),
  companyCode: z.string(),
  publishedAt: z.string(),
  summary: z.string()
})

export const AnalysisJobSchema = z.object({
  userId: z.string(),
  companyCode: z.string(),
  filingId: z.string(),
  source: z.enum(['opendart', 'private-api'])
})

export type FilingEvent = z.infer<typeof FilingEventSchema>
export type AnalysisJob = z.infer<typeof AnalysisJobSchema>
