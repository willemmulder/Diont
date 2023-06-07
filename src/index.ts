import os from 'os'
import dgram from 'dgram'

const socket = dgram.createSocket({
	type: 'udp4',
	reuseAddr: true
})

const MULTICAST_HOST = '224.0.0.236' as const
const BROADCAST_HOST = '255.255.255.255' as const
const ALL_PORT = 60540 as const
const MULTICAST_TTL = 1 as const // Local network

export interface IDiontOptions {
	broadcast: boolean
	host: string
	port: number
	ttl: number
}

export interface IService {
	name: string
	host: string
	port: number | string

	[key: string]: unknown
}

export type IOptionalHostService = Omit<IService, 'host'> & {
	host?: IService['host']
}

export interface IServiceInfo {
	isOurService: boolean
	service: IService
}

export type IEvents = 'serviceRenounced' | 'serviceAnnounced'

export type IEventCallback = (serviceInfo: IServiceInfo) => void

export type IMessage =
	| {
			eventType: 'announce' | 'renounce'
			fromDiontInstance: string
			serviceInfos: IServiceInfo[]
	  }
	| {
			eventType: 'query'
			fromDiontInstance: string
	  }

export interface IExports {
	announceService: (
		service: IOptionalHostService
	) => `${string}:${string}:${string}` | null
	renounceService: (
		service: IService | `${string}:${string}:${string}`
	) => void
	repeatAnnouncements: () => void
	queryForServices: () => void
	on: (eventName: IEvents, callback: IEventCallback) => string
	off: (eventName: IEvents, callbackId: string) => boolean
	getServiceInfos: () => IServiceInfo[]
}

export default function Diont(options: Partial<IDiontOptions> = {}): IExports {
	const instanceId = guid()

	const serviceInfos: Record<string, IServiceInfo> = {}
	const events: Record<IEvents, Record<string, IEventCallback>> = {
		serviceAnnounced: {},
		serviceRenounced: {},
	}

	options = options || {}

	const broadcast = options.broadcast

	const multicastHost = options.host || MULTICAST_HOST
	const port = parseInt(options.port as unknown as string, 10) || ALL_PORT
	const ttl = options.ttl || MULTICAST_TTL
	const sendHost = broadcast ? BROADCAST_HOST : multicastHost

	// Services is a map (service.host+":"+service.port+":"+service.name) => Object serviceInfo
	// where serviceInfo is an object like
	// { isOurService : Boolean, service: Object }

	// =====
	// Set up UDP Broadcast/Multicast connection
	// =====

	socket.bind(port)

	socket.on('listening', function () {
		socket.setMulticastLoopback(true)
		socket.setMulticastTTL(ttl)

		// Tell the OS to listen for messages on the specified host and treat them as if they were meant for this host
		socket.addMembership(multicastHost)

		if (broadcast) socket.setBroadcast(true)

		queryForServices()
	})

	socket.on('message', parseMessage)

	/**
	 * Function to parse incoming messages
	 */
	function parseMessage(message: Buffer) {
		try {
			const messageObject: IMessage = JSON.parse(message.toString())

			const eventType = messageObject.eventType
			const fromDiontId = messageObject.fromDiontInstance

			if (fromDiontId == instanceId) return

			if (eventType == 'query') {
				const serviceInfosToAnnounce: IServiceInfo[] = []

				for (const index in serviceInfos) {
					serviceInfosToAnnounce.push(
						serviceInfos[index] as IServiceInfo
					)
				}

				sendAnnouncement(serviceInfosToAnnounce)

				return
			}

			const receivedServiceInfos = messageObject.serviceInfos

			for (const serviceInfo of receivedServiceInfos) {
				if (!serviceInfo.service) continue

				const service = serviceInfo.service

				const id = serviceToId(service)

				if (eventType == 'announce') {
					if (!serviceInfos[id]) {
						const serviceInfo = {
							isOurService: false,
							service: service,
						}

						serviceInfos[id] = serviceInfo

						for (const callbackId in events['serviceAnnounced']) {
							const callback =
								events['serviceAnnounced'][callbackId]

							callback?.(serviceInfo)
						}
					}
				} else if (eventType == 'renounce') {
					const serviceInfo = serviceInfos[id]

					if (serviceInfo) {
						delete serviceInfos[id]

						for (const callbackId in events['serviceRenounced']) {
							const callback =
								events['serviceRenounced'][callbackId]

							callback?.(serviceInfo)
						}
					}
				}
			}
		} catch (e) {
			// ignore...
		}
	}

	// =====
	// Exported functions
	// =====

	const exportAnnounceService = function (service: IOptionalHostService) {
		if (!getNetworkIPAddress()) return null

		if (!service.host) service.host = getNetworkIPAddress() as string

		const populatedService = service as IService

		const id = serviceToId(populatedService)

		if (!serviceInfos[id]) {
			const serviceInfo = (serviceInfos[id] = {
				isOurService: true,
				service: populatedService,
			})

			sendAnnouncement(serviceInfo)
		}

		return id
	}

	const exportRenounceService = function (
		service: IService | `${string}:${string}:${string}`
	) {
		let id
		if (typeof service == 'string') {
			id = service
		} else {
			id = serviceToId(service)
		}

		const serviceInfo = serviceInfos[id]

		if (!serviceInfo) return

		if (serviceInfo.isOurService) {
			sendRenouncement(serviceInfo)

			delete serviceInfos[id]
		}
	}

	const exportRepeatAnnouncements = function () {
		for (const id in serviceInfos) {
			const serviceInfo = serviceInfos[id] as IServiceInfo

			sendAnnouncement(serviceInfo)
		}
	}

	const exportQueryForServices = function () {
		queryForServices()
	}

	const exportOn = function (eventName: IEvents, callback: IEventCallback) {
		const callbackId = guid()

		events[eventName][callbackId] = callback

		return callbackId
	}

	const exportOff = function (eventName: IEvents, callbackId: string) {
		delete events[eventName][callbackId]

		return true
	}

	const exportGetServiceInfos = function (): IServiceInfo[] {
		return JSON.parse(JSON.stringify(serviceInfos))
	}

	// =====
	// Helper functions
	// =====

	function sendAnnouncement(serviceInfo: IServiceInfo[] | IServiceInfo) {
		let serviceInfosToAnnounce: IServiceInfo[] = []

		if (Array.isArray(serviceInfo)) {
			serviceInfosToAnnounce = serviceInfo
		} else {
			serviceInfosToAnnounce = [serviceInfo]
		}

		const messageObject: IMessage = {
			eventType: 'announce',
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToAnnounce,
		}

		const message = JSON.stringify(messageObject)

		const buffer = Buffer.from(message)

		socket.send(buffer, 0, buffer.length, port, sendHost)
	}

	function sendRenouncement(serviceInfo: IServiceInfo | IServiceInfo[]) {
		let serviceInfosToRenounce: IServiceInfo[] = []

		if (Array.isArray(serviceInfo)) {
			serviceInfosToRenounce = serviceInfo
		} else {
			serviceInfosToRenounce = [serviceInfo]
		}

		const messageObject: IMessage = {
			eventType: 'renounce',
			fromDiontInstance: instanceId,
			serviceInfos: serviceInfosToRenounce,
		}

		const message = JSON.stringify(messageObject)
		const buffer = Buffer.from(message)

		socket.send(buffer, 0, buffer.length, port, sendHost)
	}

	function queryForServices() {
		const messageObject: IMessage = {
			eventType: 'query',
			fromDiontInstance: instanceId,
		}

		const message = JSON.stringify(messageObject)
		const buffer = Buffer.from(message)

		socket.send(buffer, 0, buffer.length, port, sendHost)
	}

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1)
		}

		return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}${s4()}`
	}

	function serviceToId(service: IService): `${string}:${string}:${string}` {
		return `${service.host}:${service.port}:${service.name}`
	}

	function getNetworkIPAddress(): string | null {
		const networkInterfaces = os.networkInterfaces()
		const addresses: string[] = []
		let localAddress: string = ''

		for (let dev in networkInterfaces) {
			networkInterfaces[dev]?.forEach(details => {
				if (details.family == 'IPv4' && details.internal === false) {
					addresses.push(details.address)

					if (details.address.indexOf('192.168.') === 0) {
						localAddress = details.address
					}
				}
			})
		}

		// Return a 192.168.x.x address if possible, otherwise return the first address found
		if (localAddress) return localAddress

		return addresses[0] ? addresses[0] : null
	}

	// =====
	// Export
	// =====

	return {
		announceService: exportAnnounceService,
		renounceService: exportRenounceService,
		repeatAnnouncements: exportRepeatAnnouncements,
		queryForServices: exportQueryForServices,
		on: exportOn,
		off: exportOff,
		getServiceInfos: exportGetServiceInfos,
	}
}
