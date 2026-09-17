/**
 * Agent de correction automatique.
 *
 * Lit le signalement (titre + corps de l'Issue GitHub), lit le code source
 * pertinent, appelle l'API Claude pour obtenir un correctif, puis ecrit
 * les fichiers corriges sur disque. Ne fait ni commit ni push : c'est le
 * workflow appelant qui decide de committer, apres validation des tests.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ISSUE_TITLE = process.env.ISSUE_TITLE || '';
const ISSUE_BODY = process.env.ISSUE_BODY || '';

// Modele a utiliser pour l'appel API. Verifier le nom exact en vigueur
// sur https://docs.claude.com si ce script est reactive plus tard,
// les identifiants de modele evoluent.
const MODEL = 'claude-sonnet-5';

function readSourceFiles(dir) {
  const files = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, readSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const relPath = path.relative(path.join(__dirname, '..'), fullPath);
      files[relPath] = fs.readFileSync(fullPath, 'utf8');
    }
  }
  return files;
}

function buildPrompt(sourceFiles, issueTitle, issueBody) {
  let filesBlock = '';
  for (const [relPath, content] of Object.entries(sourceFiles)) {
    filesBlock += `\n--- FICHIER: ${relPath} ---\n${content}\n`;
  }

  return `Tu es un agent de correction de bug pour une petite application Node.js d'assurance.

SIGNALEMENT RECU :
Titre : ${issueTitle}
Description : ${issueBody}

CODE SOURCE ACTUEL :
${filesBlock}

CONSIGNES :
1. Identifie la cause racine du bug decrit dans le signalement, en te basant uniquement sur le code fourni.
2. Corrige le bug avec le changement le plus minimal et cible possible. Ne modifie que ce qui est necessaire.
3. Ne change jamais la signature publique des fonctions exportees, sauf si le bug l'exige explicitement.
4. Le code doit rester propre pour ESLint (regle eslint:recommended) : ne laisse aucune variable declaree
   (y compris dans une destructuration comme const { a, b } = obj) qui ne serait plus utilisee apres ton
   correctif. Si une variable devient inutile, retire-la de la destructuration au lieu de la laisser inutilisee.
5. Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni apres, sans balises markdown, au format exact suivant :

{
  "diagnosis": "explication courte de la cause racine, en francais",
  "files": [
    { "path": "src/nom_du_fichier.js", "content": "contenu complet et corrige du fichier" }
  ]
}

N'inclus dans "files" que les fichiers reellement modifies.`;
}

async function callClaude(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Appel API Claude echoue (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Aucune reponse texte recue de Claude');
  }
  return textBlock.text;
}

function parseAgentResponse(rawText) {
  // Securite : au cas ou le modele encadre malgre tout sa reponse de ```json ... ```
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY manquant. Configurez le secret dans les parametres du repo.');
    process.exit(1);
  }
  if (!ISSUE_TITLE && !ISSUE_BODY) {
    console.error('Aucun signalement fourni (ISSUE_TITLE / ISSUE_BODY vides).');
    process.exit(1);
  }

  console.log('Lecture du code source...');
  const sourceFiles = readSourceFiles(SRC_DIR);
  console.log(`${Object.keys(sourceFiles).length} fichier(s) source lu(s).`);

  console.log('Construction du prompt et appel a Claude...');
  const prompt = buildPrompt(sourceFiles, ISSUE_TITLE, ISSUE_BODY);
  const rawResponse = await callClaude(prompt);

  console.log('Analyse de la reponse...');
  const agentResult = parseAgentResponse(rawResponse);

  console.log('Diagnostic pose par l agent :');
  console.log(agentResult.diagnosis);

  const rootDir = path.join(__dirname, '..');
  for (const file of agentResult.files) {
    const absPath = path.join(rootDir, file.path);
    fs.writeFileSync(absPath, file.content, 'utf8');
    console.log(`Fichier modifie : ${file.path}`);
  }

  // Ecrit le diagnostic dans un fichier temporaire pour que le workflow
  // puisse le reutiliser (commentaire sur l'Issue, message de commit).
  fs.writeFileSync(
    path.join(rootDir, 'agent-diagnosis.txt'),
    agentResult.diagnosis,
    'utf8',
  );

  console.log('Correctif applique. Les tests vont maintenant valider le resultat.');
}

main().catch((err) => {
  console.error('Erreur agent :', err.message);
  process.exit(1);
});
