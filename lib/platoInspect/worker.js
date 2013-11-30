var plato = require('plato');

var args = JSON.parse(process.argv[2]);

plato.inspect(args[0], args[1], args[2], function () {
    process.exit(0);
});
