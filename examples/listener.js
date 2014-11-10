var diont = require('../diont.js')({
	broadcast: true
});

// ======
// Listen for announcements and renouncements in services
// ======
diont.on("serviceAnnounced", function(serviceInfo) {
	// A service was announced
	// This function triggers for services not yet available in diont.getServiceInfos()
	// serviceInfo is an Object { isOurService : Boolean, service: Object }
	// service.name, service.host and service.port are always filled
	console.log("A new service was announced", serviceInfo.service);
	// List currently known services
	console.log("All known services", diont.getServiceInfos());
});

diont.on("serviceRenounced", function(serviceInfo) {
	// A service available in diont.getServiceInfos() was renounced
	// serviceInfo is an Object { isOurService : Boolean, service: Object }
	// service.name, service.host and service.port are always filled
	console.log("A service was renounced", serviceInfo.service);
	// List currently known services
	console.log("All known services", diont.getServiceInfos());
});