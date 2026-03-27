import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { useWaitlistSpots, resetWaitlist } from '../services/waitlistService';

export function DevToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { appState, setAppState } = useAppState();
  const spots = useWaitlistSpots();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-[#121212] text-white p-3 rounded-full shadow-lg hover:bg-neutral-800 transition-colors"
        aria-label="Open Dev Toggle"
      >
        <Settings size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-[9999] bg-white p-5 rounded-2xl shadow-2xl border border-neutral-200 w-72"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Dev Settings</h3>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 block">
                  Role
                </label>
                <select
                  value={appState.role}
                  onChange={(e) => setAppState({ role: e.target.value as any })}
                  className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#C81D6B]"
                >
                  <option value="visitor">Visitor</option>
                  <option value="client">Client</option>
                  <option value="coach">Coach</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Authenticated</label>
                <input
                  type="checkbox"
                  checked={appState.isAuthenticated}
                  onChange={(e) => setAppState({ isAuthenticated: e.target.checked })}
                  className="accent-[#C81D6B] w-4 h-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Has Bundle</label>
                <input
                  type="checkbox"
                  checked={appState.hasBundle}
                  onChange={(e) => setAppState({ hasBundle: e.target.checked })}
                  className="accent-[#C81D6B] w-4 h-4"
                />
              </div>

              {/* Waitlist section */}
              <div className="border-t border-neutral-200 pt-4 mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Waiting List Mode</label>
                  <input
                    type="checkbox"
                    checked={appState.isWaitlistMode}
                    onChange={(e) => setAppState({ isWaitlistMode: e.target.checked })}
                    className="accent-[#C81D6B] w-4 h-4"
                  />
                </div>

                {appState.isWaitlistMode && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>Spots: {spots} / 50</span>
                      <button
                        onClick={resetWaitlist}
                        className="text-neutral-400 hover:text-[#C81D6B] underline cursor-pointer transition-colors"
                      >
                        Reset counter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
