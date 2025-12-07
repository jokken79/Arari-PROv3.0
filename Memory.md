# Memory.md - 粗利 PRO

Este archivo registra el historial de cambios significativos realizados en el repositorio, especialmente por asistentes de IA o herramientas automatizadas.

**Propósito**: Mantener un registro claro de qué se cambió, por qué, y qué impacto tiene para facilitar la comprensión del proyecto en futuras sesiones.

**Formato de entradas**: Cada entrada debe incluir fecha, autor/herramienta, resumen, cambios, impacto y próximos pasos.

---

## [2025-12-07] – Claude (Arquitecto de Repo)

**Resumen breve**
- Auditoría inicial de estructura del repositorio y creación de Memory.md.

**Cambios realizados**
- `Memory.md`: Creado este archivo para registro de historial.
- `docs/`: Creada estructura de carpetas para documentación.
- `docs/tech/`: Subcarpeta para documentación técnica.
- `docs/assets/`: Subcarpeta para imágenes y recursos.
- `docs/ai/`: Subcarpeta para análisis generados por IA.
- `DOCKER_DEPLOYMENT.md` → `docs/tech/DOCKER_DEPLOYMENT.md`: Movido a ubicación correcta.

**Impacto**
- El repositorio ahora tiene una estructura de documentación organizada.
- Documentación técnica separada del README principal.
- Historial de cambios documentado para futuras sesiones.

**TODO / Próximos pasos**
- [x] ~~REVISAR: Confirmar si imágenes IMG_7706/7707/7708 deben moverse a `docs/assets/`~~ → Movidas
- [x] ~~REVISAR: Verificar si `templates/index.html` se usa o puede eliminarse~~ → Eliminado
- [ ] Considerar añadir `.env.instance01-09` si se necesitan las 10 instancias Docker

---

## [2025-12-07] – Claude (Arquitecto de Repo) - Limpieza

**Resumen breve**
- Limpieza de archivos: mover imágenes de referencia y eliminar prototipo obsoleto.

**Cambios realizados**
- `IMG_7706.jpeg`, `IMG_7707.png`, `IMG_7708.jpeg` → `docs/assets/`: Movidas imágenes de referencia usadas para ajustar cálculos de márgenes.
- `templates/` → ELIMINADO: Carpeta con prototipo HTML antiguo (Chart.js) que ya no se usa. El proyecto ahora usa Next.js + Recharts.

**Impacto**
- Raíz del repo más limpia (solo archivos esenciales).
- Imágenes de referencia organizadas en `docs/assets/`.
- Eliminado código muerto que podría causar confusión.

**TODO / Próximos pasos**
- [ ] Considerar añadir `.env.instance01-09` si se necesitan las 10 instancias Docker

---
