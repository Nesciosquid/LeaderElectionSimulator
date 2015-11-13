paper.setup("c");

var counter = 0;
var nodeRadius = 20;
var nodeSignalRadius = 200;
var backgroundColor = "#dddddd";
var nodeColor = "#ffffff";
var nodeStrokeColor = "#000000";
var nodeStrokeWidth = 3;
var nodeLeaderStrokeWidth = 5;
var nodeLeaderColor = "#AAAAFF";
var nodeOKColor = "#AAFFAA";
var nodeInfectedColor = "#FFAAAA";
var connectionStrokeWidth = 2;
var connectionStrokeColor = "#000000";
var validRadius = nodeRadius * 4;


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
	this.neighbors = [];

	this.isValid = function(neighbor, validDistance){
		var dist = this.position.getDistance(neighbor.position); 
		if (dist < validDistance){
			return true;
		}
		else return false;
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

	this.isValidNodeLocation = function(nodes){
		this.neighbors = [];
		for (var i in nodes){
			var neighbor = nodes[i];
			if (neighbor.id != this.id && !this.isValid(nodes[i]), validRadius){
				return false
			}
		}
		return true;
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

	var paperNode = paper.Path.Circle(node.position, node.radius);
	nodeLayer.addChild(paperNode);

	if (node.leader){
		paperNode.strokeColor = nodeLeaderColor;
	} else {
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
	var newNode = new node(x,y, counter);
	//if (newNode.isValidNodeLocation(nodes)){
		counter++;
		nodes.push(newNode);
		newNode.findNeighbors(nodes);
		drawNode(newNode);
	//}
}