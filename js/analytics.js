/**
 * Google Analytics 4 Integration Module
 * Implements privacy-compliant analytics tracking with consent management,
 * event tracking, and error handling for blocked analytics.
 * 
 * @module analytics
 * @generated-from: TASK-010 Performance Optimization and SEO Finalization
 * @modifies: none (new file)
 * @dependencies: none (standalone module)
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    measurementId: 'G-XXXXXXXXXX', // Replace with actual GA4 Measurement ID
    dataLayerName: 'dataLayer',
    consentStorageKey: 'fittrack_analytics_consent',
    consentExpiryDays: 365,
    debugMode: false,
    loadTimeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000
  };

  // Analytics state
  const state = {
    initialized: false,
    consentGiven: false,
    blocked: false,
    loadAttempts: 0,
    eventQueue: []
  };

  /**
   * Initialize Google Analytics with privacy compliance
   * Checks consent status and loads gtag.js asynchronously
   */
  function init() {
    if (state.initialized) {
      logDebug('Analytics already initialized');
      return;
    }

    // Check for stored consent
    const storedConsent = getStoredConsent();
    if (storedConsent !== null) {
      state.consentGiven = storedConsent;
    }

    // Initialize data layer
    initializeDataLayer();

    // Load gtag.js if consent given or in EU-exempt region
    if (state.consentGiven || shouldLoadByDefault()) {
      loadGtagScript();
    } else {
      logDebug('Analytics not loaded - awaiting consent');
    }

    // Set up event listeners
    setupEventListeners();

    state.initialized = true;
    logDebug('Analytics module initialized');
  }

  /**
   * Initialize the data layer for Google Analytics
   */
  function initializeDataLayer() {
    window[CONFIG.dataLayerName] = window[CONFIG.dataLayerName] || [];
    
    // Configure default consent state (denied until user consents)
    gtag('consent', 'default', {
      'analytics_storage': state.consentGiven ? 'granted' : 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'wait_for_update': 500
    });

    // Configure GA4
    gtag('js', new Date());
    gtag('config', CONFIG.measurementId, {
      'send_page_view': true,
      'anonymize_ip': true,
      'cookie_flags': 'SameSite=Strict;Secure',
      'cookie_expires': 63072000, // 2 years in seconds
      'allow_google_signals': false,
      'allow_ad_personalization_signals': false
    });

    logDebug('Data layer initialized');
  }

  /**
   * Load Google Analytics gtag.js script asynchronously
   */
  function loadGtagScript() {
    if (state.loadAttempts >= CONFIG.retryAttempts) {
      state.blocked = true;
      logError('Analytics script loading failed after maximum retries');
      processQueuedEvents(); // Process queue even if blocked
      return;
    }

    state.loadAttempts++;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.measurementId}`;
    
    // Success handler
    script.onload = function() {
      logDebug('Analytics script loaded successfully');
      state.blocked = false;
      processQueuedEvents();
    };

    // Error handler with retry logic
    script.onerror = function() {
      logError(`Analytics script loading failed (attempt ${state.loadAttempts}/${CONFIG.retryAttempts})`);
      
      if (state.loadAttempts < CONFIG.retryAttempts) {
        setTimeout(function() {
          loadGtagScript();
        }, CONFIG.retryDelay * state.loadAttempts);
      } else {
        state.blocked = true;
        processQueuedEvents();
      }
    };

    // Timeout handler
    const timeoutId = setTimeout(function() {
      if (!state.blocked && state.loadAttempts < CONFIG.retryAttempts) {
        logError('Analytics script loading timeout');
        script.onerror();
      }
    }, CONFIG.loadTimeout);

    script.onload = (function(originalOnload) {
      return function() {
        clearTimeout(timeoutId);
        if (originalOnload) originalOnload.call(this);
      };
    })(script.onload);

    document.head.appendChild(script);
  }

  /**
   * Set up event listeners for tracking
   */
  function setupEventListeners() {
    // Track CTA button clicks
    document.addEventListener('click', function(event) {
      const target = event.target.closest('[data-track-cta]');
      if (target) {
        const ctaName = target.getAttribute('data-track-cta') || target.textContent.trim();
        trackEvent('cta_click', {
          cta_name: ctaName,
          cta_location: getElementLocation(target)
        });
      }
    });

    // Track app store badge clicks
    document.addEventListener('click', function(event) {
      const target = event.target.closest('[data-track-app-store]');
      if (target) {
        const storeName = target.getAttribute('data-track-app-store');
        trackEvent('app_store_click', {
          store_name: storeName,
          link_url: target.href
        });
      }
    });

    // Track section visibility with Intersection Observer
    setupSectionTracking();

    // Track page engagement time
    setupEngagementTracking();

    logDebug('Event listeners configured');
  }

  /**
   * Set up section scroll tracking using Intersection Observer
   */
  function setupSectionTracking() {
    if (!('IntersectionObserver' in window)) {
      logDebug('IntersectionObserver not supported');
      return;
    }

    const sections = document.querySelectorAll('[data-track-section]');
    const trackedSections = new Set();

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const sectionName = entry.target.getAttribute('data-track-section');
          
          if (!trackedSections.has(sectionName)) {
            trackedSections.add(sectionName);
            trackEvent('section_view', {
              section_name: sectionName,
              scroll_depth: Math.round((window.scrollY / document.documentElement.scrollHeight) * 100)
            });
          }
        }
      });
    }, {
      threshold: [0.5],
      rootMargin: '0px'
    });

    sections.forEach(function(section) {
      observer.observe(section);
    });
  }

  /**
   * Set up engagement time tracking
   */
  function setupEngagementTracking() {
    let startTime = Date.now();
    let isActive = true;
    let totalEngagementTime = 0;

    // Track when user becomes inactive
    const inactivityEvents = ['blur', 'visibilitychange'];
    inactivityEvents.forEach(function(eventName) {
      document.addEventListener(eventName, function() {
        if (document.hidden || !document.hasFocus()) {
          if (isActive) {
            totalEngagementTime += Date.now() - startTime;
            isActive = false;
          }
        } else {
          if (!isActive) {
            startTime = Date.now();
            isActive = true;
          }
        }
      });
    });

    // Send engagement time before page unload
    window.addEventListener('beforeunload', function() {
      if (isActive) {
        totalEngagementTime += Date.now() - startTime;
      }
      
      if (totalEngagementTime > 0) {
        trackEvent('user_engagement', {
          engagement_time_msec: totalEngagementTime
        }, true);
      }
    });
  }

  /**
   * Track custom event
   * @param {string} eventName - Name of the event
   * @param {Object} eventParams - Event parameters
   * @param {boolean} immediate - Send immediately (for beforeunload)
   */
  function trackEvent(eventName, eventParams, immediate) {
    if (!eventName || typeof eventName !== 'string') {
      logError('Invalid event name provided');
      return;
    }

    eventParams = eventParams || {};

    // Add timestamp
    eventParams.timestamp = new Date().toISOString();

    // Queue event if not ready or blocked
    if (!state.consentGiven || state.blocked) {
      state.eventQueue.push({ eventName: eventName, eventParams: eventParams });
      logDebug(`Event queued: ${eventName}`);
      return;
    }

    // Send event
    try {
      if (immediate && navigator.sendBeacon) {
        // Use sendBeacon for events during page unload
        const payload = JSON.stringify({
          event: eventName,
          params: eventParams
        });
        navigator.sendBeacon(
          `https://www.google-analytics.com/g/collect?measurement_id=${CONFIG.measurementId}`,
          payload
        );
      } else {
        gtag('event', eventName, eventParams);
      }
      logDebug(`Event tracked: ${eventName}`, eventParams);
    } catch (error) {
      logError('Error tracking event', error);
    }
  }

  /**
   * Process queued events after consent or script load
   */
  function processQueuedEvents() {
    if (state.eventQueue.length === 0) {
      return;
    }

    logDebug(`Processing ${state.eventQueue.length} queued events`);

    const queue = state.eventQueue.slice();
    state.eventQueue = [];

    queue.forEach(function(item) {
      trackEvent(item.eventName, item.eventParams);
    });
  }

  /**
   * Update user consent status
   * @param {boolean} granted - Whether consent is granted
   */
  function updateConsent(granted) {
    state.consentGiven = granted;
    storeConsent(granted);

    // Update GA4 consent
    gtag('consent', 'update', {
      'analytics_storage': granted ? 'granted' : 'denied'
    });

    if (granted && !state.blocked && state.loadAttempts === 0) {
      loadGtagScript();
    }

    if (granted) {
      processQueuedEvents();
    }

    logDebug(`Consent updated: ${granted ? 'granted' : 'denied'}`);
  }

  /**
   * Get stored consent from localStorage
   * @returns {boolean|null} Stored consent or null if not set
   */
  function getStoredConsent() {
    try {
      const stored = localStorage.getItem(CONFIG.consentStorageKey);
      if (stored === null) return null;
      
      const data = JSON.parse(stored);
      const expiryDate = new Date(data.expiry);
      
      if (expiryDate > new Date()) {
        return data.consent === true;
      }
      
      localStorage.removeItem(CONFIG.consentStorageKey);
      return null;
    } catch (error) {
      logError('Error reading consent from storage', error);
      return null;
    }
  }

  /**
   * Store consent in localStorage
   * @param {boolean} granted - Whether consent is granted
   */
  function storeConsent(granted) {
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + CONFIG.consentExpiryDays);
      
      localStorage.setItem(CONFIG.consentStorageKey, JSON.stringify({
        consent: granted,
        expiry: expiry.toISOString()
      }));
    } catch (error) {
      logError('Error storing consent', error);
    }
  }

  /**
   * Determine if analytics should load by default (non-EU regions)
   * @returns {boolean} Whether to load by default
   */
  function shouldLoadByDefault() {
    // In production, implement proper geo-detection or server-side logic
    // For now, default to requiring explicit consent (GDPR-compliant)
    return false;
  }

  /**
   * Get element location description for tracking
   * @param {Element} element - DOM element
   * @returns {string} Location description
   */
  function getElementLocation(element) {
    const section = element.closest('section');
    if (section && section.id) {
      return section.id;
    }
    
    const header = element.closest('header');
    if (header) {
      return 'header';
    }
    
    const footer = element.closest('footer');
    if (footer) {
      return 'footer';
    }
    
    return 'unknown';
  }

  /**
   * gtag function wrapper
   */
  function gtag() {
    window[CONFIG.dataLayerName].push(arguments);
  }

  /**
   * Debug logging
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  function logDebug(message, data) {
    if (CONFIG.debugMode) {
      console.log('[Analytics]', message, data || '');
    }
  }

  /**
   * Error logging
   * @param {string} message - Error message
   * @param {Error} error - Optional error object
   */
  function logError(message, error) {
    console.error('[Analytics Error]', message, error || '');
  }

  // Public API
  window.FitTrackAnalytics = {
    init: init,
    trackEvent: trackEvent,
    updateConsent: updateConsent,
    getConsentStatus: function() {
      return state.consentGiven;
    },
    isBlocked: function() {
      return state.blocked;
    }
  };

  // Auto-initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();