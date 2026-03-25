import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] bg-white/95 backdrop-blur-xl border border-sage-200 shadow-soft-xl rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-sm"
        >
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-800 mb-1">Update Available 🚀</h3>
            <p className="text-xs text-earth-600">A new version of Phase is ready. Reload to update.</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white text-xs font-semibold rounded-xl transition-all shadow-soft hover:shadow-soft-lg"
            >
              <RefreshCw className="w-3 h-3" />
              Reload
            </button>
            <button
              onClick={close}
              className="p-2 text-earth-400 hover:text-earth-600 hover:bg-earth-50 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
