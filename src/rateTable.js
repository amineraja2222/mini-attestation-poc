// Grille tarifaire simplifiee : chaque entree est valide a partir de sa date "from".
// On prend la derniere entree dont la date "from" est <= a la date demandee.
const RATE_HISTORY = [
  { from: '2026-01-01', rate: 1.0 },   // tarif de base
  { from: '2026-08-03', rate: 1.05 },  // augmentation de 5% le 03/08/2026
];

function getRateForDate(dateStr) {
  const target = new Date(dateStr);
  const applicable = RATE_HISTORY
    .filter((entry) => new Date(entry.from) <= target)
    .sort((a, b) => new Date(b.from) - new Date(a.from));

  if (applicable.length === 0) {
    throw new Error('Aucun tarif applicable pour cette date');
  }
  return applicable[0].rate;
}

module.exports = { getRateForDate, RATE_HISTORY };
