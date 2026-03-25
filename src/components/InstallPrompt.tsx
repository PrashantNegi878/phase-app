import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Handle standard Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS for manual install instructions
    const ua = window.navigator.userAgent;
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isWebkit = !!ua.match(/WebKit/i);
    const isSafari = isWebkit && !ua.match(/CriOS/i);
    
    if ((isIPad || isIPhone) && isSafari && !(window.navigator as any).standalone) {
      setIsIOS(true);
      // Wait a bit before showing to not overwhelm the user immediately on first load
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const closePrompt = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed left-4 right-4 z-[90] sm:left-auto sm:right-6 sm:max-w-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 16px) + 16px)' }}
      >
        <div className="bg-white/95 backdrop-blur-xl border border-sage-200 shadow-soft-xl rounded-2xl p-4 flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              Install Phase
            </h3>
            {isIOS ? (
              <p className="text-xs text-earth-600 leading-relaxed">
                To install, tap the <Share className="inline w-3 h-3 mx-1 text-sage-600" /> Share button and select <strong>"Add to Home Screen"</strong>.
              </p>
            ) : (
              <p className="text-xs text-earth-600">
                Install our app on your device for quick access and offline support.
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2 mt-1">
            <button
              onClick={closePrompt}
              className="p-1 text-earth-400 hover:text-earth-600 hover:bg-earth-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {!isIOS && (
              <button
                onClick={handleInstallClick}
                className="mt-1 flex items-center justify-center p-2 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white rounded-xl transition-all shadow-soft hover:shadow-soft-lg"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
