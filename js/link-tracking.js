/**
 * Link Tracking Module
 * Production-ready link tracking for app store badges and social media links
 * Implements comprehensive event tracking, error handling, and performance optimization
 * 
 * @module link-tracking
 * @generated-from: task-id:TASK-008 feature:footer_cta_section
 * @modifies: DOM event listeners
 * @dependencies: []
 */

(function () {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  const CONFIG = Object.freeze({
    SELECTORS: {
      APP_BADGE: '.app-badge, .footer__app-badge',
      SOCIAL_LINK: '.footer__social-link',
      EXTERNAL_LINK: 'a[href^="http"]',
      FINAL_CTA_BADGES: '.final-cta__badges .app-badge',
      FOOTER_APP_BADGES: '.footer__app-badges .footer__app-badge',
    },
    TRACKING_EVENTS: {
      APP_STORE_CLICK: 'app_store_badge_click',
      SOCIAL_MEDIA_CLICK: 'social_media_click',
      EXTERNAL_LINK_CLICK: 'external_link_click',
    },
    PLATFORMS: {
      IOS: 'ios',
      ANDROID: 'android',
    },
    SOCIAL_NETWORKS: {
      FACEBOOK: 'facebook',
      INSTAGRAM: 'instagram',
      TWITTER: 'twitter',
    },
    DEBOUNCE_DELAY: 300,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    initialized: false,
    listeners: new WeakMap(),
    clickCounts: new Map(),
    lastClickTime: new Map(),
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Debounce function to limit event firing rate
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, delay) {
    let timeoutId = null;
    return function debounced(...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        timeoutId = null;
      }, delay);
    };
  }

  /**
   * Extract platform from app store badge URL or class
   * @param {HTMLElement} element - Badge element
   * @returns {string|null} Platform identifier
   */
  function extractPlatform(element) {
    const href = element.getAttribute('href') || '';
    const classes = element.className || '';

    if (href.includes('apple.com') || href.includes('apps.apple') || classes.includes('ios')) {
      return CONFIG.PLATFORMS.IOS;
    }
    if (href.includes('play.google') || href.includes('android') || classes.includes('android')) {
      return CONFIG.PLATFORMS.ANDROID;
    }

    // Fallback: check image alt text or src
    const img = element.querySelector('img');
    if (img) {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const src = (img.getAttribute('src') || '').toLowerCase();
      
      if (alt.includes('app store') || src.includes('app-store')) {
        return CONFIG.PLATFORMS.IOS;
      }
      if (alt.includes('google play') || src.includes('google-play')) {
        return CONFIG.PLATFORMS.ANDROID;
      }
    }

    return null;
  }

  /**
   * Extract social network from link URL or class
   * @param {HTMLElement} element - Social link element
   * @returns {string|null} Social network identifier
   */
  function extractSocialNetwork(element) {
    const href = element.getAttribute('href') || '';
    const classes = element.className || '';
    const ariaLabel = element.getAttribute('aria-label') || '';

    const combined = `${href} ${classes} ${ariaLabel}`.toLowerCase();

    if (combined.includes('facebook')) {
      return CONFIG.SOCIAL_NETWORKS.FACEBOOK;
    }
    if (combined.includes('instagram')) {
      return CONFIG.SOCIAL_NETWORKS.INSTAGRAM;
    }
    if (combined.includes('twitter') || combined.includes('x.com')) {
      return CONFIG.SOCIAL_NETWORKS.TWITTER;
    }

    return null;
  }

  /**
   * Extract location context from element
   * @param {HTMLElement} element - Link element
   * @returns {string} Location identifier
   */
  function extractLocation(element) {
    if (element.closest('.final-cta')) {
      return 'final_cta';
    }
    if (element.closest('.footer')) {
      return 'footer';
    }
    return 'unknown';
  }

  /**
   * Validate tracking data before sending
   * @param {Object} data - Tracking data
   * @returns {boolean} Validation result
   */
  function validateTrackingData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }
    if (!data.event || typeof data.event !== 'string') {
      return false;
    }
    if (!data.timestamp || typeof data.timestamp !== 'number') {
      return false;
    }
    return true;
  }

  /**
   * Check if click is duplicate (within debounce window)
   * @param {string} key - Unique identifier for the link
   * @returns {boolean} True if duplicate
   */
  function isDuplicateClick(key) {
    const lastClick = state.lastClickTime.get(key);
    const now = Date.now();
    
    if (lastClick && (now - lastClick) < CONFIG.DEBOUNCE_DELAY) {
      return true;
    }
    
    state.lastClickTime.set(key, now);
    return false;
  }

  // ============================================
  // ANALYTICS INTEGRATION
  // ============================================

  /**
   * Send tracking event to analytics service
   * @param {Object} eventData - Event data to track
   * @returns {Promise<void>}
   */
  async function sendTrackingEvent(eventData) {
    if (!validateTrackingData(eventData)) {
      console.error('[LinkTracking] Invalid tracking data:', eventData);
      return;
    }

    try {
      // Check for Google Analytics
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventData.event, {
          event_category: eventData.category,
          event_label: eventData.label,
          value: eventData.value,
          ...eventData.metadata,
        });
      }

      // Check for Google Tag Manager
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({
          event: eventData.event,
          eventCategory: eventData.category,
          eventLabel: eventData.label,
          eventValue: eventData.value,
          ...eventData.metadata,
        });
      }

      // Log to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[LinkTracking] Event tracked:', eventData);
      }

      // Update click counts
      const key = `${eventData.event}_${eventData.label}`;
      const count = (state.clickCounts.get(key) || 0) + 1;
      state.clickCounts.set(key, count);

    } catch (error) {
      console.error('[LinkTracking] Failed to send tracking event:', error);
      // Don't throw - tracking failures shouldn't break user experience
    }
  }

  /**
   * Send tracking event with retry logic
   * @param {Object} eventData - Event data to track
   * @param {number} retryCount - Current retry attempt
   * @returns {Promise<void>}
   */
  async function sendTrackingEventWithRetry(eventData, retryCount = 0) {
    try {
      await sendTrackingEvent(eventData);
    } catch (error) {
      if (retryCount < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendTrackingEventWithRetry(eventData, retryCount + 1);
      }
      console.error('[LinkTracking] Max retries reached for event:', eventData.event);
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handle app store badge click
   * @param {Event} event - Click event
   */
  function handleAppBadgeClick(event) {
    const target = event.currentTarget;
    const href = target.getAttribute('href');
    
    if (!href) {
      return;
    }

    const platform = extractPlatform(target);
    const location = extractLocation(target);
    const key = `app_badge_${platform}_${location}`;

    // Prevent duplicate tracking
    if (isDuplicateClick(key)) {
      return;
    }

    const eventData = {
      event: CONFIG.TRACKING_EVENTS.APP_STORE_CLICK,
      category: 'app_download',
      label: platform || 'unknown',
      value: 1,
      timestamp: Date.now(),
      metadata: {
        location,
        url: href,
        platform,
      },
    };

    // Send tracking asynchronously (non-blocking)
    sendTrackingEventWithRetry(eventData).catch(error => {
      console.error('[LinkTracking] App badge tracking failed:', error);
    });
  }

  /**
   * Handle social media link click
   * @param {Event} event - Click event
   */
  function handleSocialLinkClick(event) {
    const target = event.currentTarget;
    const href = target.getAttribute('href');
    
    if (!href) {
      return;
    }

    const network = extractSocialNetwork(target);
    const location = extractLocation(target);
    const key = `social_${network}_${location}`;

    // Prevent duplicate tracking
    if (isDuplicateClick(key)) {
      return;
    }

    const eventData = {
      event: CONFIG.TRACKING_EVENTS.SOCIAL_MEDIA_CLICK,
      category: 'social_engagement',
      label: network || 'unknown',
      value: 1,
      timestamp: Date.now(),
      metadata: {
        location,
        url: href,
        network,
      },
    };

    // Send tracking asynchronously (non-blocking)
    sendTrackingEventWithRetry(eventData).catch(error => {
      console.error('[LinkTracking] Social link tracking failed:', error);
    });
  }

  /**
   * Handle external link click
   * @param {Event} event - Click event
   */
  function handleExternalLinkClick(event) {
    const target = event.currentTarget;
    const href = target.getAttribute('href');
    
    if (!href || !href.startsWith('http')) {
      return;
    }

    // Skip if already tracked as app badge or social link
    if (target.matches(CONFIG.SELECTORS.APP_BADGE) || 
        target.matches(CONFIG.SELECTORS.SOCIAL_LINK)) {
      return;
    }

    const location = extractLocation(target);
    const key = `external_${href}_${location}`;

    // Prevent duplicate tracking
    if (isDuplicateClick(key)) {
      return;
    }

    const eventData = {
      event: CONFIG.TRACKING_EVENTS.EXTERNAL_LINK_CLICK,
      category: 'external_navigation',
      label: href,
      value: 1,
      timestamp: Date.now(),
      metadata: {
        location,
        url: href,
      },
    };

    // Send tracking asynchronously (non-blocking)
    sendTrackingEventWithRetry(eventData).catch(error => {
      console.error('[LinkTracking] External link tracking failed:', error);
    });
  }

  // ============================================
  // SECURITY ENHANCEMENTS
  // ============================================

  /**
   * Add security attributes to external links
   * @param {HTMLElement} link - Link element
   */
  function addSecurityAttributes(link) {
    const href = link.getAttribute('href');
    
    if (!href || !href.startsWith('http')) {
      return;
    }

    // Add security attributes for external links
    if (!link.hasAttribute('rel')) {
      link.setAttribute('rel', 'noopener noreferrer');
    } else {
      const rel = link.getAttribute('rel');
      const relValues = new Set(rel.split(/\s+/));
      relValues.add('noopener');
      relValues.add('noreferrer');
      link.setAttribute('rel', Array.from(relValues).join(' '));
    }

    // Add target="_blank" if not present
    if (!link.hasAttribute('target')) {
      link.setAttribute('target', '_blank');
    }
  }

  /**
   * Apply security attributes to all external links
   */
  function applySecurityAttributes() {
    try {
      const externalLinks = document.querySelectorAll(CONFIG.SELECTORS.EXTERNAL_LINK);
      externalLinks.forEach(link => {
        addSecurityAttributes(link);
      });
    } catch (error) {
      console.error('[LinkTracking] Failed to apply security attributes:', error);
    }
  }

  // ============================================
  // EVENT DELEGATION
  // ============================================

  /**
   * Set up event delegation for link tracking
   */
  function setupEventDelegation() {
    // Use event delegation on document for better performance
    const debouncedAppBadgeHandler = debounce(handleAppBadgeClick, 100);
    const debouncedSocialHandler = debounce(handleSocialLinkClick, 100);
    const debouncedExternalHandler = debounce(handleExternalLinkClick, 100);

    document.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      
      if (!target) {
        return;
      }

      // Check if it's an app badge
      if (target.matches(CONFIG.SELECTORS.APP_BADGE)) {
        debouncedAppBadgeHandler.call(target, event);
        return;
      }

      // Check if it's a social link
      if (target.matches(CONFIG.SELECTORS.SOCIAL_LINK)) {
        debouncedSocialHandler.call(target, event);
        return;
      }

      // Check if it's an external link
      if (target.matches(CONFIG.SELECTORS.EXTERNAL_LINK)) {
        debouncedExternalHandler.call(target, event);
      }
    }, { passive: true });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize link tracking
   */
  function init() {
    if (state.initialized) {
      console.warn('[LinkTracking] Already initialized');
      return;
    }

    try {
      // Apply security attributes to external links
      applySecurityAttributes();

      // Set up event delegation
      setupEventDelegation();

      state.initialized = true;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[LinkTracking] Initialized successfully');
      }
    } catch (error) {
      console.error('[LinkTracking] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Clean up event listeners and state
   */
  function destroy() {
    if (!state.initialized) {
      return;
    }

    try {
      // Clear state
      state.listeners.clear();
      state.clickCounts.clear();
      state.lastClickTime.clear();
      state.initialized = false;

      if (process.env.NODE_ENV !== 'production') {
        console.log('[LinkTracking] Destroyed successfully');
      }
    } catch (error) {
      console.error('[LinkTracking] Cleanup failed:', error);
    }
  }

  /**
   * Get tracking statistics
   * @returns {Object} Tracking statistics
   */
  function getStats() {
    return {
      initialized: state.initialized,
      totalClicks: Array.from(state.clickCounts.values()).reduce((sum, count) => sum + count, 0),
      clicksByType: Object.fromEntries(state.clickCounts),
    };
  }

  // ============================================
  // AUTO-INITIALIZATION
  // ============================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded
    init();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.LinkTracking = Object.freeze({
    init,
    destroy,
    getStats,
  });

})();