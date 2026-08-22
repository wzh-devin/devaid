import type { MouseEvent } from 'react'
import { PromptSuggestion } from '@agile-avocation/ui-pro/prompt-suggestion'
import { Card } from '@heroui/react'
import { EXPLORE_CATEGORIES } from './explore-data.ts'

interface ExplorePageProps {
  onNavigate: (path: string, draft?: string) => void
}

/** 展示分类提示词，并将选择结果带入 New Chat 草稿。 */
export function ExplorePage({ onNavigate }: ExplorePageProps) {
  /** 保留可访问链接语义，并把选择的提示词作为内存草稿导航。 */
  const handlePromptSelect = (
    event: MouseEvent<HTMLAnchorElement>,
    prompt: string,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    onNavigate('/new', prompt)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[960px] flex-col px-4 py-8">
        <PromptSuggestion variant="card">
          <PromptSuggestion.Header>
            <PromptSuggestion.Title>
              日常工作的常用提示词
            </PromptSuggestion.Title>
            <PromptSuggestion.Description>
              选择一个提示词，了解此模板适合哪些对话场景。所有提示词均为模拟数据，不会发送到任何后端。
            </PromptSuggestion.Description>
          </PromptSuggestion.Header>

          <div className="mt-8 flex flex-col gap-8">
            {EXPLORE_CATEGORIES.map((category) => (
              <PromptSuggestion.Group
                key={category.id}
                description={category.subtitle}
                label={category.title}
              >
                <PromptSuggestion.Items>
                  {category.prompts.map((prompt) => (
                    <a
                      key={prompt.id}
                      className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      href="/new"
                      onClick={(event) =>
                        handlePromptSelect(event, prompt.title)
                      }
                    >
                      <PromptSuggestion.Item>
                        <Card.Header>
                          <PromptSuggestion.ItemTitle>
                            {prompt.title}
                          </PromptSuggestion.ItemTitle>
                          <PromptSuggestion.ItemDescription>
                            {prompt.description}
                          </PromptSuggestion.ItemDescription>
                        </Card.Header>
                      </PromptSuggestion.Item>
                    </a>
                  ))}
                </PromptSuggestion.Items>
              </PromptSuggestion.Group>
            ))}
          </div>
        </PromptSuggestion>
      </div>
    </div>
  )
}
