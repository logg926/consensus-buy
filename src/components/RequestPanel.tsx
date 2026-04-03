import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, DollarSign, ShoppingCart, Mic, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RequestPanelProps {
  onSubmit: (item: string, budget: number, justification: string) => void;
  isProcessing: boolean;
}

export function RequestPanel({ onSubmit, isProcessing }: RequestPanelProps) {
  const [item, setItem] = useState("");
  const [budget, setBudget] = useState("");
  const [justification, setJustification] = useState("");

  // Voice recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  }, [audioUrl]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !budget) return;
    onSubmit(item, parseFloat(budget), justification);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-foreground">
          Purchase Request
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
        {/* Voice Recorder */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Voice Request
          </Label>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            {!isRecording && !audioUrl && (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing}
                className="w-full flex flex-col items-center gap-2 py-3 text-muted-foreground hover:text-primary transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-destructive/10 border-2 border-destructive/30 flex items-center justify-center hover:bg-destructive/20 transition-colors">
                  <Mic className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-xs">Tap to beg the CFO</span>
              </button>
            )}

            {isRecording && (
              <div className="flex flex-col items-center gap-2 py-2">
                {/* Pulsing waveform */}
                <div className="flex items-center gap-1 h-8">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 rounded-full bg-destructive"
                      animate={{ height: [4, 12 + Math.random() * 16, 4] }}
                      transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.05 }}
                    />
                  ))}
                </div>
                <span className="text-xs font-mono text-destructive">{formatTime(recordingTime)}</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="h-10 w-10 rounded-full bg-destructive/20 border border-destructive/40 flex items-center justify-center hover:bg-destructive/30 transition-colors"
                >
                  <Square className="h-4 w-4 text-destructive" />
                </button>
              </div>
            )}

            {audioUrl && !isRecording && (
              <div className="flex items-center gap-2">
                <audio src={audioUrl} controls className="flex-1 h-8 [&::-webkit-media-controls-panel]{background:transparent}" />
                <button
                  type="button"
                  onClick={clearRecording}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>or type your request</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item" className="text-xs text-muted-foreground uppercase tracking-wider">
            Item Description
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="item"
              placeholder="e.g. Ergonomic chair, my back is dying"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget" className="text-xs text-muted-foreground uppercase tracking-wider">
            Requested Budget
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="budget"
              type="number"
              placeholder="400"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="pl-10 bg-muted/50 border-border"
              disabled={isProcessing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification" className="text-xs text-muted-foreground uppercase tracking-wider">
            Business Justification
          </Label>
          <Textarea
            id="justification"
            placeholder="Convince the CFO... if you can"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="bg-muted/50 border-border resize-none min-h-[60px]"
            disabled={isProcessing}
          />
        </div>

        <div className="mt-auto">
          <Button
            type="submit"
            disabled={!item || !budget || isProcessing}
            className="w-full glow-primary"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-dot" />
                CFO is judging you...
              </span>
            ) : (
              "Submit to Sassy CFO 💳"
            )}
          </Button>
        </div>

        {!isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">Quick demos:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { item: "Ergonomic Chair (my back is dying)", budget: "400" },
                { item: "Herman Miller Aeron Chair", budget: "1400" },
                { item: 'Dell 32" 4K Monitor', budget: "800" },
              ].map((preset) => (
                <button
                  key={preset.item}
                  type="button"
                  onClick={() => { setItem(preset.item); setBudget(preset.budget); setJustification("I literally cannot work without this"); }}
                  className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
                >
                  {preset.item.split(" ").slice(0, 2).join(" ")} — ${preset.budget}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
