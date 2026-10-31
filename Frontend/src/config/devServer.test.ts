import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { devServerTls } from '../../scripts/dev-server-config';

const folders: string[] = [];
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spm-vite-'));
  folders.push(root);
  const frontend = path.join(root, 'Frontend');
  fs.mkdirSync(frontend);
  return { root, frontend };
}
function pair(folder: string) {
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'server-cert.pem'), 'fixture certificate');
  fs.writeFileSync(path.join(folder, 'server-key.pem'), 'fixture key');
}
afterEach(() => {
  for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

describe('portable development TLS from Frontend.zip', () => {
  it('does not require a certificate to build or run local HTTP', () => {
    expect(devServerTls(workspace().frontend, {})).toBeUndefined();
  });
  it('reuses the installation certificate pair from the sibling Backend', () => {
    const { root, frontend } = workspace();
    pair(path.join(root, 'Backend/runtime/tls'));
    expect(devServerTls(frontend, {})).toEqual({
      cert: Buffer.from('fixture certificate'),
      key: Buffer.from('fixture key'),
    });
  });
  it('accepts the archive certs layout without requiring it on every laptop', () => {
    const { root, frontend } = workspace();
    const certs = path.join(root, 'certs');
    fs.mkdirSync(certs);
    fs.writeFileSync(path.join(certs, 'denso-cert.pem'), 'archive certificate');
    fs.writeFileSync(path.join(certs, 'denso-key.pem'), 'archive key');
    expect(devServerTls(frontend, {})?.cert.toString()).toBe('archive certificate');
  });
  it('loads an explicitly configured pair relative to Frontend', () => {
    const { frontend } = workspace();
    pair(path.join(frontend, 'local-tls'));
    expect(
      devServerTls(frontend, {
        SPM_DEV_HTTPS_CERT: 'local-tls/server-cert.pem',
        SPM_DEV_HTTPS_KEY: 'local-tls/server-key.pem',
      })?.key.toString(),
    ).toBe('fixture key');
  });
  it('reports incomplete explicit configuration instead of silently falling back', () => {
    expect(() => devServerTls(workspace().frontend, { SPM_DEV_HTTPS_CERT: 'missing.pem' })).toThrow(
      /sertifikat.*kunci/i,
    );
  });
  it('reports explicit missing files clearly', () => {
    expect(() =>
      devServerTls(workspace().frontend, {
        SPM_DEV_HTTPS_CERT: 'missing.pem',
        SPM_DEV_HTTPS_KEY: 'missing.key',
      }),
    ).toThrow(/tidak ditemukan/i);
  });
});
