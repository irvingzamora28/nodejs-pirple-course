
/*
 * Helpers for various tasks
 *
 */

// Dependencies
import config from './config.js'
import crypto from 'crypto'
import https from 'https'
import querystring from 'querystring'

// Container for all the helpers
var helpers = {};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
	try {
		return JSON.parse(str)
	} catch (error) {
		return {}
	}
}

// Create a SHA256 hash
helpers.hash = (str) => {
	if (typeof (str) == 'string' && str.length > 0) {
		var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
		return hash;
	} else {
		return false;
	}
};

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (strLength) => {
	strLength = typeof (strLength) == 'number' && strLength > 0 ? strLength : false
	if (strLength) {
		let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
		let str = ''
		for (let idx = 1; idx <= strLength; idx++) {
			str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
		}
		return str;
	} else {
		return false;
	}
}

helpers.sendTwilioSms = (phone, message, callback) => {
	phone = typeof (phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false
	message = typeof (message) == 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false

	if (phone && message) {
		let payload = {
			'From': config.twilio.fromPhone,
			'To': `+52${phone}`,
			'Body': message
		}

		let stringPayload = querystring.stringify(payload)

		let requestDetails = {
			'protocol': 'https:',
			'hostname': 'api.twilio.com',
			'method': 'POST',
			'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
			'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
			'headers': {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload)
			}
		}

		let request = https.request(requestDetails, (response) => {
			// Get the status of the sent request
			let status = response.statusCode

			// Callback successfully if the request went through
			if (status == 200 || status == 201) {
				callback(false)
			} else {
				callback(`Status code returned: ${status}`)
			}
		})

		// Bind to the error event so it doesn't get thrown
		request.on('error', (error) => {
			callback(error)
		})

		// Add the payload
		request.write(stringPayload)

		request.end()
	} else {
		callback('Given parameters were missing or invalid')
	}
}

// Export the module
export default helpers