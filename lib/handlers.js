/**
 * Request handlers
 */

import _data from './data.js'
import helpers from  './helpers.js'

const handlers = {}

handlers.ping = (data, callback) => {
    callback(200)
}

handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback)
    } else {
        callback(406)
    }
}

// Container for the user's submethods
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users = {}

handlers._users.post = (data, callback) => {
    // Check that all required fields are filled out
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement.trim().length == true ? true : false

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (error, data) => {
            if (error) {
                // Hash password
                let hashedPassword = helpers.hash(password)
                console.log(hashedPassword);
            } else {
                callback(400, {'Error' : 'A user with that phone number already exists'})
            }
        })
    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }

}
handlers._users.get = (data, callback) => {

}
handlers._users.put = (data, callback) => {

}
handlers._users.delete = (data, callback) => {

}

handlers.notFound = (data, callback) => {
    callback(404)
}

export default handlers