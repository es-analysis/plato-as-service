var express = require('express'),
    router = require('./router'),
    http = require('http');

module.exports = function () {
    var app = express();

    app.configure(function () {
        app.use(express.logger('dev'));
    });

    app.configure('development', function(){
        app.use(express.errorHandler());
    });

    router(app);
    return app;
};
