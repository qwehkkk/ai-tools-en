// theme.js - Dark mode toggle with localStorage persistence
// IIFE so it runs immediately when loaded in <head>, preventing FOUC.
(function () {
  var STORAGE_KEY = "aitools-theme";
  var root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage may be blocked; ignore */
    }
  }

  // Apply stored preference before first paint
  var stored = getStoredTheme();
  if (stored === "light" || stored === "dark") {
    root.setAttribute("data-theme", stored);
  }
  // If no stored preference, leave :root without data-theme and let
  // the prefers-color-scheme media query in style.css handle it.

  // Toggle handler exposed for the header button
  window.toggleTheme = function () {
    var current = root.getAttribute("data-theme");
    var prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = current ? current === "dark" : prefersDark;
    var next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    storeTheme(next);
  };
})();
