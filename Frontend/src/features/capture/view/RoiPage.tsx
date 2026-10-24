import { useRef, useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, ZoomIn, ZoomOut } from 'lucide-react';
import { useCapture } from '../controller/captureContext';
import { useRoiEditor } from '../controller/useRoiEditor';
import { containTransform, labelBelow, resizeRoi } from '../model/roiGeometry';
import type { ROI } from '../../../shared/lib/contracts';
import { PageHeader } from '../../../shared/components/layout/PageHeader';
import { Card, Button, Field } from '../../../shared/components/ui';
export function RoiPage() {
  const { state, engine } = useCapture(),
    [params] = useSearchParams(),
    label = params.get('region') === 'label',
    editor = useRoiEditor(label ? (state.label_roi ?? labelBelow(state.roi)) : state.roi, {
      width: state.photo ? 32 / state.photo.source_width : 0.02,
      height: state.photo ? 32 / state.photo.source_height : 0.02,
    }),
    viewport = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ width: 600, height: 500 }),
    navigate = useNavigate();
  const drag = useRef<{
    x: number;
    y: number;
    roi: ROI;
    pan: { x: number; y: number };
    resize: boolean;
  } | null>(null);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, []);
  if (!state.photo) return <Navigate to="/pemeriksaan/foto" replace />;
  const transform = containTransform(
      state.photo.source_width,
      state.photo.source_height,
      size.width,
      size.height,
      editor.zoom,
      editor.pan.x,
      editor.pan.y,
    ),
    r = editor.roi;
  return (
    <>
      <PageHeader
        title={label ? 'Crop label nama alat' : 'Crop indikator'}
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              editor.setRoi(label ? labelBelow(state.roi) : { x: 0, y: 0, width: 1, height: 1 })
            }
          >
            Reset
          </Button>
        }
      />
      <Card>
        <div className="row wrap section-title">
          <Button
            variant={editor.mode === 'box' ? 'primary' : 'secondary'}
            onClick={() => editor.setMode('box')}
          >
            Geser kotak
          </Button>
          <Button
            variant={editor.mode === 'photo' ? 'primary' : 'secondary'}
            onClick={() => editor.setMode('photo')}
          >
            Geser foto
          </Button>
          <Button
            variant="secondary"
            aria-label="Perkecil foto"
            onClick={() => editor.setZoom(editor.zoom - 0.25)}
          >
            <ZoomOut size={20} />
          </Button>
          <Button
            variant="secondary"
            aria-label="Perbesar foto"
            onClick={() => editor.setZoom(editor.zoom + 0.25)}
          >
            <ZoomIn size={20} />
          </Button>
          <span>{editor.zoom.toFixed(2)}×</span>
        </div>
        <div
          className="roi-viewport"
          ref={viewport}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              roi: { ...r },
              pan: { ...editor.pan },
              resize: (e.target as HTMLElement).dataset.handle === 'resize',
            };
          }}
          onPointerMove={(e) => {
            const start = drag.current;
            if (!start) return;
            const dx = e.clientX - start.x,
              dy = e.clientY - start.y;
            if (editor.mode === 'photo')
              editor.setPan({ x: start.pan.x + dx, y: start.pan.y + dy });
            else if (start.resize)
              editor.setRoi(
                resizeRoi(start.roi, { x: dx / transform.width, y: dy / transform.height }),
              );
            else
              editor.setRoi({
                ...start.roi,
                x: start.roi.x + dx / transform.width,
                y: start.roi.y + dy / transform.height,
              });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <img
            draggable={false}
            src={state.sourceUrl}
            alt="Foto asli untuk mengatur crop"
            style={{
              left: transform.left,
              top: transform.top,
              width: transform.width,
              height: transform.height,
            }}
          />
          <div
            className={'roi-boundary ' + (label ? 'label-boundary' : '')}
            style={{
              left: transform.left + r.x * transform.width,
              top: transform.top + r.y * transform.height,
              width: r.width * transform.width,
              height: r.height * transform.height,
            }}
          >
            <span>{label ? 'Label / nama test' : 'Gauge / display'}</span>
            <button data-handle="resize" className="roi-handle" aria-label="Tarik ukuran crop" />
          </div>
        </div>
        <div className="roi-controls">
          <div className="row wrap">
            {[
              [ArrowLeft, -0.02, 0, 'Kiri'],
              [ArrowUp, 0, -0.02, 'Atas'],
              [ArrowDown, 0, 0.02, 'Bawah'],
              [ArrowRight, 0.02, 0, 'Kanan'],
            ].map(([Icon, x, y, name]) => {
              const C = Icon as typeof ArrowLeft;
              return (
                <Button
                  key={String(name)}
                  variant="secondary"
                  aria-label={'Geser ' + name}
                  onClick={() => editor.nudge(x as number, y as number)}
                >
                  <C size={22} />
                </Button>
              );
            })}
          </div>
          <Field label="Lebar crop">
            <input
              type="range"
              min="0.02"
              max="1"
              step="0.005"
              value={r.width}
              onChange={(e) => editor.setRoi({ ...r, width: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tinggi crop">
            <input
              type="range"
              min="0.02"
              max="1"
              step="0.005"
              value={r.height}
              onChange={(e) => editor.setRoi({ ...r, height: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="actions">
          <Button variant="secondary" onClick={() => navigate('/pemeriksaan/hasil')}>
            Batal
          </Button>
          <Button
            onClick={() => {
              void engine.regions(label ? state.roi : r, label ? r : state.label_roi);
              navigate('/pemeriksaan/hasil');
            }}
          >
            Gunakan crop & analisis
          </Button>
        </div>
      </Card>
    </>
  );
}
