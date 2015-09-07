var cluster = require('cluster');
var _process = process;
var $u = require('util');

var RELAY = '__relay__';

var api = {};

function masterBroadcast(type, message) {
	for (var id in cluster.workers) {
		var worker = cluster.workers[id];
		api.send(type, message, worker);
	}
}

function masterBroadcastExcluding(type, message, excludedWorkers) {
	for (var id in cluster.workers) {
		if (excludedWorkers.indexOf(id) > -1) {
			continue;
		}

		var worker = cluster.workers[id];
		api.send(type, message, worker);
	}
}

function InternalMessage(type, payload, excludedWorkers) {
	this.__type = type;
	this.__payload = payload;
	if (excludedWorkers) {
		this.__excluded = excludedWorkers;
	}
}

api.__InternalMessage = InternalMessage;

/*
	for testing purposes
*/
api._replaceDependencies = function(c, p) {
	cluster = c;
	_process = p;
};

function on(eventFunction, type, callback, target) {
	

	if (target) {
		// caller specified an explicit target
		target[eventFunction]('message', messageHandler(callback, type));

	} else if (cluster.isMaster) {

		//master
		for (var id in cluster.workers) {
			var worker = cluster.workers[id]
			worker[eventFunction]('message', messageHandler(callback, type, worker));
		}

	} else {

		// worker
		_process[eventFunction]('message', messageHandler(callback, type));
	}
}

function messageHandler(callback, type, worker) {
	return function handler(message) {
		if (message.__type && message.__type === type)
			callback(message.__payload, worker);
	}
}

api.on = function(type, callback, target) {
	on('on', type, callback, target);
};

api.once = function(type, callback, target) {
	on('once', type, callback, target);
};

/*
	send something to the entire cluster
*/
api.broadcast = function(type, msg, excludedWorkers) {

	if (cluster.isMaster) {
		if (type === RELAY) {
			throw new Error('dont broadcast/originate relay messages from master process');
		}

		if (excludedWorkers) {
			masterBroadcastExcluding(type, msg, excludedWorkers);
		} else {
			masterBroadcast(type, msg);
		}

	} else {
		// at worker
		api.send(RELAY, new InternalMessage(type, msg, excludedWorkers));
	}
};

api.send = function(type, message, target) {
	var internalMessage = new InternalMessage(type, message);

	if (target) {
		target.send(internalMessage);
	} else {
		_process.send(internalMessage);
	}
};

api.setupMasterMessageRelay = function() {

	if (!cluster.isMaster) {
		throw new Error('call this only in the cluster master process');
	}

	for (var id in cluster.workers) {
		var worker = cluster.workers[id];
		api.on(RELAY, masterRelay(id), worker);
	}

	function masterRelay(originWorkerId) {
		var permanentlyExcluded = [originWorkerId];

		return function(payload) {

			var excluded = permanentlyExcluded;

			if ($u.isArray(payload.__excluded))
				excluded = excluded.concat(payload.__excluded);

			api.broadcast(payload.__type, payload.__payload, excluded);
		}
	}
};

module.exports = api;
