var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function BufferedMessageChannel() {
    var self = this;

    EventEmitter.call(this);
    this.logChannels = {};
    this.on('newListener', function (channelId) {
        // send all buffered
        process.nextTick(function () {
            self.emit(channelId, self.messagesOf(channelId));
        });
    });
}

util.inherits(BufferedMessageChannel, EventEmitter);

BufferedMessageChannel.prototype.pipeTo = function (channelId) {
    var self = this;

    return function (message) {
        self.logChannels[channelId].push(message);
        if (self.listeners(channelId).length) {
            // send all incoming messages
            self.emit(channelId, self.messagesOf(channelId));
        }
    };
};

BufferedMessageChannel.prototype.create = function (channelId) {
    return this.logChannels[channelId] = [];
};

BufferedMessageChannel.prototype.messagesOf = function (channelId) {
    var list = this.logChannels[channelId] || [];
    this.create(channelId); // clean
    return list;
};

module.exports = BufferedMessageChannel;
