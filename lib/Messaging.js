var cluster = require('cluster');
var $u = require('util');

var api = {};

function masterBroadcast(message) {
	for (var id in cluster.workers) {		 
		var worker = cluster.workers[id];				
		worker.send(message);
	}	
}

function masterBroadcastExcluding(message, excludedWorkers) {
	for (var id in cluster.workers) {		 
		if (excludedWorkers.indexOf(id) > -1) 
			continue;

		var worker = cluster.workers[id];				
		worker.send(msg);	
	}
}

api.on = function(type, callback, target) {
	
	function messageHandler(message) {
		if (message.type && message.type === type) 
			callback(message);
	}

	if (target)
		target.on('message', messageHandler);
	else
		process.on('message', messageHandler);
};

/*
	send something to the entire cluster
*/
api.broadcast = function(msg, excludedWorkers) {
	if (cluster.isMaster) {
		if (msg.type && msg.type === 'relay') 
			throw new Error('dont broadcast/originate relay messages from master process');

		if (excludedWorkers)
			masterBroadcastExcluding(msg, excludedWorkers);
		else 
			masterBroadcast(msg);

	} else {
		// at worker
		process.send({ type: 'relay', payload: msg, exclude: excludedWorkers });
	}
};

api.setupMasterMessageRelay = function () {

	if (!cluster.isMaster)
		throw new Error('call this only in the cluster master process');

	for (var id in cluster.workers) {    	
		var worker = cluster.workers[id];
		api.on('relay', masterRelay(id), worker);		
	}

	function masterRelay(originWorkerId) {
		var permanentlyExcluded = [originWorkerId];

		return function(msg) {
			var exclude = permanentlyExcluded;
			
			if ($u.isArray(msg.exclude))
				exclude = exclude.concat(msg.exclude);

			if (typeof(msg.payload) === 'object')
				api.broadcastExcluding(msg.payload, exclude);
			else
				api.broadcastExcluding(msg, exclude);		
		}
	}
};

module.exports = api;