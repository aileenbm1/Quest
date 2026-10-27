/**
 * Worker de Cloudflare para la página de descarga de OIEG Quest.
 * - /descargar y /oieg-quest.apk entregan la APK guardada en R2.
 * - /apk-info devuelve tamaño y fecha de la última APK publicada.
 * - Todo lo demás se sirve desde la carpeta estática site/.
 *
 * La APK no puede ir como archivo estático porque Cloudflare limita los
 * assets a 25 MiB; por eso se guarda en un bucket R2 (sin límite práctico).
 */

export const APK_KEY = 'oieg-quest.apk';
/** JSON opcional con { version, commit } que sube el flujo de GitHub Actions. */
export const INFO_KEY = 'apk-info.json';
const APK_TYPE = 'application/vnd.android.package-archive';

// Tipos mínimos de la API de Workers que usamos (evita depender de @cloudflare/workers-types).
interface R2ObjectLike {
  size: number;
  uploaded: Date;
  httpEtag: string;
}
interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream;
  json<T>(): Promise<T>;
}
export interface Env {
  APK_BUCKET: {
    get(key: string): Promise<R2ObjectBodyLike | null>;
    head(key: string): Promise<R2ObjectLike | null>;
  };
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const notReady = () =>
  new Response(
    'La APK todavía no está publicada. Vuelve a intentarlo en unos minutos.',
    { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } },
  );

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === '/descargar' || path === `/${APK_KEY}`) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Método no permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const headers = (obj: R2ObjectLike) => ({
      'Content-Type': APK_TYPE,
      'Content-Disposition': `attachment; filename="${APK_KEY}"`,
      'Content-Length': String(obj.size),
      ETag: obj.httpEtag,
      'Cache-Control': 'no-cache',
    });
    if (request.method === 'HEAD') {
      const meta = await env.APK_BUCKET.head(APK_KEY);
      return meta ? new Response(null, { headers: headers(meta) }) : notReady();
    }
    const obj = await env.APK_BUCKET.get(APK_KEY);
    return obj ? new Response(obj.body, { headers: headers(obj) }) : notReady();
  }

  if (path === '/apk-info') {
    const meta = await env.APK_BUCKET.head(APK_KEY);
    let extra: { version?: string; commit?: string } = {};
    if (meta) {
      try {
        extra = (await (await env.APK_BUCKET.get(INFO_KEY))?.json<typeof extra>()) ?? {};
      } catch {
        extra = {};
      }
    }
    const body = meta
      ? {
          available: true,
          sizeBytes: meta.size,
          uploaded: meta.uploaded.toISOString(),
          version: extra.version ?? null,
          commit: extra.commit ?? null,
        }
      : { available: false };
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  return env.ASSETS.fetch(request);
}

export default { fetch: handleRequest };
