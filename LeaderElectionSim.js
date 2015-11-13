paper.setup("c");

var counter = 0;
var nodeRadius = 10;
var nodeSignalRadius = 100;
var purple = "#4A148C";
var green = "#4CAF50";
var red = "#F44336";
var blue = "#3F51B5";
var black = "#000000";
var gray = "#EEEEEE";
var darkGray = "#616161";
var white = "#FFFFFF";
var backgroundColor = gray;
var nodeStrokeColor = darkGray;
var nodeStrokeWidth = 3;
var nodeLeaderStrokeWidth = 5;
var nodeLeaderColor = blue;
var nodeUncertainColor = gray;
var nodeOKColor = green;
var nodeInfectedColor = red;
var connectionStrokeWidth = 2;
var connectionStrokeColor = darkGray;
var validDistance = 30;


var background = new paper.Path.Rectangle({
        from: paper.view.bounds.topLeft,
        to: paper.view.bounds.bottomRight, 
        fillColor: '#dddddd',
    });

background.onMouseDrag = function(event){
	createNode(event.point.x, event.point.y);
}

var backgroundLayer = new paper.Layer();
var nodeLayer = new paper.Layer();
var connectionLayer = new paper.Layer();

connectionLayer.insertBelow(nodeLayer);
backgroundLayer.insertBelow(connectionLayer);


var nodes = [];

var nodeTool = new paper.Tool();

var node = function(x, y, id){
	this.position = new paper.Point(x,y);
	this.leader = false;
	this.infected = false;
	this.id = id;
	this.paperObjects = [];
	this.hasLeader = false;
	this.leaderID = -1;
	this.neighbors = [];

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
			}
		}
	}

	return this;
}

var drawNode = function(node){
	for (var object in node.paperObjects){
		object.remove();
	}

	node.paperObjects = [];

	var paperNode = paper.Path.Circle(node.position, nodeRadius);
	nodeLayer.addChild(paperNode);

	if (node.leader){
		paperNode.strokeColor = nodeLeaderColor;
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
		neighborLine.strokeColor = connectionStrokeColor;
		node.paperObjects.push(neighborLine);
		connectionLayer.addChild(neighborLine);
	}
}

window.onload = function(){
}


nodeTool.onMouseDown = function(event) {
	createNode(event.point.x, event.point.y);
}

nodeTool.onMosueDrag = function(event) {
	console.log('You dragged the mouse!');
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
