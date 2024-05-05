/* JS for preset "Menu V2" */
(function() {
	$(function() {
		$('.menu-wrapper').each(function() {
			initMenu($(this))
		});
	});

	// Make :active pseudo classes work on iOS
	document.addEventListener("touchstart", function() {}, false);

	var initMenu = function($menuWrapper) {
		var $body = $('body');
		var $menu = $('.ed-menu', $menuWrapper);
		var $menuLinks = $('a', $menu);
		var $menuTrigger = $('.menu-trigger', $menuWrapper);
		var $banner = $('.banner').first();

		var menuWrapperHeight = $menuWrapper.outerHeight();
		var bannerHeight = $banner.length ? $banner.outerHeight() : 0;
		var smoothScrollOffset = 20;
		
		toggleClassOnClick($body.add($menu), $menuTrigger, null, 'open open-menu'); // Keep open on $menu for backward compatibility
		activateSmoothScroll($menuLinks.add($('.scroll a')), smoothScrollOffset);
		addClassOnVisibleLinkTargets($menuLinks, 'active', 2 / 3);
		handleSticky($menuWrapper, 'sticky', $banner);
	};

	/**
	 * Observe element's height changes and reload the initMenu() function
	 *
	 * @param {HTMLElement} elm Element to observe
	 * @param {function} callback to call when elmement's height changed
	 */
	var observeHeightChange = function(elm, callback) {
		if (!('ResizeObserver' in window) || elm == null) return;

		var ro = new ResizeObserver(callback);
		ro.observe(elm);
	}

	/**
	 * Toggles class on a target when a trigger is clicked
	 * 
	 * @param {jQuery} $target The target to apply the CSS class to
	 * @param {jQuery} $trigger The Trigger
	 * @param {jQuery} $closeTrigger Optional close trigger
	 * @param {string} cssClass CSS Class to toggle on the target
	 */
	var toggleClassOnClick = function($target, $trigger, $closeTrigger, cssClass) {

		// Reset in case class "open" was saved accidentally
		$target.removeClass(cssClass);
		$trigger.removeClass(cssClass);

		// Click on trigger toggles class "open"
		$trigger.off('.toggle').on('click.toggle', function() {
			$(this).toggleClass(cssClass);
			$target.toggleClass(cssClass);
		});

		// Close target when link inside is clicked
		$target.find('a').click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});

		if (!$closeTrigger || !$closeTrigger.length) {
			return;
		}

		$closeTrigger.click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});
	};

	/**
	 * Smooth scroll to link targets
	 * 
	 * @param {jQuery} $scrollLinks The links
	 * @param {jQuery} scrollOffset Offset to subtract from the scroll target position (e.g. for fixed positioned elements like a menu)
	 */
	var activateSmoothScroll = function($scrollLinks, scrollOffset) {
		if (typeof scrollOffset === 'undefined') {
			scrollOffset = 0;
		}

		var determineTarget = function($trigger, hash) {
			if (hash == '#!next') {
				return $trigger.closest('.ed-element').next();
			}

			return $(hash);
		}

		$scrollLinks.click(function(e) {
			var $target = determineTarget($(this), this.hash);
			if (!$target.length) return;
			e.preventDefault();

			viewport.scrollTo($target, 'top', 500, 0);

		});
	};

	/**
	 * We are using the fill property on an element to pass user's choices from CSS to JavaScript
	 * 
	 * @param {jQuery} $element
	 */
	var getStickyMode = function($element) {
		var fillValue = getComputedStyle($element[0]).fill;

		return fillValue === 'rgb(255, 0, 0)' ?
			'sticky_banner' :
			fillValue === 'rgb(0, 255, 0)' ?
			'sticky_menu' :
			fillValue === 'rgb(0, 0, 255)' ?
			'sticky_instant' :
			fillValue === 'rgb(255, 255, 255)' ?
			'sticky_reverse' :
			'sticky_none';
	};

	/**
	 * Adds a class to an element when not currently visible
	 * 
	 * @param {jQuery} $element The element to handle stickyness for
	 * @param {string} cssClass The actual CSS class to be applied to the element when it's above a certain scroll position
	 * @param {jQuery} $banner A banner to reference the scroll position to
	 */
	var handleSticky = function($element, cssClass, $banner) {
		var triggerPos = 0,
			offset = 0;
		var menuWrapperHeight = $element.outerHeight();
		var mode;
		var prevScroll = 0;
		$element.removeClass(cssClass);
		
		var toggleSpacer = function(toggle) {
			document.body.style.setProperty('--spacer-height', toggle ? menuWrapperHeight + 'px' : '');
		};

		var handleScroll = function() {
			if (!$element.length || mode === 'sticky_none') return;

			var isReverse = mode === 'sticky_reverse',
				curScroll = viewport.getScrollTop();

			if (triggerPos <= curScroll && (!isReverse || prevScroll > curScroll)) {
				$element.addClass(cssClass);
				toggleSpacer(true);
			} else {
				$element.removeClass(cssClass);
				toggleSpacer(false);
			}

			prevScroll = curScroll;
		};
		
		var updateOffset = function() {
			mode = getStickyMode($element);
			menuWrapperHeight = $element.outerHeight();
			if (!$element.hasClass(cssClass)) {
				offset = $element.offset().top;
			}
			if (mode === 'sticky_banner' && !$banner.length) {
				mode = 'sticky_menu';
			}
			if (mode === 'sticky_banner') {
				triggerPos = $banner.offset().top + ($banner.length ? $banner.outerHeight() : $element.outerHeight());
			}
			if (mode === 'sticky_menu' || mode === 'sticky_reverse') {
				triggerPos = offset + $element.outerHeight();
			}
			if (mode === 'sticky_instant') {
				triggerPos = offset;
			}
			
			handleScroll();
		}
		
		viewport.observe('resize', updateOffset);
		viewport.observe('animation.end', updateOffset);
		observeHeightChange($element[0], updateOffset);
		updateOffset();
		
		viewport.observe('scroll', handleScroll);
		handleScroll();
	};

	/**
	 * Adds a class to links whose target is currently inside the viewport
	 * 
	 * @param {jQuery} $links Link(s) to be observed
	 * @param {string} cssClass CSS Class to be applied
	 * @param {float} sectionViewportRatio Ratio by which the target should be within the viewport
	 */
	var addClassOnVisibleLinkTargets = function($links, cssClass, sectionViewportRatio) {
		if (typeof sectionViewportRatio === 'undefined') {
			sectionViewportRatio = 1 / 2;
		}

		var menuTargets = [];
		var activeLink = $links.filter('.active:not(.wv-link-elm)').eq(0);

		var links = $links.filter(function() {
			var $target = $(this.hash);
			if (!$target.length) {
				return false;
			}

			// Cache offset position to improve performance (update on resize)		
			var updateOffset = function() {
				$target.data('offset', $target.offset().top);
			};

			viewport.observe('resize', updateOffset);
			viewport.observe('animation.end', updateOffset);
			updateOffset();

			menuTargets.push($target);
			return true;
		});

		// No hash links found, so don't handle it at all
		if (!links.length) {
			return;
		}

		var checkVisibility = function() {
			$links.removeClass('active');

			// Check section position reversely
			for (var i = menuTargets.length - 1; i >= 0; i--) {
				var desiredScrollPosition = menuTargets[i].data('offset') - viewport.getHeight() * (1 - sectionViewportRatio);
				if (viewport.getScrollTop() >= desiredScrollPosition && menuTargets[i][0].offsetParent !== null) {
					links.eq(i).addClass(cssClass);
					return;
				}
			}

			// Fallback to originally active item
			activeLink.addClass(cssClass);
		};

		viewport.observe('scroll', checkVisibility);
		checkVisibility();
	};
})();
/* End JS for preset "Menu V2" */

/* JS for preset "Counter V2" */
$(function() {
	EasingFunctions = {
		// no easing, no acceleration
		linear: function(t) {
			return t
		},
		// accelerating from zero velocity
		easeInQuad: function(t) {
			return t * t
		},
		// decelerating to zero velocity
		easeOutQuad: function(t) {
			return t * (2 - t)
		},
		// acceleration until halfway, then deceleration
		easeInOutQuad: function(t) {
			return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t
		},
		// accelerating from zero velocity 
		easeInCubic: function(t) {
			return t * t * t
		},
		// decelerating to zero velocity 
		easeOutCubic: function(t) {
			return (--t) * t * t + 1
		},
		// acceleration until halfway, then deceleration 
		easeInOutCubic: function(t) {
			return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
		},
		// accelerating from zero velocity 
		easeInQuart: function(t) {
			return t * t * t * t
		},
		// decelerating to zero velocity 
		easeOutQuart: function(t) {
			return 1 - (--t) * t * t * t
		},
		// acceleration until halfway, then deceleration
		easeInOutQuart: function(t) {
			return t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
		},
		// accelerating from zero velocity
		easeInQuint: function(t) {
			return t * t * t * t * t
		},
		// decelerating to zero velocity
		easeOutQuint: function(t) {
			return 1 + (--t) * t * t * t * t
		},
		// acceleration until halfway, then deceleration 
		easeInOutQuint: function(t) {
			return t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t
		}
	}
    
	$('[data-count]').each(function() {
		var $target = $(this);
		var offset = 0;
		
		var duration = 2000;
		var interval = Math.floor(duration / 60);
		var steps = Math.ceil(duration / interval);
		var max = $target.data('count');
		
		var run = false, handle;
		
		// Cache offset position to improve performance (update on resize)		
		var updateOffset = function() {
			offset = $target.offset().top + $target.height()/2;
		};
		viewport.observe('resize', updateOffset);
		viewport.observe('animation.end', updateOffset);
		updateOffset();
		
		var resetCounter = function() {
		    $target.html('0');
		    run = false;
		};
		
		var finishCounter = function() {
		    $target.html(max);
			window.clearInterval(handle);
		};

		var startCounter = function() {
			if (run) return;

			run = true;
			var i = 0;
			handle = window.setInterval(function() {
                var newCount = Math.round(max * EasingFunctions.easeOutCubic(++i / steps));
                if (newCount >= max) {
                    return finishCounter();
                }
				$target.html(newCount);
			}, interval);
		};
		
		var checkVisiblity = function() {
		    var t = viewport.getScrollTop();
		    var h = viewport.getHeight();
		    if (t < offset && offset < t+h) {
				!run && startCounter();
			} else {
			    run && resetCounter();
			}
		};
		
		viewport.observe('scroll', checkVisiblity);
		checkVisiblity();
	});
});
/* End JS for preset "Counter V2" */