paper.setup("c");

var counter = 0;
var nodeRadius = 10;
var nodeSignalRadius = 80;
var purple = "#4A148C";
var green = "#4CAF50";
var red = "#F44336";
var blue = "#3F51B5";
var black = "#000000";
var gray = "#EEEEEE";
var mediumGray = "#AAAAAA";
var darkGray = "#616161";
var white = "#FFFFFF";
var backgroundColor = gray;
var nodeStrokeColor = darkGray;
var nodeStrokeWidth = 2;
var nodeLeaderStrokeWidth = 12;
var nodeLeaderColor = darkGray;
var nodeUncertainColor = gray;
var nodeOKColor = green;
var nodeInfectedColor = red;
var connectionStrokeWidth = 2;
var connectionStrokeColor = darkGray;
var strokeUncertainColor = mediumGray;
var validDistance = 40;
var nominationTimeout = 2000;
var leaderTimeout = 3000;
var immunityTimer = 1000;
var followerTimeout = 4000;
var frameDelay = 50;
var nextFrameTime = 0;
var del = false;

var background = new paper.Path.Rectangle({
        from: paper.view.bounds.topLeft,
        to: paper.view.bounds.bottomRight, 
        fillColor: backgroundColor,
    });

var backgroundLayer = new paper.Layer();
var nodeLayer = new paper.Layer();
var connectionLayer = new paper.Layer();

connectionLayer.insertBelow(nodeLayer);
backgroundLayer.insertBelow(connectionLayer);


var nodes = [];

var Message = function(messageID, content, issuer){
	this.content = content;
	this.ID = messageID;
	this.issuerID = issuer;
}

var node = function(x, y, id){
	this.position = new paper.Point(x,y);
	this.leader = false;
	this.infected = false;
	this.id = id;
	this.paperObjects = [];
	this.hasLeader = false;
	this.awaitingVictory = false;
	this.neighborChange = false;
	this.isNominated = false;
	this.leaderID = -1;
	this.lastInfectionMessage = null;
	this. timeToVictory = 0;
	this. timeToPanic = 0;
	this. timeToImmunity = getCurrentTime() + immunityTimer;
	this.neighbors = [];
	this.inbox = [];
	this.outbox = [];
	this.seenMessages = {};

	this.remove = function(){
		for(var i in this.neighbors){
			this.neighbors[i].removeNeighbor(this);
		}
		for(var i in this.paperObjects){
			this.paperObjects[i].remove();
		}
	}

	this.removeNeighbor = function(node){
		var index = this.neighbors.indexOf(node);
		this.neighbors.splice(index, 1);
	}

	this.activate = function() {
		console.log("Activate!");
		console.log("Cooldown is..." + (getCurrentTime() - this.timeToImmunity));
		if (this.leader){
			this.cure();
		} else {
			this.infect();
		}
	}

	this.isNeighbor = function(neighbor){
		var dist = this.position.getDistance(neighbor.position); 
		if (dist < nodeSignalRadius){
			return true;
		}
		else return false;
	}

	this.addNeighbor = function(neighbor){
		this.neighbors.push(neighbor);
	}

	this.findNeighbors = function(nodes){
		this.neighbors = [];
		for (var i in nodes){
			var neighbor = nodes[i];
			if (neighbor.id != this.id && this.isNeighbor(nodes[i])){
				this.addNeighbor(nodes[i]);
				neighbor.addNeighbor(this);
			}
		}
		this.neighborChange = true;
	}

	this.checkLeaderStatus = function(){
		if (this.neighborChange == true){
			//this.nominateSelf();
			this.neighborChange = false;
		}

		if (this.leader){
			if (getCurrentTime() >= this.timeToPanic){
				this.announceVictory();
				//console.log(this.id+ " continues to win!");
			}
		}

		else {
			if (this.hasLeader){

				if (getCurrentTime() >= this.timeToPanic){
					this.hasLeader = false;
					this.leaderID = -1;
					this.timeToPanic = 0;
				}
			}
			else {
				if (this.isNominated){
					if (getCurrentTime() >= this.timeToVictory){
						//console.log(this.id + " wins! It's after: " + this.timeToVictory);
						this.announceVictory();
					}
				}
				else if (this.awaitingVictory){
					if (getCurrentTime() >= this.timeToVictory){
						this.nominateSelf();
						//console.log("Um, " + this.id + " could still be leader, if you want...?");
					}
				}
				else {
					this.nominateSelf();
				}
			}
		}
	}

	this.filterMessages = function(){
		var bestID = -1;
		for (var i in this.outbox){
			var msg = this.outbox[i];
			if (msg.content == "elect"){
				if (bestID == -1 || msg.issuerID < bestID){
					bestID = msg.issuerID;
				}
			}
		}
		var newOutbox = [];
		for (var i in this.outbox){
			var msg = this.outbox[i];
			if (msg.content != "elect" || msg.issuerID == bestID){
				newOutbox.push(msg);
			}
		}
		this.outbox = newOutbox;
	}

	this.broadcastMessages = function(){
		this.filterMessages();
		//console.log(this.id + " is broadcasting!");
		if (this.infected){
			this.outbox.push(this.lastInfectionMessage);
		}
		for (var i in this.outbox){
			//console.log(this.outbox[i]);
			this.broadcastMessage(this.outbox[i]);
		}
		this.outbox = [];
	}

	this.processMessages = function() {
		for (var i in this.inbox){
			this.readMessage(this.inbox[i]);
		}
		this.inbox = [];
	}

	this.readMessage = function(msg){
		if (!this.seenMessages.hasOwnProperty(msg.ID) || (msg.content == "infect" && !this.infected)){
			this.seenMessages[msg.ID] = msg;
			this.executeMessage(msg);
		} else {
			//console.log("Seen this one before!");
		}
	}

	this.isWinner = function(challengerID){
		if (this.id < challengerID){
			return true;
		} else {
			return false;
		}
	}

	this.executeMessage = function(msg){
		if (msg.issuerID != this.id){
			if (msg.content == "elect"){
				if (this.isWinner(msg.issuerID) && !this.hasLeader){
					if (this.isNominated){
						this.writeMessage("elect");
					} else {
						this.nominateSelf();
					}
				} else if (this.hasLeader && this.leaderID < msg.issuerID) {
					//console.log(this.id + " sees an upstart!");
				} else {
					this.concede();
					this.forwardMessage(msg);
				}
			} else if (msg.content == "victory"){
				if (this.isWinner(msg.issuerID)){
					this.nominateSelf();
				} else {
					this.hailGloriousLeader(msg);
					this.forwardMessage(msg);
				}
			} else if (msg.content == "infect"){
				if (!this.leader){
					if (getCurrentTime() >= this.timeToImmunity){
						this.infected = true;
						this.lastInfectionMessage = msg;
					} else {
						console.log("immune!");
					}
				}
			} else if (msg.content == "cure"){
					this.infected = false;
					this.timeToImmunity = getCurrentTime() + immunityTimer;
					this.forwardMessage(msg);
			}
		}
	}

	this.createMessageID = function(){
		return "" + this.id + getCurrentTime();
	}

	this.cure = function(){
		var msg = new Message(this.createMessageID(), "cure", this.id);
		this.forwardMessage(msg);
	}

	this.infect = function(){
		if (getCurrentTime() >= this.timeToImmunity){
			this.infected = true;
			var msg = new Message(this.createMessageID(), "infect", this.id);
			this.lastInfectionMessage = msg;			
		}
	}

	this.forwardMessage = function(msg){
		this.outbox.push(msg);
	}

	this.nominateSelf = function(){
		this.writeMessage("elect");
		this.isNominated = true;
		this.awaitingVictory = false;
		this.timeToVictory = getCurrentTime() + nominationTimeout;
		//console.log(this.id + " is the greatest! choose me! will win at: " + this.timeToVictory);
	}

	this.concede = function(){
		this.isNominated = false;
		this.leader = false;
		this.awaitingVictory = true;
		this.timeToVictory = getCurrentTime() + nominationTimeout;
		//console.log("I concede! Leader will win at: " + this.timeToVictory);
	}

	this.announceVictory = function(){
		this.isNominated = false;
		this.timeToVictory = 0;
		this.leader = true;
		this.leaderID = this.id;

		if (this.infected){
			this.infected = false;
		}

		this.hasLeader = true;
		this.timeToPanic = getCurrentTime() + leaderTimeout;
		//console.log(this.id + " rules!");
		this.writeMessage("victory");
	}

	this.hailGloriousLeader = function(msg){
		this.leaderID = msg.issuerID;
		this.timeToVictory = 0;
		this.awaitingVictory = false;
		this.isNominated = false;
		this.timeToPanic = getCurrentTime() + followerTimeout;
		this.hasLeader = true;
		this.leader = false;
		//console.log("All hail our glorious leader!");
	}

	this.broadcastMessage = function(msg){
		for (var i in this.neighbors){
			this.sendMessage(this.neighbors[i], msg);
		}
	}

	this.sendMessage = function(targetNode, msg){
		if (targetNode.id != msg.issuerID){
			targetNode.inbox.push(msg);
		}
	}

	this.writeMessage = function(content){
		var messageID = "" + this.id + getCurrentTime();
		this.forwardMessage(new Message(messageID, content, this.id));
	}

	return this;
}

var drawNode = function(node){
	for (var object in node.paperObjects){
		node.paperObjects[object].remove();
	}

	node.paperObjects = [];

	var radius = nodeRadius;
	if (node.leader){
		radius = radius *2;
	}
	var paperNode = paper.Path.Circle(node.position, radius);

	paperNode.parentNode = node;

	nodeLayer.addChild(paperNode);

	if (node.leader){
		paperNode.strokeColor = nodeLeaderColor;
		paperNode.strokeWidth = nodeLeaderStrokeWidth;
	} else if (!node.hasLeader){
		paperNode.strokeColor = nodeUncertainColor;
	}
	else {
		paperNode.strokeColor = nodeStrokeColor;
	}

	if (node.infected){
		paperNode.fillColor = nodeInfectedColor;
	} else {
		paperNode.fillColor = nodeOKColor;
	}

	paperNode.strokeWidth = nodeStrokeWidth;

	node.paperObjects.push(paperNode);

	for (var i in node.neighbors){
		var neighbor = node.neighbors[i];
		var neighborLine = paper.Path.Line(node.position, neighbor.position);
		neighborLine.strokeWidth = connectionStrokeWidth;
		if (node.hasLeader){
			neighborLine.strokeColor = connectionStrokeColor;
		} else {
			neighborLine.strokeColor = strokeUncertainColor;
		}
		node.paperObjects.push(neighborLine);
		connectionLayer.addChild(neighborLine);
	}
}

var createNode = function(x, y){

	var p = new paper.Point(x,y);
	var valid = true;
	for (var n in nodes){
		var dist = p.getDistance(nodes[n].position);
		if (dist < validDistance){
			valid = false;
		}
	}

	if (valid){
		var newNode = new node(x,y, counter);
		counter++;
		nodes.push(newNode);
		newNode.findNeighbors(nodes);
		drawNode(newNode);	
	}
}

var getCurrentTime = function(){
	var d = new Date();
	return d.getTime();
}

var processNodes = function(){
	for (var i in nodes){
		nodes[i].checkLeaderStatus();
		nodes[i].processMessages();
	}
}

var broadcastNodes = function(){
	for (var i in nodes){
		nodes[i].broadcastMessages();
	}
}

var removeNode = function(node){
	var index = nodes.indexOf(node);
	nodes.splice(index, 1);
	node.remove();
}

var updateNodes = function(){
	for (var i in nodes){
		drawNode(nodes[i]);
	}
}

var step = function(){
	processNodes();
	broadcastNodes();
	updateNodes();
}

var clickTool = new paper.Tool();

clickTool.onKeyDown = function(event){
	if (event.key == 'shift'){
		del = true;
	}
}

clickTool.onKeyUp = function(event){
	if (event.key == 'shift'){
		del = false;
	}
}

clickTool.onMouseDrag = function(event){
	if (del){
		var hitOptions = {
		stroke: false,
        fill: true,
        tolerance: 5,
		}
		var result = nodeLayer.hitTest(event.point, hitOptions);
		if (result != null){
			removeNode(result.item.parentNode);
		}
	}
	else {
		createNode(event.point.x, event.point.y);
	}
}

clickTool.onMouseDown = function(event){
	var hitOptions = {
		stroke: false,
        fill: true,
        tolerance: 5,
	}
	var result = nodeLayer.hitTest(event.point, hitOptions);
	if (result != null){
		if (del){
			removeNode(result.item.parentNode);
		} else {
			result.item.parentNode.activate();
		}
	} else {
		createNode(event.point.x, event.point.y);
	}

}

paper.view.onFrame = function(){
	if (getCurrentTime() > nextFrameTime){
		step();
		nextFrameTime = getCurrentTime() + frameDelay;
	} 
}