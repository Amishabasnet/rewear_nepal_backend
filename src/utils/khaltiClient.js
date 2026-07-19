const axios = require('axios');
const khaltiApi = axios.create({
  baseURL: process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2/epayment',
  headers: {
    Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});
const initiatePayment = async (payload) => {
  const { data } = await khaltiApi.post('/initiate/', payload);
  return data;
};
const lookupPayment = async (pidx) => {
  const { data } = await khaltiApi.post('/lookup/', { pidx });
  return data;
};
module.exports = { initiatePayment, lookupPayment };
