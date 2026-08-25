import { useState } from 'react'
import { PromptSuggestion } from '@agile-avocation/ui-pro/prompt-suggestion'
import { SUGGESTED_PROMPTS } from '../../features/chat/chat-data.ts'
import {
  ChatComposer,
  type ChatSubmitPayload,
} from '../../features/chat/components/ChatComposer.tsx'

interface NewChatPageProps {
  draft: string
  onDraftChange: (draft: string) => void
}

/** 组合 New Chat 欢迎内容、建议词与消息输入区。 */
export function NewChatPage({ draft, onDraftChange }: NewChatPageProps) {
  const [fixedWorkspaceId, setFixedWorkspaceId] = useState<string>()

  /** 首次有效发送后固定工作区，后续提交不再允许切换。 */
  const handleSubmit = ({ workspaceId }: ChatSubmitPayload) => {
    setFixedWorkspaceId((currentWorkspaceId) =>
      currentWorkspaceId === undefined ? workspaceId : currentWorkspaceId,
    )
  }

  return (
    <div className="flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex min-h-full w-full max-w-[714px] flex-col justify-center px-4 py-10">
          <PromptSuggestion>
            <PromptSuggestion.Header>
              <PromptSuggestion.Title>
                你想从哪里开始？
              </PromptSuggestion.Title>
              <PromptSuggestion.Description>
                输入问题，或从下面的建议中选择一个开始。当前为模拟对话，不会实际发送任何内容。
              </PromptSuggestion.Description>
            </PromptSuggestion.Header>
            <PromptSuggestion.Items>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <PromptSuggestion.Item
                  key={prompt}
                  onPress={() => onDraftChange(prompt)}
                >
                  {prompt}
                </PromptSuggestion.Item>
              ))}
            </PromptSuggestion.Items>
          </PromptSuggestion>
        </div>
      </div>

      <div className="shrink-0 bg-background px-4 pt-3 pb-4">
        <div className="mx-auto w-full max-w-[714px]">
          <ChatComposer
            fixedWorkspaceId={fixedWorkspaceId}
            value={draft}
            onSubmit={handleSubmit}
            onValueChange={onDraftChange}
          />
        </div>
      </div>
    </div>
  )
}
