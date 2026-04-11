import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

type Env = {
  SUPABASE_URL: string
  SUPABASE_SECRET_KEY: string
  TELEGRAM_BOT_TOKEN: string
  OPENDART_API_KEY: string
  ANALYSIS_QUEUE: Queue<AnalysisJob>
}

type AnalysisJob = {
  userId: string
  companyCode: string
  filingId: string
  source: 'opendart' | 'private-api'
}

const TelegramUpdateSchema = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number() }),
      text: z.string().optional()
    })
    .optional()
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  })
}

async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.json()
  const parsed = TelegramUpdateSchema.safeParse(payload)

  if (!parsed.success) {
    return json({ ok: false, error: 'Invalid Telegram payload' }, 400)
  }

  const text = parsed.data.message?.text?.trim() ?? ''
  const chatId = parsed.data.message?.chat.id

  if (!chatId) {
    return json({ ok: true })
  }

  if (text.startsWith('/start')) {
    return json({ ok: true, message: 'Welcome to investment-helper.' })
  }

  if (text.startsWith('/watch ')) {
    const companyCode = text.replace('/watch', '').trim()
    if (!companyCode) {
      return json({ ok: false, error: 'Company code required' }, 400)
    }

    const rawSupabaseUrl = env.SUPABASE_URL ?? ''
    const normalizedSupabaseUrl = rawSupabaseUrl.trim().replace(/^['"]|['"]$/g, '')

    let parsedSupabaseUrl: URL | null = null
    try {
      parsedSupabaseUrl = new URL(normalizedSupabaseUrl)
    } catch {
      parsedSupabaseUrl = null
    }

    if (!normalizedSupabaseUrl || !parsedSupabaseUrl || parsedSupabaseUrl.protocol !== 'https:') {
      console.error('invalid_supabase_url_configuration', {
        rawSupabaseUrl,
        normalizedSupabaseUrl,
        hasSupabaseSecretKey: Boolean(env.SUPABASE_SECRET_KEY),
        hint: 'SUPABASE_URL must look like https://<project-ref>.supabase.co'
      })

      return json({ ok: false, error: 'Invalid SUPABASE_URL configuration' }, 500)
    }

    if (!env.SUPABASE_SECRET_KEY) {
      return json({ ok: false, error: 'Missing SUPABASE_SECRET_KEY configuration' }, 500)
    }

    console.log('watch_command_received', {
      companyCode,
      chatId,
      supabaseHost: parsedSupabaseUrl.host,
      hasSupabaseSecretKey: true
    })

    let supabase
    try {
      supabase = createClient(normalizedSupabaseUrl, env.SUPABASE_SECRET_KEY)
    } catch (error) {
      console.error('supabase_client_init_failed', {
        message: error instanceof Error ? error.message : String(error),
        rawSupabaseUrl,
        normalizedSupabaseUrl,
        supabaseHost: parsedSupabaseUrl.host
      })
      return json({ ok: false, error: 'Supabase client initialization failed' }, 500)
    }

    const { error } = await supabase.from('subscriptions').upsert(
      {
        telegram_user_id: String(chatId),
        company_code: companyCode,
        source: 'opendart',
        status: 'active'
      },
      { onConflict: 'telegram_user_id,company_code,source' }
    )

    if (error) {
      console.error('subscription_upsert_failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })

      return json(
        {
          ok: false,
          error: 'Failed to save subscription',
          reason: error.message
        },
        500
      )
    }

    return json({ ok: true, message: `Watching ${companyCode}` })
  }

  if (text.startsWith('/list')) {
    return json({ ok: true, message: 'Use admin UI for full subscription list in v1 scaffold.' })
  }

  return json({ ok: true })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { pathname } = new URL(request.url)

      if (pathname === '/health') {
        return json({ ok: true, service: 'bot-worker' })
      }

      if (pathname === '/telegram/webhook' && request.method === 'POST') {
        return handleTelegramWebhook(request, env)
      }

      if (pathname === '/admin/health') {
        return json({ ok: true, ingestion: 'unknown', queues: 'configured' })
      }

      return json({ ok: false, error: 'Not Found' }, 404)
    } catch (error) {
      console.error('worker_fetch_failed', {
        message: error instanceof Error ? error.message : String(error)
      })
      return json({ ok: false, error: 'Internal worker error' }, 500)
    }
  },

  async queue(batch: MessageBatch<AnalysisJob>): Promise<void> {
    for (const message of batch.messages) {
      console.log('analysis-job', message.body)
      message.ack()
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await env.ANALYSIS_QUEUE.send({
      userId: 'bootstrap-user',
      companyCode: '005930',
      filingId: `cron-${Date.now()}`,
      source: 'opendart'
    })
  }
}
