import { ChatMessageActions } from '@agile-avocation/ui-pro/chat-message-actions'

interface MessageActionsProps {
  variant: 'full' | 'minimal'
}

/** 展示模板消息的复制、反馈和更多操作入口。 */
export function MessageActions({ variant }: MessageActionsProps) {
  return (
    <ChatMessageActions>
      <ChatMessageActions.Copy aria-label="复制" tooltip="复制" />
      {variant === 'full' ? (
        <>
          <ChatMessageActions.ThumbsUp
            aria-label="回答有帮助"
            tooltip="回答有帮助"
          />
          <ChatMessageActions.ThumbsDown
            aria-label="回答需改进"
            tooltip="回答需改进"
          />
          <ChatMessageActions.Regenerate
            aria-label="重新生成"
            tooltip="重新生成"
          />
        </>
      ) : null}
      <ChatMessageActions.Menu aria-label="更多" tooltip="更多操作" />
    </ChatMessageActions>
  )
}
