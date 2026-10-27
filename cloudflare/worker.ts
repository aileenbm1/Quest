/**
 * Worker de Cloudflare para la página de descarga de OIEG Quest.
 * - /descargar y /oieg-quest.apk entregan la APK desde tu propio dominio:
 *   el Worker la baja de la release «latest» de GitHub y la reenvía como descarga.
 * - Todo lo demás se sirve desde la carpeta estática site/.
 */

export const APK_NAME = 'oieg-quest.apk';
export const APK_SOURCE = `https://github.com/aileenbm1/Quest/releases/latest/download/${APK_NAME}`;
const APK_TYPE = 'application/vnd.android.package-archive';

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const notReady = () =>
  new Response('La APK todavía no está publicada. Vuelve a intentarlo en unos minutos.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';

  if (path === '/descargar' || path === `/${APK_NAME}`) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Método no permitido', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const upstream = await fetch(APK_SOURCE, { method: request.method, redirect: 'follow' });
    if (!upstream.ok) return notReady();
    const headers = new Headers({
      'Content-Type': APK_TYPE,
      'Content-Disposition': `attachment; filename="${APK_NAME}"`,
      'Cache-Control': 'no-cache',
    });
    const length = upstream.headers.get('Content-Length');
    if (length) headers.set('Content-Length', length);
    return new Response(request.method === 'HEAD' ? null : upstream.body, { headers });
  }

  return env.ASSETS.fetch(request);
}

export default { fetch: handleRequest };
