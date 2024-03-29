/**
 * Library for storing and editing data
 */

import fs from 'fs'
import path from 'path'
import helpers from './helpers.js';

let lib = {}
let __dirname = path.resolve(path.dirname(''));
console.log("Here")
console.log(__dirname)
lib.baseDir = path.join(__dirname, '/.data/')

lib.create = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            let stringData  = JSON.stringify(data)
            fs.writeFile(fileDescriptor, stringData, (error) => {
                if (!error) {
                    fs.close(fileDescriptor, (error) => {
                        if (!error) {
                            callback(false)
                        } else {
                            callback('Error closing new file')
                        }
                    })
                } else {
                    callback('Error writing to new file')
                }
            })
        } else {
            callback('Could not create new file, it may already exist')
        }
    })
}

lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (error, data) => {
        if (!error && data) {
            let parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        } else {
            callback(error, data)
        }
    })
}

lib.update = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            let stringData = JSON.stringify(data)
            fs.ftruncate(fileDescriptor, (error) => {
                if (!error) {
                    fs.writeFile(fileDescriptor, stringData, (error) => {
                        if (!error) {
                            fs.close(fileDescriptor, (error) => {
                                if (!error) {
                                    callback(false)
                                } else {
                                    callback('Error closing the file')
                                }
                            })
                        } else {
                            callback('Error writing to existing file')
                        }
                    })
                } else {
                    callback('Error truncating file')
                }
            })
        } else {
            callback('Could not open the file for updating, it may not exist yet')
        }
    })
}

lib.delete = (dir, file, callback) => {
    fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (error) => {
        if (!error) { 
            callback(false)
        } else {
            callback('Error deleting the file')
        }
    })
}

lib.list = (dir, callback) => {
    fs.readdir(`${lib.baseDir}${dir}/`, (error, data) => {
        if (!error && data && data.length > 0) {
            let trimmedFileNames = []
            data.forEach((fileName) => trimmedFileNames.push(fileName.replace('.json', '')))

            callback(false, trimmedFileNames)
        } else {
            callback(error, data)
        }
    })
}

export default lib