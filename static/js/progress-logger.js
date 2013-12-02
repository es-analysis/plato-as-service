(function ($, _, io) {
    'use strict';

    var channelId = location.pathname.split('/').slice(1, -1).join('/');

    if (!channelId) {
        return;
    }

    var logTemplate = _.template($.trim($('#LogRowTemplate').html())),
        socket = io.connect();

    var $app = $(document.body),
        $logger = $('.progress-logger'),
        $success = $('.progress-success'),
        $error = $('.progress-error');

    $app.on('log', function (event, message) {
        $logger.append(logTemplate(message));
    });

    $app.on('ready', function () {
        $success.show();
        setTimeout(function () {
            window.location.reload(true);
        }, 2000);
    });

    $app.on('error', function () {
        $error.show();
    });

    // Follow log
    $app.on('ready.follow-log error.follow-log log.follow-log', function () {
        window.scrollTo(0, 1e11);
    });

    // Unfollow
    $(window).one('mousewheel wheel DOMMouseScroll MozMousePixelScroll touchmove', function () {
        $logger.off('.follow-log');
    });

    socket.on('progress', function (data) {
        _.each(data, function (message) {
            $app.trigger(message.type, message);
        });
    });

    socket.emit('join', channelId);

})(window.jQuery, window._, window.io);
