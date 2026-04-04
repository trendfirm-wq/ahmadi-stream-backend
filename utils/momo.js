const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 🔐 YOUR KEYS
const subscriptionKey = "424ffcb2cdd542498176168351d956eb";
const userId = "a7c9e1d2-1234-4abc-9def-112233445566";
const apiKey = "b76321746d9b42f49bab904950b59e04";

const BASE_URL = "https://sandbox.momodeveloper.mtn.com";

// 🔑 GET ACCESS TOKEN
async function getToken() {
  const auth = Buffer.from(`${userId}:${apiKey}`).toString('base64');

  const res = await axios.post(
    `${BASE_URL}/collection/token/`,
    {},
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey
      }
    }
  );

  return res.data.access_token;
}

// 💸 REQUEST TO PAY
async function requestToPay(phone, amount) {
  const token = await getToken();
  const referenceId = uuidv4();

  await axios.post(
    `${BASE_URL}/collection/v1_0/requesttopay`,
    {
      amount: amount.toString(),
      currency: "EUR",
      externalId: referenceId,
      payer: {
        partyIdType: "MSISDN",
        partyId: phone
      },
      payerMessage: "Saani Subscription",
      payeeNote: "Payment"
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json"
      }
    }
  );

  return referenceId;
}

// 🔍 CHECK PAYMENT STATUS
async function checkPayment(referenceId) {
  const token = await getToken();

  const res = await axios.get(
    `${BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": subscriptionKey
      }
    }
  );

  return res.data;
}

module.exports = {
  requestToPay,
  checkPayment
};