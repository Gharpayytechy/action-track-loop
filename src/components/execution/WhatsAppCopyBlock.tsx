import { useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard, waDeepLink } from "@/lib/execution/wa-format";
import { toast } from "sonner";

interface Props {
  text: string;
  label?: string;
}

export function WhatsAppCopyBlock({ text, label = "Copy to WhatsApp" }: Props) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  const doCopy = async () => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      toast.success("Copied — paste in WhatsApp group");
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error("Copy failed — long-press to select");
    }
  };

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mt-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          WhatsApp-ready · copy & paste
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={doCopy} className="h-7 text-xs">
            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
            {copied ? "Copied" : label}
          </Button>
          <a
            href={waDeepLink(text)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center h-7 px-2 text-xs rounded-md hover:bg-emerald-500/10"
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open WhatsApp
          </a>
        </div>
      </div>
      <pre className="whitespace-pre-wrap text-xs font-mono bg-background/70 rounded p-2 border border-border max-h-56 overflow-auto">
{text}
      </pre>
    </div>
  );
}