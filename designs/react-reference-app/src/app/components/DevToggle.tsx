import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Settings, X } from 'lucide-react';
import {
  useAppState,
  type PrototypeWaitlistAvailability,
} from '../context/AppContext';
import type { PrototypeStoreCheckoutOutcome } from '../services/storeAcquisitionService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

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
    value === 'rate-limited' ||
    value === 'server-error' ||
    value === 'unavailable-product'
  ) {
    return value;
  }

  return 'success';
}

const SELECT_CONTENT_CLASS = 'z-[10000]';

function DevCheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </div>
  );
}

export function DevToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { appState, setAppState } = useAppState();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 z-[9999] bg-surface-inverted text-surface-inverted-foreground p-3 rounded-full shadow-lg hover:bg-brand transition-colors bottom-[calc(env(safe-area-inset-bottom)+5rem)] lg:bottom-4"
        aria-label="Open Dev Toggle"
      >
        <Settings size={24} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed right-4 z-[9999] bg-card p-5 rounded-2xl shadow-2xl border border-control-border-soft w-80 max-w-[calc(100vw-2rem)] bottom-[calc(env(safe-area-inset-bottom)+9rem)] lg:bottom-20"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Dev Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close Dev Settings"
                className="text-copy-muted hover:text-foreground"
              >
                <X size={20} aria-hidden="true" />
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
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-role"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Role
                  </Label>
                  <Select
                    value={appState.role}
                    onValueChange={(value) =>
                      setAppState({ role: value as typeof appState.role })
                    }
                  >
                    <SelectTrigger id="dev-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="visitor">Visitor</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DevCheckboxRow
                  id="dev-authenticated"
                  label="Authenticated"
                  checked={appState.isAuthenticated}
                  onCheckedChange={(checked) => setAppState({ isAuthenticated: checked })}
                />

                <DevCheckboxRow
                  id="dev-has-bundle"
                  label="Has Bundle"
                  checked={appState.hasBundle}
                  onCheckedChange={(checked) => setAppState({ hasBundle: checked })}
                />

                {appState.role === 'client' && (
                  <DevCheckboxRow
                    id="dev-needs-onboarding"
                    label="Needs Onboarding"
                    checked={appState.needsOnboarding}
                    onCheckedChange={(checked) => setAppState({ needsOnboarding: checked })}
                  />
                )}
              </TabsContent>

              <TabsContent value="store" className="space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <DevCheckboxRow
                  id="dev-store-empty-catalog"
                  label="Empty catalog"
                  checked={appState.isStoreCatalogEmpty}
                  onCheckedChange={(checked) => setAppState({ isStoreCatalogEmpty: checked })}
                />
                <div className="space-y-2">
                  <Label
                    htmlFor="dev-store-checkout-outcome"
                    className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                  >
                    Checkout outcome
                  </Label>
                  <Select
                    value={appState.storeCheckoutOutcome}
                    onValueChange={(value) =>
                      setAppState({
                        storeCheckoutOutcome:
                          parseStoreCheckoutOutcomeControl(value),
                      })
                    }
                  >
                    <SelectTrigger id="dev-store-checkout-outcome" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="bot-rejected">Bot verification rejected</SelectItem>
                      <SelectItem value="delivery-failure">Delivery failure</SelectItem>
                      <SelectItem value="rate-limited">Rate limited</SelectItem>
                      <SelectItem value="server-error">Server failure</SelectItem>
                      <SelectItem value="unavailable-product">Unavailable product in cart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DevCheckboxRow
                  id="dev-store-download-unavailable"
                  label="Download link unavailable"
                  checked={appState.isDownloadUnavailable}
                  onCheckedChange={(checked) => setAppState({ isDownloadUnavailable: checked })}
                />
                <Link
                  to="/downloads"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Open download page <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </TabsContent>

              <TabsContent value="waitlist" className="space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <DevCheckboxRow
                  id="dev-waitlist-mode"
                  label="Waiting List Mode"
                  checked={appState.isWaitlistMode}
                  onCheckedChange={(checked) => setAppState({ isWaitlistMode: checked })}
                />

                {appState.isWaitlistMode && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="dev-waitlist-availability"
                      className="text-xs font-semibold text-copy-muted uppercase tracking-wider"
                    >
                      Availability
                    </Label>
                    <Select
                      value={appState.waitlistAvailability ?? 'unavailable'}
                      onValueChange={(value) =>
                        setAppState({
                          waitlistAvailability:
                            parseWaitlistAvailabilityControl(value),
                        })
                      }
                    >
                      <SelectTrigger id="dev-waitlist-availability" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={SELECT_CONTENT_CLASS}>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="nutrition" className="space-y-4 pt-3 max-h-[50vh] overflow-y-auto pr-1">
                <DevCheckboxRow
                  id="dev-nutrition-block-completed"
                  label="Block completed (show review)"
                  checked={appState.nutritionBlockCompleted}
                  onCheckedChange={(checked) => setAppState({ nutritionBlockCompleted: checked })}
                />
                <DevCheckboxRow
                  id="dev-nutrition-preference-conflict"
                  label="Preference conflict (salmon)"
                  checked={appState.nutritionPreferenceConflict}
                  onCheckedChange={(checked) => setAppState({ nutritionPreferenceConflict: checked })}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
