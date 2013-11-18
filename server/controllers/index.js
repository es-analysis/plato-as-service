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
        add = messages.pipeTo(channelId);

    // create blank message channel
    messages.create(channelId);

    reportGenerator.isFresh()
        .then(function (isFresh) {
            if (isFresh) {
                return isFresh;
            }
            // report is not fresh, user have to wait, and watch some logs
            res.send(indexView);
            return reportGenerator.create().then(function () {
                return isFresh;
            });
        })
        .progress(function (text) {
            add({type: 'log', text: text});
        })
        .fail(next)
        .then(function (isFresh) {
            if (isFresh) {
                next();
            }
        })
        .always(function () {
            add({type: 'log', text: 'Ready'});
            add({type: 'ready'});
        });
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

