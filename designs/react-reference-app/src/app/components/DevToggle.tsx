import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X } from 'lucide-react';
import {
  useAppState,
  type PrototypeWaitlistAvailability,
} from '../context/AppContext';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

function parseWaitlistAvailabilityControl(
  value: string,
): PrototypeWaitlistAvailability {
  if (value === 'available' || value === 'limited' || value === 'closed') {
    return value;
  }

  return null;
}

function parseStoreCheckoutOutcomeControl(
  value: string,
): PrototypeStoreCheckoutOutcome {
  if (
    value === 'bot-rejected' ||
    value === 'delivery-failure' ||
    value === 'server-error' ||
    value === 'unavailable-product'
  ) {
    return value;
  }

  return 'success';
}

export function DevToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { appState, setAppState } = useAppState();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-[9999] bg-[#121212] text-white p-3 rounded-full shadow-lg hover:bg-neutral-800 transition-colors bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-4"
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
            className="fixed right-4 z-[9999] bg-white p-5 rounded-2xl shadow-2xl border border-neutral-200 w-80 max-w-[calc(100vw-2rem)] bottom-[calc(env(safe-area-inset-bottom)+9rem)] lg:bottom-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Dev Settings</h3>
              <button onClick={() => setIsOpen(false)} className="text-neutral-500 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <Tabs defaultValue="session">
              <TabsList className="w-full">
                <TabsTrigger value="session">Session</TabsTrigger>
                <TabsTrigger value="store">Store</TabsTrigger>
                <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
                <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-semibold text-copy-muted uppercase tracking-wider mb-2 block">
                    Role
                  </label>
                  <select
                    value={appState.role}
                    onChange={(e) => setAppState({ role: e.target.value as any })}
                    className="w-full border border-control-border-soft bg-card text-foreground rounded-lg p-2 text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="visitor">Visitor</option>
                    <option value="client">Client</option>
                    <option value="coach">Coach</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="dev-authenticated" className="text-sm font-medium">Authenticated</label>
                  <input
                    id="dev-authenticated"
                    type="checkbox"
                    checked={appState.isAuthenticated}
                    onChange={(e) => setAppState({ isAuthenticated: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="dev-has-bundle" className="text-sm font-medium">Has Bundle</label>
                  <input
                    id="dev-has-bundle"
                    type="checkbox"
                    checked={appState.hasBundle}
                    onChange={(e) => setAppState({ hasBundle: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>

                {appState.role === 'client' && (
                  <div className="flex items-center justify-between">
                    <label htmlFor="dev-needs-onboarding" className="text-sm font-medium">Needs Onboarding</label>
                    <input
                      id="dev-needs-onboarding"
                      type="checkbox"
                      checked={appState.needsOnboarding}
                      onChange={(e) => setAppState({ needsOnboarding: e.target.checked })}
                      className="accent-brand w-4 h-4"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="store" className="space-y-3 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="dev-store-empty-catalog" className="text-sm font-medium">
                    Empty catalog
                  </label>
                  <input
                    id="dev-store-empty-catalog"
                    type="checkbox"
                    checked={appState.isStoreCatalogEmpty}
                    onChange={(e) => setAppState({ isStoreCatalogEmpty: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dev-store-checkout-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider mb-2 block"
                  >
                    Checkout outcome
                  </label>
                  <select
                    id="dev-store-checkout-outcome"
                    value={appState.storeCheckoutOutcome}
                    onChange={(event) => {
                      setAppState({
                        storeCheckoutOutcome:
                          parseStoreCheckoutOutcomeControl(
                            event.target.value,
                          ),
                      });
                    }}
                    className="w-full border border-control-border-soft bg-card text-foreground rounded-lg p-2 text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="success">Success</option>
                    <option value="bot-rejected">Bot verification rejected</option>
                    <option value="delivery-failure">Delivery failure</option>
                    <option value="server-error">Server failure</option>
                    <option value="unavailable-product">Unavailable product in cart</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="dev-store-download-unavailable" className="text-sm font-medium">
                    Download link unavailable
                  </label>
                  <input
                    id="dev-store-download-unavailable"
                    type="checkbox"
                    checked={appState.isDownloadUnavailable}
                    onChange={(e) => setAppState({ isDownloadUnavailable: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>
              </TabsContent>

              <TabsContent value="waitlist" className="space-y-3 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="dev-waitlist-mode"
                    className="text-sm font-medium"
                  >
                    Waiting List Mode
                  </label>
                  <input
                    id="dev-waitlist-mode"
                    type="checkbox"
                    checked={appState.isWaitlistMode}
                    onChange={(e) => setAppState({ isWaitlistMode: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>

                {appState.isWaitlistMode && (
                  <div>
                    <label
                      htmlFor="dev-waitlist-availability"
                      className="text-xs font-semibold text-copy-muted uppercase tracking-wider mb-2 block"
                    >
                      Availability
                    </label>
                    <select
                      id="dev-waitlist-availability"
                      value={appState.waitlistAvailability ?? 'unavailable'}
                      onChange={(event) => {
                        setAppState({
                          waitlistAvailability:
                            parseWaitlistAvailabilityControl(
                              event.target.value,
                            ),
                        });
                      }}
                      className="w-full border border-control-border-soft bg-card text-foreground rounded-lg p-2 text-sm focus:outline-none focus:border-brand"
                    >
                      <option value="available">Available</option>
                      <option value="limited">Limited</option>
                      <option value="closed">Closed</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="nutrition" className="space-y-3 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="dev-nutrition-block-completed" className="text-sm font-medium">
                    Block completed (show review)
                  </label>
                  <input
                    id="dev-nutrition-block-completed"
                    type="checkbox"
                    checked={appState.nutritionBlockCompleted}
                    onChange={(e) => setAppState({ nutritionBlockCompleted: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="dev-nutrition-preference-conflict" className="text-sm font-medium">
                    Preference conflict (salmon)
                  </label>
                  <input
                    id="dev-nutrition-preference-conflict"
                    type="checkbox"
                    checked={appState.nutritionPreferenceConflict}
                    onChange={(e) => setAppState({ nutritionPreferenceConflict: e.target.checked })}
                    className="accent-brand w-4 h-4"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
