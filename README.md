# mini-attestation-poc

POC minimal pour valider, de bout en bout, un pipeline dev + CI/CD +
correction d'anomalie automatisee par agent IA — avant de l'appliquer
a un vrai systeme critique (SAGIS).

## Ce que fait l'application

Une API tres simple qui calcule la prime a payer pour une attestation
(provisoire ou definitive), en respectant la regle metier reelle du
fractionnement de paiement : le tarif applique doit rester celui en
vigueur a la date de souscription initiale, meme si l'attestation en
cours est validee plus tard.

`POST /api/premium/calculate`
```json
{ "basePremium": 1000, "originalQuoteDate": "2026-07-15", "provisionalCount": 2 }
```

## Le bug seme volontairement

Dans `src/premiumService.js`, a partir de la 2e attestation provisoire,
le code utilise la date du jour au lieu de la date de souscription
initiale pour choisir le tarif applicable — exactement le type
d'anomalie qu'on a diagnostique cette semaine sur SAGIS.

Le test `test/premiumService.test.js` contient un test de non-regression
qui echoue tant que ce bug n'est pas corrige — c'est le signal que
l'agent devra detecter et corriger.

## Mise en place

1. **Creer le repo GitHub** et y pousser ce code :
   ```bash
   cd mini-attestation-poc
   git init
   git add .
   git commit -m "Initial commit: POC pipeline dev + CI/CD automatise"
   git remote add origin https://github.com/<votre-org>/mini-attestation-poc.git
   git push -u origin main
   ```

2. **Verifier le pipeline** : le premier push declenche `.github/workflows/ci-cd.yml`.
   Le job `build-test` doit **echouer** a ce stade (le test de
   non-regression est rouge) — c'est normal et attendu, ca prouve que
   la CI detecte bien l'anomalie.

3. **Connecter Claude Code** au repo (poste dev ou CI), avec un compte
   ayant les droits de push + creation de Pull Request.

4. **Deploiement** : le job `deploy` construit une image Docker et la
   publie sur GitHub Container Registry (`ghcr.io`) — gratuit, aucun
   compte externe requis pour ce POC. Une etape TODO est prevue dans le
   workflow pour brancher un vrai environnement (Render, Azure App
   Service, VM interne...) une fois le POC valide.

## Scenario de demo

1. On simule la reception d'un signalement (email ou ticket) decrivant
   l'anomalie de prime.
2. On donne ce signalement a l'agent (dans Claude Code, en pointant sur
   ce repo).
3. L'agent localise la cause racine dans `premiumService.js`, corrige,
   fait passer les tests, cree une branche + une Pull Request.
4. Revue humaine rapide de la PR, merge.
5. La CI/CD rejoue tests + build + deploy automatiquement.
6. L'agent redige un message de reponse a envoyer a l'utilisateur
   confirmant la correction.

## Le correctif attendu (a titre de reference, ne pas l'appliquer soi-meme :
   c'est ce que l'agent doit trouver)

Dans `calculateProvisionalPremium`, la date utilisee pour `getRateForDate`
doit toujours rester `originalQuoteDate`, quelle que soit la valeur de
`provisionalCount`.
