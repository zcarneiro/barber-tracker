# Explicación del Proyecto

## 1. Estructura de la Interfaz (UI)

La aplicación está diseñada como una "Single Page Application" (SPA) móvil-primero, lo que significa que se siente como una app nativa en tu teléfono.

### 📋 Secciones Principales:

1.  **Barra Superior (Header)**:
    *   **Selector de Ubicación**: Un menú desplegable o botones grandes para cambiar rápidamente entre "Santiago", "Milladoiro" y "Bertamiráns".
    *   **Selector de Fecha**: Un control para elegir el mes y año (ej. "Febrero 2026"). Al cambiarlo, todos los datos de la pantalla se actualizan.

2.  **Tarjetas de Resumen (Dashboard)**:
    *   4 tarjetas visuales clave:
        *   **Ingresos**: Total recaudado.
        *   **Gastos**: Total gastado.
        *   **Beneficio Neto**: (Ingresos - Gastos).
        *   **Beneficio por Socio**: (Beneficio Neto / 2).

3.  **Botones de Acción Rápida**:
    *   Botones grandes y fáciles de tocar para:
        *   ➕ Añadir Gasto
        *   ➕ Añadir Ingreso
        *   👔 Añadir Nómina (Salario)
        *   ⚙️ Gestionar Gastos Fijos

4.  **Lista de Historial**:
    *   Debajo de los controles, una lista cronológica de los movimientos del mes seleccionado, para que puedas revisar qué se ha introducido.

5.  **Modales (Formularios)**:
    *   Al pulsar un botón de acción, se abre una ventana emergente (modal) limpia para introducir los datos sin salir de la pantalla principal.

---

## 2. Flujo de Datos (Data Flow)

Dado que tu webhook de n8n solo sirve para **guardar** datos en Google Sheets, la aplicación funcionará de forma híbrida para asegurar que puedas ver los totales al instante.

### 🔄 Cómo funciona:

1.  **Cuando guardas un dato (ej. Gasto de Luz de 180€)**:
    *   **Paso 1 (Local)**: La app guarda inmediatamente el dato en la memoria de tu teléfono (`localStorage`).
    *   **Paso 2 (Visual)**: Los totales (Ingresos, Beneficios) se recalculan al instante. ¡No hay tiempos de carga!
    *   **Paso 3 (Nube)**: La app envía silenciosamente los datos a tu webhook de n8n.
    *   **Paso 4 (Confirmación)**: n8n recibe los datos, los guarda en Google Sheets y devuelve "Gasto guardado correctamente". La app te muestra un mensaje de éxito.

2.  **Gastos Fijos**:
    *   Los defines en la app (se guardan en tu teléfono).
    *   Cuando pulsas "Aplicar gastos fijos a este mes", la app recorre tu lista y envía uno por uno al webhook de n8n automáticamente.

### ⚠️ Nota Importante:
Como la app lee los datos de la memoria del teléfono, si usas dos teléfonos distintos, los datos introducidos en uno no se verán en el otro (aunque ambos enviarán todo correctamente a Google Sheets). Para un uso personal o de un solo dispositivo principal, esto es perfecto y muy rápido.
