
import os from "os";
import dgram from "dgram";
const socket = dgram.createSocket({type: 'udp4', reuseAddr: true, toString: function () { return 'udp4' }});

const MULTICAST_HOST = "224.0.0.236";
const BROADCAST_HOST = "255.255.255.255";
const ALL_PORT = 60540;
const MULTICAST_TTL = 1; // Local network

export default function Diont(options){

	let instanceId = guid();

	let exports = {};
	let serviceInfos = {};
	let events = {};

	options = options || {};

	let broadcast = !!options.broadcast;

	let multicastHost = options.host || MULTICAST_HOST;
	let port = options.port || ALL_PORT;
	let ttl = options.ttl || MULTICAST_TTL;
	let sendHost = (broadcast ? BROADCAST_HOST : multicastHost);

	// Services is a map (service.host+":"+service.port+":"+service.name) => Object serviceInfo
	// where serviceInfo is an object like
	// { isOurService : Boolean, service: Object }

	// =====
	// Set up UDP Broadcast/Multicast connection
	// =====

	socket.bind(port);
	socket.on('listening', function() {
		socket.setMulticastLoopback(true);
		socket.setMulticastTTL(ttl);
		socket.addMembership(multicastHost); // Tell the OS to listen for messages on the specified host and treat them as if they were meant for this host
		if(broadcast) {
			socket.setBroadcast(true);
		}
		queryForServices();
	});
	socket.on('message', parseMessage);

	// =====
	// Function to parse incoming messages
	// =====

	function parseMessage(message, rinfo) {
		try {
			let messageObject = JSON.parse(message);
			let eventType = messageObject.eventType;
			let fromDiontId = messageObject.fromDiontInstance;
			if (fromDiontId == instanceId) {
				return;
			}
			if (eventType == "query") {
				let serviceInfosToAnnounce = [];
				for(let index in serviceInfos) {
					serviceInfosToAnnounce.push(serviceInfos[index]);
				}
				sendAnnouncement(serviceInfosToAnnounce);
			} else {
				let receivedServiceInfos = messageObject.serviceInfos;
				for(let serviceInfoIndex in receivedServiceInfos) {
					let serviceInfo = receivedServiceInfos[serviceInfoIndex];
					if(!serviceInfo.service) {
						continue;
					}
					let service = serviceInfo.service;
					if (!service.host || !service.port || !service.name) {
						continue;
					}
					if (eventType == "announce") {
						let id = service.host + ":" + service.port + ":" + service.name;
						if(!serviceInfos[id]) {
							let serviceInfo = serviceInfos[id] = {
								isOurService: false,
								service: service
							}
							if (events["serviceAnnounced"]) {
								for(let callbackId in events["serviceAnnounced"]) {
									let callback = events["serviceAnnounced"][callbackId];
									callback(serviceInfo);
								}
							}
						}
					} else if (eventType == "renounce") {
						let id = service.host + ":" + service.port + ":" + service.name;
						if(serviceInfos[id]) {
							let serviceInfo = serviceInfos[id];
							delete serviceInfos[id];
							if (events["serviceRenounced"]) {
								for(let callbackId in events["serviceRenounced"]) {
									let callback = events["serviceRenounced"][callbackId];
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
	};

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
		let id = service.host + ":" + service.port + ":" + service.name;
		if(!serviceInfos[id]) {
			let serviceInfo = serviceInfos[id] = {
				isOurService: true,
				service: service
			}
			sendAnnouncement(serviceInfo);
		}
		return id;
	}

	exports.renounceService = function(service) {
		let id;
		if (typeof service == 'string') {
			id = service;
		} else {
			if (!service.host || !service.port || !service.name) {
				return false;
			}
			id = service.host + ":" + service.port + ":" + service.name;
		}
		if(serviceInfos[id] && serviceInfos[id].isOurService) {
			sendRenouncement(serviceInfos[id]);
			delete serviceInfos[id];
		}
	}

	exports.repeatAnnouncements = function() {
		for(let id in serviceInfos) {
			let serviceInfo = serviceInfos[id];
			sendAnnouncement(serviceInfo);
		}
	}

	exports.queryForServices = function() {
		queryForServices();
	}

	exports.on = function(eventName, callback) {
		if(!events[eventName]) {
			events[eventName] = {};
		}
		let callbackId = guid();
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
		let serviceInfosToAnnounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToAnnounce = serviceInfo;
		} else {
			serviceInfosToAnnounce = [serviceInfo];
		}
		let messageObject = {
			eventType: "announce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToAnnounce
		}
		let message = JSON.stringify(messageObject);
		let buffer = Buffer.from(message);
		socket.send(buffer, 0, buffer.length, port, sendHost);
	}

	function sendRenouncement(serviceInfo) {
		let serviceInfosToRenounce = [];
		if (serviceInfo instanceof Array) {
			serviceInfosToRenounce = serviceInfo;
		} else {
			serviceInfosToRenounce = [serviceInfo];
		}
		let messageObject = {
			eventType: "renounce",
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToRenounce
		}
		let message = JSON.stringify(messageObject);
		let buffer = Buffer.from(message);
		socket.send(buffer, 0, buffer.length, port, sendHost);
	}

	function queryForServices() {
		let messageObject = {
			eventType: "query",
			fromDiontInstance: instanceId
		}
		let message = JSON.stringify(messageObject);
		let buffer = Buffer.from(message);
		socket.send(buffer, 0, buffer.length, port, sendHost);
	}

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	}

	function getNetworkIPAddress() {
		let ifaces = os.networkInterfaces();
		let addresses = [];
		let localAddress;
		for (let dev in ifaces) {
			ifaces[dev].forEach(function(details){
				if (details.family=='IPv4' && details.internal === false) {
					addresses.push(details.address);
					if (details.address.indexOf('192.168.') === 0) {
						localAddress = details.address;
					}
				}
			});
		}
		// Return a 192.168.x.x address if possible, otherwise return the first address found
		if (localAddress) {
			return localAddress;
		}
		return addresses[0];
	}

	// =====
	// Export
	// =====

	return exports;
}
