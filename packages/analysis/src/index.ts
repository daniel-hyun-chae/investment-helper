import { AnalysisJobSchema, type AnalysisJob } from '@investment-helper/contracts'

export type AnalysisResult = {
  score: number
  thesis: string
}

export interface AnalysisEngine {
  analyze: (job: AnalysisJob) => Promise<AnalysisResult>
}

export const nodeAnalysisEngine: AnalysisEngine = {
  async analyze(job) {
    const validated = AnalysisJobSchema.parse(job)

    return {
      score: 0.5,
      thesis: `Placeholder thesis for ${validated.companyCode}. Replace with LLM-backed analysis flow.`
    }
  }
}
