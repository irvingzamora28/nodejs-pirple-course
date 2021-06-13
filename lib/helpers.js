
/*
 * Helpers for various tasks
 *
 */

// Dependencies
import config from './config.js'
import crypto from 'crypto'

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
		for(let idx = 1; idx <= strLength; idx++) {
			str += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
		}
		return str;
	} else {
		return false;
	}
}

// Export the module
export default helpers