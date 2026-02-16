/**
 * Theme - Dark / Light theme management.
 * Call Theme.init() on DOMContentLoaded in every page.
 */
const Theme = {
  async init() {
    const theme = await Storage.getTheme();
    this.apply(theme);

    const toggle = document.getElementById("themeToggle");
    if (toggle) {
      toggle.checked = theme === "dark";
      toggle.addEventListener("change", (e) => {
        const next = e.target.checked ? "dark" : "light";
        this.apply(next);
        Storage.setTheme(next);
      });
    }
  },

  apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
};
