import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { QrCode, Sparkles } from "lucide-react";

export function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        onLogin(event.data.user);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      // Fetch the OAuth URL from our server
      const response = await fetch('/api/auth/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }
      const { url } = await response.json();

      // Open the OAuth PROVIDER's URL directly in popup
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('请允许浏览器弹出窗口以连接小红书账号。');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f9f9f9] p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden"
      >
        <div className="p-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 border border-gray-100">
            <Sparkles size={28} className="text-gray-800" />
          </div>
          <h1 className="text-2xl font-semibold mb-3 text-gray-900 tracking-tight">别躺了</h1>
          <p className="text-sm text-gray-500 mb-10 leading-relaxed">
            连接小红书，将您的收藏夹<br/>转化为专属的个人知识库。
          </p>
          
          <button 
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-black hover:bg-gray-800 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <QrCode size={18} />
                <span>扫码授权登录</span>
              </>
            )}
          </button>
          
          <p className="text-[11px] text-center text-gray-400 mt-6 leading-relaxed">
            登录即表示同意授权「别躺了」读取您的收藏笔记。<br/>您的数据仅存储于本地知识库，我们承诺保护您的隐私安全。
          </p>
        </div>
      </motion.div>
    </div>
  );
}
