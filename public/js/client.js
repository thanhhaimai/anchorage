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
        p.score = player.score;
        return p;
      });

      self.game.actions = game.actions.map(function(action) {
        return new anchorage.Action(action.player, action.guess, action.card);
      });

      self.game.roundsCount = game.roundsCount;
      self.game.state = game.state;

      self.currentPlayer = null;
      for (var i = 0; i < self.game.players.length; i++) {
        var player = self.game.players[i];
        if (player.id == socket.socket.sessionid) {
          self.currentPlayer = player;
        }
      }

      self.render(); 
    });
  }

  // loads the current hand from server.
  Room.prototype.requestSync = function() {
    this.socket.emit('requestSync', this.name);
  }

  Room.prototype.requestReady = function() {
    this.socket.emit('requestReady', this.name);
  }

  Room.prototype.requestUnready = function() {
    this.socket.emit('requestUnready', this.name);
  }

  Room.prototype.requestPlayCard = function(card, guess) {
    request = {
      name: this.name,
      guess: guess,
      card: card
    };
    this.socket.emit('requestPlayCard', request);
  }

  Room.prototype.playRandom = function() {
    var index = Math.floor(Math.random() * this.currentPlayer.hand.length);
    var card = this.currentPlayer.hand[index];
    var guess = Math.floor(Math.random() * anchorage.GuessActions.COUNT);

    console.log("Playing card=" + card + ", guess=" + guess);
    this.requestPlayCard(card, guess);
  }

  Room.prototype.render = function() {
    if (this.game.state == anchorage.GameStates.INIT) {
      this.renderReadyButton();
    } else if (this.game.state == anchorage.GameStates.STARTED) {
      this.clearReadyButton();
    } else if (this.game.state == anchorage.GameStates.ROUND_START) {
      this.renderRoundStart();
      this.renderPlayers();
      this.renderActions();
    } else if (this.game.state == anchorage.GameStates.ROUND_END) {
      this.renderRoundEnd();
      this.renderActions();
    } else if (this.game.state == anchorage.GameStates.END) {
      this.renderPlayers();
      this.renderGameEnd();
    } else {
      console.error("Bad game state: " + this.game.state);
    }
  }

  Room.prototype.renderReadyButton = function() {
    for (var i = 0; i < this.game.players.length; i++) {
      var player = this.game.players[i];
      if (player.id == this.socket.socket.sessionid) {
        console.log("You're in the game");
        return;
      }
    }

    console.log("Welcome to room " + this.name);
    console.log("There is a free slot in the room. Do you want to play?");
    console.log("Type: room.requestReady() to join the game.");
  }

  Room.prototype.clearReadyButton = function() {
    // noop
  }

  Room.prototype.renderRoundStart = function() {
    console.log("=================== ROUND " + this.game.roundsCount + " =================");
    // console.log("Round " + this.game.roundsCount + " in progress.");
    console.log("To play a card, type:");
    console.log("room.requestPlayCard(<card numer>, <guess number>)");
  }

  Room.prototype.renderRoundEnd = function() {
    console.log("================================================");
    console.log("Round " + this.game.roundsCount + " has ended.");
    console.log("Here is the result of last round:");
  }

  Room.prototype.renderGameEnd = function() {
    console.log("Game is over. Please create a new game. Thanks for testing.");
  }

  Room.prototype.renderPlayers = function() {
    console.log("All players in game, note that you can only see your hand.");
    for (var i = 0; i < this.game.players.length; i++) {
      var player = this.game.players[i];
      console.log(i + "> " + player.id + " score=" + player.score + ", hand=" + player.hand);
    }
  }

  Room.prototype.renderActions = function() {
    for (var i = 0; i < this.game.actions.length; i++) {
      var action = this.game.actions[i];
      if (typeof action.card === 'undefined') {
        console.log(action.player.id + " played guess=" + action.guess);
      } else {
        console.log(action.player.id + " played card=" + action.card + ", guess=" + action.guess);
      }
    }
  }

  exports.socket = io.connect('http://localhost:3000');
  exports.Room = Room;

})(this['anchorage'] = this['anchorage'] || {});

room = new anchorage.Room(anchorage.socket);
