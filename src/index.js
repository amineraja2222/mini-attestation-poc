const express = require('express');
const { calculateProvisionalPremium } = require('./premiumService');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/premium/calculate', (req, res) => {
  const { basePremium, originalQuoteDate, provisionalCount } = req.body;

  if (basePremium == null || !originalQuoteDate || provisionalCount == null) {
    return res.status(400).json({
      error: 'basePremium, originalQuoteDate et provisionalCount sont requis',
    });
  }

  try {
    const premium = calculateProvisionalPremium({
      basePremium,
      originalQuoteDate,
      provisionalCount,
    });
    return res.status(200).json({ premium });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`mini-attestation-poc en ecoute sur le port ${PORT}`);
  });
}

module.exports = app;
