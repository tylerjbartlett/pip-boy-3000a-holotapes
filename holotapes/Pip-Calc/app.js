(function () {
  const W = h.getWidth();
  const H = h.getHeight();

  let removed = false;

  let originalIdleTimeout = null;

  function onLeftWheel(dir) {}

  function onRightWheel(dir) {}

  function readSystemIdleTimeout() {
    let idle = null;
    try {
      if (typeof Pip !== 'undefined') {
        if (Pip.settings && typeof Pip.settings.idleTimeout === 'number') {
          idle = Pip.settings.idleTimeout;
        } else if (typeof Pip.idleTimeout === 'number') {
          idle = Pip.idleTimeout;
        }
      }
    } catch (e) {}
    return idle;
  }

  function start() {
    h.clear();
    Pip.audioStop();

    // Store original idle timeout to restore on app exit
    originalIdleTimeout = readSystemIdleTimeout();
    try {
      Pip.settings.idleTimeout = 0;
    } catch (e) {}

    Pip.onExclusive('knob1', onLeftWheel);
    Pip.onExclusive('knob2', onRightWheel);
  }

  function remove() {
    if (removed) return;
    removed = true;

    Pip.removeListener('knob1', onLeftWheel);
    Pip.removeListener('knob2', onRightWheel);

    Pip.audioStop();

    // Restore original idle timeout on app exit
    if (originalIdleTimeout !== null) {
      try {
        Pip.settings.idleTimeout = originalIdleTimeout;
      } catch (e) {}
    }

    h.clear();
    h.flip();
  }

  start();

  return {
    id: 'pipcalc',
    notDefault: true,
    fullscreen: true,
    remove: remove,
  };
});
