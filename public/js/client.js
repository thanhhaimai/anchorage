/*
 * Code on client only
 */
(function(exports){

  function Room(socket) {
    var self = this;
    self.socket = socket;
    self.name = window.location.href.split("/").pop();
    self.game = new anchorage.Game(this.name);

    self.socket.on('connect', function() {
      self.requestSync();
    });

    self.socket.on('onSync', function(game) {
      if (game == null) {
        console.log('Game does not exist');
        return;
      }

      self.game.players = game.players.map(function(player) {
        var p = new anchorage.Player(player.id);
        p.hand = player.hand;
        return p;
      });

      self.game.actions = game.actions.map(function(action) {
        return new anchorage.Action(action.player, action.guess);
      });

      self.game.discardCardsCount = game.discardCardsCount;
      self.game.roundsCount = game.roundsCount;
      self.game.state = game.state;

      for (var i = 0; i < self.game.players.length; i++) {
        var player = self.game.players[i];
        if (player.id == socket.id) {
          self.currentPlayer = player;
        }
      }

      self.render(); 
    });

    // self.socket.on('onRoundStart', this.onRoundStart);
    // self.socket.on('onRoundEnd', this.onRoundEnd);
    // self.socket.on('onGameEnd', this.onGameEnd);

    this.isPlaying = false;
  }

  // loads the current hand from server.
  Room.prototype.requestSync = function() {
    this.socket.emit('requestSync', this.name);
  }

  Room.prototype.requestReady = function() {
    this.socket.emit('requestReady', this.name);
  }

  Room.prototype.requestUnready = function() {
    this.socket.emit('requestUnReady', this.name);
  }

  Room.prototype.requestPlayCard = function(card, guess) {
    // local
    this.game.playCard(this.currentPlayer, guess, card);

    // server
    request = {
      name: this.name,
      id: this.socket.id,
      guess: guess,
      card: card
    };
    this.socket.emit('requestPlayCard', request);
  }

  Room.prototype.render = function() {
    if (this.game.state == anchorage.GameStates.INIT) {
      this.renderReadyButton();
    } else if (this.game.state < anchorage.GameStates.STARTED) {
      this.clearReadyButton();
    } else if (this.game.state < anchorage.GameStates.ROUND_START) {
      this.renderRoundStart();
    } else if (this.game.state < anchorage.GameStates.ROUND_END) {
      this.renderRoundEnd();
    } else if (this.game.state < anchorage.GameStates.END) {
      this.renderGameEnd();
    } else {
      console.error("Bad game state: " + this.game.state);
    }

    this.renderPlayers(this.game.players);
  }

  Room.prototype.renderReadyButton = function() {
    console.log("Please enter ready");
  }

  Room.prototype.clearReadyButton = function() {
    // noop
  }

  Room.prototype.renderRoundStart = function() {
    console.log("Round " + this.game.roundsCount + " in progress. Please submit your action.");
  }

  Room.prototype.renderRoundEnd = function() {
    console.log("Round " + this.game.roundsCount + " has ended.");
  }

  Room.prototype.renderGameEnd = function() {
    console.log("Game is over.");
  }

  Room.prototype.renderPlayers = function() {
    for (var i = 0; i < this.game.players.length; i++) {
      var player = this.game.players[i];
      console.log(player.id + ": " + player.hand);
    }
  }

  Room.prototype.renderAction = function() {
    for (var i = 0; i < this.game.actions.length; i++) {
      console.log(this.game.actions[i]);
    }
  }

  // Room.prototype.onRoundStart = function(game) {
  //   this.game.state = anchorage.GameStates.ROUND_START;
  //   // renderRoundStart(game);
  // }
  //
  // Room.prototype.onRoundEnd = function(game) {
  //   this.game.state = anchorage.GameStates.ROUND_START;
  //   // renderRoundEnd(game);
  // }
  //
  // Room.prototype.onGameEnd = function(game) {
  //   this.game.state = anchorage.GameStates.END;
  //   // renderGameEnd(game);
  // }

  exports.socket = io.connect('http://localhost:3000');
  // exports.Display = Display;
  exports.Room = Room;

})(this['anchorage'] = this['anchorage'] || {});

room = new anchorage.Room(anchorage.socket);
