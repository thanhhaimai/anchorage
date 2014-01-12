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

  exports.listen = function(sockets) {
    sockets.on('connection', function (client) {
      client.on('requestSync', function (name) {
        console.log('requestSync from: ' + client.id + ' for game: ' + name);
        var game = games[name];
        client.emit('onSync', game);
      });

      client.on('requestReady', function (name) {
        console.log('requestReady from: ' + client.id + ' for game: ' + name);
        var game = games[name];
        for (var i = 0; i < game.players.length; i++) {
          // the player is already in the game
          if (game.players[i].id == client.id) {
            sockets.emit('onSync', game);
            return;
          }
        }

        game.addNewPlayer(client.id);
        sockets.emit('onSync', game);
      });
    });
  }

  exports.games = games;
}());
