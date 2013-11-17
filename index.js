module.exports = process.env.PLATO_AS_SERVICE_COVERAGE ?
    require('./lib-cov') :
    require('./lib');
