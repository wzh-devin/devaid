import { useState } from 'react'
import {
  Button,
  Disclosure,
  FieldError,
  Input,
  Label,
  TextField,
} from '@heroui/react'
import { SelectMenu } from '../../../components/ui/SelectMenu.tsx'
import {
  API_PROTOCOL_OPTIONS,
  type ApiProtocol,
  type ProviderConfiguration,
} from '../provider-models.ts'
import { ProviderModelCatalog } from './ProviderModelCatalog.tsx'

interface ProviderCustomSettingsProps {
  providerId: string
  value: ProviderConfiguration
  onChange: (value: ProviderConfiguration) => void
}

/** 提供方编辑与新增流程共用的业务级高级配置。 */
export function ProviderCustomSettings({
  providerId,
  value,
  onChange,
}: ProviderCustomSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Disclosure isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
      <Disclosure.Heading className="border-t border-divider pt-4">
        <Button
          className="h-auto min-h-0 justify-start gap-2 px-0 py-0 text-sm font-medium text-muted"
          slot="trigger"
          type="button"
          variant="ghost"
        >
          <Disclosure.Indicator className="text-muted" />
          自定义设置
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content className="**:data-[slot=disclosure-body]:p-0">
        <Disclosure.Body className="flex flex-col gap-5 pt-5">
          {value.apiProtocol ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                API 协议
              </span>
              <SelectMenu
                ariaLabel="API 协议"
                options={API_PROTOCOL_OPTIONS}
                triggerClassName="w-full sm:max-w-60"
                value={value.apiProtocol}
                onChange={(apiProtocol) =>
                  onChange({ ...value, apiProtocol: apiProtocol as ApiProtocol })
                }
              />
            </div>
          ) : null}

          <TextField name="baseUrl" type="url" value={value.baseUrl}>
            <Label>API 地址</Label>
            <Input
              placeholder="提供方默认"
              variant="secondary"
              onChange={(event) =>
                onChange({ ...value, baseUrl: event.target.value })
              }
            />
            <FieldError />
          </TextField>

          <ProviderModelCatalog
            canLoadAvailableModels={!value.apiProtocol}
            providerId={providerId}
            value={value.models}
            onChange={(models) => onChange({ ...value, models })}
          />
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  )
}
