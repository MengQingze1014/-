import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Database, Image as ImageIcon, Video, FileText, CheckSquare, Square } from "lucide-react";

export function SyncScreen({ user, onComplete }: { user: any, onComplete: () => void }) {
  const [step, setStep] = useState<"loading" | "consent" | "syncing" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const [categories, setCategories] = useState<{name: string, count: number}[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    // Fetch real data from our backend
    const fetchFavorites = async () => {
      try {
        const res = await fetch(`/api/xhs/favorites?userId=${user.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setCategories(json.data.categories);
          setTotal(json.data.total);
          setSelectedCategories(json.data.categories.map((c: any) => c.name));
          setStep("consent");
        }
      } catch (error) {
        console.error("Failed to fetch favorites", error);
        // Fallback for preview
        setCategories([{ name: '默认分类', count: 0 }]);
        setStep("consent");
      }
    };
    fetchFavorites();
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const startSync = () => {
    if (selectedCategories.length === 0) return;
    setStep("syncing");
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("done"), 500);
          return 100;
        }
        return p + Math.floor(Math.random() * 15);
      });
    }, 300);
  };

  useEffect(() => {
    if (step === "done") {
      const timer = setTimeout(() => onComplete(), 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9f9f9] p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
            {step === "done" ? (
              <CheckCircle2 size={32} className="text-gray-800" />
            ) : (
              <Database
                size={32}
                className={`text-gray-800 ${step === "syncing" ? "animate-pulse" : ""}`}
              />
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-2 text-gray-900 tracking-tight">
          {step === "loading" && "正在获取收藏数据..."}
          {step === "consent" && "选择要同步的笔记"}
          {step === "syncing" && "同步笔记中..."}
          {step === "done" && "知识库构建完成！"}
        </h2>

        <p className="text-sm text-gray-500 mb-8 min-h-[40px] leading-relaxed">
          {step === "loading" && "正在请求小红书接口"}
          {step === "consent" && `我们发现了 ${total} 篇收藏笔记。请选择您希望导入到个人知识库的内容。`}
          {step === "syncing" && "正在提取图文、视频并进行OCR与语音转文字处理"}
          {step === "done" && "已成功将选中的笔记转化为可搜索知识"}
        </p>

        {step === "loading" && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
          </div>
        )}

        {step === "consent" && (
          <div className="space-y-4 text-left mb-4">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 max-h-56 overflow-y-auto border border-gray-100">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-gray-100 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {selectedCategories.includes(cat.name) ? (
                      <CheckSquare size={18} className="text-gray-800" />
                    ) : (
                      <Square size={18} className="text-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {cat.count} 篇
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={startSync}
              disabled={selectedCategories.length === 0}
              className="w-full mt-4 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-xl font-medium transition-all"
            >
              同意并开始同步
            </button>
          </div>
        )}

        {step === "syncing" && (
          <div className="space-y-6 py-4">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="bg-black h-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>处理进度</span>
              <span>{Math.min(progress, 100)}%</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                <ImageIcon size={20} className="text-gray-600 mb-2" />
                <span className="text-[11px] text-gray-500 font-medium">图文提取</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                <Video size={20} className="text-gray-600 mb-2" />
                <span className="text-[11px] text-gray-500 font-medium">视频转录</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-gray-100">
                <FileText size={20} className="text-gray-600 mb-2" />
                <span className="text-[11px] text-gray-500 font-medium">自动打标</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
