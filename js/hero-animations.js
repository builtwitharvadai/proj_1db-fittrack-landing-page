/**
 * Hero Section Animations and Interactions
 * Production-ready JavaScript for FitTrack Landing Page
 * 
 * Features:
 * - Intersection Observer for scroll-triggered animations
 * - CSS class toggling for animation states
 * - CTA button click tracking
 * - Smooth scroll functionality
 * - Performance optimization with requestAnimationFrame
 * - Accessibility support (prefers-reduced-motion)
 * - Proper event listener cleanup
 * 
 * @generated-from: task-id:TASK-004
 * @modifies: hero section animations
 * @dependencies: ["css/components/hero.css"]
 */

(function heroAnimations() {
  'use strict';

  // ============================================
  // CONFIGURATION & CONSTANTS
  // ============================================

  const CONFIG = Object.freeze({
    ANIMATION_DELAY: 100,
    SCROLL_BEHAVIOR: 'smooth',
    INTERSECTION_THRESHOLD: 0.1,
    INTERSECTION_ROOT_MARGIN: '0px 0px -10% 0px',
    DEBOUNCE_DELAY: 150,
    ANALYTICS_ENDPOINT: '/api/analytics/track',
    FEATURE_FLAG_CLASS: 'no-animations',
  });

  const SELECTORS = Object.freeze({
    HERO: '.hero',
    HERO_HEADLINE: '.hero__headline',
    HERO_SUBTEXT: '.hero__subtext',
    HERO_CTA: '.hero__cta',
    HERO_BUTTON_PRIMARY: '.hero__button--primary',
    HERO_BUTTON_SECONDARY: '.hero__button--secondary',
    HERO_SCROLL_INDICATOR: '.hero__scroll-indicator',
    ANIMATED_ELEMENTS: '.hero__headline, .hero__subtext, .hero__cta, .hero__scroll-indicator',
  });

  const CSS_CLASSES = Object.freeze({
    ANIMATED: 'hero-animated',
    VISIBLE: 'hero-visible',
    LOADING: 'hero-loading',
    ERROR: 'hero-error',
  });

  const EVENTS = Object.freeze({
    CTA_CLICK: 'hero:cta:click',
    SCROLL_INDICATOR_CLICK: 'hero:scroll:click',
    ANIMATION_COMPLETE: 'hero:animation:complete',
    VISIBILITY_CHANGE: 'hero:visibility:change',
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    isInitialized: false,
    prefersReducedMotion: false,
    isFeatureFlagDisabled: false,
    observers: new Set(),
    eventListeners: new Map(),
    animationFrameId: null,
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Checks if animations should be disabled
   * @returns {boolean} True if animations should be disabled
   */
  function shouldDisableAnimations() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hasFeatureFlag = document.documentElement.classList.contains(CONFIG.FEATURE_FLAG_CLASS);
    return mediaQuery.matches || hasFeatureFlag;
  }

  /**
   * Logs structured messages with context
   * @param {string} level - Log level (info, warn, error)
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  function log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      component: 'hero-animations',
      ...context,
    };

    if (level === 'error') {
      console.error(`[HeroAnimations] ${message}`, logData);
    } else if (level === 'warn') {
      console.warn(`[HeroAnimations] ${message}`, logData);
    } else {
      console.log(`[HeroAnimations] ${message}`, logData);
    }
  }

  /**
   * Debounces a function call
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, delay) {
    let timeoutId;
    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * Safely queries DOM element with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {Element|null} Found element or null
   */
  function safeQuerySelector(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      log('error', 'Invalid selector', { selector, error: error.message });
      return null;
    }
  }

  /**
   * Safely queries all DOM elements with error handling
   * @param {string} selector - CSS selector
   * @param {Element} context - Context element (default: document)
   * @returns {NodeList} Found elements
   */
  function safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      log('error', 'Invalid selector', { selector, error: error.message });
      return [];
    }
  }

  // ============================================
  // ANIMATION FUNCTIONS
  // ============================================

  /**
   * Triggers animation for hero elements
   * @param {Element} element - Element to animate
   */
  function triggerAnimation(element) {
    if (!element || state.prefersReducedMotion || state.isFeatureFlagDisabled) {
      return;
    }

    try {
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
      }

      state.animationFrameId = requestAnimationFrame(() => {
        element.classList.add(CSS_CLASSES.ANIMATED, CSS_CLASSES.VISIBLE);
        
        log('info', 'Animation triggered', {
          element: element.className,
          timestamp: performance.now(),
        });

        element.dispatchEvent(new CustomEvent(EVENTS.ANIMATION_COMPLETE, {
          bubbles: true,
          detail: { element: element.className },
        }));
      });
    } catch (error) {
      log('error', 'Animation trigger failed', {
        element: element.className,
        error: error.message,
      });
    }
  }

  /**
   * Handles intersection observer callback
   * @param {IntersectionObserverEntry[]} entries - Intersection entries
   */
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        triggerAnimation(entry.target);
        
        log('info', 'Element entered viewport', {
          element: entry.target.className,
          intersectionRatio: entry.intersectionRatio,
        });

        entry.target.dispatchEvent(new CustomEvent(EVENTS.VISIBILITY_CHANGE, {
          bubbles: true,
          detail: { visible: true },
        }));
      }
    });
  }

  /**
   * Initializes Intersection Observer for scroll animations
   */
  function initIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      log('warn', 'IntersectionObserver not supported, falling back to immediate animation');
      
      const elements = safeQuerySelectorAll(SELECTORS.ANIMATED_ELEMENTS);
      elements.forEach((element) => triggerAnimation(element));
      return;
    }

    try {
      const observerOptions = {
        root: null,
        rootMargin: CONFIG.INTERSECTION_ROOT_MARGIN,
        threshold: CONFIG.INTERSECTION_THRESHOLD,
      };

      const observer = new IntersectionObserver(handleIntersection, observerOptions);
      state.observers.add(observer);

      const elements = safeQuerySelectorAll(SELECTORS.ANIMATED_ELEMENTS);
      
      if (elements.length === 0) {
        log('warn', 'No animated elements found', { selector: SELECTORS.ANIMATED_ELEMENTS });
        return;
      }

      elements.forEach((element) => {
        observer.observe(element);
        log('info', 'Observing element', { element: element.className });
      });

      log('info', 'Intersection Observer initialized', {
        elementCount: elements.length,
        options: observerOptions,
      });
    } catch (error) {
      log('error', 'Failed to initialize Intersection Observer', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Tracks CTA button clicks
   * @param {Event} event - Click event
   */
  function handleCtaClick(event) {
    const button = event.currentTarget;
    const buttonType = button.classList.contains('hero__button--primary') ? 'primary' : 'secondary';
    const buttonText = button.textContent.trim();

    log('info', 'CTA button clicked', {
      buttonType,
      buttonText,
      timestamp: Date.now(),
    });

    button.dispatchEvent(new CustomEvent(EVENTS.CTA_CLICK, {
      bubbles: true,
      detail: {
        buttonType,
        buttonText,
        href: button.getAttribute('href'),
      },
    }));

    // Track analytics (non-blocking)
    trackAnalytics('cta_click', {
      button_type: buttonType,
      button_text: buttonText,
    }).catch((error) => {
      log('error', 'Analytics tracking failed', { error: error.message });
    });
  }

  /**
   * Handles smooth scroll to target section
   * @param {Event} event - Click event
   */
  function handleSmoothScroll(event) {
    const link = event.currentTarget;
    const href = link.getAttribute('href');

    if (!href || !href.startsWith('#')) {
      return;
    }

    event.preventDefault();

    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      log('warn', 'Scroll target not found', { targetId });
      return;
    }

    try {
      targetElement.scrollIntoView({
        behavior: CONFIG.SCROLL_BEHAVIOR,
        block: 'start',
      });

      log('info', 'Smooth scroll triggered', {
        targetId,
        timestamp: performance.now(),
      });

      link.dispatchEvent(new CustomEvent(EVENTS.SCROLL_INDICATOR_CLICK, {
        bubbles: true,
        detail: { targetId },
      }));
    } catch (error) {
      log('error', 'Smooth scroll failed', {
        targetId,
        error: error.message,
      });
      
      // Fallback to default behavior
      window.location.hash = href;
    }
  }

  /**
   * Handles reduced motion preference changes
   * @param {MediaQueryListEvent} event - Media query change event
   */
  function handleReducedMotionChange(event) {
    state.prefersReducedMotion = event.matches;
    
    log('info', 'Reduced motion preference changed', {
      prefersReducedMotion: state.prefersReducedMotion,
    });

    if (state.prefersReducedMotion) {
      const elements = safeQuerySelectorAll(SELECTORS.ANIMATED_ELEMENTS);
      elements.forEach((element) => {
        element.classList.add(CSS_CLASSES.VISIBLE);
      });
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Tracks analytics events
   * @param {string} eventName - Event name
   * @param {Object} eventData - Event data
   * @returns {Promise<void>}
   */
  async function trackAnalytics(eventName, eventData) {
    if (!navigator.sendBeacon && !window.fetch) {
      log('warn', 'Analytics tracking not supported');
      return;
    }

    const payload = {
      event: eventName,
      timestamp: Date.now(),
      page: window.location.pathname,
      ...eventData,
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(CONFIG.ANALYTICS_ENDPOINT, blob);
      } else {
        await fetch(CONFIG.ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }

      log('info', 'Analytics tracked', { event: eventName });
    } catch (error) {
      log('error', 'Analytics request failed', {
        event: eventName,
        error: error.message,
      });
    }
  }

  // ============================================
  // EVENT LISTENER MANAGEMENT
  // ============================================

  /**
   * Adds event listener with cleanup tracking
   * @param {Element} element - Target element
   * @param {string} eventType - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  function addTrackedEventListener(element, eventType, handler, options = {}) {
    if (!element) {
      return;
    }

    element.addEventListener(eventType, handler, options);

    const key = `${element.className}-${eventType}`;
    if (!state.eventListeners.has(key)) {
      state.eventListeners.set(key, []);
    }
    state.eventListeners.get(key).push({ element, eventType, handler, options });

    log('info', 'Event listener added', {
      element: element.className,
      eventType,
    });
  }

  /**
   * Removes all tracked event listeners
   */
  function removeAllEventListeners() {
    state.eventListeners.forEach((listeners) => {
      listeners.forEach(({ element, eventType, handler, options }) => {
        element.removeEventListener(eventType, handler, options);
      });
    });

    state.eventListeners.clear();
    log('info', 'All event listeners removed');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initializes hero section animations and interactions
   */
  function init() {
    if (state.isInitialized) {
      log('warn', 'Hero animations already initialized');
      return;
    }

    try {
      log('info', 'Initializing hero animations');

      // Check for feature flag and reduced motion preference
      state.isFeatureFlagDisabled = document.documentElement.classList.contains(CONFIG.FEATURE_FLAG_CLASS);
      state.prefersReducedMotion = shouldDisableAnimations();

      if (state.prefersReducedMotion) {
        log('info', 'Animations disabled due to user preference');
      }

      // Initialize Intersection Observer for scroll animations
      initIntersectionObserver();

      // Setup CTA button click tracking
      const primaryButton = safeQuerySelector(SELECTORS.HERO_BUTTON_PRIMARY);
      const secondaryButton = safeQuerySelector(SELECTORS.HERO_BUTTON_SECONDARY);

      if (primaryButton) {
        addTrackedEventListener(primaryButton, 'click', handleCtaClick);
      }

      if (secondaryButton) {
        addTrackedEventListener(secondaryButton, 'click', handleCtaClick);
      }

      // Setup smooth scroll for scroll indicator
      const scrollIndicator = safeQuerySelector(SELECTORS.HERO_SCROLL_INDICATOR);
      if (scrollIndicator) {
        addTrackedEventListener(scrollIndicator, 'click', handleSmoothScroll);
      }

      // Setup smooth scroll for all anchor links in hero
      const heroElement = safeQuerySelector(SELECTORS.HERO);
      if (heroElement) {
        const anchorLinks = heroElement.querySelectorAll('a[href^="#"]');
        anchorLinks.forEach((link) => {
          addTrackedEventListener(link, 'click', handleSmoothScroll);
        });
      }

      // Listen for reduced motion preference changes
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.addEventListener) {
        addTrackedEventListener(mediaQuery, 'change', handleReducedMotionChange);
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers
        mediaQuery.addListener(handleReducedMotionChange);
      }

      state.isInitialized = true;
      log('info', 'Hero animations initialized successfully', {
        prefersReducedMotion: state.prefersReducedMotion,
        isFeatureFlagDisabled: state.isFeatureFlagDisabled,
      });

      // Track page load
      trackAnalytics('hero_loaded', {
        animations_enabled: !state.prefersReducedMotion && !state.isFeatureFlagDisabled,
      }).catch((error) => {
        log('error', 'Failed to track hero load', { error: error.message });
      });
    } catch (error) {
      log('error', 'Failed to initialize hero animations', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Cleans up all resources and event listeners
   */
  function cleanup() {
    log('info', 'Cleaning up hero animations');

    // Cancel any pending animation frames
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }

    // Disconnect all observers
    state.observers.forEach((observer) => {
      observer.disconnect();
    });
    state.observers.clear();

    // Remove all event listeners
    removeAllEventListeners();

    state.isInitialized = false;
    log('info', 'Hero animations cleanup complete');
  }

  // ============================================
  // AUTO-INITIALIZATION
  // ============================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);

  // Expose public API for testing and external control
  window.heroAnimations = Object.freeze({
    init,
    cleanup,
    getState: () => ({ ...state }),
  });
})();