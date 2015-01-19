/* global describe:true, beforeEach:true, it:true, afterEach:true */

// Smoke test
var server = require('..'),
    path = require('path'),
    request = require('supertest');

// Suppress socket.io and express logs
process.env.NODE_ENV = 'production';

describe('plato-as-service', function () {
    var app;
    var rootUrl = '/azproduction/plato-as-service/master/';

    beforeEach(function () {
        app = server({
            apiHostname: 'api.github.com',
            badgeService: 'img.shields.io',
            maxConcurrent: 50,
            maxConcurrentQueue: Infinity,
            reports: path.join(__dirname, '..', 'reports'),
            ttl: 60 * 15 * 1000
        });
    });

    it('returns landing page', function (done) {
        request(app).get('/').expect(200, done);
    });

    it('returns sloc badge', function (done) {
        request(app).get(rootUrl + 'sloc.png').expect(200, done);
    });

    it('returns maintainability badge', function (done) {
        request(app).get(rootUrl + 'maintainability.png').expect(200, done);
    });

    it('returns progress page', function (done) {
        request(app).get(rootUrl).expect(200, done);
    });
});
