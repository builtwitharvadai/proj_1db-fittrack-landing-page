/**
 * Testimonials Carousel Component
 * 
 * Production-ready carousel with auto-play, touch gestures, keyboard navigation,
 * and comprehensive accessibility features.
 * 
 * @module TestimonialsCarousel
 * @version 1.0.0
 */

/**
 * Testimonials Carousel Class
 * Manages carousel state, navigation, auto-play, and user interactions
 */
class TestimonialsCarousel {
  /**
   * @param {HTMLElement} container - Carousel container element
   * @param {Object} options - Configuration options
   */
  constructor(container, options = {}) {
    // Validate container
    if (!container || !(container instanceof HTMLElement)) {
      throw new TypeError('Container must be a valid HTMLElement');
    }

    // Configuration with defaults
    this.config = {
      autoPlayInterval: options.autoPlayInterval || 5000,
      autoPlayEnabled: options.autoPlayEnabled !== false,
      transitionDuration: options.transitionDuration || 500,
      swipeThreshold: options.swipeThreshold || 50,
      pauseOnHover: options.pauseOnHover !== false,
      pauseOnFocus: options.pauseOnFocus !== false,
      enableKeyboard: options.enableKeyboard !== false,
      enableTouch: options.enableTouch !== false,
      loop: options.loop !== false,
      ...options
    };

    // DOM elements
    this.container = container;
    this.track = null;
    this.slides = [];
    this.prevButton = null;
    this.nextButton = null;
    this.dots = [];
    this.playPauseButton = null;

    // State management
    this.state = {
      currentIndex: 0,
      isPlaying: this.config.autoPlayEnabled,
      isDragging: false,
      isTransitioning: false,
      startX: 0,
      currentX: 0,
      translateX: 0,
      autoPlayTimer: null,
      resizeObserver: null,
      intersectionObserver: null
    };

    // Bound methods for event listeners
    this.boundHandlers = {
      handlePrevClick: this.handlePrevClick.bind(this),
      handleNextClick: this.handleNextClick.bind(this),
      handleDotClick: this.handleDotClick.bind(this),
      handlePlayPauseClick: this.handlePlayPauseClick.bind(this),
      handleKeyDown: this.handleKeyDown.bind(this),
      handleTouchStart: this.handleTouchStart.bind(this),
      handleTouchMove: this.handleTouchMove.bind(this),
      handleTouchEnd: this.handleTouchEnd.bind(this),
      handleMouseEnter: this.handleMouseEnter.bind(this),
      handleMouseLeave: this.handleMouseLeave.bind(this),
      handleFocus: this.handleFocus.bind(this),
      handleBlur: this.handleBlur.bind(this),
      handleTransitionEnd: this.handleTransitionEnd.bind(this),
      handleVisibilityChange: this.handleVisibilityChange.bind(this)
    };

    // Initialize carousel
    this.init();
  }

  /**
   * Initialize carousel components and event listeners
   */
  init() {
    try {
      this.findElements();
      this.validateElements();
      this.setupAccessibility();
      this.attachEventListeners();
      this.setupObservers();
      this.updateUI();
      
      if (this.state.isPlaying) {
        this.startAutoPlay();
      }

      this.logInfo('Carousel initialized successfully', {
        slideCount: this.slides.length,
        autoPlay: this.state.isPlaying
      });
    } catch (error) {
      this.logError('Failed to initialize carousel', error);
      throw error;
    }
  }

  /**
   * Find and cache DOM elements
   */
  findElements() {
    this.track = this.container.querySelector('.testimonials-carousel__track');
    this.slides = Array.from(this.container.querySelectorAll('.testimonials-carousel__slide'));
    this.prevButton = this.container.querySelector('.testimonials-carousel__nav--prev');
    this.nextButton = this.container.querySelector('.testimonials-carousel__nav--next');
    this.playPauseButton = this.container.querySelector('.testimonials-carousel__play-pause');
    
    const dotsContainer = this.container.querySelector('.testimonials-carousel__dots');
    if (dotsContainer) {
      this.dots = Array.from(dotsContainer.querySelectorAll('.testimonials-carousel__dot'));
    }
  }

  /**
   * Validate required elements exist
   */
  validateElements() {
    if (!this.track) {
      throw new Error('Carousel track element not found');
    }

    if (this.slides.length === 0) {
      throw new Error('No carousel slides found');
    }

    if (!this.prevButton || !this.nextButton) {
      this.logWarning('Navigation buttons not found');
    }

    if (this.dots.length === 0) {
      this.logWarning('Dot indicators not found');
    }
  }

  /**
   * Setup ARIA attributes and accessibility features
   */
  setupAccessibility() {
    // Container attributes
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Testimonials carousel');
    this.container.setAttribute('aria-roledescription', 'carousel');

    // Track attributes
    this.track.setAttribute('role', 'list');

    // Slide attributes
    this.slides.forEach((slide, index) => {
      slide.setAttribute('role', 'listitem');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `Testimonial ${index + 1} of ${this.slides.length}`);
      
      if (index === this.state.currentIndex) {
        slide.classList.add('is-active');
        slide.setAttribute('aria-current', 'true');
      } else {
        slide.removeAttribute('aria-current');
      }
    });

    // Button attributes
    if (this.prevButton) {
      this.prevButton.setAttribute('aria-label', 'Previous testimonial');
      this.prevButton.setAttribute('aria-controls', this.track.id || 'carousel-track');
    }

    if (this.nextButton) {
      this.nextButton.setAttribute('aria-label', 'Next testimonial');
      this.nextButton.setAttribute('aria-controls', this.track.id || 'carousel-track');
    }

    if (this.playPauseButton) {
      this.updatePlayPauseButton();
    }

    // Dot attributes
    this.dots.forEach((dot, index) => {
      dot.setAttribute('role', 'button');
      dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
      dot.setAttribute('aria-controls', this.track.id || 'carousel-track');
    });
  }

  /**
   * Attach all event listeners
   */
  attachEventListeners() {
    // Navigation buttons
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.boundHandlers.handlePrevClick);
    }

    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.boundHandlers.handleNextClick);
    }

    // Dot indicators
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => this.boundHandlers.handleDotClick(index));
    });

    // Play/pause button
    if (this.playPauseButton) {
      this.playPauseButton.addEventListener('click', this.boundHandlers.handlePlayPauseClick);
    }

    // Keyboard navigation
    if (this.config.enableKeyboard) {
      this.container.addEventListener('keydown', this.boundHandlers.handleKeyDown);
    }

    // Touch events
    if (this.config.enableTouch) {
      this.track.addEventListener('touchstart', this.boundHandlers.handleTouchStart, { passive: true });
      this.track.addEventListener('touchmove', this.boundHandlers.handleTouchMove, { passive: false });
      this.track.addEventListener('touchend', this.boundHandlers.handleTouchEnd);
    }

    // Hover events
    if (this.config.pauseOnHover) {
      this.container.addEventListener('mouseenter', this.boundHandlers.handleMouseEnter);
      this.container.addEventListener('mouseleave', this.boundHandlers.handleMouseLeave);
    }

    // Focus events
    if (this.config.pauseOnFocus) {
      this.container.addEventListener('focusin', this.boundHandlers.handleFocus);
      this.container.addEventListener('focusout', this.boundHandlers.handleBlur);
    }

    // Transition end
    this.track.addEventListener('transitionend', this.boundHandlers.handleTransitionEnd);

    // Visibility change
    document.addEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);
  }

  /**
   * Setup observers for responsive behavior and performance
   */
  setupObservers() {
    // Intersection Observer for auto-play when visible
    if ('IntersectionObserver' in window) {
      this.state.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && this.state.isPlaying) {
              this.startAutoPlay();
            } else {
              this.stopAutoPlay();
            }
          });
        },
        { threshold: 0.5 }
      );

      this.state.intersectionObserver.observe(this.container);
    }

    // Resize Observer for responsive updates
    if ('ResizeObserver' in window) {
      this.state.resizeObserver = new ResizeObserver(() => {
        this.updateSlidePosition(false);
      });

      this.state.resizeObserver.observe(this.container);
    }
  }

  /**
   * Handle previous button click
   */
  handlePrevClick() {
    this.goToPrevious();
    this.resetAutoPlay();
  }

  /**
   * Handle next button click
   */
  handleNextClick() {
    this.goToNext();
    this.resetAutoPlay();
  }

  /**
   * Handle dot indicator click
   * @param {number} index - Target slide index
   */
  handleDotClick(index) {
    this.goToSlide(index);
    this.resetAutoPlay();
  }

  /**
   * Handle play/pause button click
   */
  handlePlayPauseClick() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    const { key } = event;

    switch (key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.goToPrevious();
        this.resetAutoPlay();
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.goToNext();
        this.resetAutoPlay();
        break;

      case 'Home':
        event.preventDefault();
        this.goToSlide(0);
        this.resetAutoPlay();
        break;

      case 'End':
        event.preventDefault();
        this.goToSlide(this.slides.length - 1);
        this.resetAutoPlay();
        break;

      case ' ':
        if (event.target === this.container || this.container.contains(event.target)) {
          event.preventDefault();
          this.handlePlayPauseClick();
        }
        break;

      default:
        break;
    }
  }

  /**
   * Handle touch start
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    if (this.state.isTransitioning) {
      return;
    }

    this.state.isDragging = true;
    this.state.startX = event.touches[0].clientX;
    this.state.currentX = this.state.startX;

    this.track.classList.add('is-dragging');
    this.stopAutoPlay();
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(event) {
    if (!this.state.isDragging) {
      return;
    }

    this.state.currentX = event.touches[0].clientX;
    const deltaX = this.state.currentX - this.state.startX;

    // Prevent default to stop scrolling while swiping
    if (Math.abs(deltaX) > 10) {
      event.preventDefault();
    }

    // Update visual feedback
    const slideWidth = this.slides[0].offsetWidth;
    const currentTranslate = -(this.state.currentIndex * slideWidth);
    this.state.translateX = currentTranslate + deltaX;

    this.track.style.transform = `translateX(${this.state.translateX}px)`;
  }

  /**
   * Handle touch end
   */
  handleTouchEnd() {
    if (!this.state.isDragging) {
      return;
    }

    this.state.isDragging = false;
    this.track.classList.remove('is-dragging');

    const deltaX = this.state.currentX - this.state.startX;
    const threshold = this.config.swipeThreshold;

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        this.goToPrevious();
      } else {
        this.goToNext();
      }
    } else {
      // Snap back to current slide
      this.updateSlidePosition(true);
    }

    this.resetAutoPlay();
  }

  /**
   * Handle mouse enter (pause on hover)
   */
  handleMouseEnter() {
    if (this.config.pauseOnHover && this.state.isPlaying) {
      this.stopAutoPlay();
    }
  }

  /**
   * Handle mouse leave (resume auto-play)
   */
  handleMouseLeave() {
    if (this.config.pauseOnHover && this.state.isPlaying) {
      this.startAutoPlay();
    }
  }

  /**
   * Handle focus (pause on focus)
   */
  handleFocus() {
    if (this.config.pauseOnFocus && this.state.isPlaying) {
      this.stopAutoPlay();
    }
  }

  /**
   * Handle blur (resume auto-play)
   */
  handleBlur() {
    if (this.config.pauseOnFocus && this.state.isPlaying && !this.container.contains(document.activeElement)) {
      this.startAutoPlay();
    }
  }

  /**
   * Handle transition end
   */
  handleTransitionEnd() {
    this.state.isTransitioning = false;
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.stopAutoPlay();
    } else if (this.state.isPlaying) {
      this.startAutoPlay();
    }
  }

  /**
   * Navigate to previous slide
   */
  goToPrevious() {
    if (this.state.isTransitioning) {
      return;
    }

    let newIndex = this.state.currentIndex - 1;

    if (newIndex < 0) {
      newIndex = this.config.loop ? this.slides.length - 1 : 0;
    }

    this.goToSlide(newIndex);
  }

  /**
   * Navigate to next slide
   */
  goToNext() {
    if (this.state.isTransitioning) {
      return;
    }

    let newIndex = this.state.currentIndex + 1;

    if (newIndex >= this.slides.length) {
      newIndex = this.config.loop ? 0 : this.slides.length - 1;
    }

    this.goToSlide(newIndex);
  }

  /**
   * Navigate to specific slide
   * @param {number} index - Target slide index
   */
  goToSlide(index) {
    if (index === this.state.currentIndex || this.state.isTransitioning) {
      return;
    }

    if (index < 0 || index >= this.slides.length) {
      this.logWarning('Invalid slide index', { index, max: this.slides.length - 1 });
      return;
    }

    this.state.currentIndex = index;
    this.state.isTransitioning = true;

    this.updateSlidePosition(true);
    this.updateUI();

    this.logInfo('Navigated to slide', { index });
  }

  /**
   * Update slide position with transform
   * @param {boolean} animate - Whether to animate the transition
   */
  updateSlidePosition(animate) {
    const slideWidth = this.slides[0].offsetWidth;
    const translateX = -(this.state.currentIndex * slideWidth);

    if (animate) {
      this.track.style.transition = `transform ${this.config.transitionDuration}ms ease-in-out`;
    } else {
      this.track.style.transition = 'none';
    }

    this.track.style.transform = `translateX(${translateX}px)`;

    if (!animate) {
      this.state.isTransitioning = false;
    }
  }

  /**
   * Update UI elements (buttons, dots, ARIA)
   */
  updateUI() {
    // Update slides
    this.slides.forEach((slide, index) => {
      if (index === this.state.currentIndex) {
        slide.classList.add('is-active');
        slide.setAttribute('aria-current', 'true');
      } else {
        slide.classList.remove('is-active');
        slide.removeAttribute('aria-current');
      }
    });

    // Update navigation buttons
    if (this.prevButton) {
      if (this.config.loop || this.state.currentIndex > 0) {
        this.prevButton.disabled = false;
        this.prevButton.removeAttribute('aria-disabled');
      } else {
        this.prevButton.disabled = true;
        this.prevButton.setAttribute('aria-disabled', 'true');
      }
    }

    if (this.nextButton) {
      if (this.config.loop || this.state.currentIndex < this.slides.length - 1) {
        this.nextButton.disabled = false;
        this.nextButton.removeAttribute('aria-disabled');
      } else {
        this.nextButton.disabled = true;
        this.nextButton.setAttribute('aria-disabled', 'true');
      }
    }

    // Update dots
    this.dots.forEach((dot, index) => {
      if (index === this.state.currentIndex) {
        dot.classList.add('is-active');
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.classList.remove('is-active');
        dot.removeAttribute('aria-current');
      }
    });

    // Update live region for screen readers
    this.announceSlideChange();
  }

  /**
   * Announce slide change to screen readers
   */
  announceSlideChange() {
    const liveRegion = this.container.querySelector('[aria-live]') || this.createLiveRegion();
    liveRegion.textContent = `Showing testimonial ${this.state.currentIndex + 1} of ${this.slides.length}`;
  }

  /**
   * Create live region for screen reader announcements
   * @returns {HTMLElement} Live region element
   */
  createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0;';
    this.container.appendChild(liveRegion);
    return liveRegion;
  }

  /**
   * Start auto-play
   */
  startAutoPlay() {
    if (!this.config.autoPlayEnabled || this.state.autoPlayTimer) {
      return;
    }

    this.state.autoPlayTimer = setInterval(() => {
      this.goToNext();
    }, this.config.autoPlayInterval);

    this.logInfo('Auto-play started');
  }

  /**
   * Stop auto-play
   */
  stopAutoPlay() {
    if (this.state.autoPlayTimer) {
      clearInterval(this.state.autoPlayTimer);
      this.state.autoPlayTimer = null;
      this.logInfo('Auto-play stopped');
    }
  }

  /**
   * Reset auto-play timer
   */
  resetAutoPlay() {
    if (this.state.isPlaying) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  /**
   * Play carousel
   */
  play() {
    this.state.isPlaying = true;
    this.startAutoPlay();
    this.updatePlayPauseButton();
    this.logInfo('Carousel playing');
  }

  /**
   * Pause carousel
   */
  pause() {
    this.state.isPlaying = false;
    this.stopAutoPlay();
    this.updatePlayPauseButton();
    this.logInfo('Carousel paused');
  }

  /**
   * Update play/pause button state
   */
  updatePlayPauseButton() {
    if (!this.playPauseButton) {
      return;
    }

    const isPlaying = this.state.isPlaying;
    const label = isPlaying ? 'Pause auto-play' : 'Start auto-play';
    const icon = isPlaying ? 'pause' : 'play';

    this.playPauseButton.setAttribute('aria-label', label);
    this.playPauseButton.setAttribute('data-state', icon);

    // Update icon if using SVG
    const svg = this.playPauseButton.querySelector('svg use');
    if (svg) {
      svg.setAttribute('href', `#icon-${icon}`);
    }
  }

  /**
   * Destroy carousel and cleanup
   */
  destroy() {
    try {
      // Stop auto-play
      this.stopAutoPlay();

      // Remove event listeners
      if (this.prevButton) {
        this.prevButton.removeEventListener('click', this.boundHandlers.handlePrevClick);
      }

      if (this.nextButton) {
        this.nextButton.removeEventListener('click', this.boundHandlers.handleNextClick);
      }

      this.dots.forEach((dot, index) => {
        dot.removeEventListener('click', () => this.boundHandlers.handleDotClick(index));
      });

      if (this.playPauseButton) {
        this.playPauseButton.removeEventListener('click', this.boundHandlers.handlePlayPauseClick);
      }

      this.container.removeEventListener('keydown', this.boundHandlers.handleKeyDown);
      this.track.removeEventListener('touchstart', this.boundHandlers.handleTouchStart);
      this.track.removeEventListener('touchmove', this.boundHandlers.handleTouchMove);
      this.track.removeEventListener('touchend', this.boundHandlers.handleTouchEnd);
      this.container.removeEventListener('mouseenter', this.boundHandlers.handleMouseEnter);
      this.container.removeEventListener('mouseleave', this.boundHandlers.handleMouseLeave);
      this.container.removeEventListener('focusin', this.boundHandlers.handleFocus);
      this.container.removeEventListener('focusout', this.boundHandlers.handleBlur);
      this.track.removeEventListener('transitionend', this.boundHandlers.handleTransitionEnd);
      document.removeEventListener('visibilitychange', this.boundHandlers.handleVisibilityChange);

      // Disconnect observers
      if (this.state.intersectionObserver) {
        this.state.intersectionObserver.disconnect();
        this.state.intersectionObserver = null;
      }

      if (this.state.resizeObserver) {
        this.state.resizeObserver.disconnect();
        this.state.resizeObserver = null;
      }

      // Clear references
      this.container = null;
      this.track = null;
      this.slides = [];
      this.prevButton = null;
      this.nextButton = null;
      this.dots = [];
      this.playPauseButton = null;

      this.logInfo('Carousel destroyed successfully');
    } catch (error) {
      this.logError('Error destroying carousel', error);
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[TestimonialsCarousel] ${message}`, context);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  logWarning(message, context = {}) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[TestimonialsCarousel] ${message}`, context);
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  logError(message, error) {
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[TestimonialsCarousel] ${message}`, error);
    }
  }
}

/**
 * Initialize all carousels on the page
 */
function initTestimonialsCarousels() {
  const carousels = document.querySelectorAll('.testimonials-carousel');
  const instances = [];

  carousels.forEach((container) => {
    try {
      const carousel = new TestimonialsCarousel(container, {
        autoPlayInterval: 5000,
        autoPlayEnabled: true,
        transitionDuration: 500,
        swipeThreshold: 50,
        pauseOnHover: true,
        pauseOnFocus: true,
        enableKeyboard: true,
        enableTouch: true,
        loop: true
      });

      instances.push(carousel);
    } catch (error) {
      console.error('[TestimonialsCarousel] Failed to initialize carousel', error);
    }
  });

  return instances;
}

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTestimonialsCarousels);
  } else {
    initTestimonialsCarousels();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestimonialsCarousel, initTestimonialsCarousels };
}