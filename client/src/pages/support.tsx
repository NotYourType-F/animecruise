import { Send, Mail, MessageCircle, AlertTriangle, HelpCircle, Bug } from "lucide-react";

export default function Support() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[700px] mx-auto px-6">
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
            <HelpCircle className="w-7 h-7 text-white/40" />
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-white mb-3" data-testid="text-support-title">
            Support & Contact
          </h1>
          <p className="text-white/30 text-sm max-w-md mx-auto leading-relaxed">
            Having trouble or found a bug? Reach out and we'll help you as soon as possible.
          </p>
        </div>

        <div className="grid gap-4">
          <a
            href="https://t.me/FNxELECTRA"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-blue-400/20 hover:bg-blue-500/[0.04] transition-all duration-300"
            data-testid="link-telegram-contact"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500/15 transition-colors">
              <Send className="w-5 h-5 text-blue-400/70" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-white/80 text-sm mb-1">Telegram</h3>
              <p className="text-white/25 text-xs">@FNxELECTRA — Fastest way to get in touch</p>
            </div>
            <span className="text-xs text-white/15 group-hover:text-blue-400/50 transition-colors shrink-0">
              Open Chat
            </span>
          </a>

          <a
            href="mailto:electraop09@gmail.com"
            className="group flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-red-400/20 hover:bg-red-500/[0.04] transition-all duration-300"
            data-testid="link-email-contact"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/15 flex items-center justify-center shrink-0 group-hover:bg-red-500/15 transition-colors">
              <Mail className="w-5 h-5 text-red-400/70" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-white/80 text-sm mb-1">Email</h3>
              <p className="text-white/25 text-xs">electraop09@gmail.com — For detailed reports</p>
            </div>
            <span className="text-xs text-white/15 group-hover:text-red-400/50 transition-colors shrink-0">
              Send Email
            </span>
          </a>
        </div>

        <div className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <h3 className="font-heading font-bold text-white/60 text-sm mb-5">What can we help with?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Bug className="w-4 h-4 text-white/15 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white/40 mb-0.5">Bug Reports</p>
                <p className="text-[11px] text-white/15 leading-relaxed">Something broken or not working correctly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="w-4 h-4 text-white/15 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white/40 mb-0.5">Feature Requests</p>
                <p className="text-[11px] text-white/15 leading-relaxed">Ideas to make AnimeCruise even better</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-white/15 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-white/40 mb-0.5">Playback Issues</p>
                <p className="text-[11px] text-white/15 leading-relaxed">Video not loading or streaming problems</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
