(function ($, _, io) {
    'use strict';

    var channelId       = location.pathname.split('/').slice(1, -1).join('/'),
        socket          = io.connect('http://localhost'),
        $log            = $('#log'),
        messageHandlers = {},
        renderRow       = _.template($.trim($('#LogRowTemplate').html()));

    messageHandlers.log = function (message) {
        $log.append(renderRow(message));
        window.scrollTo(0, 1e11);
    };

    messageHandlers.ready = function (message) {
        $('#PlatoSuccess').show();
        window.scrollTo(0, 1e11);
        setTimeout(function () { window.location.reload(true); }, 2000);
    };

    messageHandlers.error = function (message) {
        $('#PlatoError').show();
    };

    socket.on('progress', function (data) {
        for (var i = 0, c = data.length, message; i < c; i++) {
            message = data[i];
            if (messageHandlers[message.type]) {
                messageHandlers[message.type](message);
            }
        }
    });

    socket.emit('join', channelId);

})(window.jQuery, window._, window.io);
