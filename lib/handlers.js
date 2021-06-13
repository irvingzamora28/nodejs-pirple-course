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

handlers._users.get = (data, callback) => {
    // Check phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
        // Get the token from the headers
        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
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
                callback(403, {'Error': 'Missing required token in header or token is invaliud'})
            }
        })

    } else {
        callback(400, { 'Error': 'Missing phone number' })
    }
}

/**
 * Required field: phone
 * Optional fields: firstName, lastName, password
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

            // Get the token from the headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
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
                    callback(403, {'Error': 'Missing required token in header or token is invaliud'})
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

         // Get the token from the headers
         let token = typeof(data.headers.token) == 'string' ? data.headers.token : false
         handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
             if (tokenIsValid) {
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
                 callback(403, {'Error': 'Missing required token in header or token is invaliud'})
             }
         })

        
    } else {
        callback(400, { 'Error': 'Missing phone number' })
    }
}

handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    const method = data.method.toLowerCase()
    if (acceptableMethods.indexOf(method) > -1) {
        handlers._tokens[method](data, callback)
    } else {
        callback(406)
    }
}

// Container for the token's submethods
handlers._tokens = {}

/**
 * Required fields: phone, password
 */
handlers._tokens.post = (data, callback) => {
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

    if(phone && password) {
        _data.read('users', phone, (error, userData) => {
            if (!error && userData) {
                let hashedPassword = helpers.hash(password)
                if (hashedPassword == userData.hashedPassword) {
                    let tokenId = helpers.createRandomString(20)
                    let expires = Date.now() + 1000 * 60 * 60;

                    let tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    }

                    _data.create('tokens', tokenId, tokenObject, (error) => {
                        if (!error) {
                            callback(200, tokenObject)
                        } else {
                            callback(500, {'Error': 'Could not create the new token'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'Password did not match the specified user\'s password'})
                }
            } else {
                callback(400, {'Error': 'Could not find the specified user'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'})
    }
}

/**
 * Get token
 * Required field: id
 * @param {*} data 
 * @param {*} callback 
 */
handlers._tokens.get = (data, callback) => {
    // Check id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        _data.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                callback(200, tokenData)
            } else {
                callback(404, { 'Error': 'id doesn\' exist' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
}

/**
 * Required fields: id, extend
 * @param {*} data 
 * @param {*} callback 
 */
handlers._tokens.put = (data, callback) => {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false
    let extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false
    
    if (id && extend) {
        _data.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 *  60 * 60;

                    _data.update('tokens', id, tokenData, (error) => {
                        if (!error) {
                            callback(200)
                        } else {
                            callback(500, {'Error': 'Could not update the token\'s expiration'})
                        }
                    })
                } else {
                    callback(400, {'Error': 'The token has already expired, and cannot be extended'})
                }
            }else {
                callback(400, {'Error' : 'Specified token does not exist'})
            }
        })        
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
}

/**
 * Required fields: id
 * @param {*} data 
 * @param {*} callback 
 */
handlers._tokens.delete = (data, callback) => {
    // Check id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        _data.read('tokens', id, (error, tokenData) => {
            if (!error && tokenData) {
                _data.delete('tokens', id, (error) => {
                    if (!error) {
                        callback(200)
                    } else {
                        callback(500, {'Error': 'Could not delete the specified token'})
                    }
                })
            } else {
                callback(400, { 'Error': 'id doesn\' exist' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing id' })
    }   
}

/**
 * Verify if a given token id is currently valid for a given user
 * @param {*} id 
 * @param {*} phone 
 * @param {*} callback 
 */
handlers._tokens.verifyToken = (id, phone, callback) => {
    _data.read('tokens', id, (error, tokenData) => {
        if (!error && tokenData) {
            if (tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}

handlers.notFound = (data, callback) => {
    callback(404)
}

export default handlers