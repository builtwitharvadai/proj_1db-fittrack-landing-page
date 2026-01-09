/**
 * Lazy Loading Implementation for Workout Plan Images
 * 
 * Production-ready lazy loading system using Intersection Observer API
 * with comprehensive error handling, performance optimization, and accessibility.
 * 
 * Features:
 * - Intersection Observer API for efficient lazy loading
 * - Placeholder to actual image replacement with fade-in animation
 * - Error handling with fallback images
 * - Performance optimization with loading thresholds
 * - Memory management and proper cleanup
 * - Accessibility considerations (ARIA attributes, reduced motion)
 * - Retry mechanism for failed image loads
 * 
 * @module lazy-loading
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = Object.freeze({
    // Intersection Observer options
    rootMargin: '50px', // Start loading 50px before entering viewport
    threshold: 0.01, // Trigger when 1% of image is visible
    
    // Loading behavior
    maxRetries: 3,
    retryDelay: 1000, // ms
    fadeInDuration: 400, // ms
    
    // Selectors
    imageSelector: '.workout-card__image[data-src]',
    placeholderClass: 'workout-card__image--loading',
    loadedClass: 'workout-card__image--loaded',
    errorClass: 'workout-card__image--error',
    
    // Fallback image (1x1 transparent pixel)
    fallbackImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3Crect fill="%23e5e7eb" width="1" height="1"/%3E%3C/svg%3E',
    
    // Error image (workout placeholder)
    errorImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" fill="none"%3E%3Crect width="400" height="250" fill="%23f3f4f6"/%3E%3Cpath d="M200 100c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 50c-16.5 0-30-13.5-30-30s13.5-30 30-30 30 13.5 30 30-13.5 30-30 30z" fill="%239ca3af"/%3E%3C/svg%3E',
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    observer: null,
    loadingImages: new WeakMap(), // Track loading state per image
    retryCount: new WeakMap(), // Track retry attempts per image
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

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
      module: 'lazy-loading',
      ...context,
    };

    if (level === 'error') {
      console.error(`[LazyLoad] ${message}`, logData);
    } else if (level === 'warn') {
      console.warn(`[LazyLoad] ${message}`, logData);
    } else {
      console.log(`[LazyLoad] ${message}`, logData);
    }
  }

  /**
   * Delays execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if browser supports Intersection Observer
   * @returns {boolean}
   */
  function supportsIntersectionObserver() {
    return (
      'IntersectionObserver' in window &&
      'IntersectionObserverEntry' in window &&
      'intersectionRatio' in window.IntersectionObserverEntry.prototype
    );
  }

  /**
   * Preloads an image and returns a promise
   * @param {string} src - Image source URL
   * @returns {Promise<HTMLImageElement>}
   */
  function preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        resolve(img);
      };

      img.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load image: ${src}`));
      };

      img.src = src;
    });
  }

  // ============================================
  // IMAGE LOADING LOGIC
  // ============================================

  /**
   * Loads an image with retry mechanism
   * @param {HTMLImageElement} img - Image element
   * @param {string} src - Image source URL
   * @returns {Promise<void>}
   */
  async function loadImageWithRetry(img, src) {
    const currentRetries = state.retryCount.get(img) || 0;

    try {
      // Preload the image
      await preloadImage(src);
      
      // Update the actual image element
      img.src = src;
      
      // Remove data-src attribute to prevent reprocessing
      img.removeAttribute('data-src');
      
      // Update classes for styling
      img.classList.remove(CONFIG.placeholderClass);
      img.classList.add(CONFIG.loadedClass);
      
      // Update ARIA attributes
      img.removeAttribute('aria-busy');
      img.setAttribute('aria-label', img.alt || 'Workout plan image');
      
      // Apply fade-in animation if motion is allowed
      if (!state.prefersReducedMotion) {
        img.style.opacity = '0';
        img.style.transition = `opacity ${CONFIG.fadeInDuration}ms ease-in-out`;
        
        // Force reflow
        void img.offsetHeight;
        
        img.style.opacity = '1';
      }
      
      log('info', 'Image loaded successfully', {
        src,
        alt: img.alt,
        retries: currentRetries,
      });
      
      // Clear retry count
      state.retryCount.delete(img);
      
    } catch (error) {
      if (currentRetries < CONFIG.maxRetries) {
        // Increment retry count
        state.retryCount.set(img, currentRetries + 1);
        
        log('warn', 'Image load failed, retrying', {
          src,
          attempt: currentRetries + 1,
          maxRetries: CONFIG.maxRetries,
          error: error.message,
        });
        
        // Wait before retrying with exponential backoff
        await delay(CONFIG.retryDelay * Math.pow(2, currentRetries));
        
        // Retry loading
        return loadImageWithRetry(img, src);
      } else {
        // Max retries reached, use error image
        log('error', 'Image load failed after max retries', {
          src,
          retries: currentRetries,
          error: error.message,
        });
        
        handleImageError(img);
      }
    } finally {
      // Clear loading state
      state.loadingImages.delete(img);
    }
  }

  /**
   * Handles image loading errors
   * @param {HTMLImageElement} img - Image element
   */
  function handleImageError(img) {
    // Set error image
    img.src = CONFIG.errorImage;
    
    // Update classes
    img.classList.remove(CONFIG.placeholderClass);
    img.classList.add(CONFIG.errorClass);
    
    // Update ARIA attributes
    img.removeAttribute('aria-busy');
    img.setAttribute('aria-label', 'Image failed to load');
    
    // Remove data-src to prevent reprocessing
    img.removeAttribute('data-src');
  }

  /**
   * Processes an image element for lazy loading
   * @param {HTMLImageElement} img - Image element
   */
  function processImage(img) {
    // Check if already loading or loaded
    if (state.loadingImages.has(img) || !img.hasAttribute('data-src')) {
      return;
    }

    const src = img.getAttribute('data-src');
    
    if (!src) {
      log('warn', 'Image has no data-src attribute', {
        alt: img.alt,
      });
      return;
    }

    // Mark as loading
    state.loadingImages.set(img, true);
    
    // Set ARIA busy state
    img.setAttribute('aria-busy', 'true');
    
    // Start loading
    loadImageWithRetry(img, src);
  }

  // ============================================
  // INTERSECTION OBSERVER
  // ============================================

  /**
   * Handles intersection observer entries
   * @param {IntersectionObserverEntry[]} entries - Observer entries
   */
  function handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Process the image
        processImage(img);
        
        // Stop observing this image
        if (state.observer) {
          state.observer.unobserve(img);
        }
      }
    });
  }

  /**
   * Initializes the Intersection Observer
   */
  function initIntersectionObserver() {
    if (!supportsIntersectionObserver()) {
      log('warn', 'Intersection Observer not supported, loading all images immediately');
      loadAllImagesImmediately();
      return;
    }

    try {
      state.observer = new IntersectionObserver(handleIntersection, {
        rootMargin: CONFIG.rootMargin,
        threshold: CONFIG.threshold,
      });

      log('info', 'Intersection Observer initialized', {
        rootMargin: CONFIG.rootMargin,
        threshold: CONFIG.threshold,
      });
    } catch (error) {
      log('error', 'Failed to initialize Intersection Observer', {
        error: error.message,
      });
      loadAllImagesImmediately();
    }
  }

  /**
   * Observes all lazy-loadable images
   */
  function observeImages() {
    const images = document.querySelectorAll(CONFIG.imageSelector);
    
    if (images.length === 0) {
      log('info', 'No images found for lazy loading');
      return;
    }

    log('info', 'Starting to observe images', {
      count: images.length,
    });

    images.forEach((img) => {
      // Set placeholder if not already set
      if (!img.src || img.src === window.location.href) {
        img.src = CONFIG.fallbackImage;
      }
      
      // Add loading class
      img.classList.add(CONFIG.placeholderClass);
      
      // Set loading attribute for native lazy loading support
      img.loading = 'lazy';
      
      // Observe the image
      if (state.observer) {
        state.observer.observe(img);
      }
    });
  }

  /**
   * Loads all images immediately (fallback for unsupported browsers)
   */
  function loadAllImagesImmediately() {
    const images = document.querySelectorAll(CONFIG.imageSelector);
    
    log('info', 'Loading all images immediately', {
      count: images.length,
    });

    images.forEach((img) => {
      processImage(img);
    });
  }

  // ============================================
  // CLEANUP AND MEMORY MANAGEMENT
  // ============================================

  /**
   * Cleans up resources and disconnects observer
   */
  function cleanup() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
      
      log('info', 'Intersection Observer disconnected');
    }

    // Clear WeakMaps (they'll be garbage collected automatically)
    state.loadingImages = new WeakMap();
    state.retryCount = new WeakMap();
  }

  /**
   * Reinitializes lazy loading (useful for dynamic content)
   */
  function reinitialize() {
    log('info', 'Reinitializing lazy loading');
    cleanup();
    init();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initializes the lazy loading system
   */
  function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    log('info', 'Initializing lazy loading system', {
      prefersReducedMotion: state.prefersReducedMotion,
      supportsIntersectionObserver: supportsIntersectionObserver(),
    });

    // Initialize observer
    initIntersectionObserver();
    
    // Start observing images
    observeImages();

    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      state.prefersReducedMotion = e.matches;
      log('info', 'Reduced motion preference changed', {
        prefersReducedMotion: state.prefersReducedMotion,
      });
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
  }

  // ============================================
  // PUBLIC API
  // ============================================

  // Expose public API for dynamic content updates
  window.LazyLoadingAPI = Object.freeze({
    reinitialize,
    cleanup,
    observeImages,
  });

  // ============================================
  // AUTO-INITIALIZE
  // ============================================

  init();
})();