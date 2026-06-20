// =============================================================================
//  Name: Pip-Calc
//  Author: @tylerjbartlett
//  License: CC-BY-NC-4.0
//  Repository: https://github.com/tylerjbartlett/pip-boy-3000a-holotapes
// =============================================================================

// TODO: want to remove double wide clear button and add a delete button.
//       assess the 10 character display limit

(function () {
  // General variables
  const APP_NAME = 'PIP-CALC';
  const APP_VERSION = 'v1.0.0';

  // Screen layout variables
  const W = h.getWidth();
  const H = h.getHeight();
  const C = {
    DISP_X: 16,
    DISP_Y: 8,
    DISP_W: W - 32,
    DISP_H: 52,
    GRID_X: 16,
    GRID_Y: 68,
    BTN_GAP: 4,
    BTN_H: 48,
    BTN_PAD: 6,
  };
  C.BTN_W = (C.DISP_W - 3 * C.BTN_GAP) / 4;

  // prettier-ignore
  const BTNS = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+',
    'CLR', '', '(', ')',
  ];

  // Store original device settings to restore on exit
  let originalIdleTimeout = Pip.settings.idleTimeout;

  // ── Calculator state ─────────────────────────────────────────────────────────
  let expression = '0';
  let justEvaluated = false;
  let selectedCol = 0;
  let selectedRow = 0;
  let lastRow4Col = 0; // remembers which column we approached row 4 from
  let dirtyDisplay = 1;
  let dirtyCells = []; // list of {col, row} cells needing redraw

  function markDirty(col, row) {
    if (row === 4 && col === 1) col = 0; // redirect to the spanning C button
    dirtyCells.push({ col: col, row: row });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getButtonLabel(col, row) {
    if (row === 4 && col === 1) return 'C'; // C button spans col 0–1
    return BTNS[row * 4 + col] || '';
  }

  function trimDisplay(s) {
    return s.length > 10 ? s.slice(s.length - 10) : s;
  }

  function evaluateExpression(s) {
    try {
      const result = eval(s);
      if (result === undefined || result !== result) return 'ERR';
      if (result === Infinity || result === -Infinity) return 'ERR';
      return '' + Math.round(result * 1e8) / 1e8;
    } catch (e) {
      return 'ERR';
    }
  }

  // ── Draw ─────────────────────────────────────────────────────────────────────
  function drawDisplay() {
    h.clearRect(C.DISP_X, C.DISP_Y, C.DISP_X + C.DISP_W, C.DISP_Y + C.DISP_H);
    h.drawRect(C.DISP_X, C.DISP_Y, C.DISP_X + C.DISP_W, C.DISP_Y + C.DISP_H);

    h.setClipRect(
      C.DISP_X + 1,
      C.DISP_Y + 1,
      C.DISP_X + C.DISP_W - 1,
      C.DISP_Y + C.DISP_H - 1,
    );

    h.setFontAlign(-1, -1, 0).setFontMonofonto14();
    h.drawString(APP_NAME + ' ' + APP_VERSION, C.DISP_X + 4, C.DISP_Y + 4);

    const displayString = trimDisplay(expression);
    h.setFontMonofonto36().setFontAlign(1, -1, 0);
    h.drawString(displayString, C.DISP_X + C.DISP_W - 6, C.DISP_Y + 14);

    h.setClipRect(0, 0, W - 1, H - 1);
  }

  function drawButton(col, row) {
    if (row === 4 && col === 1) return; // covered by the spanned C button

    const label = getButtonLabel(col, row);
    if (label === '') return;

    const isClearSpan = row === 4 && col === 0;
    const spanCols = isClearSpan ? 2 : 1;

    const buttonX = C.GRID_X + col * (C.BTN_W + C.BTN_GAP);
    const buttonY = C.GRID_Y + row * (C.BTN_H + C.BTN_GAP);
    const buttonW = C.BTN_W * spanCols + C.BTN_GAP * (spanCols - 1);
    const isSelected =
      row === selectedRow &&
      (col === selectedCol || (isClearSpan && selectedCol === 1));

    h.clearRect(buttonX, buttonY, buttonX + buttonW - 1, buttonY + C.BTN_H - 1);
    h.drawRect(buttonX, buttonY, buttonX + buttonW - 1, buttonY + C.BTN_H - 1);

    h.setClipRect(
      buttonX + C.BTN_PAD,
      buttonY + 1,
      buttonX + buttonW - 1 - C.BTN_PAD,
      buttonY + C.BTN_H - 2,
    );
    h.setFontMonofonto16().setFontAlign(0, 0, 0);
    h.drawString(label, buttonX + buttonW / 2, buttonY + C.BTN_H / 2);
    h.setClipRect(0, 0, W - 1, H - 1);

    if (isSelected)
      Pip.shadeBox(
        buttonX,
        buttonY,
        buttonX + buttonW - 1,
        buttonY + C.BTN_H - 1,
      );
  }

  function drawGrid() {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) drawButton(col, row);
    }
  }

  function draw() {
    if (dirtyDisplay) {
      drawDisplay();
      dirtyDisplay = 0;
    }
    if (dirtyCells.length) {
      for (let i = 0; i < dirtyCells.length; i++) {
        drawButton(dirtyCells[i].col, dirtyCells[i].row);
      }
      dirtyCells = [];
    }
  }

  function drawAll() {
    dirtyDisplay = 0;
    dirtyCells = [];
    drawDisplay();
    drawGrid();
  }

  // ── Input handlers ───────────────────────────────────────────────────────────
  function pressSelected() {
    const label = getButtonLabel(selectedCol, selectedRow);
    if (label === '') return;

    Pip.playSound('TAB');

    if (label === 'C') {
      expression = '0';
      justEvaluated = false;
    } else if (label === '=') {
      expression = evaluateExpression(expression);
      justEvaluated = true;
    } else if (justEvaluated) {
      const isOperator =
        label === '+' || label === '-' || label === '*' || label === '/';
      expression = isOperator ? expression + label : label;
      justEvaluated = false;
    } else {
      expression =
        expression === '0' && label !== '.' && label !== '(' && label !== ')'
          ? label
          : expression + label;
    }

    dirtyDisplay = 1;
    draw();
  }

  function onLeftWheel(dir, longPress) {
    if (dir === 0) {
      if (longPress) {
        Pip.playSound('TAB');
        expression = '0';
        justEvaluated = false;
        dirtyDisplay = 1;
        draw();
      } else {
        pressSelected();
      }
    } else {
      Pip.playSound('SCROLL');
      const previousRow = selectedRow;
      const previousCol = selectedCol;

      let newRow = previousRow + (dir === 1 ? 1 : -1);
      if (newRow > 4) newRow = 0;
      if (newRow < 0) newRow = 4;

      if (previousRow === 4 && newRow !== 4) {
        // leaving row 4 — restore whichever column we originally came from
        selectedCol = lastRow4Col;
      } else if (newRow === 4 && previousRow !== 4) {
        // arriving at row 4 — remember the column, then snap onto C visually
        lastRow4Col = selectedCol;
        if (selectedCol === 1) selectedCol = 0;
      }

      selectedRow = newRow;

      markDirty(previousCol, previousRow);
      markDirty(selectedCol, selectedRow);
      draw();
    }
  }

  function onRightWheel(dir) {
    if (dir === 0) return;
    Pip.playSound('SCROLL');
    const previousCol = selectedCol;
    selectedCol += dir === 1 ? 1 : -1;
    if (selectedCol > 3) selectedCol = 0;
    if (selectedCol < 0) selectedCol = 3;
    if (selectedRow === 4 && selectedCol === 1) {
      selectedCol += dir === 1 ? 1 : -1; // skip phantom cell covered by C
    }
    if (selectedRow === 4) lastRow4Col = selectedCol;
    markDirty(previousCol, selectedRow);
    markDirty(selectedCol, selectedRow);
    draw();
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  Pip.settings.idleTimeout = 0;
  h.clear(1).flip();

  Pip.onExclusive('knob1', onLeftWheel);
  Pip.onExclusive('knob2', onRightWheel);

  drawAll();

  return {
    id: 'PIPCALC',
    notDefault: true,
    fullscreen: true,
    remove: function () {
      Pip.removeListener('knob1', onLeftWheel);
      Pip.removeListener('knob2', onRightWheel);
      Pip.settings.idleTimeout = originalIdleTimeout;
    },
  };
});
