(function () {
  "use strict";

  var prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function toDelay(value) {
    if (!value) {
      return "0ms";
    }

    return /^[0-9]+$/.test(value) ? value + "ms" : value;
  }

  function initRevealAnimations() {
    var targets = document.querySelectorAll("[data-reveal]");

    if (!targets.length) {
      return;
    }

    Array.prototype.forEach.call(targets, function (target) {
      target.classList.add("reveal");
      target.style.setProperty(
        "--reveal-delay",
        toDelay(target.getAttribute("data-reveal-delay"))
      );
    });

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      Array.prototype.forEach.call(targets, function (target) {
        target.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        Array.prototype.forEach.call(entries, function (entry) {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    Array.prototype.forEach.call(targets, function (target) {
      if (target.getBoundingClientRect().top <= window.innerHeight * 0.92) {
        target.classList.add("is-visible");
        return;
      }

      observer.observe(target);
    });
  }

  function initCarousel(carousel) {
    var slides = carousel.querySelectorAll("[data-carousel-slide]");
    var dots = carousel.querySelectorAll("[data-carousel-dot]");
    var prev = carousel.querySelector("[data-carousel-prev]");
    var next = carousel.querySelector("[data-carousel-next]");
    var viewport = carousel.querySelector(".carousel__viewport");
    var autoplay = parseInt(carousel.getAttribute("data-carousel-autoplay"), 10);
    var heightMode = carousel.getAttribute("data-carousel-height") || "max";
    var activeIndex = 0;
    var timerId = null;
    var resizeQueued = false;

    if (!slides.length) {
      return;
    }

    function syncHeight() {
      var hiddenStates;
      var maxHeight = 0;
      var activeSlide;

      if (!viewport) {
        return;
      }

      if (heightMode === "active") {
        activeSlide = slides[activeIndex];
        viewport.style.minHeight = activeSlide
          ? activeSlide.getBoundingClientRect().height + "px"
          : "";
        return;
      }

      hiddenStates = Array.prototype.map.call(slides, function (slide) {
        return slide.hidden;
      });

      Array.prototype.forEach.call(slides, function (slide, slideIndex) {
        Array.prototype.forEach.call(slides, function (item, itemIndex) {
          item.hidden = itemIndex !== slideIndex;
        });

        maxHeight = Math.max(maxHeight, slide.getBoundingClientRect().height);
      });

      Array.prototype.forEach.call(slides, function (slide, slideIndex) {
        slide.hidden = hiddenStates[slideIndex];
      });

      viewport.style.minHeight = maxHeight ? maxHeight + "px" : "";
    }

    function queueHeightSync() {
      if (heightMode === "active") {
        syncHeight();
        return;
      }

      if (resizeQueued) {
        return;
      }

      resizeQueued = true;
      window.requestAnimationFrame(function () {
        resizeQueued = false;
        syncHeight();
      });
    }

    function render(index) {
      activeIndex = index;

      Array.prototype.forEach.call(slides, function (slide, slideIndex) {
        var isActive = slideIndex === index;
        slide.hidden = !isActive;
        slide.classList.toggle("is-active", isActive);
      });

      Array.prototype.forEach.call(dots, function (dot, dotIndex) {
        var isActive = dotIndex === index;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      queueHeightSync();
    }

    function goTo(index) {
      var lastIndex = slides.length - 1;

      if (index < 0) {
        render(lastIndex);
        return;
      }

      if (index > lastIndex) {
        render(0);
        return;
      }

      render(index);
    }

    function stopAutoplay() {
      if (!timerId) {
        return;
      }

      window.clearInterval(timerId);
      timerId = null;
    }

    function startAutoplay() {
      if (prefersReducedMotion || slides.length < 2 || !autoplay) {
        return;
      }

      stopAutoplay();
      timerId = window.setInterval(function () {
        goTo(activeIndex + 1);
      }, autoplay);
    }

    if (prev) {
      prev.addEventListener("click", function () {
        goTo(activeIndex - 1);
      });
    }

    if (next) {
      next.addEventListener("click", function () {
        goTo(activeIndex + 1);
      });
    }

    Array.prototype.forEach.call(dots, function (dot) {
      dot.addEventListener("click", function () {
        goTo(parseInt(dot.getAttribute("data-carousel-dot"), 10));
      });
    });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", stopAutoplay);
    carousel.addEventListener("focusout", startAutoplay);
    window.addEventListener("resize", queueHeightSync);

    render(0);
    queueHeightSync();
    startAutoplay();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(queueHeightSync);
    }
  }

  function initCarousels() {
    var carousels = document.querySelectorAll("[data-carousel]");

    Array.prototype.forEach.call(carousels, initCarousel);
  }

  function initHeroMedia() {
    var video = document.querySelector(".hero-media__video");
    var visual = video && video.closest(".hero-media__visual");
    var connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    var mobileQuery =
      window.matchMedia && window.matchMedia("(max-width: 800px)");
    var playPromise;
    var retryTimer = null;
    var retryCount = 0;
    var maxRetries = 8;
    var hasStarted = false;

    if (!video || !visual) {
      return;
    }

    if (
      prefersReducedMotion ||
      (connection &&
        (connection.saveData || connection.effectiveType === "slow-2g"))
    ) {
      return;
    }

    if (
      !video.getAttribute("data-src-mobile") ||
      !video.getAttribute("data-src-desktop")
    ) {
      return;
    }

    function markReady() {
      visual.classList.add("is-video-ready");
    }

    function clearReady() {
      visual.classList.remove("is-video-ready");
    }

    function getMediaSrc() {
      var isMobile = mobileQuery && mobileQuery.matches;

      return video.getAttribute(
        isMobile ? "data-src-mobile" : "data-src-desktop"
      );
    }

    function ensureSource() {
      var src = getMediaSrc();

      if (video.getAttribute("src") === src) {
        return false;
      }

      video.setAttribute("src", src);
      return true;
    }

    function revealWhenFramePainted() {
      if (
        typeof video.requestVideoFrameCallback === "function" &&
        !hasStarted
      ) {
        video.requestVideoFrameCallback(function () {
          hasStarted = true;
          markReady();
        });
        return;
      }

      hasStarted = true;
      markReady();
    }

    function scheduleRetry(delay, shouldReload) {
      if (retryCount >= maxRetries) {
        return;
      }

      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(function () {
        retryCount += 1;
        attemptPlay(shouldReload);
      }, delay);
    }

    function attemptPlay(shouldReload) {
      var sourceChanged = ensureSource();

      if (shouldReload || sourceChanged) {
        video.load();
      }

      playPromise = video.play();

      if (video.currentTime > 0 || (!video.paused && video.readyState >= 2)) {
        revealWhenFramePainted();
      }

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          clearReady();
          scheduleRetry(800, false);
        });
      }
    }

    function startVideo() {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.loop = true;
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");

      video.addEventListener("loadedmetadata", function () {
        attemptPlay(false);
      });
      video.addEventListener("canplay", function () {
        attemptPlay(false);
      });
      video.addEventListener("playing", function () {
        retryCount = 0;
        revealWhenFramePainted();
        window.clearTimeout(retryTimer);
      });
      video.addEventListener("timeupdate", function () {
        if (video.currentTime > 0) {
          hasStarted = true;
          markReady();
        }
      });
      video.addEventListener("pause", function () {
        if (document.visibilityState !== "visible") {
          return;
        }

        scheduleRetry(video.currentTime > 0.25 ? 900 : 600, false);
      });
      video.addEventListener("stalled", function () {
        if (!hasStarted) {
          scheduleRetry(900, false);
        }
      });
      video.addEventListener("waiting", function () {
        if (!hasStarted) {
          scheduleRetry(900, false);
        }
      });
      video.addEventListener("error", function () {
        clearReady();
        scheduleRetry(900, true);
      });

      attemptPlay(false);
      scheduleRetry(1400, false);
    }

    startVideo();

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState !== "visible" || !video.paused) {
        return;
      }

      attemptPlay(false);
    });

    window.addEventListener("pageshow", function () {
      if (video.paused) {
        attemptPlay(false);
      }
    });

    window.addEventListener("focus", function () {
      if (video.paused) {
        attemptPlay(false);
      }
    });

    if (mobileQuery) {
      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", function () {
          hasStarted = false;
          clearReady();
          attemptPlay(true);
        });
      } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(function () {
          hasStarted = false;
          clearReady();
          attemptPlay(true);
        });
      }
    }
  }

  function initCalendlyWidget() {
    var widget = document.querySelector(".calendly-inline-widget[data-url]");
    var isLoaded = false;

    if (!widget) {
      return;
    }

    function loadCalendly() {
      var script;

      if (isLoaded) {
        return;
      }

      isLoaded = true;
      script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = function () {
        if (
          window.Calendly &&
          typeof window.Calendly.initInlineWidget === "function" &&
          !widget.querySelector("iframe")
        ) {
          window.Calendly.initInlineWidget({
            url: widget.getAttribute("data-url"),
            parentElement: widget
          });
        }
      };
      document.body.appendChild(script);
    }

    if (!("IntersectionObserver" in window)) {
      loadCalendly();
      return;
    }

    new IntersectionObserver(
      function (entries, observer) {
        if (!entries[0].isIntersecting) {
          return;
        }

        observer.disconnect();
        loadCalendly();
      },
      { rootMargin: "320px 0px" }
    ).observe(widget);
  }



  document.addEventListener("DOMContentLoaded", function () {
    initRevealAnimations();
    initCarousels();
    initHeroMedia();
    initCalendlyWidget();
  });
})();
