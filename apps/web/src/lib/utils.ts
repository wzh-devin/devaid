import { twMerge } from 'tailwind-merge'

export const cn = (...classes: (false | null | string | undefined)[]) =>
  twMerge(classes.filter(Boolean).join(' '))
