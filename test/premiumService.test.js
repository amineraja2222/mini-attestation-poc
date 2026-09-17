const { calculateProvisionalPremium } = require('../src/premiumService');

describe('calculateProvisionalPremium', () => {
  test('applique le tarif de base pour la 1ere attestation provisoire', () => {
    const result = calculateProvisionalPremium({
      basePremium: 1000,
      originalQuoteDate: '2026-07-15',
      provisionalCount: 1,
    });
    expect(result).toBe(1000); // tarif du 01/01/2026 (rate 1.0), toujours en vigueur au 15/07
  });

  test(
    'doit garder le tarif de la souscription initiale meme pour la 2e attestation provisoire ' +
    '(regression test pour l anomalie signalee par le client : le montant total promis ne doit pas changer)',
    () => {
      const result = calculateProvisionalPremium({
        basePremium: 1000,
        originalQuoteDate: '2026-07-15', // avant l'augmentation du 03/08/2026
        provisionalCount: 2,             // 2e attestation, validee aujourd'hui (apres l'augmentation)
      });
      // Attendu : tarif du 15/07 (rate 1.0) => 1000, PAS le tarif majore (1050)
      expect(result).toBe(1000);
    },
  );

  test('applique le tarif majore pour un nouveau projet souscrit apres le 03/08/2026', () => {
    const result = calculateProvisionalPremium({
      basePremium: 1000,
      originalQuoteDate: '2026-08-10',
      provisionalCount: 1,
    });
    expect(result).toBe(1050);
  });
});
