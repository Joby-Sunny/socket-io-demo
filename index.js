$(function() {
  var socket = io(); // to create a client connection
  $('form').submit(function(e) {
    e.preventDefault(); // prevents page reloading
    $.ajax({
      type: 'POST',
      url: '/message',
      dataType: 'json',
      data: JSON.stringify({
        message: 'Hai this is my message',
        number: 12345
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      success: function(res) {
        console.log('response is ', res);
      },
      error: function(err) {
        console.log('error is :', err);
      }
    });

    // return false;
  });
});
