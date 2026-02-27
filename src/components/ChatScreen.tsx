import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Search, Sparkles, ExternalLink, Menu, User, Settings, LogOut, Database, Plus } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { title: string; url: string; type: "image" | "video" | "text" }[];
};

export function ChatScreen({ user }: { user: any }) {
  const [notes, setNotes] = useState<any[]>([]);
  const [categories, setCategories] = useState<{name: string, count: number}[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `你好，${user.name}！我是你的小红书个人知识库助手「别躺了」。我已经同步了你的收藏笔记。你想找点什么？比如你可以问我：“我收藏过哪些关于减脂餐的笔记？”`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`/api/xhs/notes?userId=${user.id}`);
        const json = await res.json();
        if (json.success) {
          setNotes(json.data);
          // Calculate categories
          const catMap = new Map<string, number>();
          json.data.forEach((note: any) => {
            catMap.set(note.category, (catMap.get(note.category) || 0) + 1);
          });
          const catArray = Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
          setCategories(catArray);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotes();
  }, [user.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const context = notes.map(n => `标题: ${n.title}\n分类: ${n.category}\n内容: ${n.content}\n链接: ${n.url}\n类型: ${n.type}`).join('\n\n---\n\n');

      const prompt = `
你是一个名为“别躺了”的AI智能体，帮助小红书用户查询他们收藏的笔记。
以下是用户真实的收藏笔记内容库（请严格基于这些内容回答）：

<knowledge_base>
${context}
</knowledge_base>

用户的问题是：${userMsg.content}

回答要求：
1. 语气友好、简洁，像一个贴心的助手。
2. 必须严格根据 <knowledge_base> 中的内容回答。如果用户的提问在知识库中找不到答案，请明确告知“在您的收藏中没有找到相关内容”。
3. 必须在回答的最后，以 JSON 格式提供引用的笔记列表，格式如下（不要使用 Markdown 代码块包裹 JSON，直接输出 JSON 字符串即可）：
CITATIONS: [{"title": "笔记标题", "url": "https://xiaohongshu.com/explore/...", "type": "image" | "video" | "text"}]
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text || "";

      let content = text;
      let citations = [];

      const citationMatch = text.match(/CITATIONS:\s*(?:```json\s*)?(\[.*?\])(?:\s*```)?/s);
      if (citationMatch) {
        try {
          citations = JSON.parse(citationMatch[1]);
          content = text.replace(/CITATIONS:\s*(?:```json\s*)?\[.*?\](?:\s*```)?/s, "").trim();
        } catch (e) {
          console.error("Failed to parse citations", e);
        }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        citations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "抱歉，查询知识库时出现了一些问题，请稍后再试。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f9f9f9] w-full font-sans text-gray-900">
      {/* Sidebar - IMA Style (Minimal, light gray) */}
      <div className="hidden md:flex w-[260px] flex-col bg-[#f9f9f9] shrink-0 border-r border-gray-100/50">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl bg-gray-200" />
            <h1 className="text-lg font-semibold tracking-tight">{user.name}的知识库</h1>
          </div>
          
          <button className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:shadow-sm transition-all text-gray-700">
            <span>新对话</span>
            <Plus size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3 mt-4">知识库分类</div>
          {categories.map(
            (category, i) => (
              <button
                key={i}
                className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] text-gray-600 hover:bg-black/5 hover:text-gray-900 transition-colors font-medium flex justify-between items-center"
              >
                <span>{category.name}</span>
                <span className="text-gray-400 text-xs">{category.count}</span>
              </button>
            ),
          )}
        </div>

        <div className="p-4 space-y-1 mb-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-600 hover:bg-black/5 transition-colors font-medium">
            <Database size={16} className="text-gray-400" />
            立即同步
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-600 hover:bg-black/5 transition-colors font-medium">
            <Settings size={16} className="text-gray-400" />
            设置
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-600 hover:bg-black/5 transition-colors font-medium">
            <LogOut size={16} className="text-gray-400" />
            退出登录
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative bg-white rounded-l-[32px] shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-gray-100 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl bg-gray-200" />
            <h1 className="text-lg font-semibold tracking-tight">{user.name}的知识库</h1>
          </div>
          <button className="p-2 text-gray-500">
            <Menu size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 pb-32">
          <div className="max-w-3xl mx-auto space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex max-w-[85%] sm:max-w-[80%] gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles size={16} className="text-gray-800" />
                      </div>
                    ) : (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl bg-gray-200 shrink-0 mt-1" />
                    )}

                    <div className="flex flex-col gap-3">
                      <div
                        className={`px-5 py-3.5 text-[15px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#f4f4f5] text-gray-900 rounded-[20px] rounded-tr-sm"
                            : "text-gray-800"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((cite, i) => (
                              <a
                                key={i}
                                href={cite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-xl text-[13px] text-gray-600 hover:border-gray-300 hover:shadow-sm transition-all"
                              >
                                <ExternalLink size={14} className="text-gray-400" />
                                <span className="truncate max-w-[180px] font-medium">
                                  {cite.title}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={16} className="text-gray-800" />
                  </div>
                  <div className="px-5 py-4 flex items-center gap-2">
                    <div
                      className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating Input Area - IMA Style */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto relative pointer-events-auto">
            <div className="relative flex items-end gap-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-2">
              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="搜索你的小红书知识库..."
                  className="w-full bg-transparent border-transparent focus:ring-0 rounded-xl py-3 pl-4 pr-12 text-[15px] resize-none transition-all outline-none text-gray-800 placeholder:text-gray-400"
                  rows={1}
                  style={{ minHeight: "48px", maxHeight: "160px" }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 mb-1 mr-1 shrink-0 bg-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-all"
              >
                <Send
                  size={18}
                  className={input.trim() && !isLoading ? "translate-x-0.5" : ""}
                />
              </button>
            </div>
            <div className="text-center mt-3">
              <span className="text-[11px] text-gray-400 font-medium">
                AI 可能会犯错，请结合原笔记核实。
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
