import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Heart, Users } from 'lucide-react';
import { authService } from '../services/auth';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [role, setRole] = useState<'tracker' | 'partner'>('tracker');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check for magic link callback on component mount
  useEffect(() => {
    const handleMagicLink = async () => {
      try {
        const user = await authService.handleMagicLinkSignIn();
        if (user) {
          onAuthSuccess();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Magic link authentication failed');
      }
    };

    handleMagicLink();
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle(role);
      onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      await authService.sendMagicLink(email, role);
      setMagicLinkSent(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const buttonTap = { scale: 0.95 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-earth-50 via-sage-50 to-earth-100 flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-sage-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-earth-200/40 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative w-full max-w-md"
      >
        {/* Main Card */}
        <motion.div
          variants={cardVariants}
          className="bg-white/80 backdrop-blur-xl rounded-4xl shadow-soft-lg p-8 sm:p-10"
        >
          {/* Logo & Welcome Section */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex justify-center mb-6"
            >
              <img src="/pwa-192x192.png" alt="Phase Logo" className="w-16 h-16 sm:w-24 sm:h-24 mix-blend-multiply hover:scale-105 transition-transform duration-300 drop-shadow-sm" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-2 tracking-tight">
              Welcome to Phase
            </h1>
            <p className="text-earth-600 font-light">
              Your mindful cycle companion
            </p>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm opacity-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence mode="wait">
            {magicLinkSent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-sage-50 border border-sage-200 text-sage-700 rounded-2xl text-sm opacity-100"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  <span>Magic link sent! Check your email to sign in.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            {/* Role Selection - Segmented Control */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                I am a...
              </label>
              <div className="relative bg-earth-200/70 p-1.5 rounded-2xl">
                {/* Sliding background */}
                <motion.div
                  layout
                  className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-md ring-1 ring-sage-200/50"
                  initial={false}
                  animate={{
                    left: role === 'tracker' ? '4px' : '50%',
                    right: role === 'tracker' ? '50%' : '4px',
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
                <div className="relative grid grid-cols-2 gap-1">
                  <motion.button
                    type="button"
                    onClick={() => setRole('tracker')}
                    whileTap={buttonTap}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 opacity-100 ${
                      role === 'tracker'
                        ? 'text-sage-700'
                        : 'text-earth-500 hover:text-earth-700'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>Tracker</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setRole('partner')}
                    whileTap={buttonTap}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 opacity-100 ${
                      role === 'partner'
                        ? 'text-sage-700'
                        : 'text-earth-500 hover:text-earth-700'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Partner</span>
                  </motion.button>
                </div>
              </div>
              <p className="mt-2 text-xs text-earth-500 text-center">
                {role === 'tracker'
                  ? "Track your cycle and share insights with your partner"
                  : "Support and stay connected with your partner's journey"}
              </p>
            </motion.div>

            {/* Google Sign-In Button */}
            <motion.button
              variants={itemVariants}
              onClick={handleGoogleSignIn}
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={buttonTap}
              className="w-full bg-white border-2 border-earth-200 hover:border-sage-300 text-slate-700 font-medium py-4 rounded-2xl transition-colors duration-200 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:shadow-soft"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </motion.button>

            {/* Divider */}
            <motion.div variants={itemVariants} className="relative opacity-100">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-earth-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white/80 text-earth-400 text-sm">
                  or continue with email
                </span>
              </div>
            </motion.div>

            {/* Magic Link Form */}
            <motion.form variants={itemVariants} onSubmit={handleMagicLink} className="space-y-4 opacity-100">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-earth-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-earth-200 rounded-2xl focus:outline-none focus:border-sage-400 focus:ring-4 focus:ring-sage-100 transition-colors duration-200 opacity-100 bg-white text-slate-700 placeholder-earth-400"
                    placeholder="hello@example.com"
                    required
                  />
                </div>
              </div>
              <motion.button
                type="submit"
                disabled={loading || !email}
                whileHover={{ y: -2 }}
                whileTap={buttonTap}
                className="w-full bg-gradient-to-r from-sage-500 to-sage-600 hover:from-sage-600 hover:to-sage-700 text-white font-medium py-4 rounded-2xl transition-colors duration-200 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft hover:shadow-soft-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Send Magic Link
                  </span>
                )}
              </motion.button>
            </motion.form>

            <motion.p variants={itemVariants} className="text-center text-sm text-earth-500 opacity-100">
              No password needed. We'll send a secure link to your inbox.
            </motion.p>
          </div>
        </motion.div>

        {/* Footer tagline */}
        <motion.p
          variants={itemVariants}
          className="text-center text-earth-400 text-sm mt-6 opacity-100"
        >
          Mindful tracking for couples
        </motion.p>
      </motion.div>
    </div>
  );
}