import Diont from '../src/index.js'

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

const id = diont.announceService(service)

// Renounce after 5 seconds
setTimeout(function () {
	if (id) {
		diont.renounceService(id)
	}
}, 5000)
