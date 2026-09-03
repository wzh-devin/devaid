import type {
  OAuthSessionCreateRequestDto,
  OAuthSessionInputRequestDto,
  OAuthSessionStatusResponseDto,
} from '../../dto/llm/oauth-dto.ts'
import type { OAuthSessionService } from '@oh-my-harness/llm'
import type { Context } from 'hono'

/** 创建 OAuth 会话 HTTP Controller。 */
export function createOAuthController(oauth: OAuthSessionService) {
  return {
    cancel: (context: Context) => {
      oauth.cancel(context.req.param('id')!)
      return context.body(null, 204)
    },
    create: async (context: Context) => {
      const body = await context.req
        .json<Partial<OAuthSessionCreateRequestDto>>()
        .catch(() => undefined)
      if (
        !body?.providerId ||
        (body.authMode !== undefined && typeof body.authMode !== 'string')
      ) {
        return context.json(
          { code: 'INVALID_PROVIDER', message: '缺少 Provider。' },
          400,
        )
      }
      try {
        const status = oauth.create(body.providerId, body.authMode)
        return context.json(status satisfies OAuthSessionStatusResponseDto, 201)
      } catch (error) {
        return context.json(
          { code: 'OAUTH_START_FAILED', message: (error as Error).message },
          400,
        )
      }
    },
    get: (context: Context) => {
      const status = oauth.get(context.req.param('id')!)
      return status
        ? context.json(status satisfies OAuthSessionStatusResponseDto)
        : context.json(
            {
              code: 'OAUTH_SESSION_NOT_FOUND',
              message: 'OAuth 会话不存在或已过期。',
            },
            404,
          )
    },
    input: async (context: Context) => {
      const body = await context.req
        .json<OAuthSessionInputRequestDto>()
        .catch(() => undefined)
      if (!body?.promptId || typeof body.value !== 'string') {
        return context.json(
          { code: 'INVALID_OAUTH_INPUT', message: 'OAuth 输入无效。' },
          400,
        )
      }
      try {
        const status = oauth.input(
          context.req.param('id')!,
          body.promptId,
          body.value,
        )
        return context.json(status satisfies OAuthSessionStatusResponseDto)
      } catch (error) {
        return context.json(
          { code: 'INVALID_OAUTH_INPUT', message: (error as Error).message },
          400,
        )
      }
    },
  }
}
