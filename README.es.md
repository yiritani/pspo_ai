# PSPO AI Sala de estudio

[日本語](README.ja.md) · [English](README.en.md) · [简体中文](README.zh.md) · [Español](README.es.md)

Una aplicación gratuita para preparar PSPO-AI Essentials, con 124 preguntas de práctica y explicaciones de cada opción. Es un recurso no oficial, sin afiliación con Scrum.org. No contiene preguntas reales ni de exámenes anteriores.

[Abrir la aplicación](https://yiritani.github.io/pspo_ai/) · [GitHub](https://github.com/yiritani/pspo_ai)

## Funciones

- Hasta 40 preguntas por sesión, dando prioridad a las que tienen menos aciertos.
- Modos normal y difícil. Dos aciertos acumulados marcan una pregunta como dominada en ese modo.
- Repaso de errores e importación y exportación de preguntas propias en JSON.
- El progreso y el idioma se guardan en el navegador. Sin registro ni sincronización entre dispositivos.

## Idiomas

Disponible en japonés, inglés, chino simplificado y español. Cambiar el idioma de la aplicación no modifica la URL. Las páginas estáticas de preguntas y explicaciones tienen una URL por idioma.

[日本語](https://yiritani.github.io/pspo_ai/questions/) · [English](https://yiritani.github.io/pspo_ai/en/questions/) · [简体中文](https://yiritani.github.io/pspo_ai/zh/questions/) · [Preguntas en español](https://yiritani.github.io/pspo_ai/es/questions/)

## Desarrollo

Creada con React y Vite.

```sh
npm install
npm run dev
```

Abre la URL local que aparece en el terminal. Para comprobar y compilar:

```sh
npm test
npm run build
```

Las preguntas están en `public/questions.json`, las opciones del modo difícil en `public/questions-hard.json` y los textos de la interfaz en `src/messages.js`. Al modificar preguntas, actualiza también los archivos correspondientes `.en.json`, `.zh.json` y `.es.json`. Las preguntas propias o editadas no se traducen automáticamente.

Al hacer push a `main`, GitHub Actions ejecuta las pruebas, compila y publica en GitHub Pages.

## Contribuir

Puedes abrir PR e issues libremente, sin pedir permiso antes. Se agradecen las correcciones de preguntas, las mejoras de traducción y las propuestas de funciones.
