# Compilar la APK de Android

La configuración ya está lista en `app.json` (paquete `mx.oiegquest.app`, icono, splash, permisos mínimos) y `eas.json` (perfiles).

## Perfiles de `eas.json`

| Perfil | Resultado | Uso |
| --- | --- | --- |
| `development` | APK con *development client* | Desarrollo con recarga en vivo (`npx expo start --dev-client`). |
| `preview` | APK instalable (`buildType: apk`, distribución interna) | **APK de prueba** para instalar en teléfonos. |
| `production` | AAB | Publicación futura en Google Play. |

## Pasos con EAS Build (en la nube)

Requisitos: Node 22.13+, una cuenta gratuita de Expo (https://expo.dev/signup).

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build:configure      # la primera vez: crea el proyecto en Expo y agrega su projectId a app.json
npx eas-cli@latest build -p android --profile preview
```

La primera vez EAS pregunta si debe generar un *keystore* de Android: responde que sí (EAS lo guarda de forma segura). Al terminar muestra un enlace y un QR para descargar el `.apk`.

Atajos equivalentes en `package.json`:

```bash
npm run build:apk   # perfil preview
npm run build:dev   # perfil development
```

## Instalar la APK

- Desde el teléfono: abre el enlace de EAS, descarga el `.apk` y permite «instalar apps de origen desconocido» cuando Android lo pida.
- Desde la computadora: `adb install ruta/al/archivo.apk`
- En un emulador: `npx eas-cli@latest build:run -p android --latest`

## Compilación local (opcional)

Con Android Studio y el SDK instalados:

```bash
npx expo prebuild --platform android
npx expo run:android --variant release
```

o bien `npx eas-cli@latest build -p android --profile preview --local`.

## Variables de entorno

No se requiere ninguna. Para compilar en CI con EAS, define `EXPO_TOKEN` (token personal de Expo) como secreto del CI.

## Descarga directa con un link (Cloudflare)

La APK se compila sola en GitHub Actions (`.github/workflows/apk.yml`) en cada push a `main`, se sube a un bucket de R2 y el Worker `quest` (`wrangler.jsonc`, `cloudflare/worker.ts`) la sirve en:

- `https://<tu-dominio>/` página de descarga con instrucciones
- `https://<tu-dominio>/descargar` descarga directa del `.apk`
- `https://<tu-dominio>/apk-info` versión, tamaño y fecha en JSON

Configuración (una sola vez):

1. En Cloudflare, **My Profile → API Tokens → Create Token** con permiso *Workers R2 Storage: Edit*. Copia también tu *Account ID*.
2. En GitHub, **Settings → Secrets and variables → Actions**, crea `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.

El workflow crea el bucket R2 `oieg-quest-apk` la primera vez si todavía no existe.

Sin esos secretos el workflow igual compila la APK y la deja como *artifact* descargable en la pestaña Actions, pero no la publica en el link.

La APK de este flujo se firma con la llave de depuración de la plantilla de Expo: sirve para instalarla directamente, no para Google Play.
