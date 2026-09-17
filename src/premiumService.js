const { getRateForDate } = require('./rateTable');

/**
 * Calcule la prime a payer pour une attestation (provisoire ou definitive).
 *
 * Regle metier : le tarif applique doit toujours etre celui en vigueur
 * a la date de souscription initiale du projet (originalQuoteDate),
 * meme si l'attestation en cours (2e, 3e, definitive) est validee plus tard
 * et que le tarif a change entre-temps. C'est ce qui permet au fractionnement
 * de paiement de respecter le montant total promis au client au depart.
 *
 * @param {Object} policy
 * @param {number} policy.basePremium - prime de base avant application du tarif
 * @param {string} policy.originalQuoteDate - date (YYYY-MM-DD) de la souscription initiale
 * @returns {number} montant de la prime a payer, arrondi a 2 decimales
 */
function calculateProvisionalPremium(policy) {
  const { basePremium, originalQuoteDate } = policy;

  // Le tarif applique doit toujours etre celui en vigueur a la date de
  // souscription initiale, quel que soit le nombre d'attestations
  // provisoires deja emises.
  const rate = getRateForDate(originalQuoteDate);
  return Math.round(basePremium * rate * 100) / 100;
}

module.exports = { calculateProvisionalPremium };
