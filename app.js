const express = require('express');
require("dotenv").config();
const AfricasTalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_API_USERNAME
})

const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sms = AfricasTalking.SMS;
const ussd = AfricasTalking.USSD;
const voice = AfricasTalking.VOICE;
const payments = AfricasTalking.PAYMENTS;


app.post('/ussd', (req, res) => {});
app.post('/transaction', (req, res) => {});
app.post('/sms', (req, res) => {});

app.listen(PORT, ()=> {
    console.log(`Server started on PORT ${PORT}`);
})