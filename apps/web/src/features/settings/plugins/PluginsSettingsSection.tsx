import { useState, type FormEvent } from 'react'
import { CircleFill, Code, Server, TrashBin } from '@gravity-ui/icons'
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Switch,
  Tabs,
  TextField,
} from '@heroui/react'
import { SelectMenu } from '../../../components/ui/index.ts'
import {
  type McpTransport,
  type PluginSettingsTab,
  usePluginSettings,
} from '../providers/plugin-settings-context.ts'
import { PluginListPanel } from './PluginListPanel.tsx'
import { SettingsItemCard } from '../shared/SettingsItemCard.tsx'
import { SettingsAddButton } from '../shared/SettingsAddButton.tsx'
import { SettingsEditorActions } from '../shared/SettingsEditorActions.tsx'
import { SettingsEditorCard } from '../shared/SettingsEditorCard.tsx'

interface PluginsSettingsSectionProps {
  activeTab: PluginSettingsTab
  onTabChange: (tab: PluginSettingsTab) => void
}

const MCP_TRANSPORT_OPTIONS = [
  { id: 'stdio', label: 'STDIO' },
  { id: 'http', label: 'Streamable HTTP' },
] as const

type ActiveEditor = Exclude<PluginSettingsTab, 'plugins'> | null

/** 管理当前页面会话中的技能、MCP 与插件 Connector 模拟配置。 */
export function PluginsSettingsSection({
  activeTab,
  onTabChange,
}: PluginsSettingsSectionProps) {
  const { mcpServers, setMcpServers, setSkills, skills } = usePluginSettings()
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null)
  const [mcpTransport, setMcpTransport] = useState<McpTransport>('stdio')
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase()
  const visibleSkills = skills.filter((skill) =>
    `${skill.name} ${skill.description} ${skill.source}`
      .toLocaleLowerCase()
      .includes(normalizedSearchQuery),
  )
  const visibleMcpServers = mcpServers.filter((server) =>
    `${server.name} ${server.description} ${server.endpoint}`
      .toLocaleLowerCase()
      .includes(normalizedSearchQuery),
  )

  const handleSkillSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    if (!name || !description) return

    setSkills((currentSkills) => [
      ...currentSkills,
      {
        description,
        enabled: true,
        id: `skill-${crypto.randomUUID()}`,
        name,
        source: '本地',
      },
    ])
    setActiveEditor(null)
  }

  const handleMcpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const endpoint = String(formData.get('endpoint') ?? '').trim()
    if (!name || !endpoint) return

    setMcpServers((currentServers) => [
      ...currentServers,
      {
        description: '当前页面会话中新添加的模拟 MCP 服务器。',
        enabled: false,
        endpoint,
        id: `mcp-${crypto.randomUUID()}`,
        name,
        scope: 'project',
        status: 'disconnected',
        transport: mcpTransport,
      },
    ])
    setActiveEditor(null)
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="text-base leading-6 font-medium text-foreground">插件</h2>
      <p className="mt-3 text-sm leading-[22px] text-muted">
        管理当前页面会话中的技能、MCP 与插件
        Connector。这里是界面模拟，不会连接真实服务。
      </p>

      <Tabs
        className="mt-5"
        selectedKey={activeTab}
        variant="secondary"
        onSelectionChange={(key) => {
          setActiveEditor(null)
          setSearchQuery('')
          onTabChange(String(key) as PluginSettingsTab)
        }}
      >
        <Tabs.ListContainer className="border-b border-divider">
          <Tabs.List aria-label="插件设置" className="!min-w-0">
            <Tabs.Tab className="!w-auto px-3" id="skills">
              技能
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="!w-auto px-3" id="mcp">
              MCP
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className="!w-auto px-3" id="plugins">
              插件
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel className="pt-5" id="skills">
          <div className="flex flex-col gap-3">
            <TextField aria-label="搜索技能" value={searchQuery}>
              <Input
                placeholder="搜索技能"
                variant="secondary"
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
            </TextField>

            {visibleSkills.map((skill) => (
              <SettingsItemCard
                key={skill.id}
                actions={
                  <>
                    <Switch
                      size="sm"
                      isSelected={skill.enabled}
                      onChange={(enabled) =>
                        setSkills((currentSkills) =>
                          currentSkills.map((currentSkill) =>
                            currentSkill.id === skill.id
                              ? { ...currentSkill, enabled }
                              : currentSkill,
                          ),
                        )
                      }
                    >
                      <Switch.Content>
                        <Switch.Control>
                          <Switch.Thumb />
                        </Switch.Control>
                        <Label className="sr-only">
                          {skill.enabled ? '禁用' : '启用'}技能 {skill.name}
                        </Label>
                      </Switch.Content>
                    </Switch>
                    <Button
                      isIconOnly
                      aria-label={`移除技能 ${skill.name}`}
                      className="size-7 min-w-7 text-muted"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        if (!window.confirm(`移除技能“${skill.name}”？`)) return
                        setSkills((currentSkills) =>
                          currentSkills.filter(
                            (currentSkill) => currentSkill.id !== skill.id,
                          ),
                        )
                      }}
                    >
                      <TrashBin className="size-3.5" />
                    </Button>
                  </>
                }
                description={skill.description}
                icon={<Code aria-hidden className="size-4 text-muted" />}
                title={
                  <>
                    <span className="truncate">{skill.name}</span>
                    <span className="shrink-0 text-xs font-normal text-muted">
                      {skill.source}
                    </span>
                  </>
                }
              />
            ))}

            {visibleSkills.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                没有匹配的技能
              </p>
            ) : null}

            {activeEditor === 'skills' ? (
              <SettingsEditorCard>
                <Form
                  aria-label="添加技能"
                  className="flex flex-col gap-4"
                  onSubmit={handleSkillSubmit}
                >
                  <TextField isRequired name="name">
                    <Label>技能名称</Label>
                    <Input placeholder="例如：发布检查" variant="secondary" />
                    <FieldError />
                  </TextField>
                  <TextField isRequired name="description">
                    <Label>技能描述</Label>
                    <Input
                      placeholder="说明技能适合处理什么任务"
                      variant="secondary"
                    />
                    <FieldError />
                  </TextField>
                  <SettingsEditorActions
                    onCancel={() => setActiveEditor(null)}
                  />
                </Form>
              </SettingsEditorCard>
            ) : (
              <SettingsAddButton
                label="添加技能"
                onPress={() => setActiveEditor('skills')}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-5" id="mcp">
          <div className="flex flex-col gap-3">
            <TextField aria-label="搜索 MCP" value={searchQuery}>
              <Input
                placeholder="搜索 MCP"
                variant="secondary"
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
            </TextField>

            {visibleMcpServers.map((server) => (
              <SettingsItemCard
                key={server.id}
                actions={
                  <>
                    {server.status === 'disconnected' ? (
                      <Button
                        className="h-7 min-h-0 rounded-full !px-2.5 !text-xs"
                        size="sm"
                        variant="outline"
                        onPress={() =>
                          setMcpServers((currentServers) =>
                            currentServers.map((currentServer) =>
                              currentServer.id === server.id
                                ? {
                                    ...currentServer,
                                    enabled: true,
                                    status: 'connected',
                                  }
                                : currentServer,
                            ),
                          )
                        }
                      >
                        模拟连接
                      </Button>
                    ) : (
                      <Switch
                        size="sm"
                        isSelected={server.enabled}
                        onChange={(enabled) =>
                          setMcpServers((currentServers) =>
                            currentServers.map((currentServer) =>
                              currentServer.id === server.id
                                ? { ...currentServer, enabled }
                                : currentServer,
                            ),
                          )
                        }
                      >
                        <Switch.Content>
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                          <Label className="sr-only">
                            {server.enabled ? '禁用' : '启用'} MCP {server.name}
                          </Label>
                        </Switch.Content>
                      </Switch>
                    )}
                    <Button
                      isIconOnly
                      aria-label={`移除 MCP ${server.name}`}
                      className="size-7 min-w-7 text-muted"
                      size="sm"
                      variant="ghost"
                      onPress={() => {
                        if (!window.confirm(`移除 MCP“${server.name}”？`))
                          return
                        setMcpServers((currentServers) =>
                          currentServers.filter(
                            (currentServer) => currentServer.id !== server.id,
                          ),
                        )
                      }}
                    >
                      <TrashBin className="size-3.5" />
                    </Button>
                  </>
                }
                description={
                  <span title={server.endpoint}>
                    {server.transport === 'stdio' ? 'STDIO' : 'Streamable HTTP'}
                    {' · '}
                    {server.endpoint}
                  </span>
                }
                icon={<Server aria-hidden className="size-4 text-muted" />}
                title={
                  <>
                    <span className="truncate">{server.name}</span>
                    <CircleFill
                      aria-label={
                        server.status === 'connected'
                          ? `${server.name} 已连接`
                          : `${server.name} 未连接`
                      }
                      className={`size-2 shrink-0 ${server.status === 'connected' ? 'text-success' : 'text-muted'}`}
                      role="img"
                    />
                  </>
                }
              />
            ))}

            {visibleMcpServers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                没有匹配的 MCP
              </p>
            ) : null}

            {activeEditor === 'mcp' ? (
              <SettingsEditorCard>
                <Form
                  aria-label="添加 MCP"
                  className="flex flex-col gap-4"
                  onSubmit={handleMcpSubmit}
                >
                  <TextField isRequired name="name">
                    <Label>服务器名称</Label>
                    <Input placeholder="例如：GitHub" variant="secondary" />
                    <FieldError />
                  </TextField>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-foreground">
                      连接方式
                    </span>
                    <SelectMenu
                      ariaLabel="MCP 连接方式"
                      options={MCP_TRANSPORT_OPTIONS}
                      triggerClassName="w-full sm:max-w-60"
                      value={mcpTransport}
                      onChange={(transport) =>
                        setMcpTransport(transport as McpTransport)
                      }
                    />
                  </div>
                  <TextField isRequired name="endpoint">
                    <Label>
                      {mcpTransport === 'stdio' ? '启动命令' : '服务地址'}
                    </Label>
                    <Input
                      placeholder={
                        mcpTransport === 'stdio'
                          ? '例如：npx -y @example/mcp-server'
                          : 'https://mcp.example.com'
                      }
                      variant="secondary"
                    />
                    <FieldError />
                  </TextField>
                  <p className="text-xs leading-5 text-muted">
                    本阶段只保存页面会话中的模拟配置，不会执行命令或发送网络请求。
                  </p>
                  <SettingsEditorActions
                    submitLabel="添加 MCP"
                    onCancel={() => setActiveEditor(null)}
                  />
                </Form>
              </SettingsEditorCard>
            ) : (
              <SettingsAddButton
                label="添加 MCP"
                onPress={() => setActiveEditor('mcp')}
              />
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel className="pt-5" id="plugins">
          <PluginListPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        </Tabs.Panel>
      </Tabs>
    </section>
  )
}
