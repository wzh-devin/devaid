interface ProviderEditorHeadingProps {
  className?: string
  description?: string
  isInline?: boolean
  title: string
}

/** 展示模型提供方编辑器标题与可选标识。 */
export function ProviderEditorHeading({
  className,
  description,
  isInline,
  title,
}: ProviderEditorHeadingProps) {
  return (
    <div
      className={`${isInline ? 'flex items-baseline gap-2' : ''} ${className ?? ''}`}
    >
      <h3 className="text-sm leading-[22px] font-medium text-foreground">
        {title}
      </h3>
      {description ? (
        <p
          className={`${isInline ? '' : 'mt-1'} text-xs leading-[18px] text-muted`}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
