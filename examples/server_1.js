import Diont from '../dist/index.js'

const diont = Diont()

// ======
// Announce our own service
// ======
const service = {
	name: 'TestServer 1',
	host: '127.0.0.1', // defaults to the local IP
	port: '1231',
	// any additional information is allowed
}

diont.announceService(service)

// Renounce after 5 seconds
setTimeout(function () {
	diont.renounceService(service)
}, 5000)
