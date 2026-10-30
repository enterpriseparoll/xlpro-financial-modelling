/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AppRoutes } from '@/routes/AppRoutes';
import { getDefaultSubRoute } from '@/config/routes.config';
import { DriverDrawer } from '@/components/modals/DriverDrawer';
import { NewModelWizardModal } from '@/components/modals/NewModelWizardModal';
import { useModelContext } from '@/contexts/ModelContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string>(
    getDefaultSubRoute('dashboard') || 'overview'
  );
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  const { toasts, removeToast } = useModelContext();

  const handleNavigate = (tabId: string, subTabId?: string) => {
    setActiveTab(tabId);
    if (subTabId) {
      setActiveSubTab(subTabId);
    } else {
      const defaultSub = getDefaultSubRoute(tabId);
      if (defaultSub) setActiveSubTab(defaultSub);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground antialiased selection:bg-primary-soft selection:text-primary">
      {/* Dual Sidebar (Primary 80px + Collapsible Secondary 224px) */}
      <Sidebar
        activeTab={activeTab}
        activeSubTab={activeSubTab}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky Header */}
        <Header
          onOpenWizard={() => setIsWizardOpen(true)}
          onNavigateTab={handleNavigate}
        />

        <div role="status" className="px-6 py-2 border-b border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-2">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Prototype mode: financials are illustrative; changes are saved in this browser only. Do not use valuations for investment decisions without independent review.
        </div>
        {/* Scrollable Main Area (Single Scroll Region as mandated) */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
          <AppRoutes
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onNavigateTab={handleNavigate}
            onOpenWizard={() => setIsWizardOpen(true)}
          />
        </main>
      </div>

      {/* Driver Inspector Slide-In Drawer */}
      <DriverDrawer />

      {/* 5-Step Guided Model Creation Wizard Modal */}
      <NewModelWizardModal
        open={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onModelCreated={() => handleNavigate('data', 'historical')}
      />

      {/* Toast Notification Container */}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-md text-xs transition-all duration-200 bg-card ${
              toast.type === 'success'
                ? 'border-emerald-200 text-foreground'
                : toast.type === 'error'
                ? 'border-rose-200 text-foreground'
                : 'border-border text-foreground'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-600" />
              ) : (
                <Info className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 font-medium leading-relaxed">{toast.message}</div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
