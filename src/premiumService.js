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
 * @param {number} policy.provisionalCount - combien d'attestations provisoires deja emises
 * @returns {number} montant de la prime a payer, arrondi a 2 decimales
 */
function calculateProvisionalPremium(policy) {
  const { basePremium, originalQuoteDate, provisionalCount } = policy;

  // BUG (volontairement seme pour la demo) :
  // a partir de la 2e attestation provisoire, le code utilise la date du jour
  // au lieu de la date de souscription initiale -> le client peut se voir
  // appliquer une augmentation tarifaire survenue apres sa souscription.
  let rateDate = originalQuoteDate;
  if (provisionalCount > 1) {
    rateDate = new Date().toISOString().slice(0, 10);
  }

  const rate = getRateForDate(rateDate);
  return Math.round(basePremium * rate * 100) / 100;
}

module.exports = { calculateProvisionalPremium };
