import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SyncConfig } from '../types';

interface Props {
  config: SyncConfig;
  spreadsheetUrl: string;
  syncError?: string | null;
  onSaveAndSync: (cfg: SyncConfig) => Promise<void>;
  onResetLocal: () => void;
  onClose: () => void;
}

export const SyncModal: React.FC<Props> = ({
  config,
  spreadsheetUrl,
  syncError,
  onSaveAndSync,
  onResetLocal,
  onClose,
}) => {
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl);
  const [passcode, setPasscode] = useState(config.passcode);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    syncError ? { type: 'err', text: syncError } : null
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      await onSaveAndSync({ endpointUrl: endpointUrl.trim(), passcode: passcode.trim() });
      setMsg({ type: 'ok', text: 'Synced live with your Google Sheet ♡' });
    } catch (err) {
      setMsg({ type: 'err', text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3A1E2B]/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-[#FFFDFD] border border-[#ECC6D3] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#FDF0F4] px-6 py-4 border-b border-[#ECC6D3]">
          <h2 className="font-display text-xl font-bold text-[#9E3355]">
            Live Google Sheet Sync ♡
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#8C5366] hover:bg-[#F7DCE5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-[#5C3A47]">
          <p>
            Your <strong>Kitty and bear</strong> Google Sheet stays the single source of truth—so
            you can ask your AI assistant to add items <em>or</em> add/check off items right here!
          </p>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#FDEBF0] border border-[#E8B8C8] px-4 py-2 text-xs font-bold text-[#9E3355] hover:bg-[#FADBE5] transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open “Kitty and bear” Google Sheet
          </a>

          <div className="rounded-2xl bg-[#FFF7FA] border border-[#F0D2DC] p-4 text-xs space-y-1.5">
            <p className="font-bold text-[#9E3355]">2-minute one-time setup for two-way sync:</p>
            <ol className="list-decimal list-inside space-y-1 text-[#6D4856]">
              <li>
                In your Google Sheet, click <strong>Extensions → Apps Script</strong>.
              </li>
              <li>
                Paste <code className="bg-white px-1.5 py-0.5 rounded">apps-script/Code.gs</code>{' '}
                from this repo and click <strong>Deploy → New deployment → Web app</strong> (Execute
                as: <em>Me</em>, Access: <em>Anyone</em>).
              </li>
              <li>Paste the Web App URL below and hit Connect!</li>
            </ol>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                Apps Script Web App URL
              </label>
              <input
                type="url"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#9E5A72] mb-1">
                Optional Passcode (if set in Code.gs)
              </label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Leave blank if none set"
                className="w-full rounded-xl border border-[#E6C3D0] bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D87B97]"
              />
            </div>

            {msg && (
              <div
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                  msg.type === 'ok'
                    ? 'bg-[#E5F6EC] text-[#286B4E]'
                    : 'bg-[#FDE8EC] text-[#A82D50]'
                }`}
              >
                {msg.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  onResetLocal();
                  setMsg({ type: 'ok', text: 'Reloaded bundled snapshot from spreadsheet.' });
                }}
                className="text-xs font-semibold text-[#9E5A72] underline hover:text-[#7A2F49]"
              >
                Reset to bundled snapshot
              </button>
              <button
                type="submit"
                disabled={loading || !endpointUrl.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#C95D7E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B24B6B] transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Syncing...' : 'Save & Sync Now'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
