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
const payments = AfricasTalking.AIRTIME;
const mobileData = AfricasTalking.MOBILE_DATA;
const billing = AfricasTalking.BILLING;

const users = new Map();
const transaction = new Map();
const blacklist = new Map();

const generatepin = () => Math.floor(1000 + Math.random() * 9000).toString();

// const generateotp = () => Math.floor(1000 + Math.random() * 9000)
const add300days = () => new Date(Date.now() + 30 * 24 * 60 * 1000);

app.post('/ussd', async (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    let response = '';
  
    const steps = text.split('*');
    const option = steps[0] || '';
  
    if (text === '') {
      response = `Welcome to ${serviceCode}\n1. Join M-shield\n2. Verify Transaction\n3. Report Scam\n4. Top Up\n5. Check Rewards`;
    } else if (option === '1') {
      // Join CashGuard
      response = 'Pay 50 KES to activate M-shield for 30 days? Reply:\n1. Yes\n2. No';
      if (steps[1] === '1') {
        try {
          await billing.charge({ phoneNumber, amount: 50, currencyCode: 'KES' });
          users.set(phoneNumber, {
            account: steps[2] || phoneNumber,
            planActiveUntil: add30Days(),
            rewards: { airtime: 0, data: 0 },
          });
          sms.send({
            to: phoneNumber,
            message: `M-shield active until ${add30Days().toLocaleDateString()}. Top up: *556#`,
          });
          response = 'END Successfully activated CashGuard!';
        } catch (error) {
          response = 'END Payment failed. Try again.';
        }
      } else if (steps[1] === '2') {
        response = 'END Activation cancelled.';
      }
    } else if (option === '2') {
      // Verify Transaction
      response = 'Enter your 4-digit PIN from the voice call:';
      if (steps[1]) {
        const tx = transactions.get(sessionId);
        if (tx && tx.pin === steps[1]) {
          tx.status = 'approved';
          const user = users.get(phoneNumber);
          user.rewards.airtime += 5;
          response = 'END Transaction approved! You earned 5 KES airtime.';
          sms.send({
            to: phoneNumber,
            message: `${tx.amount} KES sent successfully. Rewards: ${user.rewards.airtime} KES airtime.`,
          });
          await airtime.send({ recipients: [{ phoneNumber, amount: '5', currencyCode: 'KES' }] });
        } else {
          response = 'END Invalid PIN. Transaction cancelled.';
          transactions.delete(sessionId);
        }
      }
    } else if (option === '3') {
      // Report Scam
      response = 'Enter suspicious phone number (e.g., 07XX-XXXX):';
      if (steps[1]) {
        const suspect = steps[1];
        blacklist.set(suspect, (blacklist.get(suspect) || 0) + 1);
        const user = users.get(phoneNumber);
        if (blacklist.get(suspect) >= 5) {
          sms.send({
            to: Array.from(users.keys()),
            message: `New scam number: ${suspect}`,
          });
          user.rewards.data += 50; 
          await mobileData.send({
            recipients: [{ phoneNumber, quantity: 50, unit: 'MB', validity: 'Day' }],
          });
        }
        response = 'END Number reported. You earned 50MB data!';
      }
    } else if (option === '4') {
      // Top Up
      response = 'Enter amount to top up (min 50 KES):';
      if (steps[1]) {
        const amount = parseInt(steps[1]);
        if (amount >= 50) {
          try {
            await billing.charge({ phoneNumber, amount, currencyCode: 'KES' });
            const user = users.get(phoneNumber);
            user.planActiveUntil = add30Days();
            response = 'END Top-up successful! Plan active until ' + user.planActiveUntil.toLocaleDateString();
            sms.send({
              to: phoneNumber,
              message: `CashGuard topped up with ${amount} KES. Active until ${user.planActiveUntil.toLocaleDateString()}.`,
            });
          } catch (error) {
            response = 'END Payment failed. Try again.';
          }
        } else {
          response = 'END Minimum top-up is 50 KES.';
        }
      }
    } else if (option === '5') {
      const user = users.get(phoneNumber);
      if (user) {
        response = `END Your Rewards:\nAirtime: ${user.rewards.airtime} KES\nData: ${user.rewards.data} MB`;
      } else {
        response = 'END Register first via *556# > Join.';
      }
    }
  
    res.send(response);
  });
app.post('/transaction', (req, res) => {});
app.post('/sms', (req, res) => {});

app.listen(PORT, ()=> {
    console.log(`Server started on PORT ${PORT}`);
})