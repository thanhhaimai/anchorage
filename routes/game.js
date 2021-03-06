(function() {
  var Moniker = require('moniker');
  var anchorage = require('../public/js/game.js');

  games = {};

  exports.index = function(req, res){
    var rooms = [];
    for (var name in games) {
      rooms.push(name);
    }

    res.render('index', { rooms: rooms });
  };

  exports.create = function(req, res) {
    var name = Moniker.choose();
    var game = new anchorage.Game(name);
    games[name] = game;
    res.redirect('/room/' + name);
  };

  // exports.list = function(req, res) {
  //   res.render('room');
  // };

  exports.get = function(req, res) {
    res.render('game');
  };

  exports.listen = function(sockets) {
    sockets.on('connection', function(client) {
      client.on('requestSync', function(name) {
        console.log('requestSync from: ' + client.id + ' for game: ' + name);
        var game = games[name];
        if (game == null) {
          return;
        }

        client.emit('onSync', game.toDict(client.id, false));
      });

      client.on('requestReady', function(name) {
        console.log('requestReady from: ' + client.id + ' for game: ' + name);
        var game = games[name];
        if (game == null) {
          return;
        }

        if (game.findPlayer(client.id) != null) {
          return;
        }

        game.addNewPlayer(client);

        if (game.state == anchorage.GameStates.INIT
          && game.players.length == anchorage.GameConstants.NUM_PLAYERS) {
          game.start();
        }

        game.syncAllClients();
        // sockets.emit('onSync', game);
      });

      client.on('requestUnready', function(name) {
        console.log('requestReady from: ' + client.id + ' for game: ' + name);
        var game = games[name];
        if (game == null) {
          return;
        }

        if (game.findPlayer(client.id) == null) {
          return;
        }

        for (var i = 0; i < game.players.length; i++) {
          // the player is already in the game
          if (game.players[i].id == client.id) {
            game.players.splice(i, 1);
            break;
          }
        }

        if (game.state != anchorage.GameStates.INIT
          && game.players.length < anchorage.GameConstants.NUM_PLAYERS) {
          game.state = anchorage.GameStates.END;
        }

        game.syncAllClients();
        // sockets.emit('onSync', game);
      });

      client.on('requestPlayCard', function(request) {
        var name = request.name;
        var game = games[name];
        if (game == null) {
          return;
        }

        var player = game.findPlayer(client.id);
        if (player == null) {
          return;
        }

        game.playCard(player, request.guess, request.card);

        if (game.state == anchorage.GameStates.ROUND_END) {
          if (game.roundsCount == game.maxRoundsCount - 1) {
            game.state = anchorage.GameStates.END;
          } else {
            game.startRound();
          }
        }

        game.syncAllClients();
      });
    });
  }

  exports.games = games;
}());
