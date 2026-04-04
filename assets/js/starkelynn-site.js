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
    var startDelay = 200;
    var playPromise;

    if (!video || !visual) {
      return;
    }

    if (
      prefersReducedMotion ||
      (connection && connection.saveData) ||
      !window.matchMedia("(min-width: 801px)").matches
    ) {
      return;
    }

    if (!video.querySelector("source")) {
      return;
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

      video.addEventListener(
        "loadeddata",
        function () {
          visual.classList.add("is-video-ready");
          video.play().catch(function () {});
        },
        { once: true }
      );

      video.addEventListener(
        "canplay",
        function () {
          visual.classList.add("is-video-ready");
          video.play().catch(function () {});
        },
        { once: true }
      );

      video.addEventListener(
        "playing",
        function () {
          visual.classList.add("is-video-ready");
        },
        { once: true }
      );

      video.load();
      playPromise = video.play();

      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          visual.classList.remove("is-video-ready");
        });
      }

      window.setTimeout(function () {
        if (video.currentTime > 0 || visual.classList.contains("is-video-ready")) {
          return;
        }

        video.play().catch(function () {});
      }, 1800);
    }

    window.setTimeout(startVideo, startDelay);
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
    initCalendlyWidget();
  });

  window.addEventListener(
    "load",
    function () {
      initHeroMedia();
    },
    { once: true }
  );
})();
