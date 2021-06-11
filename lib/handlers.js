/**
 * Request handlers
 */

import _data from './data.js'
import helpers from './helpers.js'

const handlers = {}

handlers.ping = (data, callback) => {
    callback(200)
}

handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    const method = data.method.toLowerCase()
    if (acceptableMethods.indexOf(method) > -1) {
        handlers._users[method](data, callback)
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
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    let tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (error, data) => {
            if (error) {
                // Hash password
                let hashedPassword = helpers.hash(password)
                console.log(hashedPassword);

                if (hashedPassword) {
                    let userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': tosAgreement
                    }

                    _data.create('users', phone, userObject, (error) => {
                        if (!error) {
                            callback(200)
                        } else {
                            console.log(error)
                            callback(500, { 'Error': 'Could not create the new user' })
                        }
                    })
                } else {
                    callback(500, { 'Error': 'Could not has the user\'s password' })
                }


            } else {
                callback(400, { 'Error': 'A user with that phone number already exists' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required fields' })
    }

}

// TODO: Only let authenticated user access their object. Don't let them access anyone else's
handlers._users.get = (data, callback) => {
    // Check phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
        _data.read('users', phone, (error, userData) => {
            if (!error && userData) {
                // Remove the hashed password from the user object before returning it to the request
                delete userData.hashedPassword
                callback(200, userData)
            } else {
                callback(404, { 'Error': 'Phone number doesn\' exist' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing phone number' })
    }
}

/**
 * Required field: phone
 * Optional fields: firstName, lastName, password
 * TODO: Only let an authenticated user update their own object
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.put = (data, callback) => {
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    
    if (phone) {
        
        if (firstName || lastName || password) {
            _data.read('users', phone, (error, userData) => {
                if (!error && userData) {
                    if (firstName) {
                        userData.firstName = firstName
                    }
                    if (lastName) {
                        userData.lastName = lastName
                    }
                    if (password) {
                        userData.password = helpers.hash(password)
                    }
                    
                    _data.update('users', phone, userData, (error) => {
                        if (!error) {
                            callback(200)
                        } else {
                            console.log(error)
                            callback(500, { 'Error': 'Could not update user' })
                        }
                    })
                } else {
                    callback(400, { 'Error': 'Phone number doesn\' exist' })
                }
            })
            
        } else {
            callback(400, { 'Error': 'Missing fields to update' })
        }
    } else {
        callback(400, { 'Error': 'Missing phone number' })
    }
}

/**
 * Required field: phone
 * 
 * TODO: Only let an authenticated user delete their own object
 * TODO: Cleanup (delete) any other data files associated with this user
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.delete = (data, callback) => {
    // Check phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
        _data.read('users', phone, (error, userData) => {
            if (!error && userData) {
                _data.delete('users', phone, (error) => {
                    if (!error) {
                        callback(200)
                    } else {
                        callback(500, {'Error': 'Could not delete the specified user'})
                    }
                })
            } else {
                callback(400, { 'Error': 'Phone number doesn\' exist' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing phone number' })
    }
}

handlers.notFound = (data, callback) => {
    callback(404)
}

export default handlers