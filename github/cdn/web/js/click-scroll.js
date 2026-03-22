//jquery-click-scroll - UPDATED for unified navigation
//by syamsul'isul' Arifin

var sectionArray = [
  { index: 0, id: 'section_1' },
  { index: 1, id: 'section_2' },
  { index: 2, id: 'section_3' },
  { index: 3, id: 'booking-section' },
  { index: 4, id: 'section_5' }
];

// Function to update active menu item based on scroll position
function updateActiveMenuOnScroll() {
  var docScroll = $(document).scrollTop();
  var docScroll1 = docScroll + 100; // Add offset for better UX
  
  sectionArray.forEach(function(section) {
    var offsetSection = $('#' + section.id).offset().top - 0;
    
    if (docScroll1 >= offsetSection) {
      $('#sidebarMenu .nav-link').removeClass('active');
      $('#sidebarMenu .nav-link:link').addClass('inactive');  
      $('#sidebarMenu .nav-item .nav-link').eq(section.index).addClass('active');
      $('#sidebarMenu .nav-item .nav-link').eq(section.index).removeClass('inactive');
    }
  });
}

// Update active menu on scroll
$(document).on('scroll', function(){
  updateActiveMenuOnScroll();
});

// Handle clicks on navigation links
sectionArray.forEach(function(section) {
  $('.click-scroll').eq(section.index).on('click', function(e){
    e.preventDefault();
    var offsetClick = $('#' + section.id).offset().top - 0;
    
    $('html, body').animate({
      'scrollTop': offsetClick
    }, 300);
    
    // Update URL hash
    window.history.pushState(null, null, '#' + section.id);
    
    // Immediately update active menu
    $('#sidebarMenu .nav-link').removeClass('active');
    $('#sidebarMenu .nav-link:link').addClass('inactive');  
    $('#sidebarMenu .nav-item .nav-link').eq(section.index).addClass('active');
    $('#sidebarMenu .nav-item .nav-link').eq(section.index).removeClass('inactive');
  });
});

// Initialize on document ready
$(document).ready(function(){
  $('#sidebarMenu .nav-item .nav-link:link').addClass('inactive');    
  $('#sidebarMenu .nav-item .nav-link').eq(0).addClass('active');
  $('#sidebarMenu .nav-item .nav-link:link').eq(0).removeClass('inactive');
  
  // Handle direct hash navigation on page load
  if (window.location.hash) {
    var hash = window.location.hash.substring(1);
    var targetElement = $('#' + hash);
    if (targetElement.length > 0) {
      setTimeout(function() {
        $('html, body').animate({
          'scrollTop': targetElement.offset().top
        }, 300);
        updateActiveMenuOnScroll();
      }, 100);
    }
  }
});