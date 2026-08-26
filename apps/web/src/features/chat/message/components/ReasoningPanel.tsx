import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from '../../../../components/assistant-ui/index.ts'
import type { ChatMessageReasoning } from '../../data/chat-types.ts'

interface ReasoningPanelProps {
  reasoning: ChatMessageReasoning
}

export function ReasoningPanel({ reasoning }: ReasoningPanelProps) {
  return (
    <ReasoningRoot
      defaultOpen={reasoning.defaultExpanded ?? false}
      variant="ghost"
    >
      <ReasoningTrigger duration={reasoning.duration} />
      <ReasoningContent>
        <ReasoningText>
          {reasoning.steps.map((step, stepIndex) => (
            <section key={`${step.label}-${stepIndex}`}>
              <h4 className="font-medium text-foreground">{step.label}</h4>
              <p className="mt-1 text-pretty">{step.content}</p>
            </section>
          ))}
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  )
}
