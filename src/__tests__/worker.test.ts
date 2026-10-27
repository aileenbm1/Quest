/** @jest-environment node */
import { APK_KEY, handleRequest, INFO_KEY, type Env } from '../../cloudflare/worker';

function makeEnv(hasApk: boolean): Env {
  const meta = {
    size: 4,
    uploaded: new Date('2026-10-27T10:00:00Z'),
    httpEtag: '"abc"',
  };
  const info = { version: '1.0.0', commit: 'deadbeef' };
  return {
    APK_BUCKET: {
      get: async (key) => {
        if (!hasApk) return null;
        if (key === APK_KEY) return { ...meta, body: new Blob(['APK!']).stream(), json: async () => ({}) as never };
        if (key === INFO_KEY) return { ...meta, body: new Blob(['{}']).stream(), json: async () => info as never };
        return null;
      },
      head: async (key) => (hasApk && key === APK_KEY ? meta : null),
    },
    ASSETS: { fetch: async () => new Response('<html>página</html>', { headers: { 'Content-Type': 'text/html' } }) },
  };
}

describe('Worker de descarga', () => {
  it('entrega la APK con el tipo y nombre correctos', async () => {
    const res = await handleRequest(new Request('https://quest.example/descargar'), makeEnv(true));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/vnd.android.package-archive');
    expect(res.headers.get('Content-Disposition')).toContain('oieg-quest.apk');
    expect(await res.text()).toBe('APK!');
  });

  it('también responde en /oieg-quest.apk y a HEAD', async () => {
    const res = await handleRequest(new Request('https://quest.example/oieg-quest.apk', { method: 'HEAD' }), makeEnv(true));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Length')).toBe('4');
  });

  it('avisa con 404 si todavía no hay APK', async () => {
    const res = await handleRequest(new Request('https://quest.example/descargar'), makeEnv(false));
    expect(res.status).toBe(404);
    const info = await handleRequest(new Request('https://quest.example/apk-info'), makeEnv(false));
    expect(await info.json()).toEqual({ available: false });
  });

  it('informa versión y tamaño', async () => {
    const res = await handleRequest(new Request('https://quest.example/apk-info'), makeEnv(true));
    expect(await res.json()).toMatchObject({ available: true, sizeBytes: 4, version: '1.0.0' });
  });

  it('sirve la página estática en las demás rutas', async () => {
    const res = await handleRequest(new Request('https://quest.example/'), makeEnv(true));
    expect(await res.text()).toContain('página');
  });
});
