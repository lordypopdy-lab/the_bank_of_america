import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Camera, FileUp, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  KYC_COUNTRIES,
  KYC_ID_TYPES,
  kycStatusLabel,
  useMyKyc,
  type KycStatus,
} from "@/hooks/useKyc";
import { supabase } from "@/integrations/supabase/client";
import { db, friendlyError } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 8 * 1024 * 1024;

const tone: Record<KycStatus, string> = {
  verified: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  declined: "bg-destructive/15 text-destructive border-destructive/30",
  not_verified: "bg-muted text-muted-foreground border-border",
};

export function KycBadge({ status }: { status?: KycStatus | null }) {
  const s = status ?? "not_verified";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${tone[s]}`}
    >
      {s === "verified" ? <BadgeCheck className="h-3.5 w-3.5" /> : null}
      {s === "verified" ? "KYC Verified" : `KYC ${kycStatusLabel(s)}`}
    </span>
  );
}

export function KycSection() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: kyc, isLoading } = useMyKyc(profile?.id);

  const [country, setCountry] = useState("");
  const [idType, setIdType] = useState("");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const docRef = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamReady(false);
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Attach the stream once the <video> element is actually mounted.
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setCamReady(true);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    void video.play().catch(() => undefined);
    onReady();
    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
    };
  }, [cameraOn]);

  const startCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Your browser doesn't support camera capture. Upload a selfie photo instead.");
      selfieRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamReady(false);
      setCameraOn(true);
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error("Camera permission denied. Allow camera access in your browser settings, or upload a selfie.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        toast.error("No front camera found. Upload a selfie photo instead.");
      } else if (name === "NotReadableError") {
        toast.error("Your camera is in use by another app. Close it and try again.");
      } else {
        toast.error("Camera unavailable. Upload a selfie photo instead.");
      }
      selfieRef.current?.click();
    }
  };

  const waitForFrame = async (video: HTMLVideoElement) => {
    for (let i = 0; i < 40; i++) {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  };

  const isBlank = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
      const w = Math.min(32, canvas.width);
      const h = Math.min(32, canvas.height);
      const { data } = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < data.length; i += 4) {
        if ((data[i] ?? 0) > 8 || (data[i + 1] ?? 0) > 8 || (data[i + 2] ?? 0) > 8) return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || capturing) return;
    setCapturing(true);
    try {
      const ready = await waitForFrame(video);
      if (!ready) {
        toast.error("Camera is still starting. Wait a moment and try again.");
        return;
      }
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("We couldn't capture the photo on this device. Upload a selfie instead.");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (isBlank(canvas, ctx)) {
        await new Promise((r) => setTimeout(r, 300));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (isBlank(canvas, ctx)) {
          toast.error("The camera returned a blank frame. Try again or upload a selfie photo.");
          return;
        }
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
      );
      if (!blob || blob.size < 1024) {
        toast.error("Capture failed. Please try again.");
        return;
      }
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      if (selfiePreview) URL.revokeObjectURL(selfiePreview);
      setSelfie(file);
      setSelfiePreview(URL.createObjectURL(file));
      stopCamera();
    } finally {
      setCapturing(false);
    }
  };


  const submit = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("You must be signed in.");
      if (!country) throw new Error("Select your country.");
      if (!idType) throw new Error("Select an ID type.");
      if (!doc) throw new Error("Upload your ID document.");
      if (!DOC_TYPES.includes(doc.type)) throw new Error("Use a JPG, PNG, WEBP or PDF document.");
      if (doc.size > MAX_SIZE) throw new Error("The document must be under 8MB.");
      if (!selfie) throw new Error("Complete the face capture.");
      if (selfie.size > MAX_SIZE) throw new Error("The selfie must be under 8MB.");

      const stamp = Date.now();
      const ext = doc.name.split(".").pop() ?? "jpg";
      const documentPath = `${profile.id}/document-${stamp}.${ext}`;
      const selfiePath = `${profile.id}/selfie-${stamp}.jpg`;

      const up1 = await supabase.storage.from("kyc").upload(documentPath, doc, { upsert: true });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage
        .from("kyc")
        .upload(selfiePath, selfie, { upsert: true, contentType: "image/jpeg" });
      if (up2.error) throw up2.error;

      const { error } = await db.rpc("submit_kyc", {
        _country: country,
        _id_type: idType,
        _document_path: documentPath,
        _selfie_path: selfiePath,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("KYC submitted — pending review");
      setDoc(null);
      setSelfie(null);
      setSelfiePreview(null);
      await queryClient.invalidateQueries({ queryKey: ["kyc"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => toast.error(friendlyError(error, "We couldn't submit your verification.")),
  });

  const status: KycStatus = kyc?.status ?? "not_verified";
  const canSubmit = status === "not_verified" || status === "declined";

  return (
    <section className="surface-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold">KYC Verification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify your identity to keep your account in good standing.
          </p>
        </div>
        <KycBadge status={status} />
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : status === "verified" ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <ShieldCheck className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-semibold text-success">✓ KYC Verified</p>
            <p className="text-xs text-muted-foreground">
              Approved {formatDateTime(kyc?.reviewed_at ?? kyc?.submitted_at)}
            </p>
          </div>
        </div>
      ) : status === "pending" ? (
        <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-semibold text-warning">Pending Review</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted {formatDateTime(kyc?.submitted_at)}. We'll notify you once it's reviewed.
          </p>
        </div>
      ) : null}

      {status === "declined" ? (
        <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <ShieldAlert className="h-4 w-4" /> Declined
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {kyc?.rejection_reason ?? "Your submission could not be verified."} You can submit again below.
          </p>
        </div>
      ) : null}

      {canSubmit ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-12 bg-background/60">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {KYC_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ID type</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger className="h-12 bg-background/60">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent>
                  {KYC_ID_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ID document</Label>
            <button
              type="button"
              onClick={() => docRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 px-4 py-4 text-left text-sm text-muted-foreground hover:text-foreground"
            >
              <FileUp className="h-4 w-4" />
              {doc ? doc.name : "Upload JPG, PNG, WEBP or PDF (max 8MB)"}
            </button>
            <input
              ref={docRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && !DOC_TYPES.includes(f.type)) {
                  toast.error("Unsupported file type");
                } else if (f && f.size > MAX_SIZE) {
                  toast.error("File must be under 8MB");
                } else {
                  setDoc(f);
                }
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Face capture</Label>
            {cameraOn ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-56 w-full rounded-xl border border-border bg-black object-cover"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void capture()}
                    disabled={!camReady || capturing}
                    className="h-11"
                  >
                    {camReady ? (capturing ? "Capturing…" : "Capture photo") : "Starting camera…"}
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera} className="h-11">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : selfiePreview ? (
              <div className="flex items-center gap-4">
                <img
                  src={selfiePreview}
                  alt="Face capture preview"
                  className="h-24 w-24 rounded-xl border border-border object-cover"
                />
                <Button type="button" variant="outline" onClick={() => void startCamera()} className="h-11">
                  Retake
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void startCamera()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 px-4 py-4 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                <Camera className="h-4 w-4" /> Start face capture
              </button>
            )}
            <input
              ref={selfieRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  if (f.size > MAX_SIZE) {
                    toast.error("Image must be under 8MB");
                  } else {
                    setSelfie(f);
                    setSelfiePreview(URL.createObjectURL(f));
                  }
                }
                e.target.value = "";
              }}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface/60 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Review your submission</p>
            <p className="mt-1">
              {country || "No country"} · {KYC_ID_TYPES.find((t) => t.value === idType)?.label ?? "No ID type"} ·{" "}
              {doc ? "Document attached" : "No document"} · {selfie ? "Face captured" : "No face capture"}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !country || !idType || !doc || !selfie}
            className="h-12 w-full text-sm font-semibold"
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit KYC"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
