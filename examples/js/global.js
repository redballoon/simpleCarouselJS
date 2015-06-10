$(function () {

	
	if ($('#example-basic').length) {
		(function () {
			// dom
			var $example = $('#example-basic');
			var $carousel = $example.find('.carousel');
			
			$carousel.simpleCarousel({ debug : true });
			
			window.next = function () {
				$carousel.simpleCarousel('next');
			};
			window.prev = function () {
				$carousel.simpleCarousel('previous', { loop : false });
			};
		})();
	}
});