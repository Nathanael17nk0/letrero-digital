/**
 * LETRERO LED DIGITAL - MOTOR DE ALTA DEFINICIÓN & LEGIBILIDAD
 * Optimizado para Desktop, Tablets y Celulares (iOS / Android).
 * Incluye fuente Pixel-Perfect de matriz LED, control de grosor de trazo,
 * espaciado de letras, auto-rotación 90° y Screen Wake Lock.
 */

(function () {
  'use strict';

  // --- Elementos del DOM ---
  const appContainer = document.getElementById('appContainer');
  const boardContainer = document.getElementById('boardContainer');
  const boardWrapper = document.getElementById('boardWrapper');
  const canvas = document.getElementById('ledCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fullscreenTapArea = document.getElementById('fullscreenTapArea');
  const floatingHud = document.getElementById('floatingHud');
  const hudBtnSettings = document.getElementById('hudBtnSettings');
  const hudBtnExitFs = document.getElementById('hudBtnExitFs');

  // Barra Superior
  const btnRotateMobile = document.getElementById('btnRotateMobile');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const iconPlayPause = document.getElementById('iconPlayPause');
  const txtPlayPause = document.getElementById('txtPlayPause');
  const btnMirror = document.getElementById('btnMirror');
  const btnToggleUI = document.getElementById('btnToggleUI');
  const iconToggleUI = document.getElementById('iconToggleUI');
  const txtToggleUI = document.getElementById('txtToggleUI');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const iconFullscreen = document.getElementById('iconFullscreen');
  const txtFullscreen = document.getElementById('txtFullscreen');

  // Input y Presets
  const messageInput = document.getElementById('messageInput');
  const btnClearText = document.getElementById('btnClearText');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const controlsPanel = document.getElementById('controlsPanel');
  const mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');

  // Ajustes de Color, Modos y Sliders
  const swatches = document.querySelectorAll('.swatch');
  const colorNameBadge = document.getElementById('colorNameBadge');
  const customColorPicker = document.getElementById('customColorPicker');
  const modePills = document.querySelectorAll('.mode-pill');
  const btnFitAuto = document.getElementById('btnFitAuto');
  const btnFitScroll = document.getElementById('btnFitScroll');
  const fitBadge = document.getElementById('fitBadge');
  const speedSlider = document.getElementById('speedSlider');
  const speedLabel = document.getElementById('speedLabel');
  const glowSlider = document.getElementById('glowSlider');
  const glowLabel = document.getElementById('glowLabel');

  // Ajustes de Legibilidad y Hardware
  const segmentBtns = document.querySelectorAll('.segment-btn');
  const strokeLabel = document.getElementById('strokeLabel');
  const spacingSlider = document.getElementById('spacingSlider');
  const spacingLabel = document.getElementById('spacingLabel');
  const fontSelect = document.getElementById('fontSelect');
  const shapeSelect = document.getElementById('shapeSelect');
  const densitySelect = document.getElementById('densitySelect');
  const fpsDisplay = document.getElementById('fpsDisplay');

  // --- Canvas Offscreen para Rasterizar Texto ---
  const offCanvas = document.createElement('canvas');
  const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

  // Lista de fuentes válidas
  const VALID_FONTS = ['led-matrix', 'modern-sans', 'impact-clean', 'arcade', 'digital'];

  // --- Estado de la Aplicación ---
  const state = {
    text: '¡HOLA! BIENVENIDOS AL LETRERO LED ✨',
    color: '#ffaa00',
    colorName: 'Ámbar Oro',
    mode: 'marquee-left', // marquee-left, marquee-right, static, blink, wave
    fitMode: 'auto', // 'auto' (Todo en pantalla sin scroll) o 'scroll' (1 línea continua)
    speed: 6,
    glow: 75,
    strokeWeight: 'fine', // fine, normal, bold
    letterSpacing: 2, // 1 a 6 píxeles de espacio entre letras
    shape: 'circle', // circle, square, diamond
    matrixRows: 'auto', // 'auto' (Auto HD Inteligente), 16, 24, 32, 44, 56
    fontType: 'led-matrix', // default pixel-perfect matrix
    isPaused: false,
    isMirror: false,
    isUIHidden: false,
    isRotated: false,

    // Runtime de animación
    scrollOffset: 0,
    textPixels: null,
    textWidth: 0,
    textHeight: 24,
    lastTimestamp: performance.now(),
    blinkTimer: 0,
    blinkVisible: true,
    rainbowHue: 0,
    wavePhase: 0,
    wakeLockObj: null,
  };

  // Variables de dimensión de la matriz
  let canvasW = 0;
  let canvasH = 0;
  let effectiveRows = 24;
  let matrixCols = 0;
  let pitch = 0;
  let diodeRadius = 0;
  let offsetX = 0;
  let offsetY = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Temporizadores
  let idleTimeout = null;
  let fpsFrames = 0;
  let fpsLastUpdate = performance.now();

  // ==========================================================================
  // FUENTE BITMAP DE MATRIZ LED DE ALTA NÍTIDEZ (5x7 / 7x9 ULTRA LEGIBLE)
  // Cada letra tiene huecos definidos (counters) y trazos exactos de 1 diodo.
  // ==========================================================================
  const BITMAP_5x7 = {
    'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
    'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
    'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
    'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
    'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
    'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
    'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
    'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
    'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
    'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
    'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
    'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
    'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
    'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
    'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
    'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
    'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
    'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
    'S': [0x46, 0x49, 0x49, 0x49, 0x31],
    'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
    'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
    'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
    'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
    'X': [0x63, 0x14, 0x08, 0x14, 0x63],
    'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
    'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
    '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
    '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
    '2': [0x42, 0x61, 0x51, 0x49, 0x46],
    '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
    '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
    '5': [0x27, 0x45, 0x45, 0x45, 0x39],
    '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
    '7': [0x01, 0x71, 0x09, 0x05, 0x03],
    '8': [0x36, 0x49, 0x49, 0x49, 0x36],
    '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
    ' ': [0x00, 0x00, 0x00],
    '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
    '¡': [0x00, 0x00, 0x7D, 0x00, 0x00],
    '?': [0x02, 0x01, 0x51, 0x09, 0x06],
    '¿': [0x30, 0x48, 0x45, 0x40, 0x20],
    '.': [0x00, 0x60, 0x60, 0x00],
    ':': [0x00, 0x36, 0x36, 0x00],
    ',': [0x00, 0x80, 0x60, 0x00],
    '-': [0x08, 0x08, 0x08, 0x08],
    '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
    '*': [0x14, 0x08, 0x3E, 0x08, 0x14],
    '%': [0x23, 0x13, 0x08, 0x64, 0x62],
    '$': [0x24, 0x2A, 0x7F, 0x2A, 0x12],
    '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
    '♥': [0x0C, 0x1E, 0x3E, 0x1E, 0x0C],
    '★': [0x24, 0x36, 0x7F, 0x36, 0x24],
    '✨': [0x08, 0x1C, 0x3E, 0x1C, 0x08],
    'Á': [0x7E, 0x11, 0x13, 0x11, 0x7E],
    'É': [0x7F, 0x49, 0x4B, 0x49, 0x41],
    'Í': [0x00, 0x41, 0x7F, 0x43, 0x00],
    'Ó': [0x3E, 0x41, 0x43, 0x41, 0x3E],
    'Ú': [0x3F, 0x40, 0x42, 0x40, 0x3F],
    'Ñ': [0x7F, 0x06, 0x09, 0x10, 0x7F],
  };

  // --- Cargar y Guardar Preferencias ---
  function loadPreferences() {
    try {
      const data = localStorage.getItem('led_sign_v5_state');
      if (data) {
        const p = JSON.parse(data);
        if (p.text) state.text = p.text;
        if (p.color) state.color = p.color;
        if (p.colorName) state.colorName = p.colorName;
        if (p.mode) state.mode = p.mode;
        if (p.fitMode) state.fitMode = p.fitMode;
        if (p.speed) state.speed = Number(p.speed);
        if (p.glow !== undefined) state.glow = Number(p.glow);
        if (p.strokeWeight) state.strokeWeight = p.strokeWeight;
        if (p.letterSpacing) state.letterSpacing = Number(p.letterSpacing);
        if (p.shape) state.shape = p.shape;
        if (p.matrixRows !== undefined) {
          state.matrixRows = (p.matrixRows === 'auto' || p.matrixRows === 24 || p.matrixRows === '24') ? 'auto' : Number(p.matrixRows);
        } else {
          state.matrixRows = 'auto';
        }
        if (p.fontType && VALID_FONTS.includes(p.fontType)) {
          state.fontType = p.fontType;
        } else {
          state.fontType = 'led-matrix';
        }
        if (p.isMirror !== undefined) state.isMirror = Boolean(p.isMirror);
      }
    } catch (e) {
      state.fontType = 'led-matrix';
      state.matrixRows = 'auto';
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem('led_sign_v5_state', JSON.stringify({
        text: state.text,
        color: state.color,
        colorName: state.colorName,
        mode: state.mode,
        fitMode: state.fitMode,
        speed: state.speed,
        glow: state.glow,
        strokeWeight: state.strokeWeight,
        letterSpacing: state.letterSpacing,
        shape: state.shape,
        matrixRows: state.matrixRows,
        fontType: state.fontType,
        isMirror: state.isMirror,
      }));
    } catch (e) {}
  }

  // --- Sincronizar UI con el Estado ---
  function syncUI() {
    messageInput.value = state.text;
    speedSlider.value = state.speed;
    updateSpeedText(state.speed);

    glowSlider.value = state.glow;
    glowLabel.textContent = `${state.glow}%`;

    spacingSlider.value = state.letterSpacing;
    spacingLabel.textContent = `+${state.letterSpacing} LEDs`;

    strokeLabel.textContent = state.strokeWeight === 'fine' ? 'Nítido (1-2 LEDs)' :
                             state.strokeWeight === 'normal' ? 'Normal' : 'Grueso (Bold)';

    segmentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.stroke === state.strokeWeight);
    });

    shapeSelect.value = state.shape;
    densitySelect.value = String(state.matrixRows);
    fontSelect.value = state.fontType;

    btnMirror.classList.toggle('active', state.isMirror);

    swatches.forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === state.color.toLowerCase());
    });
    colorNameBadge.textContent = state.colorName;

    modePills.forEach(m => {
      m.classList.toggle('active', m.dataset.mode === state.mode);
    });

    if (btnFitAuto && btnFitScroll) {
      btnFitAuto.classList.toggle('active', state.fitMode === 'auto');
      btnFitScroll.classList.toggle('active', state.fitMode === 'scroll');
    }
    if (fitBadge) {
      fitBadge.textContent = state.fitMode === 'auto' ? 'Todo en Pantalla' : '1 Sola Línea';
    }
  }

  function updateSpeedText(val) {
    if (val <= 3) speedLabel.textContent = `Lenta (${val})`;
    else if (val <= 7) speedLabel.textContent = `Media (${val})`;
    else if (val <= 11) speedLabel.textContent = `Rápida (${val})`;
    else speedLabel.textContent = `Turbo (${val})`;
  }

  // --- Cálculo Dinámico de Filas para Máxima Nitidez (Auto HD) ---
  function calculateEffectiveRows(h) {
    if (state.matrixRows !== 'auto') {
      return Number(state.matrixRows);
    }
    // Auto HD: adaptamos la densidad de diodos según la altura disponible
    // para mantener un tamaño de LED óptimo (~6.5px a 8.5px de pitch).
    if (h <= 140) {
      return 24; // Barra compacta en vertical (con controles abiertos)
    } else if (h <= 220) {
      return 30;
    } else if (h <= 340) {
      return 38;
    } else if (h <= 480) {
      return 48; // Celular horizontal / pantalla completa móvil (~375px-430px)
    } else if (h <= 680) {
      return 56; // Tablet horizontal
    } else {
      return 64; // Pantallas grandes de escritorio
    }
  }

  // --- Dimensionamiento de Canvas y Matriz (Inmune a rotaciones CSS) ---
  function updateDimensions() {
    // Usamos clientWidth y clientHeight para obtener las dimensiones lógicas no transformadas
    const w = boardWrapper.clientWidth || 300;
    const h = boardWrapper.clientHeight || 100;

    canvasW = Math.max(Math.floor(w), 240);
    canvasH = Math.max(Math.floor(h), 70);

    canvas.width = Math.round(canvasW * dpr);
    canvas.height = Math.round(canvasH * dpr);

    effectiveRows = calculateEffectiveRows(canvasH);
    pitch = canvasH / effectiveRows;
    matrixCols = Math.floor(canvasW / pitch);
    diodeRadius = (pitch * 0.78) / 2;

    offsetX = (canvasW - matrixCols * pitch) / 2;
    offsetY = (canvasH - effectiveRows * pitch) / 2;

    rasterizeText();
  }

  // --- RASTERIZADOR DE TEXTO ULTRA NÍTIDO ---
  function rasterizeText() {
    const rawContent = (state.text && state.text.trim().length > 0) ? state.text.trim() : ' ';
    const content = rawContent.toUpperCase();
    const rows = effectiveRows;
    state.textHeight = rows;

    if (state.fontType === 'led-matrix') {
      rasterizeBitmapFont(content, rows);
    } else {
      rasterizeVectorFont(content, rows);
    }
  }

  // --- Funciones Auxiliares para Ancho y Partición de Texto ---
  function measureBitmapLineWidth(text, scale, spacing) {
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      const cols = BITMAP_5x7[text[i]] || BITMAP_5x7['?'] || [0x7F, 0x41, 0x41, 0x7F];
      w += (cols.length * scale);
      if (i < text.length - 1) w += spacing;
    }
    return w;
  }

  function wrapTextIntoLines(text, maxCols, scale, spacing, maxLines) {
    if (text.includes('\n')) {
      return text.split('\n').map(l => l.trim()).filter(Boolean);
    }
    const words = text.trim().split(/\s+/);
    if (words.length <= 1) return [text];

    let lines = [];
    let curLine = '';
    for (const w of words) {
      const test = curLine ? (curLine + ' ' + w) : w;
      if (measureBitmapLineWidth(test, scale, spacing) <= maxCols) {
        curLine = test;
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
      }
    }
    if (curLine) lines.push(curLine);

    if (lines.length > maxLines) {
      const balanced = [];
      const wordsPerLine = Math.ceil(words.length / maxLines);
      for (let i = 0; i < maxLines; i++) {
        const slice = words.slice(i * wordsPerLine, (i + 1) * wordsPerLine);
        if (slice.length > 0) balanced.push(slice.join(' '));
      }
      return balanced;
    }
    return lines;
  }

  // Renderizado Pixel-Perfect con fuente bitmap (Multilínea y Auto-Ajuste)
  function rasterizeBitmapFont(content, rows) {
    if (!content || content.length === 0) {
      state.textWidth = 10;
      state.textHeight = rows;
      offCanvas.width = 10;
      offCanvas.height = rows;
      offCtx.clearRect(0, 0, 10, rows);
      state.textPixels = offCtx.getImageData(0, 0, 10, rows).data;
      return;
    }

    const spacing = Math.max(1, state.letterSpacing);
    const cols = Math.max(matrixCols, 30);

    // Escala máxima para llenar armónicamente la altura de la matriz (~80% de la altura)
    const maxSingleScale = Math.max(1, Math.floor((rows * 0.82) / 7));
    let scale = maxSingleScale;
    let lines = [content];

    const isExplicitMultiline = content.includes('\n');

    if (isExplicitMultiline) {
      lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      scale = Math.max(1, Math.floor(((rows / Math.max(lines.length, 1)) * 0.76) / 7));
    } else if (state.fitMode === 'auto') {
      // En modo 'auto' (Todo en Pantalla), buscamos la escala más alta donde quepa en 1 sola línea
      let bestSingleScale = 1;
      for (let s = maxSingleScale; s >= 1; s--) {
        if (measureBitmapLineWidth(content, s, spacing) <= cols) {
          bestSingleScale = s;
          break;
        }
      }

      if (measureBitmapLineWidth(content, bestSingleScale, spacing) <= cols && bestSingleScale >= 2) {
        scale = bestSingleScale;
        lines = [content];
      } else {
        // Si a escala 1 o 2 no cabe bien, probamos multilínea
        const maxLines = rows >= 36 ? 3 : 2;
        const candidateLines = wrapTextIntoLines(content, cols, 1, spacing, maxLines);
        if (candidateLines.length > 1) {
          lines = candidateLines;
          scale = Math.max(1, Math.floor(((rows / lines.length) * 0.74) / 7));
        } else {
          scale = bestSingleScale;
          lines = [content];
        }
      }
    } else {
      // Modo 'scroll' (1 Sola Línea Continua):
      // Usa la escala completa del letrero para que las letras sean altas, nítidas e imponentes
      scale = maxSingleScale;
      lines = [content];
    }

    const fontH = 7 * scale;
    const lineGap = (lines.length === 2) ? (rows >= 24 ? 3 : 2) : 1;
    const totalBlockH = lines.length * fontH + (lines.length - 1) * lineGap;
    const blockY = Math.max(0, Math.floor((rows - totalBlockH) / 2));

    // Determinar ancho máximo de línea
    let maxLineW = 0;
    lines.forEach(line => {
      const lw = measureBitmapLineWidth(line, scale, spacing);
      if (lw > maxLineW) maxLineW = lw;
    });

    const isFixedScreen = ((state.fitMode === 'auto' || state.mode === 'static' || state.mode === 'blink') && lines.length > 1) || (state.mode === 'static' || state.mode === 'blink');
    const canvasW = isFixedScreen ? cols : Math.max(maxLineW, 10);
    state.textWidth = canvasW;

    offCanvas.width = canvasW;
    offCanvas.height = rows;
    offCtx.clearRect(0, 0, canvasW, rows);
    offCtx.fillStyle = '#ffffff';

    const boldExtra = (state.strokeWeight === 'bold') ? Math.max(1, Math.round(scale * 0.35)) : 0;

    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      const lineW = measureBitmapLineWidth(line, scale, spacing);
      const lineY = blockY + l * (fontH + lineGap);
      let curX = isFixedScreen ? Math.max(0, Math.floor((cols - lineW) / 2)) : 0;

      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const colBits = BITMAP_5x7[ch] || BITMAP_5x7['?'] || [0x7F, 0x41, 0x41, 0x7F];

        for (let c = 0; c < colBits.length; c++) {
          const bits = colBits[c];
          for (let r = 0; r < 7; r++) {
            if ((bits >> r) & 1) {
              const px = curX + c * scale;
              const py = lineY + r * scale;
              offCtx.fillRect(px, py, scale, scale);

              if (boldExtra > 0) {
                offCtx.fillRect(px + boldExtra, py, scale, scale);
              }
            }
          }
        }
        curX += (colBits.length * scale) + spacing;
      }
    }

    state.textPixels = offCtx.getImageData(0, 0, canvasW, rows).data;
  }

  // Renderizado Vectorial con Soporte Multilínea
  function rasterizeVectorFont(content, rows) {
    if (!content || content.length === 0) {
      state.textWidth = 10;
      state.textHeight = rows;
      offCanvas.width = 10;
      offCanvas.height = rows;
      offCtx.clearRect(0, 0, 10, rows);
      state.textPixels = offCtx.getImageData(0, 0, 10, rows).data;
      return;
    }

    const cols = Math.max(matrixCols, 30);
    let fontName = "'Trebuchet MS', 'Arial', sans-serif";
    if (state.fontType === 'modern-sans') fontName = "'Trebuchet MS', 'Arial', sans-serif";
    else if (state.fontType === 'impact-clean') fontName = "Impact, 'Arial Black', sans-serif";
    else if (state.fontType === 'arcade') fontName = "'Press Start 2P', monospace";
    else if (state.fontType === 'digital') fontName = "'Orbitron', sans-serif";

    const weight = state.strokeWeight === 'fine' ? '500' :
                   state.strokeWeight === 'normal' ? '700' : '900';

    const maxFontH = Math.round(rows * 0.78);
    let fontSize = maxFontH;
    let lines = [content];

    const isExplicitMultiline = content.includes('\n');

    if (isExplicitMultiline) {
      lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      fontSize = Math.round((rows * 0.74) / lines.length);
    } else if (state.fitMode === 'auto') {
      offCtx.font = `${weight} ${fontSize}px ${fontName}`;
      const singleW = Math.ceil(offCtx.measureText(content).width) + (content.length - 1) * state.letterSpacing;

      if (singleW > cols) {
        // Reducción proporcional suave para que quepa en 1 línea si es posible
        const fitFontSize = Math.floor(fontSize * (cols / singleW) * 0.96);
        if (fitFontSize >= Math.round(rows * 0.45)) {
          fontSize = fitFontSize;
          lines = [content];
        } else {
          // Si es muy largo, partir en multilínea
          const maxLines = rows >= 36 ? 3 : 2;
          fontSize = Math.round((rows * 0.74) / maxLines);
          offCtx.font = `${weight} ${fontSize}px ${fontName}`;

          const words = content.trim().split(/\s+/);
          lines = [];
          let cur = '';
          for (const w of words) {
            const test = cur ? (cur + ' ' + w) : w;
            const testW = Math.ceil(offCtx.measureText(test).width) + (test.length - 1) * state.letterSpacing;
            if (testW <= cols) {
              cur = test;
            } else {
              if (cur) lines.push(cur);
              cur = w;
            }
          }
          if (cur) lines.push(cur);
          if (lines.length > maxLines) lines = lines.slice(0, maxLines);
        }
      }
    } else {
      // Modo 'scroll' (1 Sola Línea Continua):
      // Usa el tamaño óptimo para llenar con impacto la matriz
      fontSize = maxFontH;
      lines = [content];
    }

    offCtx.font = `${weight} ${fontSize}px ${fontName}`;
    let maxLineW = 0;
    lines.forEach(line => {
      const lw = Math.ceil(offCtx.measureText(line).width) + (line.length - 1) * state.letterSpacing;
      if (lw > maxLineW) maxLineW = lw;
    });

    const isFixedScreen = ((state.fitMode === 'auto' || state.mode === 'static' || state.mode === 'blink') && lines.length > 1) || (state.mode === 'static' || state.mode === 'blink');
    const canvasW = isFixedScreen ? cols : Math.max(maxLineW, 10);
    state.textWidth = canvasW;

    offCanvas.width = canvasW;
    offCanvas.height = rows;
    offCtx.clearRect(0, 0, canvasW, rows);

    offCtx.font = `${weight} ${fontSize}px ${fontName}`;
    offCtx.fillStyle = '#ffffff';
    offCtx.textBaseline = 'middle';
    offCtx.textAlign = 'center';

    for (let l = 0; l < lines.length; l++) {
      const yCenter = (rows / (lines.length + 1)) * (l + 1);
      const xCenter = canvasW / 2;
      offCtx.fillText(lines[l], xCenter, yCenter);
    }

    state.textPixels = offCtx.getImageData(0, 0, canvasW, rows).data;
  }

  // Muestreo de píxel con filtro para evitar que las letras se engorden
  function samplePixel(x, y) {
    if (!state.textPixels) return 0;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= state.textWidth || iy < 0 || iy >= state.textHeight) {
      return 0;
    }
    const idx = (iy * state.textWidth + ix) * 4;
    const r = state.textPixels[idx];
    const a = state.textPixels[idx + 3];

    let threshold = 90;
    if (state.fontType === 'led-matrix') {
      threshold = 40; // la fuente bitmap ya es 100% binaria
    } else {
      if (state.strokeWeight === 'fine') threshold = 125;
      else if (state.strokeWeight === 'bold') threshold = 45;
    }

    return (a > threshold) ? Math.max(r, a) / 255 : 0;
  }

  // --- Funciones de Color ---
  function hexToRgb(hex) {
    let clean = hex.replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    const num = parseInt(clean, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function hslToRgb(h, s, l) {
    h = (h % 360 + 360) % 360 / 360;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  // --- Renderizado de Diodos LED ---
  function renderLed(target, cx, cy, rad, brightness, rgb, shape, glow) {
    if (brightness < 0.15) {
      // Diodo apagado: Receptáculo visible
      target.fillStyle = '#161622';
      target.beginPath();
      if (shape === 'circle') {
        target.arc(cx, cy, rad * 0.88, 0, Math.PI * 2);
      } else if (shape === 'square') {
        const s = rad * 1.55;
        target.rect(cx - s / 2, cy - s / 2, s, s);
      } else if (shape === 'diamond') {
        const d = rad * 1.05;
        target.moveTo(cx, cy - d);
        target.lineTo(cx + d, cy);
        target.lineTo(cx, cy + d);
        target.lineTo(cx - d, cy);
        target.closePath();
      }
      target.fill();

      // Centro oscuro
      target.fillStyle = '#0a0a12';
      target.beginPath();
      target.arc(cx, cy, rad * 0.48, 0, Math.PI * 2);
      target.fill();

      // Anillo de borde
      target.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      target.lineWidth = 1;
      target.stroke();
      return;
    }

    // Diodo Encendido
    const { r, g, b } = rgb;
    const alpha = Math.min(brightness * 1.25, 1);

    // 1. Resplandor / Bloom
    if (glow > 5) {
      const glowR = rad * (1.3 + (glow / 100) * 1.15);
      const glowGrad = target.createRadialGradient(cx, cy, rad * 0.25, cx, cy, glowR);
      glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.55 * (glow / 100)})`);
      glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      target.fillStyle = glowGrad;
      target.beginPath();
      target.arc(cx, cy, glowR, 0, Math.PI * 2);
      target.fill();
    }

    // 2. Diodo Principal
    target.beginPath();
    if (shape === 'circle') {
      target.arc(cx, cy, rad, 0, Math.PI * 2);
    } else if (shape === 'square') {
      const s = rad * 1.8;
      target.rect(cx - s / 2, cy - s / 2, s, s);
    } else if (shape === 'diamond') {
      const d = rad * 1.25;
      target.moveTo(cx, cy - d);
      target.lineTo(cx + d, cy);
      target.lineTo(cx, cy + d);
      target.lineTo(cx - d, cy);
      target.closePath();
    }

    const domeGrad = target.createRadialGradient(
      cx - rad * 0.2, cy - rad * 0.2, rad * 0.08,
      cx, cy, rad
    );
    domeGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.98})`);
    domeGrad.addColorStop(0.38, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    domeGrad.addColorStop(1, `rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, ${alpha * 0.95})`);

    target.fillStyle = domeGrad;
    target.fill();

    // 3. Brillo del cristal
    target.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
    target.beginPath();
    target.arc(cx - rad * 0.28, cy - rad * 0.28, rad * 0.25, 0, Math.PI * 2);
    target.fill();
  }

  // --- Bucle Principal de Renderizado ---
  function render(now) {
    const delta = (now - state.lastTimestamp) / 1000;
    state.lastTimestamp = now;

    fpsFrames++;
    if (now - fpsLastUpdate >= 1000) {
      if (fpsDisplay) fpsDisplay.textContent = `${fpsFrames} FPS`;
      fpsFrames = 0;
      fpsLastUpdate = now;
    }

    if (!state.isPaused) {
      const speedPx = state.speed * 18;

      if (state.mode === 'marquee-left') {
        state.scrollOffset += speedPx * delta;
        if (state.scrollOffset > state.textWidth + 6) {
          state.scrollOffset = -matrixCols;
        }
      } else if (state.mode === 'marquee-right') {
        state.scrollOffset -= speedPx * delta;
        if (state.scrollOffset < -matrixCols) {
          state.scrollOffset = state.textWidth;
        }
      } else if (state.mode === 'blink') {
        state.blinkTimer += delta * (state.speed * 0.8);
        state.blinkVisible = (Math.floor(state.blinkTimer) % 2 === 0);
      } else if (state.mode === 'wave') {
        state.wavePhase += delta * (state.speed * 1.5);
        state.scrollOffset += speedPx * delta;
        if (state.scrollOffset > state.textWidth + 6) {
          state.scrollOffset = -matrixCols;
        }
      }

      state.rainbowHue = (state.rainbowHue + delta * 60) % 360;
    }

    // --- Dibujar en Canvas ---
    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#060609';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const isRainbow = (state.color === 'rainbow');
    const solidRgb = isRainbow ? null : hexToRgb(state.color);
    const rows = effectiveRows;
    const cols = matrixCols;
    const isBlinkOff = (state.mode === 'blink' && !state.blinkVisible);

    // Modo Fijo y Parpadeo: 100% estático sin desplazamiento
    const isTrulyStatic = (state.mode === 'static' || state.mode === 'blink');
    let staticOffset = 0;
    if (isTrulyStatic) {
      staticOffset = Math.floor((cols - state.textWidth) / 2);
    }

    for (let c = 0; c < cols; c++) {
      const displayCol = state.isMirror ? (cols - 1 - c) : c;
      const cx = offsetX + displayCol * pitch + pitch / 2;

      let sampleX = 0;
      if (isTrulyStatic) {
        if (state.textWidth === cols) {
          sampleX = c; // Ya perfectamente centrado en el offscreen
        } else {
          sampleX = c - staticOffset;
        }
      } else if (state.mode === 'marquee-right') {
        sampleX = (cols - 1 - c) + Math.floor(state.scrollOffset);
      } else {
        sampleX = c + Math.floor(state.scrollOffset);
      }

      let colRgb = solidRgb;
      if (isRainbow) {
        const hue = (c * 6 + state.rainbowHue) % 360;
        colRgb = hslToRgb(hue, 1, 0.55);
      }

      for (let r = 0; r < rows; r++) {
        const cy = offsetY + r * pitch + pitch / 2;

        let brightness = 0;
        if (!isBlinkOff) {
          let sampleY = r;

          if (state.mode === 'wave') {
            const waveY = Math.sin((c * 0.3) + state.wavePhase) * (rows * 0.22);
            sampleY = r - waveY;
          }

          brightness = samplePixel(sampleX, sampleY);
        }

        renderLed(ctx, cx, cy, diodeRadius, brightness, colRgb, state.shape, state.glow);
      }
    }

    ctx.restore();

    requestAnimationFrame(render);
  }

  // --- Mantenimiento de Pantalla Encendida (Wake Lock Celular) ---
  async function requestScreenWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        state.wakeLockObj = await navigator.wakeLock.request('screen');
      }
    } catch (e) {}
  }

  // --- Rotación 90° (Ideal para Celulares en Vertical) ---
  function toggleMobileRotation() {
    state.isRotated = !state.isRotated;
    appContainer.classList.toggle('rotated-landscape', state.isRotated);
    btnRotateMobile.classList.toggle('active', state.isRotated);

    if (state.isRotated && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }

    // Permitir que la transición CSS termine y recalcular
    setTimeout(updateDimensions, 100);
    setTimeout(updateDimensions, 380);
  }

  // --- Pantalla Completa ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      appContainer.requestFullscreen().catch(() => {});
      requestScreenWakeLock();
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }

  function handleFullscreenChange() {
    const isFs = Boolean(document.fullscreenElement);
    if (isFs) {
      txtFullscreen.textContent = 'Salir';
      btnFullscreen.title = 'Salir de Pantalla Completa (Esc)';
      hideControls();
      requestScreenWakeLock();
    } else {
      txtFullscreen.textContent = 'Pantalla Completa';
      btnFullscreen.title = 'Pantalla Completa (F)';
      showControls();
    }
    setTimeout(updateDimensions, 100);
    setTimeout(updateDimensions, 300);
  }

  // --- Ocultar / Mostrar Interfaz ---
  function hideControls() {
    state.isUIHidden = true;
    appContainer.classList.add('ui-hidden');
    txtToggleUI.textContent = 'Mostrar';
    iconToggleUI.textContent = '👁️‍🗨️';
    btnToggleUI.classList.add('active');
    setTimeout(updateDimensions, 100);
    setTimeout(updateDimensions, 300);
  }

  function showControls() {
    state.isUIHidden = false;
    appContainer.classList.remove('ui-hidden');
    txtToggleUI.textContent = 'Ocultar';
    iconToggleUI.textContent = '👁️';
    btnToggleUI.classList.remove('active');
    resetIdleTimer();
    setTimeout(updateDimensions, 100);
    setTimeout(updateDimensions, 300);
  }

  function toggleControls() {
    if (state.isUIHidden) showControls();
    else hideControls();
  }

  function resetIdleTimer() {
    clearTimeout(idleTimeout);
    if (document.fullscreenElement && !state.isUIHidden) {
      idleTimeout = setTimeout(() => {
        hideControls();
      }, 3000);
    }
  }

  // --- Listeners de Interacción ---
  function initListeners() {
    window.addEventListener('resize', () => {
      updateDimensions();
      setTimeout(updateDimensions, 150);
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(updateDimensions, 150);
      setTimeout(updateDimensions, 400);
    });
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('mousemove', resetIdleTimer);

    // Tocar el letrero conmuta pantalla limpia / controles
    boardContainer.addEventListener('click', () => {
      if (!state.isUIHidden) {
        hideControls();
      }
    });

    fullscreenTapArea.addEventListener('click', () => {
      showControls();
    });

    hudBtnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      showControls();
    });

    hudBtnExitFs.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else showControls();
    });

    // Botones de acción principales
    btnRotateMobile.addEventListener('click', toggleMobileRotation);
    btnFullscreen.addEventListener('click', toggleFullscreen);
    btnToggleUI.addEventListener('click', toggleControls);

    btnPlayPause.addEventListener('click', () => {
      state.isPaused = !state.isPaused;
      if (state.isPaused) {
        iconPlayPause.textContent = '▶️';
        txtPlayPause.textContent = 'Reanudar';
        btnPlayPause.classList.add('active');
      } else {
        iconPlayPause.textContent = '⏸️';
        txtPlayPause.textContent = 'Pausar';
        btnPlayPause.classList.remove('active');
      }
    });

    btnMirror.addEventListener('click', () => {
      state.isMirror = !state.isMirror;
      btnMirror.classList.toggle('active', state.isMirror);
      savePreferences();
    });

    // Pestañas móviles
    mobileTabBtns.forEach(tab => {
      tab.addEventListener('click', () => {
        mobileTabBtns.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        controlsPanel.setAttribute('data-tab', tab.dataset.tabTarget);
      });
    });

    // Campo de texto
    messageInput.addEventListener('input', (e) => {
      state.text = e.target.value;
      state.scrollOffset = 0;
      rasterizeText();
      savePreferences();
    });

    btnClearText.addEventListener('click', () => {
      messageInput.value = '';
      state.text = ' ';
      rasterizeText();
      messageInput.focus();
    });

    // Presets Rápidos
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.text = btn.dataset.text;
        messageInput.value = state.text;

        if (btn.dataset.color) {
          state.color = btn.dataset.color;
          state.colorName = btn.textContent.trim();
          swatches.forEach(s => s.classList.toggle('active', s.dataset.color.toLowerCase() === state.color.toLowerCase()));
          colorNameBadge.textContent = state.colorName;
        }

        if (btn.dataset.mode) {
          state.mode = btn.dataset.mode;
          modePills.forEach(m => m.classList.toggle('active', m.dataset.mode === state.mode));
        }

        state.scrollOffset = 0;
        state.blinkTimer = 0;
        state.wavePhase = 0;
        rasterizeText();
        savePreferences();
      });
    });

    // Paleta de Colores
    swatches.forEach(s => {
      s.addEventListener('click', () => {
        const color = s.dataset.color;
        const name = s.dataset.name;
        state.color = color;
        state.colorName = name;
        swatches.forEach(other => other.classList.toggle('active', other === s));
        colorNameBadge.textContent = name;
        savePreferences();
      });
    });

    customColorPicker.addEventListener('input', (e) => {
      state.color = e.target.value;
      state.colorName = 'Personalizado';
      swatches.forEach(s => s.classList.remove('active'));
      colorNameBadge.textContent = 'Personalizado';
      savePreferences();
    });

    // Modos
    modePills.forEach(pill => {
      pill.addEventListener('click', () => {
        state.mode = pill.dataset.mode;
        modePills.forEach(p => p.classList.toggle('active', p === pill));
        state.scrollOffset = 0;
        state.blinkTimer = 0;
        state.wavePhase = 0;
        rasterizeText();
        savePreferences();
      });
    });

    // Ajuste de Pantalla (Auto-Ajustar vs 1 Línea)
    if (btnFitAuto && btnFitScroll) {
      btnFitAuto.addEventListener('click', () => {
        state.fitMode = 'auto';
        btnFitAuto.classList.add('active');
        btnFitScroll.classList.remove('active');
        if (fitBadge) fitBadge.textContent = 'Todo en Pantalla';
        rasterizeText();
        savePreferences();
      });

      btnFitScroll.addEventListener('click', () => {
        state.fitMode = 'scroll';
        btnFitScroll.classList.add('active');
        btnFitAuto.classList.remove('active');
        if (fitBadge) fitBadge.textContent = '1 Sola Línea';
        rasterizeText();
        savePreferences();
      });
    }

    // Grosor de Letra
    segmentBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.strokeWeight = btn.dataset.stroke;
        segmentBtns.forEach(b => b.classList.toggle('active', b === btn));
        strokeLabel.textContent = state.strokeWeight === 'fine' ? 'Nítido (1-2 LEDs)' :
                                 state.strokeWeight === 'normal' ? 'Normal' : 'Grueso (Bold)';
        rasterizeText();
        savePreferences();
      });
    });

    // Espaciado entre letras
    spacingSlider.addEventListener('input', (e) => {
      state.letterSpacing = Number(e.target.value);
      spacingLabel.textContent = `+${state.letterSpacing} LEDs`;
      rasterizeText();
      savePreferences();
    });

    // Sliders
    speedSlider.addEventListener('input', (e) => {
      state.speed = Number(e.target.value);
      updateSpeedText(state.speed);
      savePreferences();
    });

    glowSlider.addEventListener('input', (e) => {
      state.glow = Number(e.target.value);
      glowLabel.textContent = `${state.glow}%`;
      savePreferences();
    });

    // Selects
    fontSelect.addEventListener('change', (e) => {
      state.fontType = e.target.value;
      rasterizeText();
      savePreferences();
    });

    shapeSelect.addEventListener('change', (e) => {
      state.shape = e.target.value;
      savePreferences();
    });

    densitySelect.addEventListener('change', (e) => {
      state.matrixRows = e.target.value === 'auto' ? 'auto' : Number(e.target.value);
      updateDimensions();
      savePreferences();
    });

    // Atajos de teclado
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === messageInput) {
        if (e.key === 'Enter') messageInput.blur();
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === ' ' || key === 'spacebar') {
        e.preventDefault();
        btnPlayPause.click();
      } else if (key === 'h') {
        e.preventDefault();
        toggleControls();
      } else if (key === 'm') {
        e.preventDefault();
        btnMirror.click();
      } else if (key === 'r') {
        e.preventDefault();
        toggleMobileRotation();
      } else if (key === 'escape') {
        if (state.isUIHidden) showControls();
      }
    });
  }

  // --- Inicio Inmediato ---
  function init() {
    loadPreferences();
    syncUI();
    initListeners();
    updateDimensions();

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
