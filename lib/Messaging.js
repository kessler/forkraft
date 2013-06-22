var cluster = require('cluster');
var api = {};

api.messageHandler = function(type, callback) {
	return function(message) {
		if (message.type && message.type === type) 
			callback(message);
	}
};

/*
	send something to the entire cluster
*/
api.clusterBroadcast = function(msg) {	
	if (cluster.isMaster) {
		if (msg.type && msg.type === 'relay') 
			throw new Error('dont broadcast/originate relay messages from master process');

		for (var id in cluster.workers) {		 
			var worker = cluster.workers[id];				
			worker.send(msg);
		}
	} else {
		// at worker
		var rm = { type: 'relay', payload: msg };
		process.send(rm);
	}
};

api.sendExcluding = function(msg, excludedWorkers) {
	for (var id in cluster.workers) {		 
		if (excludedWorkers.indexOf(id) > -1) 
			continue;

		var worker = cluster.workers[id];				
		worker.send(msg);	
	}
};

api.setupMasterMessageRelay = function () {

	for (var id in cluster.workers) {    	
		var worker = cluster.workers[id];
		worker.on('message', masterRelay(id));
	}

	function masterRelay(originWorkerId) {
		return function(msg) {
			if (msg.type && msg.type === 'relay') {
				api.sendExcluding(msg, [originWorkerId]);
			}
		}
	}
};

module.exports = api;