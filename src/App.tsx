import { useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { SyncScreen } from "./components/SyncScreen";
import { ChatScreen } from "./components/ChatScreen";

export type User = { id: string; name: string; avatar: string };

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"login" | "sync" | "chat">("login");
  const [user, setUser] = useState<User | null>(null);

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-gray-900 font-sans">
      {currentScreen === "login" && (
        <LoginScreen onLogin={(u) => { setUser(u); setCurrentScreen("sync"); }} />
      )}
      {currentScreen === "sync" && user && (
        <SyncScreen user={user} onComplete={() => setCurrentScreen("chat")} />
      )}
      {currentScreen === "chat" && user && <ChatScreen user={user} />}
    </div>
  );
}
