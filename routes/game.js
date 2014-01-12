(function() {
  var Moniker = require('moniker');
  var anchorage = require('../public/js/game.js');

  games = {};

  exports.create = function(req, res) {
    var name = Moniker.choose();
    var game = new anchorage.Game(name);
    games[name] = game;
    res.send("New game created: " + name);
  };

  exports.list = function(req, res) {
    res.render('room');
  };

  exports.get = function(req, res) {
    res.render('game');
  };

  exports.onConnect = function (client) {
    // client.emit('ping', {data: 'ping'});
    client.on('requestSync', function (name) {
      console.log('requestSync from: ' + client.id + ' for game: ' + name);
      var game = games[name];
      client.emit('onSync', game);
    });
  };

  exports.games = games;
}());
