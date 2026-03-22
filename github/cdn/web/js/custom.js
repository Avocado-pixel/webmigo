
  (function ($) {
  
  "use strict";

    // MENU
    $('#sidebarMenu .nav-link').on('click',function(){
      $("#sidebarMenu").collapse('hide');
    });
    
    // UNIFIED SCROLL HANDLER for both .smoothscroll and .click-scroll
    $('a.smoothscroll, a.click-scroll').on('click', function(e){
      e.preventDefault();
      
      var href = $(this).attr('href');
      
      // Only process hash links
      if (!href || !href.startsWith('#')) {
        return;
      }
      
      var targetElement = $(href);
      
      // Check if target exists
      if (targetElement.length === 0) {
        console.warn('Target element not found:', href);
        return;
      }
      
      var header_height = $('.navbar').height() || 0;
      var offset = targetElement.offset();
      var offsetTop = offset.top;
      var totalScroll = offsetTop - header_height;
      
      // Update URL hash
      window.history.pushState(null, null, href);
      
      // Smooth scroll
      $('body,html').animate({
        scrollTop: totalScroll
      }, 300);
    });
  
  })(window.jQuery);


