import Diont from '../diont.js';
const diont = Diont();

// ======
// Announce our own service
// ======
var service = {
	name: "TestServer 2",
	// host: "127.0.0.1", // defaults to the local IP
	port: "1231",
	someAdditionalInfo: "Ja!"
	// any additional information is allowed
};
diont.announceService(service);

// Renounce after 5 seconds
setTimeout(function() {
	diont.renounceService(service);
}, 5000);