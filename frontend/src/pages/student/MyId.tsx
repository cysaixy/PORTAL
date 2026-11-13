import { ChangeEvent, PointerEvent, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Badge, Button, Card, CardHeader, ErrorState, Modal, PageLoader } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useToast } from '../../components/Toast';
import { useApiMutation } from '../../hooks/useReference';
import { useAuth } from '../../contexts/AuthContext';
import api, { assetUrl } from '../../lib/api';
import type { SectionSummary } from '../../hooks/useStudent';

interface Profile {
  student: { id: string; lrn: string; firstName: string; middleName: string | null; lastName: string; suffix: string | null; photoUrl: string | null; signatureUrl: string | null; guardianName: string; guardianContact: string; address: string };
  section: SectionSummary | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function usePreview(file: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}

export default function MyId() {
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: () => api.get<Profile>('/student/profile').then((r) => r.data),
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [drawing, setDrawing] = useState(false);
  const photoPreview = usePreview(photo);
  const sigPreview = usePreview(signature);

  const upload = useApiMutation(
    () => {
      const fd = new FormData();
      if (photo) fd.append('photo', photo);
      if (signature) fd.append('signature', signature, 'signature.png');
      return api.post('/student/upload-id', fd);
    },
    {
      success: 'Saved! Your ID details are updated.',
      invalidate: [['student']],
      onSuccess: () => {
        setPhoto(null);
        setSignature(null);
        refreshUser();
      },
    }
  );

  const pick = (setter: (f: File) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) return toast.error('Please choose a JPG, PNG or WebP image.');
    if (f.size > MAX_BYTES) return toast.error('That file is larger than 5 MB.');
    setter(f);
  };

  const s = data?.student;
  const photoSrc = photoPreview ?? assetUrl(s?.photoUrl);
  const sigSrc = sigPreview ?? assetUrl(s?.signatureUrl);
  const ready = !!(s?.photoUrl && s?.signatureUrl);

  return (
    <DashboardLayout title="My ID" subtitle="Upload a recent photo and your signature for your school ID.">
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : s ? (
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* ID preview */}
          <div className="space-y-3">
            <div className="mx-auto w-full max-w-[340px] aspect-[54/86] rounded-2xl overflow-hidden shadow-pop bg-white border border-line flex flex-col">
              <div className="bg-brand-800 text-white px-4 py-3 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400 text-brand-900 text-xs font-extrabold">LA</span>
                <div className="leading-tight">
                  <p className="text-[13px] font-extrabold">Lyceum of Alcala</p>
                  <p className="text-[10px] text-brand-200">Alcala, Pangasinan</p>
                </div>
              </div>
              <div className="h-1.5 bg-gold-400" />
              <div className="flex-1 flex flex-col items-center px-5 pt-5">
                <div className="h-36 w-28 rounded-lg bg-canvas border border-line overflow-hidden flex items-center justify-center text-muted">
                  {photoSrc ? <img src={photoSrc} alt="ID photo" className="h-full w-full object-cover" /> : <Icon name="user" size={36} />}
                </div>
                <p className="mt-4 text-lg font-extrabold text-ink text-center leading-tight">
                  {s.firstName} {s.middleName ? `${s.middleName[0]}. ` : ''}{s.lastName}{s.suffix ? ` ${s.suffix}` : ''}
                </p>
                <p className="text-xs font-semibold text-brand-800">
                  {data.section ? `${data.section.gradeLevel} · ${data.section.name}` : 'Student'}
                </p>
                <p className="mt-1 text-[11px] text-muted tabular-nums">LRN {s.lrn}</p>
                <div className="mt-auto mb-4 w-40 text-center">
                  <div className="h-12 flex items-end justify-center border-b border-ink/40">
                    {sigSrc ? <img src={sigSrc} alt="Signature" className="max-h-12 object-contain" /> : <span className="text-[10px] text-muted pb-1">signature</span>}
                  </div>
                  <p className="text-[9px] uppercase tracking-wider text-muted mt-1">Student's signature</p>
                </div>
              </div>
              <div className="bg-brand-900 text-center text-[10px] text-brand-200 py-1.5">SY {data.section?.schoolYear ?? '—'}</div>
            </div>
            <div className="text-center">
              {ready ? <Badge tone="success" icon="check">Ready for printing</Badge> : <Badge tone="warn">Incomplete</Badge>}
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-4">
            {(photo || signature) && (
              <Alert
                tone="warn"
                title="Unsaved changes"
                action={<Button variant="primary" icon="upload" loading={upload.isPending} onClick={() => upload.mutate(undefined)}>Save</Button>}
              >
                The preview shows your new {[photo && 'photo', signature && 'signature'].filter(Boolean).join(' and ')}. Save to submit.
              </Alert>
            )}

            <Card>
              <CardHeader title="ID photo" description="2×2, plain white background, face clearly visible, taken within the last 6 months" actions={s.photoUrl && !photo ? <Badge tone="success" icon="check">Uploaded</Badge> : undefined} />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold shadow-card hover:bg-canvas">
                  <Icon name="upload" size={17} /> {s.photoUrl ? 'Replace photo' : 'Choose photo'}
                  <input type="file" accept={TYPES.join(',')} className="sr-only" onChange={pick(setPhoto)} />
                </label>
                {photo && <Button variant="ghost" onClick={() => setPhoto(null)}>Discard</Button>}
              </div>
            </Card>

            <Card>
              <CardHeader title="Signature" description="Sign the way you sign official documents" actions={s.signatureUrl && !signature ? <Badge tone="success" icon="check">Uploaded</Badge> : undefined} />
              <div className="flex flex-wrap gap-2">
                <Button icon="signature" onClick={() => setDrawing(true)}>Draw signature</Button>
                <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold shadow-card hover:bg-canvas">
                  <Icon name="upload" size={17} /> Upload image
                  <input type="file" accept={TYPES.join(',')} className="sr-only" onChange={pick(setSignature)} />
                </label>
                {signature && <Button variant="ghost" onClick={() => setSignature(null)}>Discard</Button>}
              </div>
            </Card>

            <p className="text-xs text-muted px-1">JPG, PNG or WebP · up to 5 MB each. Your photo and signature are only used for your school ID.</p>
          </div>

          {drawing && (
            <SignaturePad
              onClose={() => setDrawing(false)}
              onSave={(b) => {
                setSignature(b);
                setDrawing(false);
              }}
            />
          )}
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function SignaturePad({ onClose, onSave }: { onClose: () => void; onSave: (b: Blob) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
  }, []);

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const ctx = canvas.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.moveTo(...pos(e));
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvas.current!.getContext('2d')!;
    ctx.lineTo(...pos(e));
    ctx.stroke();
    setEmpty(false);
  };
  const up = () => (drawingRef.current = false);
  const clear = () => {
    const c = canvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };
  const save = () => canvas.current!.toBlob((b) => b && onSave(b), 'image/png');

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Draw your signature"
      description="Use your mouse, finger or stylus."
      footer={
        <>
          <Button onClick={clear} icon="refresh">Clear</Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={empty} onClick={save}>Use this signature</Button>
        </>
      }
    >
      <div className="relative rounded-xl border-2 border-dashed border-line bg-white">
        <canvas
          ref={canvas}
          className="block w-full h-56 touch-none cursor-crosshair"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          aria-label="Signature drawing area"
        />
        <div className="pointer-events-none absolute left-8 right-8 bottom-12 border-b border-ink/20" />
        {empty && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">Sign here</p>}
      </div>
    </Modal>
  );
}
