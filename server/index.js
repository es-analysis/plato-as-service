var express = require('express'),
    router = require('./router'),
    http = require('http');
 
var app = express();
 
app.configure(function () {
  app.use(express.logger('dev'));
});
 
app.configure('development', function(){
    app.use(express.errorHandler());
});

router(app);


app.listen(8080);
 
console.log('localhost:8080');
