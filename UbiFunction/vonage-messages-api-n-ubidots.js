/*
 * Project: vonage-messages-api-n-ubidots
 * Description: Requests the last value of Ubidots variables via SMS using the Vonage Messages API
 * Author: Maria Carlina Hernández <mariacarlinahernandez@gmail.com>
 * Date: 24/06/2020
 */

// Import the 'request-promise' library to handle HTTP requests
var request = require('request-promise');

// Ubidots constants
const UBIDOTS_TOKEN = "BBFF-xxxxxxxx";
// Vonage constants
const VONAGE_API_SECRET = "xxxxxx";

/*
 * Main function - runs every time the UbiFunction is executed
 *
 * @arg args, dictionary containing Vonage request data
 */
async function main(args) {
  // When sending SMS, delivery receipts will be returned
  // status: submitted, delivered,
  if (args['status']) {
    return args;
  }

  // Parses incoming values
  var api_key = args['api-key'];
  var keyword = args['keyword'];
  var msisdn = args['msisdn'];
  var text = args['text'];
  var to = args['to'];
  var msg_type = args['type'];
  //var message_timestamp = args['message-timestamp'];
  //var messageId = args['messageId'];

  // Verify the keyword received to request the data
  if (keyword == 'UBIDOTS') {

    text = text.toLowerCase(); // Converts the text received to lowercase letters

    // Filter the requested devices
    const devices = /Devices:(.*)/i.exec(text);
    const deviceList = devices[1].split(',').map(device => device.trim());
    // Filter the requested variables
    const variables = /Variables:(.*)/i.exec(text);
    const variableList = variables[1].split(',').map(variable => variable.trim());

    // "msg" stores the response to be sent
    var msg = "Data requested:\n";

    // Iterates the deviceList previously filtered
    for (const device of deviceList) {
      msg = msg.concat('\nDevice: ', device);
      // Iterates the variableList previously filtered
      for (const variable of variableList) {
        // Handle GET request to Ubidots
        try {
          var response = await ubidots_get_request(UBIDOTS_TOKEN, device, variable);
          msg = msg.concat('\nVariable: ' , variable , ' = ' , response);
        } catch (error) {
          // Send a reply back in case any error is presented
          var vonage_response = await vonage_messages(api_key, msg_type, msisdn, to, "The requested data cannot be found. Please verify it and try again.");
          // Pass the error message caught as the function's response
          return { "message": error.message};
        }
      }
      msg = msg.concat('\n');
    }
  }

  // Send a reply back with the requested data
  /*  Reply example for multiple devices and variables:

      Data requested:

      Device: balcony
      Variable: humidity = 50.87
      Variable: temperature = 36.39

      Device: kitchen
      Variable: humidity = 55.72
      Variable: temperature = 29.45
  */
  //var vonage_response = await vonage_messages(api_key, msg_type, msisdn, to, msg);
  var vonage_response = await vonage_messages(api_key, msg_type, msisdn, to, msg);

  // Pass Vonage's API Response as the function's reponse
  return vonage_response;
}

/*
 * Handle an HTTP POST request to Vonage Messaging API
 * API Documentation: https://developer.nexmo.com/api/messages-olympus#overview
 *
 * @arg api_key [Mandatory], Nexmo account's API Key
 * @arg msg_channel [Mandatory], type of message that you want to send.
 * @arg recipient [Mandatory], phone number of the message recipient
 * @arg sender [Mandatory], phone number of the message sender
 * @arg msg [Mandatory], text of the message
 *
 * @return message_uuid, UUID of the message
 */

async function vonage_messages(api_key, msg_type, recipient, sender, msg) {

  // Base64 encoded API key and secret joined by a colon
  var auth = 'Basic ' + Buffer.from(api_key + ":" + VONAGE_API_SECRET).toString('base64');

  var options = {
    method: 'POST',
    url: 'https://api.nexmo.com/v0.1/messages',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    json: {
      "from": {
        "type": "sms",
        "number": sender
      },
      "to": {
        "type": "sms",
        "number": recipient
      },
      "message": {
        "content": {
          "type": msg_type,
          "text": msg
        }
      }
    }
  };

  // Pass UUID of the message sent
  return await request.post(options);
}

/*
 * Handle an GET request to Ubidots API
 * API Documentation: https://ubidots.com/docs/sw/
 *
 * @arg token [Mandatory], Ubidots account's Token
 * @arg device_label [Mandatory], single and unique label of device
 * @arg variable_label [Mandatory], single and unique label of variable
 *
 * @return last_value, variable last value
 */
async function ubidots_get_request(token, device_label, variable_label) {

  var options = {
    method: 'GET',
    url: 'https://industrial.api.ubidots.com/api/v1.6/devices/' + device_label + "/" + variable_label + "/lv",
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    }
  };

  var last_value = await request.get(options);

  return last_value;
}


/*
 * Handle an POST request to Ubidots API
 * API Documentation: https://ubidots.com/docs/sw/
 *
 * @arg token [Mandatory], Ubidots account's Token
 * @arg device_label [Mandatory], single and unique label of device
 * @arg variable_label [Mandatory], single and unique label of variable
 *
 * @return last_value, variable last value
 */
async function ubidots_post_request(token, label, body) {

  var options = {
    method: 'POST',
    url: 'https://industrial.api.ubidots.com/api/v1.6/devices/' + label,
    body: body,
    json: true,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token
    }
  };

  var response = await request.post(options);

  return response;
}
