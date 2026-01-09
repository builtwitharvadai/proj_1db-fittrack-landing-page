/**
 * Navigation Module - Mobile-First Responsive Navigation
 * 
 * Implements hamburger menu, smooth scroll, keyboard navigation,
 * and accessibility features for the FitTrack landing page.
 * 
 * @module navigation
 * @requires DOM API
 */

(function () {
  'use strict';

  // ============================================
  // CONSTANTS AND CONFIGURATION
  // ============================================

  const SELECTORS = Object.freeze({
    HEADER: '.header',
    NAV_TOGGLE: '.nav__toggle',
    NAV_MENU: '.nav__menu',
    NAV_OVERLAY: '.nav__overlay',
    NAV_LINKS: '.nav__link',
    NAV_LIST: '.nav__list',
  });

  const ARIA_ATTRIBUTES = Object.freeze({
    EXPANDED: 'aria-expanded',
    HIDDEN: 'aria-hidden',
    LABEL: 'aria-label',
  });

  const DATA_ATTRIBUTES = Object.freeze({
    VISIBLE: 'data-visible',
  });

  const CLASSES = Object.freeze({
    SCROLLED: 'scrolled',
    ACTIVE: 'active',
  });

  const KEYS = Object.freeze({
    ESCAPE: 'Escape',
    TAB: 'Tab',
  });

  const SCROLL_CONFIG = Object.freeze({
    BEHAVIOR: 'smooth',
    BLOCK: 'start',
    INLINE: 'nearest',
    OFFSET: 80, // Header height offset
    THROTTLE_DELAY: 100,
  });

  const ANIMATION_CONFIG = Object.freeze({
    MENU_TRANSITION_DURATION: 300,
    SCROLL_THRESHOLD: 50,
  });

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const state = {
    isMenuOpen: false,
    lastScrollPosition: 0,
    activeSection: null,
    focusableElements: [],
    lastFocusedElement: null,
    isReducedMotion: false,
  };

  // ============================================
  // DOM ELEMENT REFERENCES
  // ============================================

  let elements = {
    header: null,
    navToggle: null,
    navMenu: null,
    navOverlay: null,
    navLinks: null,
    sections: null,
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  function throttle(func, delay) {
    let timeoutId = null;
    let lastExecTime = 0;

    return function throttled(...args) {
      const currentTime = Date.now();
      const timeSinceLastExec = currentTime - lastExecTime;

      const execute = () => {
        lastExecTime = currentTime;
        func.apply(this, args);
      };

      if (timeSinceLastExec >= delay) {
        execute();
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(execute, delay - timeSinceLastExec);
      }
    };
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean} True if reduced motion is preferred
   */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement[]} Array of focusable elements
   */
  function getFocusableElements(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  /**
   * Trap focus within a container
   * @param {KeyboardEvent} event - Keyboard event
   * @param {HTMLElement[]} focusableElements - Array of focusable elements
   */
  function trapFocus(event, focusableElements) {
    if (event.key !== KEYS.TAB || focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Log navigation events for observability
   * @param {string} action - Action name
   * @param {Object} context - Additional context
   */
  function logNavigationEvent(action, context = {}) {
    if (typeof console !== 'undefined' && console.log) {
      const timestamp = new Date().toISOString();
      console.log(`[Navigation] ${timestamp} - ${action}`, context);
    }
  }

  // ============================================
  // MOBILE MENU FUNCTIONALITY
  // ============================================

  /**
   * Open mobile navigation menu
   */
  function openMenu() {
    if (state.isMenuOpen) {
      return;
    }

    state.isMenuOpen = true;
    state.lastFocusedElement = document.activeElement;

    // Update ARIA attributes
    elements.navToggle.setAttribute(ARIA_ATTRIBUTES.EXPANDED, 'true');
    elements.navMenu.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'false');
    elements.navOverlay.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'false');

    // Update data attributes for CSS transitions
    elements.navMenu.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'true');
    elements.navOverlay.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'true');

    // Prevent body scroll on mobile
    document.body.style.overflow = 'hidden';

    // Get focusable elements and focus first link
    state.focusableElements = getFocusableElements(elements.navMenu);
    if (state.focusableElements.length > 0) {
      setTimeout(() => {
        state.focusableElements[0].focus();
      }, ANIMATION_CONFIG.MENU_TRANSITION_DURATION);
    }

    logNavigationEvent('Menu opened', { method: 'toggle' });
  }

  /**
   * Close mobile navigation menu
   */
  function closeMenu() {
    if (!state.isMenuOpen) {
      return;
    }

    state.isMenuOpen = false;

    // Update ARIA attributes
    elements.navToggle.setAttribute(ARIA_ATTRIBUTES.EXPANDED, 'false');
    elements.navMenu.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'true');
    elements.navOverlay.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'true');

    // Update data attributes for CSS transitions
    elements.navMenu.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'false');
    elements.navOverlay.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'false');

    // Restore body scroll
    document.body.style.overflow = '';

    // Restore focus to toggle button
    if (state.lastFocusedElement && state.lastFocusedElement.focus) {
      state.lastFocusedElement.focus();
    }

    state.focusableElements = [];

    logNavigationEvent('Menu closed');
  }

  /**
   * Toggle mobile navigation menu
   */
  function toggleMenu() {
    if (state.isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /**
   * Handle menu toggle click
   * @param {Event} event - Click event
   */
  function handleToggleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu();
  }

  /**
   * Handle overlay click to close menu
   * @param {Event} event - Click event
   */
  function handleOverlayClick(event) {
    event.preventDefault();
    closeMenu();
  }

  // ============================================
  // SMOOTH SCROLL FUNCTIONALITY
  // ============================================

  /**
   * Smooth scroll to target element
   * @param {HTMLElement} target - Target element to scroll to
   * @param {Object} options - Scroll options
   */
  function smoothScrollTo(target, options = {}) {
    if (!target) {
      return;
    }

    const scrollOptions = {
      behavior: state.isReducedMotion ? 'auto' : SCROLL_CONFIG.BEHAVIOR,
      block: SCROLL_CONFIG.BLOCK,
      inline: SCROLL_CONFIG.INLINE,
      ...options,
    };

    // Calculate position with offset for fixed header
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = targetPosition - SCROLL_CONFIG.OFFSET;

    try {
      window.scrollTo({
        top: offsetPosition,
        behavior: scrollOptions.behavior,
      });
    } catch (error) {
      // Fallback for browsers that don't support smooth scroll
      window.scrollTo(0, offsetPosition);
      logNavigationEvent('Smooth scroll fallback used', { error: error.message });
    }
  }

  /**
   * Handle navigation link click
   * @param {Event} event - Click event
   */
  function handleNavLinkClick(event) {
    const link = event.currentTarget;
    const href = link.getAttribute('href');

    // Only handle internal anchor links
    if (!href || !href.startsWith('#')) {
      return;
    }

    event.preventDefault();

    const targetId = href.substring(1);
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      logNavigationEvent('Target element not found', { targetId });
      return;
    }

    // Close mobile menu if open
    if (state.isMenuOpen) {
      closeMenu();
    }

    // Smooth scroll to target
    smoothScrollTo(targetElement);

    // Update active state
    updateActiveNavLink(link);

    // Update URL hash without jumping
    if (history.pushState) {
      history.pushState(null, null, href);
    } else {
      window.location.hash = href;
    }

    logNavigationEvent('Navigation link clicked', { targetId, href });
  }

  /**
   * Update active navigation link
   * @param {HTMLElement} activeLink - Active link element
   */
  function updateActiveNavLink(activeLink) {
    elements.navLinks.forEach((link) => {
      link.classList.remove(CLASSES.ACTIVE);
      link.setAttribute(ARIA_ATTRIBUTES.LABEL, link.textContent);
    });

    if (activeLink) {
      activeLink.classList.add(CLASSES.ACTIVE);
      activeLink.setAttribute(
        ARIA_ATTRIBUTES.LABEL,
        `${activeLink.textContent} (current section)`
      );
    }
  }

  // ============================================
  // SCROLL POSITION TRACKING
  // ============================================

  /**
   * Get current section based on scroll position
   * @returns {HTMLElement|null} Current section element
   */
  function getCurrentSection() {
    const scrollPosition = window.pageYOffset + SCROLL_CONFIG.OFFSET + 100;

    for (let i = elements.sections.length - 1; i >= 0; i--) {
      const section = elements.sections[i];
      const sectionTop = section.offsetTop;

      if (scrollPosition >= sectionTop) {
        return section;
      }
    }

    return elements.sections[0] || null;
  }

  /**
   * Update active navigation based on scroll position
   */
  function updateActiveNavOnScroll() {
    const currentSection = getCurrentSection();

    if (currentSection && currentSection !== state.activeSection) {
      state.activeSection = currentSection;
      const sectionId = currentSection.getAttribute('id');

      if (sectionId) {
        const activeLink = Array.from(elements.navLinks).find(
          (link) => link.getAttribute('href') === `#${sectionId}`
        );

        if (activeLink) {
          updateActiveNavLink(activeLink);
        }
      }
    }
  }

  /**
   * Handle scroll events
   */
  function handleScroll() {
    const currentScrollPosition = window.pageYOffset;

    // Add scrolled class to header
    if (currentScrollPosition > ANIMATION_CONFIG.SCROLL_THRESHOLD) {
      elements.header.classList.add(CLASSES.SCROLLED);
    } else {
      elements.header.classList.remove(CLASSES.SCROLLED);
    }

    // Update active navigation
    updateActiveNavOnScroll();

    state.lastScrollPosition = currentScrollPosition;
  }

  // ============================================
  // KEYBOARD NAVIGATION
  // ============================================

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeyDown(event) {
    // Close menu on Escape key
    if (event.key === KEYS.ESCAPE && state.isMenuOpen) {
      event.preventDefault();
      closeMenu();
      logNavigationEvent('Menu closed via Escape key');
      return;
    }

    // Trap focus within menu when open
    if (state.isMenuOpen && event.key === KEYS.TAB) {
      trapFocus(event, state.focusableElements);
    }
  }

  // ============================================
  // RESIZE HANDLER
  // ============================================

  /**
   * Handle window resize
   */
  function handleResize() {
    // Close mobile menu on desktop breakpoint
    if (window.innerWidth >= 1024 && state.isMenuOpen) {
      closeMenu();
      logNavigationEvent('Menu closed due to resize to desktop');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Cache DOM elements
   * @returns {boolean} True if all required elements found
   */
  function cacheElements() {
    try {
      elements.header = document.querySelector(SELECTORS.HEADER);
      elements.navToggle = document.querySelector(SELECTORS.NAV_TOGGLE);
      elements.navMenu = document.querySelector(SELECTORS.NAV_MENU);
      elements.navOverlay = document.querySelector(SELECTORS.NAV_OVERLAY);
      elements.navLinks = document.querySelectorAll(SELECTORS.NAV_LINKS);

      // Get all sections with IDs for scroll tracking
      elements.sections = Array.from(document.querySelectorAll('section[id]'));

      // Validate required elements
      const requiredElements = [
        'header',
        'navToggle',
        'navMenu',
        'navOverlay',
      ];

      for (const elementName of requiredElements) {
        if (!elements[elementName]) {
          throw new Error(`Required element not found: ${elementName}`);
        }
      }

      return true;
    } catch (error) {
      logNavigationEvent('Error caching elements', { error: error.message });
      return false;
    }
  }

  /**
   * Initialize ARIA attributes
   */
  function initializeAriaAttributes() {
    elements.navToggle.setAttribute(ARIA_ATTRIBUTES.EXPANDED, 'false');
    elements.navToggle.setAttribute(
      ARIA_ATTRIBUTES.LABEL,
      'Toggle navigation menu'
    );

    elements.navMenu.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'true');
    elements.navOverlay.setAttribute(ARIA_ATTRIBUTES.HIDDEN, 'true');

    elements.navMenu.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'false');
    elements.navOverlay.setAttribute(DATA_ATTRIBUTES.VISIBLE, 'false');
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Mobile menu toggle
    elements.navToggle.addEventListener('click', handleToggleClick);

    // Overlay click to close menu
    elements.navOverlay.addEventListener('click', handleOverlayClick);

    // Navigation links
    elements.navLinks.forEach((link) => {
      link.addEventListener('click', handleNavLinkClick);
    });

    // Scroll events (throttled)
    const throttledScroll = throttle(handleScroll, SCROLL_CONFIG.THROTTLE_DELAY);
    window.addEventListener('scroll', throttledScroll, { passive: true });

    // Keyboard events
    document.addEventListener('keydown', handleKeyDown);

    // Resize events (throttled)
    const throttledResize = throttle(handleResize, 200);
    window.addEventListener('resize', throttledResize);

    // Reduced motion preference change
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionMediaQuery.addEventListener('change', (event) => {
      state.isReducedMotion = event.matches;
      logNavigationEvent('Reduced motion preference changed', {
        reducedMotion: state.isReducedMotion,
      });
    });
  }

  /**
   * Initialize navigation on page load
   */
  function initializeNavigation() {
    try {
      // Check for reduced motion preference
      state.isReducedMotion = prefersReducedMotion();

      // Cache DOM elements
      if (!cacheElements()) {
        throw new Error('Failed to cache required DOM elements');
      }

      // Initialize ARIA attributes
      initializeAriaAttributes();

      // Attach event listeners
      attachEventListeners();

      // Set initial active nav link based on URL hash
      const urlHash = window.location.hash;
      if (urlHash) {
        const targetElement = document.querySelector(urlHash);
        if (targetElement) {
          const activeLink = Array.from(elements.navLinks).find(
            (link) => link.getAttribute('href') === urlHash
          );
          if (activeLink) {
            updateActiveNavLink(activeLink);
          }
        }
      }

      // Initial scroll position check
      handleScroll();

      logNavigationEvent('Navigation initialized successfully', {
        reducedMotion: state.isReducedMotion,
        sectionsCount: elements.sections.length,
        linksCount: elements.navLinks.length,
      });
    } catch (error) {
      logNavigationEvent('Navigation initialization failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // ============================================
  // AUTO-INITIALIZATION
  // ============================================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
  } else {
    initializeNavigation();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (state.isMenuOpen) {
      document.body.style.overflow = '';
    }
  });
})();