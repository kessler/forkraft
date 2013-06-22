var Messaging = require('../lib/Messaging');
var assert = require('assert');
var $u = require('util');
var EventEmitter = require('events').EventEmitter;

$u.inherits(Sendable, EventEmitter);
function Sendable() {
	EventEmitter.call(this);
	this.sent = [];
}

Sendable.prototype.send = function(message) {
	this.sent.push(message);
};

function ClusterMock() {
	this.workers = {
		1: new Sendable(),
		2: new Sendable()
	};
}

var processMock = new Sendable();
var clusterMock = new ClusterMock();

Messaging._replaceDependencies(clusterMock, processMock);

describe('Messaging helper for clusters', function () {

	beforeEach(function(){
		processMock.sent = [];
		for (var i in clusterMock.workers)
			clusterMock.workers[i].sent = [];
	});

	
	it('attach a handler to the message event on the supplied target', function (done) {
		clusterMock.isMaster = false;

		Messaging.once('test2', function(message) {
			assert.strictEqual(message, 2);
			done();
		}, processMock);

		processMock.emit('message',  new Messaging.__InternalMessage('test2', 2));
	});

	it('attach a handler to the message event on the process object if not run in master process (and a target is not supplied in the call)', function (done) {
		clusterMock.isMaster = false;

		Messaging.once('test1', function(message) {
			assert.strictEqual(message, 1);
			done();
		});

		processMock.emit('message', new Messaging.__InternalMessage('test1', 1));
	});

	it('attach a handler to every worker when run in master process (and a target is not supplied in the call)', function (done) {
		clusterMock.isMaster = true;
		
		var fired = 0;

		Messaging.once('test3', function(message) {			
			assert.strictEqual(message, 3);

			if (++fired === 2)
				done();
		});

		for (var id in clusterMock.workers)
			clusterMock.workers[id].emit('message', new Messaging.__InternalMessage('test3', 3));
	});

	it('sends a message to a target', function () {
		Messaging.send('boom', 4, processMock);
		assert.strictEqual(processMock.sent.length, 1);
		assert.deepEqual(processMock.sent[0], { __type: 'boom', __payload: 4 });		
	});

	it('sends a message via process.send', function () {
		Messaging.send('boom', 5);

		assert.strictEqual(processMock.sent.length, 1);
		assert.deepEqual(processMock.sent[0], { __type: 'boom', __payload: 5 });		
	});

	it('broadcasts a message from master process to all workers', function() {
	 	clusterMock.isMaster = true;
		
	 	Messaging.broadcast('boom', 6);
	 	
	 	for (var id in clusterMock.workers) {	 		
	 		var worker = clusterMock.workers[id];

	 		assert.strictEqual(worker.sent.length, 1);
	 		assert.deepEqual(worker.sent[0], { __type: 'boom', __payload: 6 });
	 	}
	});

	it('broadcasts a message from a worker to all other workers through the master', function() {
	 	clusterMock.isMaster = true;

	 	Messaging.setupMasterMessageRelay();

	 	clusterMock.isMaster = false;
			
	 	Messaging.broadcast('boom', 7);

	 	// make sure process.send was called
		assert.strictEqual(processMock.sent.length, 1);
		assert.deepEqual(processMock.sent[0].__payload, { __type: 'boom', __payload: 7 });

	 	var initiatingWorker = clusterMock.workers['1'];

	 	// simulate message being passed from worker to master
	 	clusterMock.isMaster = true;
	 	initiatingWorker.emit('message', processMock.sent[0]);

	 	assert.strictEqual(initiatingWorker.sent.length, 0, 'initiating worker should not have gotten any message from master');

	 	var anotherWorker = clusterMock.workers['2'];
	 	assert.strictEqual(anotherWorker.sent.length, 1, 'worker should have received the message');
	 	assert.deepEqual(anotherWorker.sent[0], { __type: 'boom', __payload: 7 });	 	
	});
});

