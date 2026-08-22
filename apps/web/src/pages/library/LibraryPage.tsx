import type { MouseEvent } from 'react'
import { PromptSuggestion } from '@agile-avocation/ui-pro/prompt-suggestion'
import { Card, Chip } from '@heroui/react'
import type { LibraryItem } from './library-data.ts'
import { LIBRARY_ITEMS } from './library-data.ts'

interface LibraryPageProps {
  onNavigate: (path: string, draft?: string) => void
}

/** 展示保存的提示词与会话入口，页面数据保持只读。 */
export function LibraryPage({ onNavigate }: LibraryPageProps) {
  /** 打开关联会话；没有关联会话时将保存项带入新对话。 */
  const handleSelect = (
    event: MouseEvent<HTMLAnchorElement>,
    libraryItem: LibraryItem,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()

    if (libraryItem.threadId) {
      onNavigate(`/${libraryItem.threadId}`)
      return
    }

    onNavigate('/new', libraryItem.description)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-4 py-8">
        <PromptSuggestion variant="card">
          <PromptSuggestion.Header>
            <PromptSuggestion.Title>
              已保存的提示词与可复用配置
            </PromptSuggestion.Title>
            <PromptSuggestion.Description>
              这里展示模板自带的提示词预设、语气规则和示例对话。你也可以保存自己的内容，方便下次继续使用。
            </PromptSuggestion.Description>
          </PromptSuggestion.Header>

          <PromptSuggestion.Items>
            {LIBRARY_ITEMS.map((libraryItem) => {
              const href = libraryItem.threadId
                ? `/${libraryItem.threadId}`
                : '/new'

              return (
                <a
                  key={libraryItem.id}
                  className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  href={href}
                  onClick={(event) => handleSelect(event, libraryItem)}
                >
                  <PromptSuggestion.Item>
                    <Card.Header>
                      <PromptSuggestion.ItemTitle>
                        {libraryItem.title}
                      </PromptSuggestion.ItemTitle>
                      <PromptSuggestion.ItemDescription>
                        {libraryItem.description}
                      </PromptSuggestion.ItemDescription>
                    </Card.Header>
                    <PromptSuggestion.ItemFooter>
                      <PromptSuggestion.ItemTags>
                        {libraryItem.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            {tag}
                          </Chip>
                        ))}
                      </PromptSuggestion.ItemTags>
                      <PromptSuggestion.ItemMeta>
                        {libraryItem.updatedAt}
                      </PromptSuggestion.ItemMeta>
                    </PromptSuggestion.ItemFooter>
                  </PromptSuggestion.Item>
                </a>
              )
            })}
          </PromptSuggestion.Items>
        </PromptSuggestion>
      </div>
    </div>
  )
}
