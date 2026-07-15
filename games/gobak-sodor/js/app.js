/**
 * Gobak Sodor Nusantara — JavaScript umum website.
 * Navigasi, tema, onboarding, transisi halaman, audio, PWA, dan status offline.
 */

const STORAGE_KEYS = {
  theme: "gsn-theme",
  onboarding: "gsn-onboarding-seen-v1"
};

const onboardingSlides = [
  {
    icon: "fa-people-group",
    title: "Belajar lewat kerja sama",
    description: "Gobak Sodor mengajarkan strategi, komunikasi, dan gotong royong. Mainkan Solo untuk latihan atau Co-op dalam satu keyboard."
  },
  {
    icon: "fa-flag",
    title: "Ambil bendera dan kembali",
    description: "Jawab soal saat menembus checkpoint, ambil bendera, lalu jawab soal baru saat kembali ke area mulai sebelum waktu habis."
  },
  {
    icon: "fa-wifi",
    title: "Siap dipakai online maupun offline",
    description: "Pasang sebagai aplikasi, mainkan setelah aset tersimpan, dan gunakan Mode Guru untuk membuat set soal kelas sendiri."
  }
];

class SiteApp {
  constructor() {
    this.currentSlide = 0;
    this.elements = {};
    this.toastTimer = 0;
    this.installPrompt = null;
    this.reloadingForUpdate = false;
  }

  init() {
    this.cacheElements();
    this.applyStoredTheme();
    this.enhanceNavigationActions();
    this.bindNavigation();
    this.bindThemeToggle();
    this.bindAudioToggle();
    this.bindOnboarding();
    this.bindPageTransitions();
    this.bindNetworkStatus();
    this.initPwa();
    this.initRevealAnimation();
    this.updateYear();
    this.markActiveNavigation();
    document.body.classList.add("page-ready");
    window.gsnShowToast = (message) => this.showToast(message);
  }

  cacheElements() {
    this.elements.menuButton = document.querySelector("[data-menu-toggle]");
    this.elements.siteNav = document.querySelector("[data-site-nav]");
    this.elements.navActions = document.querySelector(".nav-actions");
    this.elements.themeButtons = document.querySelectorAll("[data-theme-toggle]");
    this.elements.modal = document.querySelector("[data-onboarding-modal]");
    this.elements.modalIcon = document.querySelector("[data-onboarding-icon]");
    this.elements.modalTitle = document.querySelector("[data-onboarding-title]");
    this.elements.modalDescription = document.querySelector("[data-onboarding-description]");
    this.elements.modalProgress = document.querySelector("[data-onboarding-progress]");
    this.elements.modalStep = document.querySelector("[data-onboarding-step]");
    this.elements.prevButton = document.querySelector("[data-onboarding-prev]");
    this.elements.nextButton = document.querySelector("[data-onboarding-next]");
    this.elements.closeButtons = document.querySelectorAll("[data-onboarding-close]");
  }

  enhanceNavigationActions() {
    if (!this.elements.navActions) return;

    if (!this.elements.navActions.querySelector("[data-audio-toggle]")) {
      const audioButton = document.createElement("button");
      audioButton.className = "icon-button";
      audioButton.type = "button";
      audioButton.dataset.audioToggle = "";
      this.elements.navActions.insertBefore(audioButton, this.elements.menuButton || null);
    }

    if (!this.elements.navActions.querySelector("[data-install-app]")) {
      const installButton = document.createElement("button");
      installButton.className = "icon-button install-button";
      installButton.type = "button";
      installButton.dataset.installApp = "";
      installButton.hidden = true;
      installButton.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i>';
      installButton.setAttribute("aria-label", "Pasang aplikasi");
      installButton.title = "Pasang aplikasi";
      this.elements.navActions.insertBefore(installButton, this.elements.menuButton || null);
    }

    this.elements.audioButtons = document.querySelectorAll("[data-audio-toggle]");
    this.elements.installButtons = document.querySelectorAll("[data-install-app]");
    this.updateAudioButtons();
  }

  bindNavigation() {
    const { menuButton, siteNav } = this.elements;
    if (!menuButton || !siteNav) return;

    menuButton.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.querySelector("i")?.classList.toggle("fa-bars", !isOpen);
      menuButton.querySelector("i")?.classList.toggle("fa-xmark", isOpen);
    });

    siteNav.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      siteNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (event) => {
      if (!siteNav.classList.contains("open")) return;
      if (siteNav.contains(event.target) || menuButton.contains(event.target)) return;
      siteNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  }

  applyStoredTheme() {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme || (systemDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    this.updateThemeIcons(theme);
    this.updateThemeColor(theme);
  }

  bindThemeToggle() {
    this.elements.themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const current = document.documentElement.dataset.theme || "light";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        localStorage.setItem(STORAGE_KEYS.theme, next);
        this.updateThemeIcons(next);
        this.updateThemeColor(next);
        window.gsnAudio?.play("click");
        this.showToast(next === "dark" ? "Mode gelap aktif" : "Mode terang aktif");
      });
    });
  }

  updateThemeIcons(theme) {
    this.elements.themeButtons?.forEach((button) => {
      const icon = button.querySelector("i");
      if (!icon) return;
      icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
      button.setAttribute("aria-label", theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap");
      button.title = theme === "dark" ? "Mode terang" : "Mode gelap";
    });
  }

  updateThemeColor(theme) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111827" : "#153c78");
  }

  bindAudioToggle() {
    this.elements.audioButtons?.forEach((button) => {
      button.addEventListener("click", async () => {
        if (!window.gsnAudio) return;
        const muted = await window.gsnAudio.toggle();
        this.updateAudioButtons();
        this.showToast(muted ? "Suara dimatikan" : "Suara diaktifkan");
      });
    });
    window.addEventListener("gsn:audio-change", () => this.updateAudioButtons());
  }

  updateAudioButtons() {
    const muted = window.gsnAudio?.muted ?? true;
    this.elements.audioButtons?.forEach((button) => {
      button.innerHTML = `<i class="fa-solid ${muted ? "fa-volume-xmark" : "fa-volume-high"}" aria-hidden="true"></i>`;
      button.setAttribute("aria-label", muted ? "Aktifkan suara" : "Matikan suara");
      button.title = muted ? "Aktifkan suara" : "Matikan suara";
      button.setAttribute("aria-pressed", String(!muted));
    });
  }

  bindOnboarding() {
    const { modal, prevButton, nextButton, closeButtons } = this.elements;
    if (!modal) return;

    document.querySelectorAll("[data-open-onboarding]").forEach((button) => {
      button.addEventListener("click", () => this.openOnboarding());
    });

    prevButton?.addEventListener("click", () => {
      window.gsnAudio?.play("click");
      this.currentSlide = Math.max(0, this.currentSlide - 1);
      this.renderOnboarding();
    });

    nextButton?.addEventListener("click", () => {
      window.gsnAudio?.play("click");
      if (this.currentSlide < onboardingSlides.length - 1) {
        this.currentSlide += 1;
        this.renderOnboarding();
        return;
      }
      this.closeOnboarding(true);
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => this.closeOnboarding(true));
    });

    modal.addEventListener("click", (event) => {
      if (event.target === modal) this.closeOnboarding(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("show")) {
        this.closeOnboarding(false);
      }
    });

    const shouldShow = document.body.dataset.page === "home" && !localStorage.getItem(STORAGE_KEYS.onboarding);
    if (shouldShow) window.setTimeout(() => this.openOnboarding(), 450);
  }

  openOnboarding() {
    if (!this.elements.modal) return;
    this.currentSlide = 0;
    this.renderOnboarding();
    this.elements.modal.classList.add("show");
    this.elements.modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    this.elements.nextButton?.focus();
  }

  closeOnboarding(markAsSeen) {
    if (!this.elements.modal) return;
    this.elements.modal.classList.remove("show");
    this.elements.modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (markAsSeen) localStorage.setItem(STORAGE_KEYS.onboarding, "true");
  }

  renderOnboarding() {
    const slide = onboardingSlides[this.currentSlide];
    if (!slide) return;
    if (this.elements.modalIcon) this.elements.modalIcon.className = `fa-solid ${slide.icon}`;
    if (this.elements.modalTitle) this.elements.modalTitle.textContent = slide.title;
    if (this.elements.modalDescription) this.elements.modalDescription.textContent = slide.description;
    if (this.elements.modalProgress) this.elements.modalProgress.style.width = `${((this.currentSlide + 1) / onboardingSlides.length) * 100}%`;
    if (this.elements.modalStep) this.elements.modalStep.textContent = `${this.currentSlide + 1} / ${onboardingSlides.length}`;
    if (this.elements.prevButton) this.elements.prevButton.hidden = this.currentSlide === 0;
    if (this.elements.nextButton) {
      this.elements.nextButton.innerHTML = this.currentSlide === onboardingSlides.length - 1
        ? 'Mulai Jelajah <i class="fa-solid fa-arrow-right"></i>'
        : 'Lanjut <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  bindPageTransitions() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.target || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const target = new URL(link.href, window.location.href);
      if (target.origin !== window.location.origin || target.pathname === window.location.pathname && target.hash) return;
      event.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => { window.location.href = target.href; }, 150);
    });
  }

  bindNetworkStatus() {
    const update = () => {
      document.documentElement.classList.toggle("is-offline", !navigator.onLine);
      if (!navigator.onLine) this.showToast("Mode offline aktif — fitur lokal tetap tersedia");
      else this.showToast("Koneksi kembali aktif");
    };
    window.addEventListener("offline", update);
    window.addEventListener("online", update);
    document.documentElement.classList.toggle("is-offline", !navigator.onLine);
  }

  initPwa() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      this.installPrompt = event;
      this.toggleInstallButtons(true);
    });

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-install-app]");
      if (!button) return;
      if (!this.installPrompt) {
        this.showToast("Gunakan menu browser ‘Pasang aplikasi’ bila tersedia");
        return;
      }
      this.installPrompt.prompt();
      await this.installPrompt.userChoice;
      this.installPrompt = null;
      this.toggleInstallButtons(false);
    });

    window.addEventListener("appinstalled", () => {
      this.installPrompt = null;
      this.toggleInstallButtons(false);
      this.showToast("Portal Permainan Nusantara berhasil dipasang");
    });

    if (!("serviceWorker" in navigator) || !["http:", "https:"].includes(window.location.protocol)) return;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("../../service-worker.js", { scope: "../../" });
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              this.showToast("Versi baru siap digunakan");
              worker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (this.reloadingForUpdate) return;
          this.reloadingForUpdate = true;
          window.location.reload();
        });
      } catch (error) {
        console.warn("Service worker tidak dapat didaftarkan:", error);
      }
    };
    if ("requestIdleCallback" in window) requestIdleCallback(register, { timeout: 1800 });
    else window.addEventListener("load", register, { once: true });
  }

  toggleInstallButtons(show) {
    document.querySelectorAll("[data-install-app]").forEach((button) => {
      button.hidden = !show;
    });
  }

  initRevealAnimation() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px 60px" });
    items.forEach((item) => observer.observe(item));
  }

  markActiveNavigation() {
    const currentPage = document.body.dataset.page;
    document.querySelectorAll("[data-nav-page]").forEach((link) => {
      const active = link.dataset.navPage === currentPage;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
    });
  }

  updateYear() {
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = new Date().getFullYear();
    });
  }

  showToast(message) {
    let toast = document.querySelector(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new SiteApp();
  app.init();
});
