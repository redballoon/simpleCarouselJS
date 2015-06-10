/**
* $.fn.simpleCarousel
*
* A jQuery plugin to create unstyled bare bone carousels with just the essential functionality available.
*
* @version v1.0.2, 2015-06-05
* @author Fredi Quirino <fred@firefallpro.com>
*/
/* global TweenMax:true */
(function ($) {
	var defaultOptions = {
		debug : false,
		debug_lvl : 2,
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
	
	var methods = {
		_log : function () {
			if (!$.fn.simpleCarousel.debug) return;
			
			var ie = !$.support.opacity, args = arguments, str = '';
			
			if (ie && typeof arguments[0] === 'string' && typeof arguments[1] === 'string') str = arguments[0] + ' ' + arguments[1];
			else if (ie && typeof arguments[0] === 'string') str = arguments[0];
			
			console.log(defaultOptions['plugin_name'], (ie) ? str : args);
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
			
			$this.on('click', '.carousel_pagination .dot', function (e) {
				e.preventDefault();
				methods.goto_dot.call($this, data, $(this));
			});
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
	/*
	$.fn.simpleCarousel = function (options) {
		
		var $window = $(window);
		
		/////////////////////
		// Per elements
		/////////////////////
		return this.each(function () {
			// initialize
			var carousel = {};
			var o = carousel.options = $.extend({}, defaultOptions, options);
			var container_id = this.id;
			var carousel_id = 'cjs_' + carousel_count;
			
			var $this = $(this).addClass(carousel_id);
			
			// set index
			carousel.current_i = 0;
			
			// log
			if (o.debug) console.log('carousel:' + carousel_id +' init container:', container_id);
			
			// has already been initialized
			if (typeof $this.data('carousel') !== 'undefined') {
				if (o.debug) console.log('carousel:' + carousel_id +' already init');
				return true;
			}
			
			// DOM
			var $wrapper,
				$slides,
				$pagination,
				$dots;
			
			$wrapper = $this.find('.carousel_wrapper');
			$slides = $wrapper.find('.carousel_slide');
			$pagination = $this.find('.carousel_pagination');
			//$dots = $pagination.find('.dot.template');
		
			// validate expected dom elements
			if (!$wrapper.length || !$slides.length) {// || !$pagination.length
				if (o.debug) console.log('carousel:' + carousel_id +' DOM element not found');
				$this.addClass('failed_carousel').data('failed_carousel', true);
				return true;
			}
			
			var section_width = $this.width();
			//var timeline = new TimelineMax();
			
			// make 1st active
			if (!$slides.filter('.active').length) $slides.eq(0).addClass('active');
			
			// wipe animation
			if (typeof $this.data('carousel-animation') !== 'undefined') {
				o.animation = $this.data('carousel-animation');
			}
			if (o.animation !== 'default') $this.addClass('animation-' + o.animation);
			
			
			//////////////////////
			// create pagination
			//////////////////////
			if (o.build_pagination) {
				// log
				if (o.debug) console.log('carousel:' + carousel_id +' will begin pagination');
				
				// build
				$pagination = carousel_factory.create_pagination($slides.length);
				$this.append($pagination);			
				$dots = $pagination.find('.dot');
				// activate first
				$dots.first().addClass('active');
				// delay the display of pagination until image is loaded
				var $image_exist = $slides.filter('.active').find('img');
				if ($dots.length > 1 && o.delay_pagination && $image_exist.length) {
					if (o.debug) console.log('carousel:' + carousel_id + ' will wait for load', $image_exist);
					var timer = setTimeout(function () {
						if (o.debug) console.log('carousel:' + carousel_id + ' image load: time is up');
						$image_exist.trigger('load');
						$pagination.addClass('timer-done');
					}, 4000);
					$image_exist.one('load', function () {
						if (o.debug) console.log('carousel:' + carousel_id + ' image loaded');
						clearTimeout(timer);
						$pagination.addClass('enable');
						$this.trigger('pagination_enabled');
					});
					
				} else if ($dots.length > 1) {
					$pagination.addClass('enable');
					$this.trigger('pagination_enabled');
					
				}
			}
						
			// Position Slides
			if (o.animation_direction === 'horizontal') {
				TweenMax.set($slides.not('.active'), {xPercent : 100});
			} else {
				TweenMax.set($slides.not('.active'), {yPercent : 100});
			}
			
			//////////////////////
			// events
			//////////////////////
			$window.on('resize', function () {
				$this.trigger('layout.carousel');
				if (o.debug) console.log('carousel-event:' + carousel_id +' height', $slides.filter('.active'), $slides.filter('.active').height());
				var active_height = parseInt($slides.filter('.active').height(), 10);
					active_height = isNaN(active_height) ? 0 : active_height;
				
				if (o.debug) console.log(active_height);
				
				if (active_height > 0) $wrapper.height(active_height);
			}).trigger('resize');
			
			$this.on('layout.carousel', function (e) {
				if (!o.build_pagination) return;
				
				if (o.debug) console.log('carousel-event:' + carousel_id +' layout');
				
				section_width = $this.width();
				
				// Position pagination
				var margin = parseInt($dots.css('margin-right'), 10);
					margin = isNaN(margin) ? 0 : margin;
				var dot_width = $dots.innerWidth();
				var pagination_width = $dots.length * (dot_width + margin) - margin;
				// log
				if (o.debug) console.log('carousel:' + carousel_id +' mar', margin, dot_width, pagination_width, section_width);
				var val = (section_width - pagination_width) / 2;
				
				if (pagination_width > dot_width) $pagination.css('left', val);//.addClass('ready');
								
			})
			.on('transition.carousel', function (e, new_i) {
				if (o.debug) console.log('carousel-event:' + carousel_id +' transition:', new_i);
				
				// no change
				if (new_i < 0 || new_i === carousel.current_i || new_i > $slides.length) {
					if (o.debug) console.log('carousel-event:' + carousel_id +' transition: no change');
					return;
				}
				if (carousel.transition) {
					if (o.debug) console.log('carousel-event:' + carousel_id +' transition: unavailable');
					return;
				}
				// direction of animation
				var dir = -1;
					dir = new_i < carousel.current_i ? 1 : dir;
				
				// flag transition
				carousel.transition = true;
				
				// target
				var $target = $slides.eq(new_i);
				if (!$target.length) {
					if (o.debug) console.log('carousel-event:' + carousel_id +' transition: no target found');
					carousel.transition = false;
					return;
				}
				// old target
				var $old = $slides.eq(carousel.current_i);
				if (!$old.length) {
					if (o.debug) console.log('carousel-event:' + carousel_id +' transition: no previous target found');
					carousel.transition = false;
					return;
				}
				// no animation
				if (typeof methods.animations[o.animation] === 'undefined' && typeof o.animations[o.animation] === 'undefined') {
					if (o.debug) console.log('carousel-event:' + carousel_id +' transition: no animation found');
					carousel.transition = false;
					return;
				}
				var animation_fn = typeof methods.animations[o.animation] !== 'undefined' ? methods.animations : o.animations;
				
				animation_fn[o.animation]($target, $old, $.extend(o, { 'dir' : dir }), function () {
					carousel.transition = false;
					carousel.current_i = new_i;
					$slides.removeClass('active').eq(carousel.current_i).addClass('active');
		
					$old.trigger('animation_complete', 'hide');
					$target.trigger('animation_complete', 'show');
		
					// update pagination
					$pagination.find('.dot').removeClass('active').eq(new_i).addClass('active');
				});
			})
			// remove
			.on('close.carousel', function (e) {
				if (o.debug) console.log('carousel-event:' + carousel_id +' close');
				
				carousel.open = false;
			})
			// remove
			.on('open.carousel', function (e, force) {
				if (o.debug) console.log('carousel-event:' + carousel_id +' open');
				
				// global flag
				//portfolio.carousel_open(true);
				
				if (carousel.open) {
					if (o.debug) console.log('carousel-event:' + carousel_id +' open: unavailable');
					return;
				}
				
				carousel.open = true;
				carousel.current_i = 0;
				$slides.removeClass('active').first().addClass('active');
				TweenMax.set($slides.first(), {xPercent : 0});
				TweenMax.set($slides.not('.active'), {xPercent : 100});
				$pagination.find('.dot').removeClass('active').first().addClass('active');
				
				$this.trigger('layout.carousel');
				//var speed = force ? 0.2 : 1;
				//$this.trigger('transition.carousel', [0, speed]);
			})
			.on('next.carousel', function () {
				if (o.debug) console.log('carousel-event:' + carousel_id +' next');
				
				var new_i = carousel.current_i;
				new_i++;
				// no change
				if (carousel.transition || new_i > $slides.length - 1) return;
				// transition
				$this.trigger('transition.carousel', new_i);
			})
			.on('prev.carousel', function () {
				if (o.debug) console.log('carousel-event:' + carousel_id +' prev');
				
				var new_i = carousel.current_i;
				new_i--;
				// no change
				if (carousel.transition || new_i < 0) return;
				// transition
				$this.trigger('transition.carousel', new_i);
			});
			
			$this.on('click', '.carousel_pagination .dot', function (e) {
				e.preventDefault();
				var $li = $(this);
				if ($li.hasClass('active')) return;
				
				$li.addClass('active').siblings().removeClass('active');
				$this.trigger('transition.carousel', $li.index());
			});
			
			carousel_count++;
			$this.data('carousel', carousel);
		});
	};
	*/
	
	// Global debug
	$.fn.simpleCarousel.debug = false;
	
	// Alliases
	$.simpleCarousel = {};
	
	// remove
	$.simpleCarousel.onLast = function (target) {
		var $this = $(target);
		// has not been initialized
		if (typeof $this.data('carousel') === 'undefined') {
			//if (o.debug) console.log('carousel:' + carousel_id +' already init');
			return null;
		}
		var carousel = $this.data('carousel');
		var $slides = $this.find('.carousel_slide');
		
		return carousel.current_i === $slides.length - 1;
	};
	$.simpleCarousel.onFirst = function (target) {
		var $this = $(target);
		// has not been initialized
		if (typeof $this.data('carousel') === 'undefined') {
			//if (o.debug) console.log('carousel:' + carousel_id +' already init');
			return null;
		}
		var carousel = $this.data('carousel');
		
		return carousel.current_i === 0;
	};
	
})(jQuery);