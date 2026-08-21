import type { ComponentType } from 'react'
import { Compass, CopyPicture, SquarePlus } from '@gravity-ui/icons'

export type ChatNavItemId = 'new' | 'library' | 'explore'

export interface ChatNavItem {
  id: ChatNavItemId
  icon: ComponentType<{ className?: string }>
  label: string
}

export interface ChatModel {
  id: string
  label: string
}

export interface ChatThread {
  id: string
  title: string
  preview: string
  updatedAt: string
  user: {
    avatar: string
    email: string
    name: string
  }
}

export const CHAT_NAV_ITEMS: readonly ChatNavItem[] = [
  { icon: SquarePlus, id: 'new', label: 'New Chat' },
  { icon: CopyPicture, id: 'library', label: 'Library' },
  { icon: Compass, id: 'explore', label: 'Explore' },
] as const

export const CHAT_MODELS: readonly ChatModel[] = [
  { id: 'gpt-5.4', label: 'GPT-5.4' },
  { id: 'claude-4.6-opus', label: 'Claude 4.6 Opus' },
  { id: 'claude-4.6-sonnet', label: 'Claude 4.6 Sonnet' },
  { id: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro' },
] as const

export const SUGGESTED_PROMPTS: readonly string[] = [
  "Summarize this week's product and design updates into a team-ready status note.",
  'Turn a rough product brief into a launch checklist with owners and deadlines.',
  'Rewrite this paragraph for a skeptical executive who cares about ROI.',
  'Brainstorm onboarding flow names for a data-heavy analytics product.',
  'Draft a weekly 1:1 agenda that surfaces blockers and growth goals.',
  'Compare three pricing models and recommend one for a usage-based SaaS.',
] as const

const USER = {
  avatar:
    'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg',
  email: 'darnell@email.com',
  name: 'Darnell Howe',
} as const

export const CHAT_THREADS: readonly ChatThread[] = [
  {
    id: 'pro-ai-showcase',
    preview: 'Pro AI components, reasoning, sources, and tool states.',
    title: 'Pro AI components showcase',
    updatedAt: 'Just now',
    user: USER,
  },
  {
    id: 'quick-recipes-for-dinner',
    preview: 'Quick dinner ideas with simple ingredients and one-pan options.',
    title: 'Quick recipes for dinner',
    updatedAt: '2m ago',
    user: USER,
  },
  {
    id: 'launch-plan-for-q3-rollout',
    preview: 'Q3 analytics dashboard rollout plan with launch timeline and KPIs.',
    title: 'Launch plan for Q3 rollout',
    updatedAt: '18m ago',
    user: USER,
  },
  {
    id: 'rewrite-homepage-value-prop',
    preview: 'Homepage messaging focused on PM workflows and faster decisions.',
    title: 'Rewrite homepage value prop',
    updatedAt: '1h ago',
    user: USER,
  },
  {
    id: 'weekly-team-update-summary',
    preview: 'Team-ready summary of product, design, and engineering updates.',
    title: 'Weekly team update summary',
    updatedAt: 'Yesterday',
    user: USER,
  },
] as const
