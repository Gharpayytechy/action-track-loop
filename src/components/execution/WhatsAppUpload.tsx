import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, MessageSquare, X } from "lucide-react";

interface Props {
  label?: string;
  onSubmit: (data: string, unread: number) => void;
  compareTo?: { unread: number; label: string };
  submitLabel?: string;
}

export function WhatsAppUpload({ label = "WhatsApp screenshot", onSubmit, compareTo, submitLabel = "Attach & continue" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [unread, setUnread] = useState<number>(0);

  const onPick = (f: File | undefined) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const delta = compareTo ? unread - compareTo.unread : 0;
  const deltaColor = delta === 0 ? "text-muted-foreground" : delta < 0 ? "text-emerald-500" : "text-red-500";
  const deltaSign = delta > 0 ? "+" : "";

  return (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground font-mono flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5" /> {label}
      </Label>

      {preview ? (
        <div className="relative rounded-lg border overflow-hidden bg-black/20">
          <img src={preview} alt="WhatsApp screenshot" className="w-full max-h-64 object-contain" />
          <button onClick={() => setPreview(null)} className="absolute top-2 right-2 bg-black/70 rounded-full p-1 text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary p-6 flex flex-col items-center gap-2 text-sm text-muted-foreground transition-colors"
          type="button"
        >
          <Upload className="h-5 w-5" />
          Tap to upload WhatsApp screenshot
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label htmlFor="unread" className="text-xs">Unread chats now</Label>
          <Input
            id="unread"
            type="number"
            min={0}
            value={unread}
            onChange={(e) => setUnread(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
        {compareTo && (
          <div className={`text-sm font-mono ${deltaColor} pb-2`}>
            vs {compareTo.label}: {deltaSign}{delta}
          </div>
        )}
      </div>

      <Button
        disabled={!preview}
        onClick={() => preview && onSubmit(preview, unread)}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  );
}