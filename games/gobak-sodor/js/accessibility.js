/**
 * Pengaturan aksesibilitas dan kontrol.
 * Semua pilihan disimpan lokal agar tetap aktif saat halaman dibuka kembali.
 */

export const ACCESSIBILITY_KEY = "gsnAccessibilityV1";

export const DEFAULT_ACCESSIBILITY = Object.freeze({
  colorBlind: false,
  practiceMode: false,
  controls: {
    p1: { up: "KeyW", left: "KeyA", down: "KeyS", right: "KeyD" },
    p2: { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight" }
  }
});

export const KEY_OPTIONS = Object.freeze([
  ["KeyW", "W"], ["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"],
  ["KeyI", "I"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"],
  ["KeyT", "T"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"],
  ["ArrowUp", "↑"], ["ArrowLeft", "←"], ["ArrowDown", "↓"], ["ArrowRight", "→"]
]);

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_ACCESSIBILITY));
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function validCode(code) {
  return KEY_OPTIONS.some(([option]) => option === code);
}

export function loadAccessibilitySettings(storage = window.localStorage) {
  const defaults = cloneDefaults();
  const stored = safeParse(storage.getItem(ACCESSIBILITY_KEY), {});
  const result = {
    colorBlind: Boolean(stored.colorBlind),
    practiceMode: Boolean(stored.practiceMode),
    controls: { p1: {}, p2: {} }
  };

  ["p1", "p2"].forEach((player) => {
    ["up", "left", "down", "right"].forEach((direction) => {
      const candidate = stored.controls?.[player]?.[direction];
      result.controls[player][direction] = validCode(candidate)
        ? candidate
        : defaults.controls[player][direction];
    });
  });
  return result;
}

export function saveAccessibilitySettings(settings, storage = window.localStorage) {
  storage.setItem(ACCESSIBILITY_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("gsn:accessibility-change", { detail: settings }));
}

export function resetAccessibilitySettings(storage = window.localStorage) {
  const settings = cloneDefaults();
  saveAccessibilitySettings(settings, storage);
  return settings;
}

export function keyLabel(code) {
  return KEY_OPTIONS.find(([option]) => option === code)?.[1] ?? code;
}

export function initAccessibilityPanel(root = document) {
  const form = root.querySelector("[data-accessibility-form]");
  if (!form) return null;

  const feedback = root.querySelector("[data-accessibility-feedback]");
  const resetButton = root.querySelector("[data-reset-accessibility]");
  form.querySelectorAll("select[data-control-player]").forEach((select) => {
    if (!select.options.length) {
      select.innerHTML = KEY_OPTIONS.map(([code, label]) => `<option value="${code}">${label}</option>`).join("");
    }
  });
  let settings = loadAccessibilitySettings();

  const fill = () => {
    form.querySelector("[name='colorBlind']").checked = settings.colorBlind;
    form.querySelector("[name='practiceMode']").checked = settings.practiceMode;
    form.querySelectorAll("select[data-control-player]").forEach((select) => {
      const player = select.dataset.controlPlayer;
      const direction = select.dataset.controlDirection;
      select.value = settings.controls[player][direction];
    });
  };

  const showFeedback = (message, type = "success") => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `settings-feedback ${type}`;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const candidate = loadAccessibilitySettings();
    candidate.colorBlind = form.querySelector("[name='colorBlind']").checked;
    candidate.practiceMode = form.querySelector("[name='practiceMode']").checked;

    form.querySelectorAll("select[data-control-player]").forEach((select) => {
      candidate.controls[select.dataset.controlPlayer][select.dataset.controlDirection] = select.value;
    });

    const codes = Object.values(candidate.controls.p1).concat(Object.values(candidate.controls.p2));
    if (new Set(codes).size !== codes.length) {
      showFeedback("Setiap arah harus memakai tombol yang berbeda agar dua pemain tidak saling mengunci.", "error");
      return;
    }

    settings = candidate;
    saveAccessibilitySettings(settings);
    document.documentElement.classList.toggle("color-blind-mode", settings.colorBlind);
    showFeedback("Pengaturan disimpan dan langsung diterapkan.");
  });

  resetButton?.addEventListener("click", () => {
    settings = resetAccessibilitySettings();
    fill();
    document.documentElement.classList.remove("color-blind-mode");
    showFeedback("Pengaturan dikembalikan ke standar.");
  });

  fill();
  document.documentElement.classList.toggle("color-blind-mode", settings.colorBlind);
  return settings;
}
