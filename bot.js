const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB connection
const mongoURI = 'mongodb://localhost:27017/Buyer';
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Product Schema (based on your provided schema)
const productSchema = new mongoose.Schema({
    productName: String,
    productCategory: String,
    productPrice: Number,
    productQuantity: Number,
    productLocation: String,
    productUnit: String,
    productFreshness: String,
    HarvestDate: Date
});
const Product = mongoose.model('Product', productSchema);

// Twilio setup
const accountSid = process.env.SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Endpoint to handle incoming WhatsApp messages
app.post('/', async (req, res) => {
    const incomingMessage = req.body.Body;
    const from = req.body.From;

    console.log(`Received message: ${incomingMessage} from ${from}`);

    let responseMessage = '';
    const command = incomingMessage.toLowerCase().split(' ')[0];

    try {
        switch (command) {
            case 'view':
                // View all products
                const products = await Product.find({});
                responseMessage = products.map(p => 
                    `${p.productName} (${p.productCategory}): ${p.productQuantity} ${p.productUnit} available at ₹${p.productPrice}/${p.productUnit}. Location: ${p.productLocation}, Freshness: ${p.productFreshness}, Harvest Date: ${p.HarvestDate.toDateString()}`
                ).join('\n\n');
                if (!responseMessage) responseMessage = 'No products found.';
                break;

            case 'add':
                // Add a new product
                const [name, category, price, quantity, location, unit, freshness, harvestDate] = incomingMessage.split(' ').slice(1);
                const newProduct = new Product({
                    productName: name,
                    productCategory: category,
                    productPrice: parseFloat(price),
                    productQuantity: parseInt(quantity), productLocation: location,
                    productUnit: unit,
                    productFreshness: freshness,
                    HarvestDate: new Date(harvestDate)
                });
                await newProduct.save();
                responseMessage = 'Product added successfully!';
                break;

            case 'delete':
                // Delete a product by name
                const productName = incomingMessage.split(' ')[1];
                await Product.deleteOne({ productName });
                responseMessage = 'Product deleted successfully!';
                break;

            case 'edit':
                // Edit a product
                const [editName, field, newValue] = incomingMessage.split(' ').slice(1);
                const updateQuery = { productName: editName };
                const updateData = { [field]: newValue };
                if (field === 'productPrice' || field === 'productQuantity') {
                    updateData[field] = parseFloat(newValue);
                } else if (field === 'HarvestDate') {
                    updateData[field] = new Date(newValue);
                }
                await Product.updateOne(updateQuery, updateData);
                responseMessage = 'Product updated successfully!';
                break;

            default:
                responseMessage = 'I’m sorry, I didn’t understand that. Can you please rephrase?';
        }
    } catch (error) {
        console.error(error);
        responseMessage = 'An error occurred. Please try again.';
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







    
    
    