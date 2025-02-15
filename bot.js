const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config()

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const accountSid = process.env.SID;
const authToken = process.env.AUTH_TOKEN
const client = twilio(accountSid, authToken);

// Endpoint to handle incoming WhatsApp messages
app.post('/', (req, res) => {
    const incomingMessage = req.body.Body;
    const from = req.body.From;

    console.log(`Received message: ${incomingMessage} from ${from}`);

    // Simple bot logic
    let responseMessage = '';

    // Example response handling
if (incomingMessage.toLowerCase().includes('hello')) {
    responseMessage = 'Hi there! How can I assist you today?';
} else if (incomingMessage.toLowerCase().includes('bye')) {
    responseMessage = 'Goodbye! Have a great day!';
} else if (incomingMessage.toLowerCase().includes('add product')) {
    responseMessage = 'What product would you like to add? Please provide details in the format: productName productCategory productPrice productQuantity productLocation productUnit productFreshness HarvestDate (ISO8601 format).';
} else {
    responseMessage = 'I’m sorry, I didn’t understand that. Can you please rephrase?';
}


    // Send the response back to the user
    client.messages
        .create({
            from: 'whatsapp:+14155238886',
            body: responseMessage,
            to: from
        })
        .then(message => {
            console.log(`Response sent: ${message.sid}`);
            res.status(200).send('Message sent');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error sending message');
        });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});