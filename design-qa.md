---
title: "Design QA - Vite Template Chat"
type: "design-qa"
status: "passed"
created: "2026-08-21 17:55"
updated: "2026-08-21 17:55"
---

# Design QA - Vite Template Chat

## 比较输入

- 参考源：`.devin-project-harness/features/vite-template-chat/assets/reference-desktop.png`
- 实现截图：`.devin-project-harness/features/vite-template-chat/assets/implementation-desktop.png`
- 并排对照：`.devin-project-harness/features/vite-template-chat/assets/comparison-desktop.png`
- 移动端截图：`.devin-project-harness/features/vite-template-chat/assets/implementation-mobile.png`

## 归一化规则

- 参考原图为 3024×1898 物理像素，先移除顶部 174 像素浏览器外壳，再按 2× 密度缩放为 1512×862 CSS 像素。
- 实现使用相同的 1512×862 CSS 视口和 `/new` 默认浅色状态，完整页面与参考图放在同一张 3024×862 对照图中检查。
- 参考图右侧两个粉色悬浮控件属于浏览器扩展覆盖层，不属于模板页面，未纳入复刻范围。

## 全局与重点区域检查

- 全局：240px 侧栏、顶部导航、居中欢迎区、714px 内容宽度及底部输入区的结构和纵向节奏一致。
- 侧栏：头像、用户信息、选中态、分隔线与最近会话的图标、文字密度和截断行为一致。
- 主区：标题、说明、两列六项建议词的字号、行高、圆角、边框与间距一致。
- 输入区：白色输入容器、附件按钮、模型选择和发送按钮的位置、尺寸与颜色一致。
- 移动端：390×844 下侧栏转换为带可访问标题的抽屉，建议词单列展示，输入区无横向溢出。

## 交互与运行状态

- 建议词点击后正确填入输入框。
- 搜索按钮及 Meta/Ctrl+K 打开命令面板，搜索过滤与 Escape 关闭有效。
- 模型可从 GPT-5.4 切换到 Claude 4.6 Sonnet。
- 文件可添加到附件列表并移除；对象 URL 和计时器在生命周期结束时清理。
- 发送按钮正确经历 submitted、streaming、ready 状态，空输入保持禁用。
- 最终桌面与移动端浏览器控制台均为 0 error、0 warning。

## 修复记录

- 首轮移动侧栏打开时，UI Pro 的 Sheet Dialog 缺少可访问标题并产生 3 条警告；已通过 `Sheet.Heading` 增加屏幕阅读器标题，复验无告警。

final result: passed
