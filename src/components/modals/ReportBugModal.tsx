import { useState } from "react";
import { Bug, CheckCircle2, Laptop, Loader2, Music2, Send } from "lucide-react";
import { useApp } from "../../store";
import { Modal } from "./Modal";
import { cn } from "../../lib/utils";

const DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1566397232067121282/SPnL7O2SQuIrGNqTUd2tjbiduoBPzHnqnewFb_tNUtQYobi6_wV8Z7fUVMRqjMRR1xmI";

const CATEGORIES = [
  "Audio / Playback",
  "UI / Visual",
  "Performance / Lag",
  "Account / Sync",
  "Search / Discovery",
  "Other",
] as const;

export function ReportBugModal() {
  const { closeModal, pushToast, currentTrack, isPlaying } = useApp();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Audio / Playback");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanSummary = summary.trim();
    const cleanDescription = description.trim();

    if (!cleanSummary) {
      pushToast("Summary required", "Please enter a brief summary of the issue.", "error");
      return;
    }
    if (!cleanDescription) {
      pushToast("Description required", "Please describe what happened.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const bridge = (window as any).chordly ?? (window as any).chordlyDesktop ?? (window as any).desktop;

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [
        { name: "📂 Category", value: category, inline: true },
        { name: "🖥️ Platform", value: "Windows 11 / Desktop", inline: true },
        { name: "⚡ App Version", value: "Chordly v1.0.0", inline: true },
      ];

      if (includeDiagnostics) {
        fields.push({
          name: "🎵 Current Track",
          value: currentTrack
            ? `**${currentTrack.title}** by *${currentTrack.artist}* (${isPlaying ? "▶ Playing" : "⏸ Paused"})`
            : "None",
          inline: false,
        });
      }

      const payload = {
        username: "Chordly Bug Reporter",
        avatar_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80",
        embeds: [
          {
            title: `🐛 [${category}] ${cleanSummary}`,
            description: cleanDescription,
            color: 0xf59e0b, // Amber accent
            fields,
            footer: {
              text: `Chordly Bug Reporter · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      let success = false;
      if (bridge?.sendDiscordReport) {
        const res = await bridge.sendDiscordReport(payload);
        success = Boolean(res?.success);
      } else {
        const res = await fetch(DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        success = res.ok;
      }

      if (success) {
        setSubmitted(true);
        pushToast("Bug report sent!", "Delivered directly to the Discord channel.", "success");
        setTimeout(() => {
          closeModal();
        }, 1200);
      } else {
        throw new Error("Webhook request failed");
      }
    } catch (err) {
      console.error("[chordly] Failed to send bug report:", err);
      pushToast("Failed to send", "Could not reach Discord webhook. Please check your connection.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Report an issue or bug"
      eyebrow="Feedback & Support"
      description="Tell us what went wrong. Your report is sent directly to the development Discord webhook."
      onClose={closeModal}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-[10px] text-[var(--faint)]">Sent securely via Discord webhook</p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-sm" onClick={closeModal} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary flex items-center gap-1.5"
              onClick={() => void handleSubmit()}
              disabled={submitting || submitted}
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Sending…
                </>
              ) : submitted ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Sent!
                </>
              ) : (
                <>
                  <Send size={13} />
                  Send Report
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Category Pills */}
        <div>
          <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium transition border",
                  category === cat
                    ? "bg-[var(--ink)] text-[var(--canvas)] border-[var(--ink)] shadow-sm"
                    : "border-[var(--line)] bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Short Summary */}
        <div>
          <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">
            Summary <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Song audio pauses but time keeps running in Discord"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] px-3.5 py-2 text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--ink)] transition"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">
            Details & Steps to Reproduce <span className="text-amber-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what happened, what you expected, and any steps to reproduce the issue..."
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3 text-[12px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--ink)] transition resize-none"
          />
        </div>

        {/* Diagnostics preview */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--hover)]/60 p-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDiagnostics}
              onChange={(e) => setIncludeDiagnostics(e.target.checked)}
              className="rounded border-[var(--line)] text-[var(--ink)] focus:ring-0"
            />
            <span className="text-[11px] font-medium text-[var(--ink)]">Include system & playback info</span>
          </label>

          {includeDiagnostics && (
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-[var(--muted)] pt-2 border-t border-[var(--line)]">
              <div className="flex items-center gap-1.5 truncate">
                <Laptop size={12} className="shrink-0 text-[var(--faint)]" />
                <span className="truncate">Windows · Chordly v1.0.0</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Music2 size={12} className="shrink-0 text-[var(--faint)]" />
                <span className="truncate">
                  {currentTrack ? `${currentTrack.title} (${isPlaying ? "Playing" : "Paused"})` : "Idle (No track)"}
                </span>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
