import { NewChatPage } from '../pages/new-chat/NewChatPage.tsx'
import { ChatLayout } from './ChatLayout.tsx'

export function App() {
  return (
    <ChatLayout>
      <NewChatPage />
    </ChatLayout>
  )
}
