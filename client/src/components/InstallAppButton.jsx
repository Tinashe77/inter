import { useEffect, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');
}

function isSafari() {
  const userAgent = window.navigator.userAgent || '';
  return /safari/i.test(userAgent) && !/crios|fxios|chrome|android/i.test(userAgent);
}

export function InstallAppButton({ compact = false }) {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIosSafari(isIos() && isSafari());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallEvent(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed || (!installEvent && !iosSafari)) return null;

  async function installApp() {
    if (installEvent) {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
      setInstallEvent(null);
      return;
    }
    if (iosSafari) setInstructionsOpen(true);
  }

  return (
    <>
      <button className={compact ? 'install-chip' : 'btn-secondary w-full'} type="button" onClick={installApp}>
        <Download size={compact ? 15 : 16} />
        {compact ? 'Install' : 'Install app'}
      </button>
      {instructionsOpen && (
        <section className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 px-3 pb-3 sm:items-center sm:px-4 sm:pb-0">
          <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-normal">Install Interpath</h3>
                <p className="mt-1 text-sm text-slate-600">Add this app to your phone home screen for faster access.</p>
              </div>
              <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" type="button" onClick={() => setInstructionsOpen(false)} aria-label="Close install instructions">
                <X size={18} />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="icon-bubble h-9 w-9"><Share2 size={16} /></span>
                <span>Tap the Safari share button.</span>
              </li>
              <li className="flex gap-3">
                <span className="icon-bubble h-9 w-9"><Download size={16} /></span>
                <span>Select Add to Home Screen or Install app.</span>
              </li>
            </ol>
            <button className="btn-primary mt-4 w-full" type="button" onClick={() => setInstructionsOpen(false)}>Done</button>
          </div>
        </section>
      )}
    </>
  );
}
