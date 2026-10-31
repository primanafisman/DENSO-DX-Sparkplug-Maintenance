import fs from 'node:fs';
import path from 'node:path';

type DevTlsEnv = { SPM_DEV_HTTPS_CERT?: string; SPM_DEV_HTTPS_KEY?: string };

// Development only: do not copy certificates or private keys into the build.
export function devServerTls(frontend: string, env: DevTlsEnv) {
  const certificate = env.SPM_DEV_HTTPS_CERT?.trim();
  const key = env.SPM_DEV_HTTPS_KEY?.trim();
  if (!!certificate !== !!key)
    throw new Error('Isi sertifikat dan kunci HTTPS pengembangan secara berpasangan.');
  const pairs =
    certificate && key
      ? [[certificate, key]]
      : [
          ['../certs/denso-cert.pem', '../certs/denso-key.pem'],
          ['../Backend/runtime/tls/server-cert.pem', '../Backend/runtime/tls/server-key.pem'],
        ];
  for (const pair of pairs) {
    const [certPath, keyPath] = pair.map((file) => path.resolve(frontend, file));
    if (fs.existsSync(certPath) && fs.existsSync(keyPath))
      return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
  }
  if (certificate) throw new Error('Berkas sertifikat/kunci HTTPS pengembangan tidak ditemukan.');
  return undefined;
}
