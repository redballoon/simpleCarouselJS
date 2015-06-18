$(function () {
	
	var $window = $(window),
		$example;
	
	$example = $('#example-basic');
	if ($example.length) {
		(function () {
			// dom
			var $carousel = $example.find('.carousel');
			// init plugin
			$carousel.simpleCarousel({ debug : false });
			// controls
			window.next = function () {
				$carousel.simpleCarousel('next');
			};
			window.prev = function () {
				$carousel.simpleCarousel('previous', { loop : false });
			};
		})();
	}
	$example = $('#example-animation');
	if ($example.length) {
		(function () {
			// dom
			var $carousel = $example.find('.carousel');
			// custom animation
			var custom = {
				'cross-fade' : function ($target, $old, o, next) {
					TweenMax.to($old, 1, { opacity : 0, ease : Power2.easeIn });
					TweenMax.set($target, {xPercent : 0, opacity : 0});
					TweenMax.to($target, 1, { opacity : 1, ease : Power2.easeIn, onComplete : function () {
						if (typeof next !== 'undefined') next();
					}});
				}
			};
			// init plugin
			$carousel.simpleCarousel({ debug : true, animation : 'cross-fade', animations : custom });
		})();
	}
	// cause too lazy to put in a preloader
	setTimeout(function () {
		$window.resize();
	}, 500);
});