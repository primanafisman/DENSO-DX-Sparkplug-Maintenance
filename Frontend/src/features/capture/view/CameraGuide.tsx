import { useRef, useEffect, useState } from 'react';
import { guideRegions, containTransform } from '../model/roiGeometry';
export function CameraGuide({ width, height }: { width: number; height: number }) {
  const ref = useRef<HTMLDivElement>(null),
    [box, setBox] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, []);
  const transform = containTransform(width || 1080, height || 1920, box.width, box.height),
    regions = guideRegions(width || 1080, height || 1920);
  return (
    <div ref={ref} className="camera-guides" aria-hidden="true">
      {(['gauge', 'label'] as const).map((key) => {
        const r = regions[key];
        return (
          <div
            key={key}
            className={'guide-' + key}
            style={{
              left: transform.left + r.x * transform.width,
              top: transform.top + r.y * transform.height,
              width: r.width * transform.width,
              height: r.height * transform.height,
            }}
          >
            <span>{key === 'gauge' ? 'Gauge / angka utuh' : 'Label nama alat / test'}</span>
          </div>
        );
      })}
    </div>
  );
}
