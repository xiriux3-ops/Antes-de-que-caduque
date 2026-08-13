# Antes de que caduque

Aplicación Android y web instalable para registrar productos y recibir avisos antes de su fecha de caducidad.

La versión 0.2 incorpora una identidad visual renovada, un logotipo propio, tarjetas con indicadores de tiempo y recursos de lanzamiento adaptados para Android.

## Funciones de esta primera versión

- Alta, edición y eliminación de productos.
- Categorías, cantidades y notas.
- Semáforo automático de vigencia.
- Búsqueda y filtros.
- Orden por fecha de caducidad.
- Datos guardados localmente, sin cuenta ni servidor.
- Notificaciones locales en Android tres días antes.
- Funcionamiento web sin conexión después de la primera carga.

## Desarrollo

Requiere Node.js y npm.

```bash
npm install
npm run dev
```

## Pruebas y compilación web

```bash
npm test
npm run build
```

## Compilación Android

Instala Android Studio con el SDK de Android y después ejecuta:

```bash
npm install
npm run build
npx cap add android
npx cap open android
```

En Android Studio selecciona **Build > Build APK(s)**. El proyecto nativo se generará dentro de `android/`.

## APK automático con GitHub

El flujo `Compilar APK Android`, incluido en `.github/workflows/build-android.yml`, ejecuta las pruebas y genera un APK de prueba cada vez que se actualiza la rama `main`. El APK aparece en la sección **Actions**, dentro de la ejecución correspondiente, bajo **Artifacts**.

## Privacidad

La versión 0.1 no solicita una cuenta y guarda el inventario únicamente en el dispositivo. No incluye anuncios, analítica ni transmisión de información personal.
