import Diont from '../dist/index.js'

const diont = Diont({
	broadcast: true,
})

// ======
// Announce our own service
// ======
const service = {
	name: 'TestServer 3',
	// host: "127.0.0.1", // defaults to the local IP
	port: '1233',
	announcedViaBroadcast: 'Oh yes!',
	// any additional information is allowed
}

diont.announceService(service)

// Renounce after 5 seconds
setTimeout(function () {
	diont.renounceService(service)
}, 5000)
