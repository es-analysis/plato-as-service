var Route = require('susanin').Route;

exports.serviceRoute = new Route({
    pattern: '/<user>/<repo>/<branch>/',
    defaults: {
        branch: 'master'
    }
});

exports.serviceBadgeRoute = new Route({
    pattern: '/<user>/<repo>/<branch>/<badge>.png',
    defaults: {
        branch: 'master'
    }
});
