import Diont from '../src/index'

const diont = Diont()

// ======
// Announce our own service
// ======
const service = {
	name: 'TestServer 2',
	// host: "127.0.0.1", // defaults to the local IP
	port: '1231',
	someAdditionalInfo: 'Ja!',
	// any additional information is allowed
}

const id = diont.announceService(service)

// Renounce after 5 seconds
setTimeout(function () {
	if (id) {
		diont.renounceService(id)
	}
}, 5000)
