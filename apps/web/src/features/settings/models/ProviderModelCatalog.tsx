import { useState } from 'react'
import { Plus } from '@gravity-ui/icons'
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
  TextField,
} from '@heroui/react'
import {
  getBuiltInModels,
  mergeProviderModels,
  type ProviderModelConfig,
} from './provider-models.ts'
import { AvailableModelsDialog } from './AvailableModelsDialog.tsx'

interface ProviderModelCatalogProps {
  canLoadAvailableModels?: boolean
  providerId: string
  value: ProviderModelConfig[]
  onChange: (models: ProviderModelConfig[]) => void
}

/** 管理提供方表单中的本地模型目录。 */
export function ProviderModelCatalog({
  canLoadAvailableModels = true,
  providerId,
  value,
  onChange,
}: ProviderModelCatalogProps) {
  const [catalogMessage, setCatalogMessage] = useState('')
  const [availableModels, setAvailableModels] = useState<
    ProviderModelConfig[] | null
  >(null)

  const updateModel = (
    index: number,
    field: keyof ProviderModelConfig,
    nextValue: string,
  ) => {
    setCatalogMessage('')
    onChange(
      value.map((model, modelIndex) =>
        modelIndex === index ? { ...model, [field]: nextValue } : model,
      ),
    )
  }

  const addSelectedModels = (selectedModels: ProviderModelConfig[]) => {
    const models = mergeProviderModels(value, selectedModels)
    onChange(models)
    setCatalogMessage(
      models.length === value.length
        ? '所选模型已全部添加。'
        : `已添加 ${models.length - value.length} 个模型。`,
    )
    setAvailableModels(null)
  }

  return (
    <div className="border-t border-divider pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-medium text-foreground">模型目录</h4>
          <p className="mt-1 text-xs text-muted">
            {value.length === 0
              ? '正在使用适配器默认模型'
              : `已添加 ${value.length} 个模型`}
          </p>
        </div>
        <Button
          isDisabled={!canLoadAvailableModels}
          className="h-8 min-h-0 shrink-0 rounded-full px-3 text-xs"
          type="button"
          variant="outline"
          onPress={() => {
            setCatalogMessage('')
            setAvailableModels(getBuiltInModels(providerId))
          }}
        >
          获取可用模型
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {value.length === 0 ? (
          <Card
            className="rounded-xl border border-dashed border-divider px-4 py-4 text-center text-xs leading-5 text-muted shadow-none"
            variant="transparent"
          >
            模型选择器中将不显示任何模型；目录外 ID 仍可直接发送。
          </Card>
        ) : (
          value.map((model, index) => (
            <Card
              key={index}
              className="grid grid-cols-1 gap-3 rounded-xl border border-divider p-3 shadow-none sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
              variant="transparent"
            >
              <TextField isRequired>
                <Label>模型 ID</Label>
                <Input
                  placeholder="例如 deepseek-chat"
                  value={model.id}
                  variant="secondary"
                  onChange={(event) =>
                    updateModel(index, 'id', event.target.value)
                  }
                />
                <FieldError />
              </TextField>
              <TextField>
                <Label>显示名称</Label>
                <Input
                  placeholder="可选"
                  value={model.name}
                  variant="secondary"
                  onChange={(event) =>
                    updateModel(index, 'name', event.target.value)
                  }
                />
              </TextField>
              <Button
                className="h-9 min-h-0 rounded-full px-3 text-xs"
                type="button"
                variant="outline"
                onPress={() => {
                  setCatalogMessage('')
                  onChange(
                    value.filter((_, modelIndex) => modelIndex !== index),
                  )
                }}
              >
                删除
              </Button>
            </Card>
          ))
        )}
      </div>

      {catalogMessage ? (
        <p aria-live="polite" className="mt-2 text-xs text-muted">
          {catalogMessage}
        </p>
      ) : null}

      <Button
        className="mt-3 h-8 min-h-0 rounded-full px-3 text-xs"
        type="button"
        variant="outline"
        onPress={() => {
          setCatalogMessage('')
          onChange([...value, { id: '', name: '' }])
        }}
      >
        <Plus className="size-3.5" />
        添加模型
      </Button>

      {availableModels !== null ? (
        <AvailableModelsDialog
          candidates={availableModels}
          currentModels={value}
          onClose={() => setAvailableModels(null)}
          onConfirm={addSelectedModels}
        />
      ) : null}
    </div>
  )
}
