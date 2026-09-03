import {
  convertToLlm,
  type AgentMessage,
  type Entry,
} from '@earendil-works/pi-agent-core'

import type {
  AgentMessageAttachment,
  AgentMessageContextItem,
} from './run-input.ts'
import { SESSION_CUSTOM_TYPE } from '../session/session-custom-type.ts'

export interface StoredAttachment extends AgentMessageAttachment {
  content?: string
  kind?: 'image' | 'text'
}

export interface StructuredMessageDetails {
  attachments: StoredAttachment[]
  content: string
  contextItems: AgentMessageContextItem[]
  schemaVersion: 1 | 2
}

export interface SessionAttachmentResource {
  content: string
  id: string
  kind: 'image' | 'text'
  mimeType: string
  name: string
}

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export const attachmentManifest = (
  attachments: readonly AgentMessageAttachment[],
) => ({
  text: [
    '<attachments>',
    ...attachments.map(
      (attachment) =>
        `  <attachment id="${escapeXml(attachment.id)}" name="${escapeXml(attachment.name)}" mime_type="${escapeXml(attachment.mimeType)}" size="${attachment.size}" />`,
    ),
    '</attachments>',
  ].join('\n'),
  type: 'text' as const,
})

export function structuredMessageDetails(
  value: unknown,
): StructuredMessageDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const details = value as Record<string, unknown>
  if (
    (details.schemaVersion !== 1 && details.schemaVersion !== 2) ||
    typeof details.content !== 'string' ||
    !Array.isArray(details.attachments) ||
    !Array.isArray(details.contextItems)
  ) {
    return undefined
  }
  const schemaVersion = details.schemaVersion
  const attachments = details.attachments.flatMap<StoredAttachment>(
    (attachment) => {
      if (
        !attachment ||
        typeof attachment !== 'object' ||
        Array.isArray(attachment)
      ) {
        return []
      }
      const item = attachment as Record<string, unknown>
      if (
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        typeof item.mimeType !== 'string' ||
        typeof item.size !== 'number' ||
        !Number.isSafeInteger(item.contentIndex) ||
        (item.contentIndex as number) < 0 ||
        (schemaVersion === 2 &&
          (typeof item.content !== 'string' ||
            (item.kind !== 'image' && item.kind !== 'text')))
      ) {
        return []
      }
      return [
        {
          contentIndex: item.contentIndex as number,
          id: item.id,
          mimeType: item.mimeType,
          name: item.name,
          size: item.size,
          ...(schemaVersion === 2
            ? {
                content: item.content as string,
                kind: item.kind as 'image' | 'text',
              }
            : {}),
        },
      ]
    },
  )
  if (attachments.length !== details.attachments.length) return undefined
  const contextItems = details.contextItems.flatMap<AgentMessageContextItem>(
    (contextItem) => {
      if (
        !contextItem ||
        typeof contextItem !== 'object' ||
        Array.isArray(contextItem)
      ) {
        return []
      }
      const item = contextItem as Record<string, unknown>
      return typeof item.id === 'string' &&
        (item.kind === 'command' || item.kind === 'skill') &&
        typeof item.label === 'string' &&
        typeof item.description === 'string' &&
        typeof item.reference === 'string' &&
        typeof item.sourceId === 'string'
        ? [
            {
              description: item.description,
              id: item.id,
              kind: item.kind,
              label: item.label,
              reference: item.reference,
              sourceId: item.sourceId,
            },
          ]
        : []
    },
  )
  if (contextItems.length !== details.contextItems.length) return undefined
  return {
    attachments,
    content: details.content,
    contextItems,
    schemaVersion,
  }
}

export const modelSafeAttachmentMessage = (
  message: AgentMessage,
): AgentMessage => {
  if (
    message.role !== 'custom' ||
    message.customType !== SESSION_CUSTOM_TYPE.userInput
  ) {
    return message
  }
  const details = structuredMessageDetails(message.details)
  if (!details) {
    return {
      ...message,
      content: [
        {
          text: '[Structured user input could not be restored safely.]',
          type: 'text',
        },
      ],
    }
  }
  if (details.schemaVersion === 2) return message
  const attachmentIndexes = new Set(
    details.attachments.map((attachment) => attachment.contentIndex),
  )
  const content =
    typeof message.content === 'string'
      ? [{ text: details.content, type: 'text' as const }]
      : message.content.filter((_, index) => !attachmentIndexes.has(index))
  if (details.attachments.length)
    content.push(attachmentManifest(details.attachments))
  return { ...message, content }
}

export const convertAttachmentMessagesToLlm = (messages: AgentMessage[]) =>
  convertToLlm(messages.map(modelSafeAttachmentMessage))

export const modelSafeAttachmentEntries = (entries: Entry[]) =>
  entries.map((entry) =>
    entry.type === 'message'
      ? { ...entry, message: modelSafeAttachmentMessage(entry.message) }
      : entry,
  ) as Entry[]

const legacyText = (text: string) => {
  const start = text.indexOf('\n')
  const suffix = '\n</attachment>'
  return text.startsWith('<attachment ') && start >= 0 && text.endsWith(suffix)
    ? text.slice(start + 1, -suffix.length)
    : text
}

export const attachmentResourcesFromEntries = (
  entries: readonly Entry[],
  incoming?: AgentMessage,
) => {
  const messages = [
    ...entries.flatMap((entry) =>
      entry.type === 'message' ? [entry.message] : [],
    ),
    ...(incoming ? [incoming] : []),
  ]
  const resources = new Map<string, SessionAttachmentResource>()
  for (const message of messages) {
    if (
      message.role !== 'custom' ||
      message.customType !== SESSION_CUSTOM_TYPE.userInput
    ) {
      continue
    }
    const details = structuredMessageDetails(message.details)
    if (!details) continue
    for (const attachment of details.attachments) {
      if (
        details.schemaVersion === 2 &&
        attachment.content !== undefined &&
        attachment.kind
      ) {
        resources.set(attachment.id, {
          content: attachment.content,
          id: attachment.id,
          kind: attachment.kind,
          mimeType: attachment.mimeType,
          name: attachment.name,
        })
        continue
      }
      if (typeof message.content === 'string') continue
      const content = message.content[attachment.contentIndex]
      if (content?.type === 'image') {
        resources.set(attachment.id, {
          content: content.data,
          id: attachment.id,
          kind: 'image',
          mimeType: content.mimeType,
          name: attachment.name,
        })
      } else if (content?.type === 'text') {
        resources.set(attachment.id, {
          content: legacyText(content.text),
          id: attachment.id,
          kind: 'text',
          mimeType: attachment.mimeType,
          name: attachment.name,
        })
      }
    }
  }
  return [...resources.values()]
}
