import { useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Upload, ImagePlus } from 'lucide-react';
import { useCapture } from '../controller/captureContext';
import { useCamera } from '../controller/useCamera';
import { CameraGuide } from './CameraGuide';
import { useInspectionGuidance } from '../../maintenance/controller/useInspectionGuidance';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Button, ErrorDialog } from '../../../shared/components/ui';
import { isAnalyzing } from '../model/analysisStage';
export function CapturePage() {
  const { state, engine } = useCapture(),
    guidance = useInspectionGuidance(),
    camera = useCamera(),
    upload = useRef<HTMLInputElement>(null),
    native = useRef<HTMLInputElement>(null),
    [monitor, setMonitor] = useState(false),
    [dims, setDims] = useState({ width: 1080, height: 1920 }),
    [params] = useSearchParams(),
    auto = useRef(false);
  const busy = isAnalyzing(state.stage);
  useEffect(() => {
    if (guidance.understood && params.get('source') === 'camera' && !auto.current) {
      auto.current = true;
      void camera.start();
    }
  }, [params, camera, guidance.understood]);
  const chosen = async (files: FileList | null) => {
    const file = files?.[0];
    if (file) {
      camera.close();
      await engine.upload(file);
    }
  };
  return (
    <>
      <PageHeader title="Foto alat ukur" />
      <Card className="capture-card">
        <input
          ref={upload}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="file-input"
          aria-label="Upload foto alat"
          onChange={async (e) => {
            const input = e.currentTarget;
            await chosen(input.files);
            input.value = '';
          }}
        />
        <input
          ref={native}
          type="file"
          accept="image/*"
          capture="environment"
          className="file-input"
          aria-label="Foto dari kamera bawaan"
          onChange={async (e) => {
            const input = e.currentTarget;
            await chosen(input.files);
            input.value = '';
          }}
        />
        {camera.open ? (
          <>
            <div className="camera-preview">
              <video
                ref={camera.videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={(e) =>
                  setDims({
                    width: e.currentTarget.videoWidth,
                    height: e.currentTarget.videoHeight,
                  })
                }
              />
              <CameraGuide width={dims.width} height={dims.height} />
            </div>
            <p className="camera-message">{camera.message}</p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={monitor}
                onChange={(e) => setMonitor(e.target.checked)}
              />
              Sedang memfoto layar monitor
            </label>
            <div className="actions workflow-actions">
              <Button
                onClick={async () => {
                  const file = await camera.take(monitor);
                  if (file) void engine.upload(file);
                }}
                disabled={camera.busy}
              >
                <Camera size={19} />
                {camera.busy ? 'Menyiapkan kamera…' : 'Ambil foto & analisis'}
              </Button>
              <Button variant="secondary" onClick={camera.close}>
                Tutup kamera
              </Button>
            </div>
          </>
        ) : (
          <div className="capture-intro">
            <ImagePlus size={44} />
            <h2>Gauge dan label dalam satu foto</h2>
            <p>
              Seluruh skala/angka terlihat utuh. Letakkan nama alat atau test tepat di bawah gauge.
            </p>
            <div className="actions workflow-actions">
              <Button disabled={busy} onClick={() => camera.start()}>
                <Camera size={19} />
                Buka kamera
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => upload.current?.click()}>
                <Upload size={18} />
                Upload gambar
              </Button>
            </div>
            <Button variant="ghost" disabled={busy} onClick={() => native.current?.click()}>
              Kamera bawaan HP
            </Button>
          </div>
        )}
        <details className="data-details">
          <summary>Panduan foto</summary>
          <p>
            Gauge utuh, label di bawah. Hindari silau. Jika memfoto monitor, ubah jarak saat pola
            layar terlihat.
          </p>
        </details>
        <Link className="link-button" to="/pemeriksaan">
          ← Kembali ke daftar
        </Link>
      </Card>
      <ErrorDialog
        error={camera.error ?? state.error}
        onClose={() => {
          camera.clearError();
          engine.clearError();
        }}
      />
    </>
  );
}
