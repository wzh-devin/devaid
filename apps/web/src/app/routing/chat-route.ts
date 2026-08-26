export type ChatRoute =
  | { kind: 'explore' }
  | { kind: 'library' }
  | { kind: 'new' }
  | { kind: 'thread'; threadId: string }

/** 将浏览器路径解析为聊天应用内部路由，不接受嵌套或外部地址。 */
export const resolveChatRoute = (pathname: string): ChatRoute => {
  const segment = pathname.replace(/^\/+/, '').split('/')[0] ?? ''

  if (segment === 'new') return { kind: 'new' }
  if (segment === 'library') return { kind: 'library' }
  if (segment === 'explore') return { kind: 'explore' }

  return { kind: 'thread', threadId: segment }
}
