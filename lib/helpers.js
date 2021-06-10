 
/*
 * Helpers for various tasks
 *
 */

// Dependencies
import config from './config'
import crypto from 'crypto'

// Container for all the helpers
var helpers = {};


// Create a SHA256 hash
helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};
// Export the module
export default helpers