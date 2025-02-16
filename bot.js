const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const accountSid = process.env.SID;
const authToken = process.env.AUTH_TOKEN;
const client = twilio(accountSid, authToken);
const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://madhiuksha:madhi%40551@mernstack.ymu81.mongodb.net/";
const dbName = "Buyer";
const collectionName = "products";
const emojiToProductName = {
    '🍎': 'apple',
    '🍏': 'green apple',
    '🍐': 'pear',
    '🍊': 'orange',
    '🍋': 'lemon',
    '🍌': 'banana',
    '🍉': 'watermelon',
    '🍇': 'grapes',
    '🍓': 'strawberry',
    '🍈': 'melon',
    '🍍': 'pineapple',
    '🥭': 'mango',
    '🍑': 'peach',
    '🍒': 'cherries',
    '🥥': 'coconut',
    '🥝': 'kiwi',
    '🍊': 'tangerine',
    '🥕': 'carrot',
    '🥒': 'cucumber',
    '🌽': 'corn',
    '🥔': 'potato',
    '🍆': 'eggplant',
    '🥬': 'lettuce',
    '🥦': 'broccoli',
    '🌶️': 'chili pepper',
    '🍅': 'tomato',
    '🧄': 'garlic',
    '🧅': 'onion',
};

let datas = [];

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

  // Check if the message is an emoji and if it's a known product emoji
  if (emojiToProductName[incomingMessage]) {
    const productName = emojiToProductName[incomingMessage];

    // Fetch the product details by product name
    const product = datas.find(item => item.productName.toLowerCase() === productName.toLowerCase());

    if (product) {
      responseMessage = `Name: ${product.productName}, Category: ${product.productCategory}, Price: ${product.productPrice}, Quantity: ${product.productQuantity}, Location: ${product.productLocation}, Unit: ${product.productUnit}, Freshness: ${product.productFreshness}, Harvest Date: ${product.HarvestDate}`;
    } else {
      responseMessage = `Product not found for emoji: ${incomingMessage}`;
    }
  } else if (incomingMessage.toLowerCase() === 'hello') {
    responseMessage = 'Hi there! How can I assist you today?';
  } else if (incomingMessage.toLowerCase() === 'bye') {
    responseMessage = 'Goodbye! Have a great day!';
  } else if (incomingMessage.toLowerCase().startsWith('add product')) {
    const productDetails = incomingMessage.substring(12).trim().split(' ');

    // Check if emoji is used for product name
    const productEmoji = productDetails[0];
    const productName = emojiToProductName[productEmoji] || productDetails[0];

    if (productDetails.length === 8 || productName) {
      const [productCategory, productPrice, productQuantity, productLocation, productUnit, productFreshness, HarvestDate] = productDetails.slice(1);

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

    // Check if emoji is used for product name
    const productEmoji = productDetails[0];
    const productName = emojiToProductName[productEmoji] || productDetails[0];

    if (productDetails.length === 9 || productName) {
      const [newProductName, newProductCategory, newProductPrice, newProductQuantity, newProductLocation, newProductUnit, newProductFreshness, newHarvestDate] = productDetails.slice(1);

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
  } else if (incomingMessage.toLowerCase() === 'view') {
    // View all products
    await fetchData();
  
    if (datas.length === 0) {
      responseMessage = 'No products found.';
    } else {
      responseMessage = datas.map(item =>
        `Name: ${item.productName}, Category: ${item.productCategory}, Price: ${item.productPrice}, Quantity: ${item.productQuantity}, Location: ${item.productLocation}, Unit: ${item.productUnit}, Freshness: ${item.productFreshness}, Harvest Date: ${item.HarvestDate}`  
      ).join('\n\n');
    }
  } else if (incomingMessage.toLowerCase().startsWith('view ')) {
    const searchQuery = incomingMessage.substring(5).trim();
    
    // Check if the search query is a known emoji
    if (emojiToProductName[searchQuery]) {
      const productName = emojiToProductName[searchQuery];

      const product = datas.find(item => item.productName.toLowerCase() === productName.toLowerCase());
      
      if (product) {
        responseMessage = `Name: ${product.productName}, Category: ${product.productCategory}, Price: ${product.productPrice}, Quantity: ${product.productQuantity}, Location: ${product.productLocation}, Unit: ${product.productUnit}, Freshness: ${product.productFreshness}, Harvest Date: ${product.HarvestDate}`;
      } else {
        responseMessage = `Product not found for emoji: ${searchQuery}`;
      }
    } else {
      // If the search query is a product name
      const productName = searchQuery;

      const product = datas.find(item => item.productName.toLowerCase() === productName.toLowerCase());

      if (product) {
        responseMessage = `Name: ${product.productName}, Category: ${product.productCategory}, Price: ${product.productPrice}, Quantity: ${product.productQuantity}, Location: ${product.productLocation}, Unit: ${product.productUnit}, Freshness: ${product.productFreshness}, Harvest Date: ${product.HarvestDate}`;
      } else {
        responseMessage = `Product with name '${productName}' not found.`;
      }
    }
  } else {
    responseMessage = 'I’m sorry, I didn’t understand that. Can you please rephrase?';
  }

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
