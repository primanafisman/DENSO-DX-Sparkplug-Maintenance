import { AlertTriangle, Camera, CheckCircle2, ClipboardList, Ruler } from 'lucide-react';
import type { MaintenanceDefinition } from '../../../shared/lib/contracts';
const value = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(n);
export function InspectionStandardTable({ definition: d }: { definition: MaintenanceDefinition }) {
  return (
    <>
      <div className="guide-facts">
        <div>
          <Ruler size={18} />
          <span>
            Alat pemeriksaan<strong>{d.tool}</strong>
          </span>
        </div>
        <div>
          <ClipboardList size={18} />
          <span>
            Frekuensi<strong>{d.interval_guide.description}</strong>
          </span>
        </div>
        <div>
          <Camera size={18} />
          <span>
            Pengisian
            <strong>
              {d.input_method === 'ok_ng'
                ? 'Pilih OK / NG'
                : d.input_method === 'photo_difference'
                  ? 'Foto sebelum & sesudah'
                  : 'Foto setiap sampel'}
            </strong>
          </span>
        </div>
      </div>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption>Standar dan metode pemeriksaan</caption>
          <thead>
            <tr>
              <th scope="col">Standar / persyaratan</th>
              <th scope="col">Metode pelaksanaan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <p className="guide-standard">{d.standard_text}</p>
                {d.limits && d.unit && (
                  <div className="guide-range" aria-label="Batas penerimaan">
                    <span>
                      Minimum
                      <strong>
                        {value(d.limits.minimum)} <small>{d.unit}</small>
                      </strong>
                    </span>
                    <span>
                      Maksimum
                      <strong>
                        {value(d.limits.maximum)} <small>{d.unit}</small>
                      </strong>
                    </span>
                  </div>
                )}
                {!!d.requirements.length && (
                  <ul className="guide-checks">
                    {d.requirements.map((r) => (
                      <li key={r.id}>
                        <CheckCircle2 size={16} />
                        <span>{r.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td>
                <p className="guide-method">{d.method_text}</p>
                <p className="guide-sample-heading">
                  {d.sample_count} {d.input_method === 'ok_ng' ? 'hasil pemeriksaan' : 'sampel'}{' '}
                  yang harus diisi
                </p>
                <div className="guide-samples">
                  {d.samples.map((s) => (
                    <span key={s.id}>{s.label}</span>
                  ))}
                </div>
                {d.resolution !== null && (
                  <p className="guide-resolution">
                    Ketelitian pada lembar: {value(d.resolution)} {d.unit}
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="guide-outcome">
        <CheckCircle2 size={18} />
        <span>{d.outcome_guide}</span>
      </p>
      {!!d.review_notes.length && (
        <aside className="guide-review">
          <AlertTriangle size={19} />
          <div>
            <strong>Catatan standar · perlu diperhatikan</strong>
            {d.review_notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
