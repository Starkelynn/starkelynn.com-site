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
    var autoplay = parseInt(carousel.getAttribute("data-carousel-autoplay"), 10);
    var activeIndex = 0;
    var timerId = null;

    if (!slides.length) {
      return;
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

    render(0);
    startAutoplay();
  }

  function initCarousels() {
    var carousels = document.querySelectorAll("[data-carousel]");

    Array.prototype.forEach.call(carousels, initCarousel);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initRevealAnimations();
    initCarousels();
  });
})();
