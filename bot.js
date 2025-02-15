const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio Setup
const accountSid = process.env.SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// MongoDB Setup
const uri = "mongodb+srv://madhiuksha:madhi%40551@mernstack.ymu81.mongodb.net/";
const dbName = "Buyer";
const collectionName = "products";
let datas = [];

// OpenAI Setup
const openaiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfig);

// Function to fetch data from MongoDB
async function fetchData() {
  const mongoClient = new MongoClient(uri);
  try {
    await mongoClient.connect();
    console.log("Connected to the database");
    const database = mongoClient.db(dbName);
    const collection = database.collection(collectionName);
    const data = await collection.find().toArray();
    datas = data;
    console.log("Fetched Data:\n", datas);
  } catch (err) {
    console.error('Error fetching data:', err);
  } finally {
    await mongoClient.close();
  }
}

fetchData();

app.post('/', async (req, res) => {
  const incomingMessage = req.body.Body.trim();
  const from = req.body.From;
  console.log(`Received message: ${incomingMessage} from ${from}`);

  let responseMessage = '';

  // Product-related commands
  if (incomingMessage.toLowerCase().includes('hello')) {
    responseMessage = 'Hi there! How can I assist you today?';
  } else if (incomingMessage.toLowerCase().includes('bye')) {
    responseMessage = 'Goodbye! Have a great day!';
  } else if (incomingMessage.toLowerCase().startsWith('add product')) {
    const productDetails = incomingMessage.substring(12).trim().split(' ');
    if (productDetails.length === 8) {
      const [productName, productCategory, productPrice, productQuantity, productLocation, productUnit, productFreshness, HarvestDate] = productDetails;
      try {
        const mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        const database = mongoClient.db(dbName);
        const collection = database.collection(collectionName);
        await collection.insertOne({
          productName,
          productCategory,
          productPrice,
          productQuantity,
          productLocation,
          productUnit,
          productFreshness,
          HarvestDate
        });
        responseMessage = 'Product added successfully!';
        await fetchData();
      } catch (err) {
        console.error('Error adding product:', err);
        responseMessage = 'Failed to add product. Please try again.';
      }
    } else {
      responseMessage = 'Invalid format. Use: add product productName productCategory productPrice productQuantity productLocation productUnit productFreshness HarvestDate';
    }
  } else if (incomingMessage.toLowerCase().startsWith('delete product')) {
    const productName = incomingMessage.substring(15).trim();
    try {
      const mongoClient = new MongoClient(uri);
      await mongoClient.connect();
      const database = mongoClient.db(dbName);
      const collection = database.collection(collectionName);
      const result = await collection.deleteOne({ productName });
      if (result.deletedCount > 0) {
        responseMessage = 'Product deleted successfully!';
      } else {
        responseMessage = 'Product not found.';
      }
      await fetchData();
    } catch (err) {
      console.error('Error deleting product:', err);
      responseMessage = 'Failed to delete product. Please try again.';
    }
  } else if (incomingMessage.toLowerCase().startsWith('edit product')) {
    const productDetails = incomingMessage.substring(13).trim().split(' ');
    if (productDetails.length === 9) {
      const [productName, newProductName, newProductCategory, newProductPrice, newProductQuantity, newProductLocation, newProductUnit, newProductFreshness, newHarvestDate] = productDetails;
      try {
        const mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        const database = mongoClient.db(dbName);
        const collection = database.collection(collectionName);
        const result = await collection.updateOne(
          { productName },
          {
            $set: {
              productName: newProductName,
              productCategory: newProductCategory,
              productPrice: newProductPrice,
              productQuantity: newProductQuantity,
              productLocation: newProductLocation,
              productUnit: newProductUnit,
              productFreshness: newProductFreshness,
              HarvestDate: newHarvestDate
            }
          }
        );
        if (result.modifiedCount > 0) {
          responseMessage = 'Product updated successfully!';
        } else {
          responseMessage = 'Product not found or no changes made.';
        }
        await fetchData();
      } catch (err) {
        console.error('Error editing product:', err);
        responseMessage = 'Failed to edit product. Please try again.';
      }
    } else {
      responseMessage = 'Invalid format. Use: edit product productName newProductName newProductCategory newProductPrice newProductQuantity newProductLocation newProductUnit newProductFreshness newHarvestDate';
    }
  } else if (incomingMessage.toLowerCase().includes('view')) {
    await fetchData();
    if (datas.length === 0) {
      responseMessage = 'No products found.';
    } else {
      responseMessage = datas.map(item =>
        `Name: ${item.productName}, Category: ${item.productCategory}, Price: ${item.productPrice}, Quantity: ${item.productQuantity}, Location: ${item.productLocation}, Unit: ${item.productUnit}, Freshness: ${item.productFreshness}, HarvestDate: ${item.HarvestDate}`
      ).join('\n\n');
    }
  } else {
    // Fallback: Use OpenAI's Chat API for general conversation
    try {
      const openaiResponse = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: incomingMessage }
        ]
      });
      responseMessage = openaiResponse.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error with OpenAI API:', error);
      responseMessage = 'I encountered an error trying to respond. Please try again later.';
    }
  }

  // Send response via Twilio
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
