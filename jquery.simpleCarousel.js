/**
* $.fn.simpleCarousel
*
* A jQuery plugin to create unstyled bare bone carousels with just the essential functionality available.
*
* @version v1.0.2, 2015-06-05
* @author Fredi Quirino <fred@firefallpro.com>
*/
/* global TweenMax:true */
/*
* to-do:
*	- animations object should be set at the plugin level, e.g $.simpleCarousel.animations
*	so user doesn't have to redefine or pass it every time a new carousel is initiated. If
*	user wants to use default animation then he can just set 'default'
*
*/
(function ($) {
	var defaultOptions = {
		debug : false,
		debug_lvl : 1,
		plugin_name : 'simpleCarousel',
		data_prefix : 'carousel',
		class_prefix : 'carousel',
		animation : 'default',
		animation_direction : 'horizontal',
		animations : {},// animations > horizontal | vertical > animation function
		initial_position : false,
		speed : 1,
		dot_pagination : true,
		delay_dot_pagination : false,
		delay_dot_pagination_limit : 4000,
		update_dot_pagination : true,
		loop: false
	};
	
	var carousel_count = 0;
	
	//////////////
	// Private
	//////////////
	var methods = {
		_log : function () {
			if (!$.fn.simpleCarousel.debug) return;
			
			var ie = !$.support.opacity, args = arguments, str = '';
			
			if (ie && typeof arguments[0] === 'string' && typeof arguments[1] === 'string') str = arguments[0] + ' ' + arguments[1];
			else if (ie && typeof arguments[0] === 'string') str = arguments[0];
			
			console.log(defaultOptions['plugin_name'], (ie) ? str : args);
		},
		_size : function (obj) {
			var size = 0, key;
			for (key in obj) {
				if (obj.hasOwnProperty(key)) size++;
			}
			return size;
		},
		init : function (fn, args, options) {
			// Toggle debug
			if (options['debug']) $.fn.simpleCarousel.debug = true;
				
			// Merge specified options with defaults
			var o = $.extend({}, defaultOptions, options);
			
			// return object by default
			var results = this;
			// iterate through jquery objects
			this.each(function () {
				var $this = $(this);
				
				// has already been initialized
				if (typeof $this.data('carousel') !== 'undefined') {
					methods._log('init: already initialized');
					var data = $this.data('carousel');
						data.options = $.extend({}, data.options, options);
					if (typeof methods[fn] !== 'undefined') results = methods[fn].call($this, data);
					return $this;
				}
				
				methods.create_carousel.call($this, o);
			});
			return results;
		},
		create_carousel : function (o) {
			methods._log('create_carousel');
			var $this = this;
			// pass around data object instead of just options
			var data = {
				carousel : {
					current_i : 0,
					transition : false,
					length : 0
				},
				options : o
			};
			
			// DOM
			var $wrapper = $this.find('.carousel_wrapper'),
				$slides = $wrapper.find('.carousel_slide'),
				$pagination = $this.find('.carousel_pagination'),
				$window = $(window);
			
			if (!$wrapper.length) {
				methods._log('create_carousel: wrapper not found');
				return $this;
			}
			if (!$slides.length) {
				methods._log('create_carousel: slides not found');
				return $this;
			}
			
			// set length
			data.carousel.length = $slides.length;
			data.carousel.slides = $slides;
			
			// set active slide if non-exist
			if (!$slides.filter('.active').length) $slides.eq(0).addClass('active');
			
			methods._log('create_carousel: checking .carousel for any data attributes:');

			// over-ride options with element data values
			$.each(data.options, function (key, val) {
				if (key === 'plugin_name' || key === 'animations') return true;
				
				if (typeof $this.data(data.options.data_prefix + '-' + key) !== 'undefined' &&
					typeof $this.data(data.options.data_prefix + '-' + key) === typeof data.options[key]) {
						methods._log('create_carousel: over-ride: ' + key);
						data.options[key] = val;
				}
			});
			
			$this.addClass('animation-' + data.options.animation);
			
			// allow users to omit the horizontal and vertical keys if they
			// are not using both
			if (methods._size(data.options.animations) && typeof data.options.animations['horizontal'] === 'undefined' && typeof data.options.animations['vertical'] === 'undefined') {
				var animation_methods = data.options.animations;
				data.options.animations = {};
				data.options.animations[data.options.animation_direction] = animation_methods;
			}
			
			// initial position
			if (typeof data.options.initial_position === 'function') {
				data.options.initial_position($slides);
			} else {
				TweenMax.set($slides.not('.active'), {xPercent : 100});
			}
			
			// pagination
			if (data.options.dot_pagination && $pagination.length && !$pagination.find('.dot').length) {
				methods._log('create_carousel: pagination element already exists but not compatible');
				data.options.dot_pagination = false;
				
			} else if (data.options.dot_pagination && $pagination.length && $pagination.find('.dot').length > 1) {
				// activate first dot
				$pagination.find('.dot').first().addClass('active');
				$pagination.addClass('enable');
				$this.trigger('pagination_enabled');
				
			} else if (data.options.dot_pagination) { methods.build_pagination.call(this, data); }
			
			//////////////////////
			// events
			//////////////////////
			$window.on('resize', function () {
				if (data.options.dot_pagination && data.options.update_dot_pagination) methods.update_layout.call($this, data);
				
				var active_height = parseInt($slides.filter('.active').height(), 10);
					active_height = isNaN(active_height) ? 0 : active_height;
			
				if (data.options.debug_lvl > 1) methods._log('resize: carousel height:', active_height);
			
				if (active_height > 0) $wrapper.height(active_height);
			}).trigger('resize');
			
			if ($.fn.simpleCarousel.old_jquery) {
				$this.delegate('.carousel_pagination .dot', 'click', function (e) {
					e.preventDefault();
					methods.goto_dot.call($this, data, $(this));
				});
			} else {
				$this.on('click', '.carousel_pagination .dot', function (e) {
					e.preventDefault();
					methods.goto_dot.call($this, data, $(this));
				});
			}
			//////////////////////
			
			carousel_count++;
			$this.data('carousel', data);
		},
		next : function (data) {
			methods._log('next');
			
			var new_i = data.carousel.current_i;
				new_i++;
			var args = {};
			// no change
			if (data.carousel.transition || (!data.options.loop && new_i > data.carousel.length - 1)) { return this; }
			else if (data.options.loop && new_i > data.carousel.length - 1) {
				new_i = 0;
				args.dir = -1;
			}
			
			// transition
			methods.transition.call(this, data, new_i, args);
			return this;
		},
		previous : function (data) {
			methods._log('previous', data);
			
			var new_i = data.carousel.current_i;
				new_i--;
			var args = {};
			// no change
			if (data.carousel.transition || (!data.options.loop && new_i < 0)) { return this; }
			else if (data.options.loop && new_i < 0) {
				new_i = data.carousel.length - 1;
				args.dir = 1;
			}
			// transition
			methods.transition.call(this, data, new_i, args);
			return this;
		},
		goto_dot : function (data, $dot) {
			methods._log('goto_dot');
			
			if (!$dot || !$dot.length) {
				methods._log('goto_dot: dot not found');
				return this;
			}
			if ($dot.hasClass('active')) {
				methods._log('goto_dot: dot already active');
				return this;
			}
			
			$dot.addClass('active').siblings().removeClass('active');
			methods.transition.call(this, data, $dot.index());
			return this;
		},
		transition : function (data, new_i, args) {
			methods._log('transition:', new_i);
			
			args = args || {};
			
			// no change
			if (new_i < 0 || new_i === data.carousel.current_i || new_i > data.carousel.length) {
				methods._log('transition: no change');
				return this;
			}
			if (data.carousel.transition) {
				methods._log('transition: unavailable');
				return this;
			}
			// direction of animation
			var dir = -1;
			if (typeof args.dir === 'undefined') {
				dir = new_i < data.carousel.current_i ? 1 : dir;
			} else {
				dir = args.dir;
			}
			
			// flag transition
			data.carousel.transition = true;
			
			// dom
			var $slides = data.carousel.slides;
			
			// target
			var $target = $slides.eq(new_i);
			if (!$target.length) {
				methods._log('transition: no target found');
				data.carousel.transition = false;
				return this;
			}
			// old target
			var $old = $slides.eq(data.carousel.current_i);
			if (!$old.length) {
				methods._log('transition: no previous target found');
				data.carousel.transition = false;
				return this;
			}
			
			var orientation = data.options.animation_direction,
				internal_map = methods.animations[orientation],
				external_map = typeof data.options.animations[orientation] !== 'undefined' ? data.options.animations[orientation] : false,
				animation = data.options.animation;
			
				methods._log(internal_map, external_map, animation);
			// no animation
			if (typeof internal_map[animation] === 'undefined' && (!external_map || typeof external_map[animation] === 'undefined')) {
				methods._log('transition: no animation found');
				data.carousel.transition = false;
				return this;
			}
			
			$old.trigger('before_animation', 'hide');
			$target.trigger('before_animation', 'show');
			
			var that = this;
			var animation_fn = typeof internal_map[animation] !== 'undefined' ? internal_map : external_map;
			animation_fn[data.options.animation]($target, $old, { 'dir' : dir, 'speed' : data.options.speed }, function () {
				data.carousel.transition = false;
				data.carousel.current_i = new_i;
				$slides.removeClass('active').eq(data.carousel.current_i).addClass('active');
	
				$old.trigger('animation_complete', 'hide');
				$target.trigger('animation_complete', 'show');
	
				// update pagination
				if (data.options.dot_pagination) that.find('.carousel_pagination .dot').removeClass('active').eq(new_i).addClass('active');
			});
			
			return this;
		},
		update_layout : function (data) {
			if (data.options.debug_lvl > 1) methods._log('update_layout');
			
			var $this = this;
			var $pagination = $this.find('.carousel_pagination');
			var $dots = $pagination.find('.dot');
			
			if (!$dots.length) {
				if (data.options.debug_lvl > 1) methods._log('update_layout: dots not found');
				return this;
			}
			
			// Position pagination
			var margin = parseInt($dots.css('margin-right'), 10);
				margin = isNaN(margin) ? 0 : margin;
			var dot_width = $dots.innerWidth();
			var pagination_width = $dots.length * (dot_width + margin) - margin;
			var width = $this.width();
			var val = (width - pagination_width) / 2;
			
			// log
			if (data.options.debug_lvl > 1) methods._log('update_layout: margin', margin, 'dot w', dot_width, 'pagination w', pagination_width, 'carousel w', width);
			
			if (pagination_width > dot_width) $pagination.css('left', val);
			
			return this;
		},
		build_pagination : function (data) {
			methods._log('build_pagination');
			// dom
			var $this = this, $dots,
				$pagination = $(document.createElement('div')).addClass('carousel_pagination'),
				$list = $(document.createElement('ul')),
				$dot = $(document.createElement('li')).addClass('dot'),
				$anchor = $(document.createElement('a')).attr({ href : '#', title : 'dot'}).text('dot');
			
			// add to stage
			$list.append($dot.append($anchor));
			for (var i = 0; i < data.carousel.length - 1; i++) {
				$list.append($dot.clone());
			}
			$this.append($pagination.append($list));
			$dots = $pagination.find('.dot');
			
			// activate first dot
			$dots.first().addClass('active');
			
			// delay the display of pagination until image is loaded
			var $image_exist = data.carousel.slides.filter('.active').find('img');
			if ($dots.length > 1 && data.options.delay_dot_pagination && $image_exist.length) {
				methods._log('build_pagination: will delay display of dot pagination');
				
				// edge-case where load event is never called
				var timer = setTimeout(function () {
					methods._log('build_pagination: delay limit reached');
					$image_exist.trigger('load');
					$pagination.addClass('delay-limit');
					
				}, data.options.delay_dot_pagination_limit);
				
				// listen to image load event
				$image_exist.one('load', function () {
					methods._log('build_pagination: image has loaded');
					clearTimeout(timer);
					$pagination.addClass('enable');
					$this.trigger('pagination_enabled');
				});
				
			// default action
			} else if ($dots.length > 1) {
				$pagination.addClass('enable');
				$this.trigger('pagination_enabled');
			}
		},
		isLast : function (data) {
			return data.carousel.current_i === data.carousel.length - 1;
		},
		isFirst : function (data) {
			return data.carousel.current_i === 0;
		},
		animations : {
			'horizontal' : {
				//////////////////////////////////////
				// Normal Animation /////////////////
				//////////////////////////////////////
				'default' : function ($target, $old, o, next) {
					var dir = o.dir || -1;
				
					TweenMax.to($old, o.speed, {xPercent : 100 * dir});//, force3D : true})
					TweenMax.set($target, {xPercent : 100 * (dir * -1)});//, force3D : true})
					TweenMax.to($target, o.speed, {xPercent : 0, onComplete : function () {//, force3D : true
						methods._log('transition: complete');
					
						if (typeof next !== 'undefined') next();
					}});
				}
			}
		}
	};
	
	$.fn.simpleCarousel = function () {
		var fn = 'init', args, settings = {}, callback;
		
		// Assign arguments
		for (var i = 0; i < arguments.length; i++) {
			switch (typeof arguments[i]) {
			
			// Callback
			case 'function':
				callback = arguments[i];
				break;
			
			// Settings
			case 'object':
				settings = arguments[i];
				break;
			
			// Ignore undefined
			case 'undefined':
				break;
			
			// Function or Argument
			case 'string':
			default:
				if (methods[arguments[i]]) fn = arguments[i];
				else args = arguments[i];
				break;
			}
		}
		
		methods._log(fn);
		
		// type checking options that will be merged with default options
		for (var op in settings) {
			if (settings.hasOwnProperty(op)) {
				
				// Default option for invalid type
				if (typeof settings[op] !== typeof defaultOptions[op] && defaultOptions[op] !== null) settings[op] = defaultOptions[op];
			}
		}
		
		// Everyone Must go through init
		return methods['init'].call(this, fn, args, settings);
	};
	
	// Global debug
	$.fn.simpleCarousel.debug = false;
	
	$.fn.simpleCarousel.old_jquery = false;
	
	if (typeof $.fn.on === 'undefined') {
		$.fn.on = $.fn.bind;
		$.fn.simpleCarousel.old_jquery = true;
	}
})(jQuery);