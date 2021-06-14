/**
 * Request handlers
 */

import _data from './data.js'
import helpers from './helpers.js'
import config from './config.js'

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
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
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
                callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
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
            let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
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
                    callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
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
 * @param {*} data 
 * @param {*} callback 
 */
handlers._users.delete = (data, callback) => {
    // Check phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {

        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (error, userData) => {
                    if (!error && userData) {
                        _data.delete('users', phone, (error) => {
                            if (!error) {
                                // Delete each of the checks related to the user
                                let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                let checksToDelete = userChecks.length
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0
                                    let deleteErrors = false
                                    userChecks.forEach((checkId) => {
                                        _data.delete('checks', checkId, (error) => {
                                            if (error) {
                                                deleteErrors = true
                                            }
                                            checksDeleted++
                                            if (checksDeleted == checksToDelete) {
                                                if (!deleteErrors) {
                                                    callback(200)
                                                } else {
                                                    callback(500, {'Error': 'Errors encountered while  attemptiing to delete all user\'s checks. All checks may have not been deleted'})
                                                }
                                            }
                                        })
                                    })
                                } else {
                                    callback(200)
                                }
                            } else {
                                callback(500, { 'Error': 'Could not delete the specified user' })
                            }
                        })
                    } else {
                        callback(400, { 'Error': 'Phone number doesn\' exist' })
                    }
                })

            } else {
                callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
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

    if (phone && password) {
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
                            callback(500, { 'Error': 'Could not create the new token' })
                        }
                    })
                } else {
                    callback(400, { 'Error': 'Password did not match the specified user\'s password' })
                }
            } else {
                callback(400, { 'Error': 'Could not find the specified user' })
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required fields' })
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
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    _data.update('tokens', id, tokenData, (error) => {
                        if (!error) {
                            callback(200)
                        } else {
                            callback(500, { 'Error': 'Could not update the token\'s expiration' })
                        }
                    })
                } else {
                    callback(400, { 'Error': 'The token has already expired, and cannot be extended' })
                }
            } else {
                callback(400, { 'Error': 'Specified token does not exist' })
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
                        callback(500, { 'Error': 'Could not delete the specified token' })
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

handlers.checks = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'put', 'delete']
    const method = data.method.toLowerCase()
    if (acceptableMethods.indexOf(method) > -1) {
        handlers._checks[method](data, callback)
    } else {
        callback(406)
    }
}

// Container for the checks submethods
handlers._checks = {}

/**
 * Required fields: protocol, url, method, successCodes, timeoutSeconds
 * @param {*} data 
 * @param {*} callback 
 */
handlers._checks.post = (data, callback) => {
    let protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    let method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    let successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false

        _data.read('tokens', token, (error, tokenData) => {
            if (!error && tokenData) {
                let userPhone = tokenData.phone

                _data.read('users', userPhone, (error, userData) => {
                    if (!error && userData) {
                        let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                        if (userChecks.length < config.maxChecks) {
                            let checkId = helpers.createRandomString(20)

                            let checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'url': url,
                                'protocol': protocol,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            }

                            _data.create('checks', checkId, checkObject, (error) => {
                                if (!error) {
                                    userData.checks = userChecks
                                    userData.checks.push(checkId)

                                    _data.update('users', userPhone, userData, (error) => {
                                        if (!error) {
                                            callback(200, checkObject)
                                        } else {
                                            callback(500, { 'Error': 'Could not update the user with the new check' })
                                        }
                                    })
                                } else {
                                    callback(500, { 'Error': 'Could not create new check' })
                                }
                            })
                        } else {
                            callback(400, { 'Error': `The user already has the maximum number of checks (${config.maxChecks})` })
                        }
                    } else {
                        callback(403, { 'Error': 'User does not exist' })
                    }
                })
            } else {
                callback(403)
            }
        })
    } else {
        callback(400, { 'Error': 'Missing required fields or fields are invalid' })
    }
}

/**
 * Required fields: id
 * @param {*} data 
 * @param {*} callback 
 */
handlers._checks.get = (data, callback) => {
    // Check id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {

        _data.read('checks', id, (error, checkData) => {
            if (!error && checkData) {
                // Get the token from the headers
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        callback(200, checkData)
                    } else {
                        callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
                    }
                })
            } else {
                callback(404, { 'Error': 'Check is not valid' })
            }
        })

    } else {
        callback(400, { 'Error': 'Missing id' })
    }
}

/**
 * Required fields: id
 * Optional fields: prototol, url, method, successCodes, timeoutSeconds (One must be set)
 * @param {*} data 
 * @param {*} callback 
 */
handlers._checks.put = (data, callback) => {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false

    let protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false
    let method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
    let successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false

    if (id) {
        // Check to make sure one or more optional fields has been sent
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', id, (error, checkData) => {
                if (!error && checkData) {

                    let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            if (protocol) {
                                checkData.protocol = protocol
                            }
                            if (url) {
                                checkData.url = url
                            }
                            if (method) {
                                checkData.method = method
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds
                            }

                            _data.update('checks', id, checkData, (error) => {
                                if (!error) {
                                    callback(200, checkData)
                                } else {
                                    callback(500, { 'Error': 'Could not update check' })
                                }
                            })
                        } else {
                            callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
                        }
                    })
                } else {
                    callback(400, { 'Error': 'Check ID does not exist' })
                }
            })
        } else {
            callback(400, { 'Error': 'Missing fields to update' })
        }

    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
}

/**
 * Required fields: id
 * @param {*} data 
 * @param {*} callback 
 */
handlers._checks.delete = (data, callback) => {
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false
    if (id) {
        // Lookup the check
        _data.read('checks', id, (error, checkData) => {
            if (!error && checkData) {
                // Get the token from the headers
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {

                        // Delete the check data
                        _data.delete('checks', id, (error) => {
                            if (!error) {
                                _data.read('users', checkData.userPhone, (error, userData) => {
                                    if (!error && userData) {
                                        let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                                        // Remove the deleted check from their lsit of the checks
                                        let checkPosition = userChecks.indexOf(id)
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1)
                                            // Re-save user's data
                                            _data.update('users', checkData.userPhone, userData, (error) => {
                                                if (!error) {
                                                    callback(200)
                                                } else {
                                                    callback(500, { 'Error': 'Could not update the user' })
                                                }
                                            })
                                        } else {
                                            callback(500, {'Error': 'Could not find the check on the users object, so could not remove it'})
                                        }

                                        
                                    } else {
                                        callback(500, { 'Error': 'Could not find the user who created the check. Check was not deleted' })
                                    }
                                })
                            } else {
                                callback(500, { 'Error': 'Could not delete the check data' })
                            }
                        })


                    } else {
                        callback(403, { 'Error': 'Missing required token in header or token is invaliud' })
                    }
                })
            } else {
                callback(400, { 'Error': 'The specified ID does not exist' })
            }
        })

    } else {
        callback(400, { 'Error': 'Missing id' })
    }
}

handlers.notFound = (data, callback) => {
    callback(404)
}

export default handlers