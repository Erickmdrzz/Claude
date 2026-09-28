# El Tiempo 🌤️

Página web del tiempo en tiempo real hecha solo con **HTML, CSS y JavaScript**, sin frameworks ni instalaciones. Usa la API gratuita de [Open-Meteo](https://open-meteo.com/), que no necesita clave.

## Qué hace

- Al abrirla pide permiso para usar tu ubicación. Si no lo das (o no se puede obtener), muestra el tiempo de **Madrid**.
- Buscador de ciudades con sugerencias mientras escribes (también puedes usar las flechas y Enter).
- Botón 📍 para volver a tu ubicación.
- Muestra la temperatura actual, la sensación térmica, la humedad, el viento (velocidad y dirección) y un icono según el estado del cielo.
- Previsión por horas de las próximas 24 horas, con probabilidad de lluvia.
- Se actualiza sola cada **10 minutos** e indica la hora de la última actualización. También hay un botón «Actualizar ahora».
- El fondo cambia según sea de día o de noche en la ciudad consultada (y se vuelve gris si está nublado o llueve).
- Diseño adaptado a móvil.

## Archivos

| Archivo      | Contenido                                        |
|--------------|--------------------------------------------------|
| `index.html` | Estructura de la página                          |
| `styles.css` | Estilos y fondos de día / noche                  |
| `app.js`     | Lógica: ubicación, buscador, API y actualización |

## Cómo abrirla

### Opción rápida

Haz doble clic en `index.html` para abrirlo en el navegador.

> Algunos navegadores no permiten la geolocalización en archivos abiertos con `file://`. Si no te pide la ubicación, verás Madrid; el buscador funciona igual. Para que la ubicación funcione siempre, usa un servidor local (abajo) o publícala en GitHub Pages.

### Con un servidor local (recomendado)

Desde la carpeta del proyecto, ejecuta uno de estos comandos y abre `http://localhost:8000`:

```bash
# Si tienes Python
python3 -m http.server 8000

# Si tienes Node.js
npx serve -l 8000
```

`localhost` se considera un origen seguro, así que el navegador sí pedirá permiso para usar tu ubicación.

## Cómo publicarla con GitHub Pages

1. Sube estos archivos a un repositorio de GitHub (con `index.html` en la raíz).
2. En el repositorio, ve a **Settings → Pages**.
3. En **Build and deployment**, elige **Source: Deploy from a branch**.
4. Selecciona la rama (por ejemplo `main`) y la carpeta **`/ (root)`**, y pulsa **Save**.
5. Espera uno o dos minutos. GitHub mostrará la dirección de tu página, del tipo:

   ```
   https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/
   ```

GitHub Pages sirve la web por HTTPS, así que la geolocalización funciona sin problemas. Cada vez que subas cambios a esa rama, la página se actualizará sola.

## APIs usadas

- **Previsión:** `https://api.open-meteo.com/v1/forecast` (Open-Meteo, gratuita y sin clave).
- **Búsqueda de ciudades:** `https://geocoding-api.open-meteo.com/v1/search` (Open-Meteo).
- **Nombre de tu ubicación:** `https://api.bigdatacloud.net/data/reverse-geocode-client` (gratuita y sin clave). Open-Meteo no ofrece geocodificación inversa; si esta llamada falla, la página muestra «Tu ubicación» y el tiempo sigue funcionando.

Los datos meteorológicos son de [Open-Meteo](https://open-meteo.com/) bajo licencia CC BY 4.0.
