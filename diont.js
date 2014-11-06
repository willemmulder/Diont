
var os = require("os");
var dgram = require("dgram");
var socket = dgram.createSocket('udp4');

var MULTICAST_HOST = "224.0.0.236";
var MULTICAST_PORT = 80;

module.exports = function(options){

	var instanceId = guid();

	var exports = {};
	var serviceInfos = {};
	var events = {};

	var options = options || {};
	var host = options.host || MULTICAST_HOST;
	var port = options.port || MULTICAST_PORT;

	// Services is a map (service.host+":"+service.port+":"+service.name) => Object serviceInfo
	// where serviceInfo is an object like
	// { isOurService : Boolean, service: Object }

	// =====
	// Set up UDP Multicast connection
	// =====

	socket.bind(port);
	socket.on('listening', function() {
		socket.setMulticastTTL(1); // Local network
		socket.addMembership(host); // Tell the OS to listen for messages on the specified host and treat them as if they were meant for this host
		socket.setMulticastLoopback(true);
		queryForServices();
	});

	socket.on('message', function(message, rinfo) {
		try {
			var messageObject = JSON.parse(message);
			var eventType = messageObject.eventType;
			var fromDiontId = messageObject.fromDiontInstance;
			if (fromDiontId == instanceId) {
				return;
			}
			if (eventType == "query") {
				var serviceInfosToAnnounce = [];
				for(var index in serviceInfos) {
					serviceInfosToAnnounce.push(serviceInfos[index]);
				}
				sendAnnouncement(serviceInfosToAnnounce);
			} else {
				var receivedServiceInfos = messageObject.serviceInfos;
				for(var serviceInfoIndex in receivedServiceInfos) {
					var serviceInfo = receivedServiceInfos[serviceInfoIndex];
					if(!serviceInfo.service) {
						continue;
					}
					var service = serviceInfo.service;
					if (!service.host || !service.port || !service.name) {
						continue;
					}
					if (eventType == "announce") {
						var id = service.host + ":" + service.port + ":" + service.name;
						if(!serviceInfos[id]) {
							var serviceInfo = serviceInfos[id] = {
								isOurService: false,
								service: service
							}
							if (events["serviceAnnounced"]) {
								for(var callbackId in events["serviceAnnounced"]) {
									var callback = events["serviceAnnounced"][callbackId];
									callback(serviceInfo);
								}
							}
						}
					} else if (eventType == "renounce") {
						var id = service.host + ":" + service.port + ":" + service.name;
						if(serviceInfos[id]) {
							var serviceInfo = serviceInfos[id];
							delete serviceInfos[id];
							if (events["serviceRenounced"]) {
								for(var callbackId in events["serviceRenounced"]) {
									var callback = events["serviceRenounced"][callbackId];
									callback(serviceInfo);
								}
							}
						}
					}
				}
			}
		} catch(e) {
			// ignore...
		}
	});

	// =====
	// Exported functions
	// =====

	exports.announceService = function(service) {
		if (!service.host) {
			service.host = getNetworkIPAddress();
		}
		if (!service.host || !service.port || !service.name) {
			return false;
		}
		var id = service.host + ":" + service.port + ":" + service.name;
		if(!serviceInfos[id]) {
			var serviceInfo = serviceInfos[id] = {
				isOurService: true,
				service: service
			}
			sendAnnouncement(serviceInfo);
		}
	}

	exports.renounceService = function(service) {
		if (!service.host || !service.port || !service.name) {
			return false;
		}
		var id = service.host + ":" + service.port + ":" + service.name;
		if(serviceInfos[id] && serviceInfos[id].isOurService) {
			sendRenouncement(serviceInfos[id]);
			delete serviceInfos[id];
		}
	}

	exports.queryForServices = function() {
		queryForServices();
	}

	exports.on = function(eventName, callback) {
		if(!events[eventName]) {
			events[eventName] = {};
		}
		var callbackId = guid();
		events[eventName][callbackId] = callback;
		return callbackId;
	}

	exports.off = function(eventName, callbackId) {
		if(!events[eventName]) {
			return false;
		}
		delete events[eventName][callbackId];
		return true;
	}

	exports.getServiceInfos = function() {
		return JSON.parse(JSON.stringify(serviceInfos));
	}

	// =====
	// Helper functions
	// =====

	function sendAnnouncement(serviceInfo) {
		var serviceInfosToAnnounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToAnnounce = serviceInfo;
		} else {
			serviceInfosToAnnounce = [serviceInfo];
		}
		var messageObject = {
			eventType: "announce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToAnnounce
		}
		var message = JSON.stringify(messageObject);
		var buffer = new Buffer(message);
		socket.send(buffer, 0, buffer.length, port, host);
	}

	function sendRenouncement(serviceInfo) {
		var serviceInfosToRenounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToRenounce = serviceInfo;
		} else {
			serviceInfosToRenounce = [serviceInfo];
		}
		var messageObject = {
			eventType: "renounce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToRenounce
		}
		var message = JSON.stringify(messageObject);
		var buffer = new Buffer(message);
		socket.send(buffer, 0, buffer.length, port, host);
	}

	function queryForServices() {
		var messageObject = {
			eventType: "query",
			fromDiontInstance: instanceId
		}
		var message = JSON.stringify(messageObject);
		var buffer = new Buffer(message);
		socket.send(buffer, 0, buffer.length, port, host);
	}

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	function getNetworkIPAddress() {
		var ifaces = os.networkInterfaces();
		var addresses = [];
		for (var dev in ifaces) {
			ifaces[dev].forEach(function(details){
				if (details.family=='IPv4' && details.internal === false) {
					addresses.push(details.address);
				}
			});
		}
		// Only return the first IP address
		return addresses[0];
	}

	// =====
	// Export
	// =====

	return exports;
}