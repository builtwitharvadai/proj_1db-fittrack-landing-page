/**
 * Performance Optimization and Monitoring Module
 * 
 * Production-ready performance optimization system with comprehensive monitoring,
 * lazy loading, resource preloading, font optimization, and Core Web Vitals tracking.
 * 
 * Features:
 * - Lazy loading for images and videos with Intersection Observer
 * - Critical resource preloading and prefetching
 * - Font loading optimization with font-display swap
 * - Core Web Vitals monitoring (LCP, FID, CLS, FCP, TTFB)
 * - Resource hints implementation (preconnect, dns-prefetch)
 * - Global error boundary for JavaScript errors
 * - Performance metrics collection and reporting
 * - Memory management and cleanup
 * - Network information API integration
 * - Adaptive loading based on connection quality
 * 
 * @module performance
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = Object.freeze({
    // Lazy loading configuration
    lazyLoading: {
      rootMargin: '100px',
      threshold: 0.01,
      videoRootMargin: '200px',
      enableNativeLazyLoading: true,
    },

    // Resource hints
    resourceHints: {
      preconnectOrigins: [
        'https://www.google-analytics.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
      dnsPrefetchOrigins: [
        'https://www.googletagmanager.com',
      ],
    },

    // Font loading
    fonts: {
      families: ['Inter', 'Poppins'],
      display: 'swap',
      timeout: 3000,
    },

    // Performance monitoring
    monitoring: {
      enableWebVitals: true,
      enableResourceTiming: true,
      enableNavigationTiming: true,
      reportingEndpoint: null, // Set to API endpoint for server reporting
      reportingInterval: 30000, // 30 seconds
      sampleRate: 1.0, // 100% sampling
    },

    // Error handling
    errorHandling: {
      maxErrors: 50,
      reportingEndpoint: null,
      enableStackTrace: true,
    },

    // Adaptive loading
    adaptiveLoading: {
      enabled: true,
      saveDataMode: false,
      reducedMotion: false,
    },

    // Selectors
    selectors: {
      lazyImage: 'img[loading="lazy"], img[data-src]',
      lazyVideo: 'video[data-src]',
      criticalImage: 'img[data-priority="high"]',
    },
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    // Observers
    imageObserver: null,
    videoObserver: null,

    // Performance metrics
    metrics: {
      webVitals: {},
      resourceTimings: [],
      navigationTiming: null,
      customMarks: new Map(),
    },

    // Error tracking
    errors: [],
    errorCount: 0,

    // Network information
    connection: {
      effectiveType: '4g',
      saveData: false,
      downlink: 10,
    },

    // Feature detection
    features: {
      intersectionObserver: false,
      performanceObserver: false,
      networkInformation: false,
      fontFaceAPI: false,
    },

    // Cleanup handlers
    cleanupHandlers: [],

    // Initialization state
    initialized: false,
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Structured logging with context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  function log(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      module: 'performance',
      ...context,
    };

    if (level === 'error') {
      console.error(`[Performance] ${message}`, logData);
    } else if (level === 'warn') {
      console.warn(`[Performance] ${message}`, logData);
    } else {
      console.log(`[Performance] ${message}`, logData);
    }
  }

  /**
   * Feature detection
   */
  function detectFeatures() {
    state.features.intersectionObserver = 'IntersectionObserver' in window;
    state.features.performanceObserver = 'PerformanceObserver' in window;
    state.features.networkInformation = 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator;
    state.features.fontFaceAPI = 'fonts' in document;

    log('info', 'Feature detection completed', state.features);
  }

  /**
   * Get network information
   * @returns {Object} Network information
   */
  function getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType || '4g',
        saveData: connection.saveData || false,
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 0,
      };
    }

    return state.connection;
  }

  /**
   * Check if should use adaptive loading
   * @returns {boolean}
   */
  function shouldUseAdaptiveLoading() {
    if (!CONFIG.adaptiveLoading.enabled) {
      return false;
    }

    const connection = getNetworkInfo();
    
    // Respect save-data preference
    if (connection.saveData) {
      return true;
    }

    // Adapt based on connection quality
    const slowConnections = ['slow-2g', '2g', '3g'];
    return slowConnections.includes(connection.effectiveType);
  }

  /**
   * Check if prefers reduced motion
   * @returns {boolean}
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ============================================
  // RESOURCE HINTS
  // ============================================

  /**
   * Add resource hint to document head
   * @param {string} rel - Relationship type
   * @param {string} href - Resource URL
   * @param {Object} attributes - Additional attributes
   */
  function addResourceHint(rel, href, attributes = {}) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;

    Object.entries(attributes).forEach(([key, value]) => {
      link.setAttribute(key, value);
    });

    document.head.appendChild(link);

    log('info', `Added resource hint: ${rel}`, { href });
  }

  /**
   * Initialize resource hints
   */
  function initResourceHints() {
    // Preconnect to critical origins
    CONFIG.resourceHints.preconnectOrigins.forEach((origin) => {
      addResourceHint('preconnect', origin, { crossorigin: 'anonymous' });
    });

    // DNS prefetch for additional origins
    CONFIG.resourceHints.dnsPrefetchOrigins.forEach((origin) => {
      addResourceHint('dns-prefetch', origin);
    });

    log('info', 'Resource hints initialized');
  }

  // ============================================
  // FONT LOADING OPTIMIZATION
  // ============================================

  /**
   * Load fonts with optimization
   */
  async function loadFonts() {
    if (!state.features.fontFaceAPI) {
      log('warn', 'Font Face API not supported, using fallback');
      return;
    }

    try {
      const fontPromises = CONFIG.fonts.families.map(async (family) => {
        const font = new FontFace(
          family,
          `local('${family}')`,
          { display: CONFIG.fonts.display }
        );

        try {
          await Promise.race([
            font.load(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Font load timeout')), CONFIG.fonts.timeout)
            ),
          ]);

          document.fonts.add(font);
          log('info', `Font loaded: ${family}`);
        } catch (error) {
          log('warn', `Font load failed: ${family}`, { error: error.message });
        }
      });

      await Promise.allSettled(fontPromises);
      log('info', 'Font loading completed');
    } catch (error) {
      log('error', 'Font loading error', { error: error.message });
    }
  }

  // ============================================
  // LAZY LOADING
  // ============================================

  /**
   * Load image element
   * @param {HTMLImageElement} img - Image element
   */
  function loadImage(img) {
    const src = img.dataset.src || img.getAttribute('data-src');
    
    if (!src) {
      return;
    }

    // Use native lazy loading if available
    if (CONFIG.lazyLoading.enableNativeLazyLoading && 'loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }

    img.src = src;
    img.removeAttribute('data-src');
    
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      log('info', 'Image loaded', { src });
    }, { once: true });

    img.addEventListener('error', () => {
      img.classList.add('error');
      log('error', 'Image load failed', { src });
    }, { once: true });
  }

  /**
   * Load video element
   * @param {HTMLVideoElement} video - Video element
   */
  function loadVideo(video) {
    const sources = video.querySelectorAll('source[data-src]');
    
    sources.forEach((source) => {
      const src = source.dataset.src || source.getAttribute('data-src');
      if (src) {
        source.src = src;
        source.removeAttribute('data-src');
      }
    });

    video.load();
    log('info', 'Video loaded');
  }

  /**
   * Initialize lazy loading with Intersection Observer
   */
  function initLazyLoading() {
    if (!state.features.intersectionObserver) {
      log('warn', 'Intersection Observer not supported, loading all resources immediately');
      loadAllResources();
      return;
    }

    // Image observer
    state.imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            loadImage(img);
            state.imageObserver.unobserve(img);
          }
        });
      },
      {
        rootMargin: CONFIG.lazyLoading.rootMargin,
        threshold: CONFIG.lazyLoading.threshold,
      }
    );

    // Video observer
    state.videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const video = entry.target;
            loadVideo(video);
            state.videoObserver.unobserve(video);
          }
        });
      },
      {
        rootMargin: CONFIG.lazyLoading.videoRootMargin,
        threshold: CONFIG.lazyLoading.threshold,
      }
    );

    // Observe images
    document.querySelectorAll(CONFIG.selectors.lazyImage).forEach((img) => {
      state.imageObserver.observe(img);
    });

    // Observe videos
    document.querySelectorAll(CONFIG.selectors.lazyVideo).forEach((video) => {
      state.videoObserver.observe(video);
    });

    log('info', 'Lazy loading initialized');
  }

  /**
   * Load all resources immediately (fallback)
   */
  function loadAllResources() {
    document.querySelectorAll(CONFIG.selectors.lazyImage).forEach(loadImage);
    document.querySelectorAll(CONFIG.selectors.lazyVideo).forEach(loadVideo);
    log('info', 'All resources loaded immediately');
  }

  // ============================================
  // CRITICAL RESOURCE PRELOADING
  // ============================================

  /**
   * Preload critical resources
   */
  function preloadCriticalResources() {
    // Preload critical images
    document.querySelectorAll(CONFIG.selectors.criticalImage).forEach((img) => {
      const src = img.dataset.src || img.src;
      if (src) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
        
        log('info', 'Preloading critical image', { src });
      }
    });
  }

  // ============================================
  // CORE WEB VITALS MONITORING
  // ============================================

  /**
   * Report metric to analytics
   * @param {Object} metric - Performance metric
   */
  function reportMetric(metric) {
    state.metrics.webVitals[metric.name] = metric;

    log('info', `Web Vital: ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
    });

    // Report to server if endpoint configured
    if (CONFIG.monitoring.reportingEndpoint && Math.random() < CONFIG.monitoring.sampleRate) {
      sendMetricToServer(metric);
    }
  }

  /**
   * Send metric to server
   * @param {Object} metric - Performance metric
   */
  function sendMetricToServer(metric) {
    if (!CONFIG.monitoring.reportingEndpoint) {
      return;
    }

    const data = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Use sendBeacon for reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.monitoring.reportingEndpoint, JSON.stringify(data));
    } else {
      fetch(CONFIG.monitoring.reportingEndpoint, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch((error) => {
        log('error', 'Failed to send metric', { error: error.message });
      });
    }
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  function initWebVitalsMonitoring() {
    if (!CONFIG.monitoring.enableWebVitals || !state.features.performanceObserver) {
      log('warn', 'Web Vitals monitoring not available');
      return;
    }

    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        reportMetric({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: lastEntry.renderTime < 2500 ? 'good' : lastEntry.renderTime < 4000 ? 'needs-improvement' : 'poor',
          delta: lastEntry.renderTime || lastEntry.loadTime,
          id: `lcp-${Date.now()}`,
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          reportMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            rating: entry.processingStart - entry.startTime < 100 ? 'good' : entry.processingStart - entry.startTime < 300 ? 'needs-improvement' : 'poor',
            delta: entry.processingStart - entry.startTime,
            id: `fid-${Date.now()}`,
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        reportMetric({
          name: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          delta: clsValue,
          id: `cls-${Date.now()}`,
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // First Contentful Paint (FCP)
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          reportMetric({
            name: 'FCP',
            value: entry.startTime,
            rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor',
            delta: entry.startTime,
            id: `fcp-${Date.now()}`,
          });
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      log('info', 'Web Vitals monitoring initialized');
    } catch (error) {
      log('error', 'Failed to initialize Web Vitals monitoring', { error: error.message });
    }
  }

  /**
   * Collect navigation timing metrics
   */
  function collectNavigationTiming() {
    if (!CONFIG.monitoring.enableNavigationTiming || !window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const navigation = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domComplete - timing.domLoading,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.navigationStart,
      ttfb: timing.responseStart - timing.navigationStart,
    };

    state.metrics.navigationTiming = navigation;
    log('info', 'Navigation timing collected', navigation);
  }

  // ============================================
  // ERROR BOUNDARY
  // ============================================

  /**
   * Handle global errors
   * @param {ErrorEvent} event - Error event
   */
  function handleError(event) {
    if (state.errorCount >= CONFIG.errorHandling.maxErrors) {
      log('warn', 'Max error count reached, suppressing further errors');
      return;
    }

    state.errorCount++;

    const errorData = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (CONFIG.errorHandling.enableStackTrace && event.error) {
      errorData.stack = event.error.stack;
    }

    state.errors.push(errorData);

    log('error', 'JavaScript error caught', errorData);

    // Report to server if endpoint configured
    if (CONFIG.errorHandling.reportingEndpoint) {
      sendErrorToServer(errorData);
    }

    // Prevent default error handling
    return false;
  }

  /**
   * Handle unhandled promise rejections
   * @param {PromiseRejectionEvent} event - Rejection event
   */
  function handleUnhandledRejection(event) {
    if (state.errorCount >= CONFIG.errorHandling.maxErrors) {
      return;
    }

    state.errorCount++;

    const errorData = {
      message: event.reason?.message || String(event.reason),
      type: 'unhandledRejection',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    if (CONFIG.errorHandling.enableStackTrace && event.reason?.stack) {
      errorData.stack = event.reason.stack;
    }

    state.errors.push(errorData);

    log('error', 'Unhandled promise rejection', errorData);

    if (CONFIG.errorHandling.reportingEndpoint) {
      sendErrorToServer(errorData);
    }
  }

  /**
   * Send error to server
   * @param {Object} errorData - Error data
   */
  function sendErrorToServer(errorData) {
    if (!CONFIG.errorHandling.reportingEndpoint) {
      return;
    }

    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.errorHandling.reportingEndpoint, JSON.stringify(errorData));
    } else {
      fetch(CONFIG.errorHandling.reportingEndpoint, {
        method: 'POST',
        body: JSON.stringify(errorData),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {
        // Silently fail to avoid error loops
      });
    }
  }

  /**
   * Initialize error boundary
   */
  function initErrorBoundary() {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    state.cleanupHandlers.push(() => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    });

    log('info', 'Error boundary initialized');
  }

  // ============================================
  // PERFORMANCE MARKS AND MEASURES
  // ============================================

  /**
   * Create performance mark
   * @param {string} name - Mark name
   */
  function mark(name) {
    if (!window.performance || !window.performance.mark) {
      return;
    }

    try {
      window.performance.mark(name);
      state.metrics.customMarks.set(name, performance.now());
      log('info', `Performance mark: ${name}`);
    } catch (error) {
      log('error', 'Failed to create performance mark', { name, error: error.message });
    }
  }

  /**
   * Measure performance between marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   * @returns {number|null} Duration in milliseconds
   */
  function measure(name, startMark, endMark) {
    if (!window.performance || !window.performance.measure) {
      return null;
    }

    try {
      window.performance.measure(name, startMark, endMark);
      const measure = window.performance.getEntriesByName(name, 'measure')[0];
      
      log('info', `Performance measure: ${name}`, { duration: measure.duration });
      
      return measure.duration;
    } catch (error) {
      log('error', 'Failed to create performance measure', { name, error: error.message });
      return null;
    }
  }

  // ============================================
  // CLEANUP AND MEMORY MANAGEMENT
  // ============================================

  /**
   * Cleanup resources
   */
  function cleanup() {
    // Disconnect observers
    if (state.imageObserver) {
      state.imageObserver.disconnect();
      state.imageObserver = null;
    }

    if (state.videoObserver) {
      state.videoObserver.disconnect();
      state.videoObserver = null;
    }

    // Run cleanup handlers
    state.cleanupHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        log('error', 'Cleanup handler failed', { error: error.message });
      }
    });

    state.cleanupHandlers = [];

    log('info', 'Performance module cleanup completed');
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize performance optimization module
   */
  function init() {
    if (state.initialized) {
      log('warn', 'Performance module already initialized');
      return;
    }

    log('info', 'Initializing performance optimization module');

    // Feature detection
    detectFeatures();

    // Network information
    state.connection = getNetworkInfo();
    state.adaptiveLoading.saveDataMode = shouldUseAdaptiveLoading();
    state.adaptiveLoading.reducedMotion = prefersReducedMotion();

    // Initialize components
    initResourceHints();
    initErrorBoundary();
    
    // Load fonts asynchronously
    loadFonts();

    // Preload critical resources
    preloadCriticalResources();

    // Initialize lazy loading
    if (!state.adaptiveLoading.saveDataMode) {
      initLazyLoading();
    } else {
      log('info', 'Adaptive loading enabled, deferring lazy loading');
    }

    // Initialize monitoring
    initWebVitalsMonitoring();

    // Collect navigation timing after page load
    if (document.readyState === 'complete') {
      collectNavigationTiming();
    } else {
      window.addEventListener('load', collectNavigationTiming, { once: true });
    }

    // Performance marks
    mark('performance-module-initialized');

    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup, { once: true });

    state.initialized = true;

    log('info', 'Performance optimization module initialized', {
      features: state.features,
      connection: state.connection,
      adaptiveLoading: state.adaptiveLoading,
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.PerformanceAPI = Object.freeze({
    init,
    cleanup,
    mark,
    measure,
    getMetrics: () => ({ ...state.metrics }),
    getErrors: () => [...state.errors],
    reinitialize: () => {
      cleanup();
      state.initialized = false;
      init();
    },
  });

  // ============================================
  // AUTO-INITIALIZE
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();