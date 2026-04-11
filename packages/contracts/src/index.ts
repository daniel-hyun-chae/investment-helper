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

export const CompanyDirectoryEntrySchema = z.object({
  corpCode: z.string().length(8),
  corpName: z.string(),
  corpEngName: z.string().optional(),
  stockCode: z.string().optional(),
  modifyDate: z.string().optional()
})

export const SummaryPeriodSchema = z.enum(['yearly', 'quarterly', 'ttm'])
export const SummaryRangeSchema = z.enum(['5', '10'])

export const SummaryMetricPointSchema = z.object({
  label: z.string(),
  fiscalYear: z.number().int(),
  fiscalQuarter: z.number().int().min(1).max(4).nullable(),
  revenue: z.number().nullable(),
  operatingIncome: z.number().nullable(),
  sellingGeneralAdministrativeExpense: z.number().nullable(),
  costOfSales: z.number().nullable()
})

export const CompanySummaryResponseSchema = z.object({
  corpCode: z.string().length(8),
  corpName: z.string(),
  period: SummaryPeriodSchema,
  rangeYears: SummaryRangeSchema,
  basis: z.enum(['CFS', 'OFS']),
  generatedAt: z.string(),
  points: z.array(SummaryMetricPointSchema),
  marketCap: z
    .object({
      available: z.literal(false),
      reason: z.literal('not_supported_by_opendart_v1')
    })
    .default({ available: false, reason: 'not_supported_by_opendart_v1' }),
  refreshWarning: z
    .object({
      code: z.string(),
      message: z.string()
    })
    .optional()
})

export type FilingEvent = z.infer<typeof FilingEventSchema>
export type AnalysisJob = z.infer<typeof AnalysisJobSchema>
export type CompanyDirectoryEntry = z.infer<typeof CompanyDirectoryEntrySchema>
export type SummaryPeriod = z.infer<typeof SummaryPeriodSchema>
export type SummaryRange = z.infer<typeof SummaryRangeSchema>
export type SummaryMetricPoint = z.infer<typeof SummaryMetricPointSchema>
export type CompanySummaryResponse = z.infer<typeof CompanySummaryResponseSchema>
