var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    vow = require('vow'),
    Route = require('susanin').Route,
    ReportGenerator = require('../../lib/report'),
    BufferedMessageChannel = require('../../lib/bufferedMessageChannel');

var serviceRoute = new Route({
    pattern: '/<user>/<repo>/<branch>/',
    defaults: {
        branch: 'master'
    }
});

var indexView = fs.readFileSync(__dirname + '/../views/index.html', 'utf8');

var messages = new BufferedMessageChannel();

exports.index = function (req, res, next) {
    var reportGenerator = new ReportGenerator(res.app.locals.reportSettings, req.params),
        channelId = reportGenerator.cacheKey(),
        isPending = reportGenerator.isPending();

    // create blank message channel
    if (!isPending) {
        messages.reset(channelId);
    }

    var promise = reportGenerator.isFresh()
        .then(function (isFresh) {
            if (isFresh) {
                return isFresh;
            }
            // report is not fresh, user have to wait, and watch some logs
            res.send(indexView);
            return reportGenerator.create().then(function () {
                return isFresh;
            });
        });

    if (!isPending) {
        promise = promise.progress(function (text) {
            messages.addTo(channelId, {type: 'log', text: text});
        });
    }

    promise = promise.fail(next)
    .then(function (isFresh) {
        if (isFresh) {
            next();
        }
    });

    if (!isPending) {
        promise.always(function () {
            messages.addTo(channelId, {type: 'log', text: 'Ready'});
            messages.addTo(channelId, {type: 'ready'});
        });
    }
};

exports.redirectToMaster = function (req, res) {
    res.redirect(serviceRoute.build(req.params));
};

exports.usage = function (req, res) {
    var example = serviceRoute.build({
        user: 'azproduction',
        repo: 'plato-as-service'
    });

    var usage = serviceRoute.build({
        user: '%user%',
        repo: '%repo%',
        branch: '%branch%'
    });

    var html = util.format('<pre>Usage %s Example <a href="%s">%s</a>', usage, example, example);

    res.send(html);
};

exports.streamLog = function (socket) {
    socket.on('join', function (channelId) {
        socket.on('disconnect', function () {
            messages.removeAllListeners(channelId);
        });
        messages.addListener(channelId, function (messages) {
            if (!messages.length) {
                return;
            }
            socket.emit('progress', messages);
        });
    });
};

