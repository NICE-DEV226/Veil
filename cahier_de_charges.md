📋 CAHIER DES CHARGES TECHNIQUE - VEIL MVP
Version : 1.0
Date : 6 Janvier 2025
Durée estimée : 12 semaines
Équipe : Backend (Go) + Frontend (TypeScript)

🎯 VISION & OBJECTIFS
Vision produit
Veil est un outil de sécurité qui détecte les vulnérabilités dans le code généré par IA (Copilot, Cursor, Claude) en temps réel, directement dans l'IDE du développeur.
Objectifs MVP

Détecter 10 types de vulnérabilités critiques
Fonctionner en temps réel (< 200ms par analyse)
S'intégrer nativement dans VS Code
Proposer des corrections automatiques
Fonctionner 100% offline (aucune donnée cloud)

Critères de succès

1,000 installations dans la première semaine
50% de rétention à J+7
0 crash sur 1h d'utilisation continue
Performance perçue comme "instantanée"


🏗️ ARCHITECTURE GLOBALE
Stack technique
Backend (Moteur d'analyse)

Langage : Go 1.21+
Parser AST : tree-sitter (librairie C avec bindings Go)
Communication : JSON-RPC via stdio
Packaging : Binaire standalone (multi-platform)

Frontend (Extension VS Code)

Langage : TypeScript 5.0+
Framework : VS Code Extension API
Build : esbuild
UI embarquée : Webview avec HTML/CSS/JS vanilla

Pas de backend cloud pour le MVP

Tout fonctionne localement
Zéro API externe
Zéro données envoyées

Composants
┌─────────────────────────────────────────┐
│   VS CODE EXTENSION (TypeScript)        │
│   - Interface utilisateur                │
│   - Affichage des warnings              │
│   - Gestion des quick fixes             │
│   - Stats locales                       │
└──────────────┬──────────────────────────┘
               │ JSON-RPC / stdio
┌──────────────▼──────────────────────────┐
│   MOTEUR D'ANALYSE (Go)                 │
│   - Parsing AST                         │
│   - Détection vulnérabilités           │
│   - Génération quick fixes              │
│   - Exécution locale                    │
└─────────────────────────────────────────┘

📦 COMPOSANT 1 : MOTEUR D'ANALYSE (Backend Go)
Responsabilités

Parser le code en Abstract Syntax Tree (AST)
Appliquer 10 règles de détection
Générer des corrections automatiques (quick fixes)
Communiquer via JSON-RPC avec l'extension

Architecture interne
Structure des dossiers
engine/
├── cmd/
│   └── main.go              # Entry point
├── pkg/
│   ├── server/
│   │   └── jsonrpc.go       # Serveur JSON-RPC
│   ├── analyzer/
│   │   ├── analyzer.go      # Orchestrateur
│   │   ├── python.go        # Analyseur Python
│   │   ├── javascript.go    # Analyseur JavaScript
│   │   └── typescript.go    # Analyseur TypeScript
│   ├── rules/
│   │   ├── registry.go      # Registre des règles
│   │   ├── secrets.go
│   │   ├── sql_injection.go
│   │   ├── xss.go
│   │   ├── command_injection.go
│   │   ├── path_traversal.go
│   │   ├── weak_crypto.go
│   │   ├── dead_code.go
│   │   ├── error_handling.go
│   │   ├── n_plus_one.go
│   │   └── memory_leak.go
│   ├── fixer/
│   │   └── generator.go     # Génération quick fixes
│   └── types/
│       └── finding.go       # Types partagés
├── go.mod
└── go.sum
Types de données principaux
Request (de l'extension vers le moteur)
{
  "jsonrpc": "2.0",
  "method": "analyze",
  "params": {
    "code": string,
    "language": "python" | "javascript" | "typescript",
    "filepath": string
  },
  "id": number
}
Response (du moteur vers l'extension)
{
  "jsonrpc": "2.0",
  "result": {
    "findings": [
      {
        "rule": string,
        "severity": "error" | "warning" | "info",
        "message": string,
        "line": number,
        "column": number,
        "endLine": number,
        "endColumn": number,
        "explanation": string,
        "learnMoreUrl": string,
        "quickFix": {
          "title": string,
          "newCode": string,
          "startLine": number,
          "endLine": number
        } | null
      }
    ]
  },
  "id": number
}
Les 10 règles à implémenter
Règle 1 : Hardcoded Secrets
Description : Détecte les secrets hardcodés (API keys, passwords, tokens)
Patterns à détecter :

Clés AWS : AKIA[0-9A-Z]{16}
Tokens GitHub : ghp_[a-zA-Z0-9]{36}
Clés privées : -----BEGIN PRIVATE KEY-----
Secrets génériques : (password|secret|token|api_key)\s*=\s*['"][^'"]{8,}['"]

Logique :

Scanner le code avec regex
Vérifier que ce n'est pas dans un commentaire
Vérifier que ce n'est pas une variable d'exemple (ex: "your_api_key")
Ignorer les fichiers de test si contient "test" ou "test"

Quick fix :

Remplacer par lecture de variable d'environnement
Python : os.getenv("NOM_VARIABLE")
JavaScript : process.env.NOM_VARIABLE

Severity : error

Règle 2 : SQL Injection
Description : Détecte les requêtes SQL avec input utilisateur non sécurisé
Patterns à détecter :

Concaténation de strings dans query SQL
F-strings Python avec variables dans SQL
Template literals JavaScript avec variables dans SQL
Absence de parameterized queries

Logique :

Trouver les appels de fonctions DB (execute, query, raw)
Vérifier si l'argument contient des variables interpolées
Vérifier que ces variables ne sont pas sanitisées
Exceptions : si utilise des paramètres bindés (?, $1, etc.)

Quick fix :

Convertir en parameterized query
Python : cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
JavaScript : db.query("SELECT * FROM users WHERE id = $1", [userId])

Severity : error

Règle 3 : XSS (Cross-Site Scripting)
Description : Détecte l'injection de contenu utilisateur dans HTML
Patterns à détecter :

innerHTML = variable
document.write(variable)
dangerouslySetInnerHTML en React sans sanitization
Template strings injectant variables dans HTML

Logique :

Trouver les assignments innerHTML ou équivalents
Vérifier si la valeur contient une variable (pas juste string literal)
Vérifier absence de sanitization (DOMPurify, etc.)

Quick fix :

Remplacer par textContent si possible
Ou wrapper dans sanitizer (DOMPurify.sanitize())
React : suggérer un composant safe

Severity : error

Règle 4 : Command Injection
Description : Détecte l'exécution de commandes shell avec input utilisateur
Patterns à détecter :

os.system(user_input)
subprocess.call(user_input, shell=True)
exec(user_input)
eval(user_input)
child_process.exec(user_input)

Logique :

Trouver les appels de fonctions dangereuses
Vérifier si l'argument contient des variables
Vérifier absence de validation/sanitization

Quick fix :

Remplacer par array d'arguments (pas shell)
Python : subprocess.run(["command", arg1, arg2])
JavaScript : child_process.execFile("command", [arg1, arg2])

Severity : error

Règle 5 : Path Traversal
Description : Détecte les opérations fichier avec chemins non validés
Patterns à détecter :

open(user_input)
fs.readFile(user_input)
Concatenation de chemins avec input utilisateur
Absence de validation path

Logique :

Trouver les opérations fichier
Vérifier si le chemin contient des variables
Vérifier absence de os.path.abspath ou équivalent

Quick fix :

Valider le chemin (remove ../, absolute path)
Python : os.path.abspath(os.path.join(base_dir, user_path))
JavaScript : path.resolve(baseDir, userPath)

Severity : error

Règle 6 : Weak Cryptography
Description : Détecte l'utilisation d'algorithmes cryptographiques faibles
Patterns à détecter :

MD5 : hashlib.md5(), crypto.createHash('md5')
SHA1 : hashlib.sha1(), crypto.createHash('sha1')
DES : Crypto.Cipher.DES

Logique :

Trouver les imports/appels crypto
Vérifier si algorithme deprecated

Quick fix :

Remplacer par SHA256 minimum
Python : hashlib.sha256()
JavaScript : crypto.createHash('sha256')

Severity : warning

Règle 7 : Dead Code
Description : Détecte le code mort (variables/fonctions non utilisées)
Logique :

Parser tout le fichier
Identifier toutes les déclarations (variables, fonctions)
Identifier toutes les références
Matcher déclarations sans références

Quick fix :

Supprimer la déclaration
Ou commenter avec explication

Severity : info

Règle 8 : Missing Error Handling
Description : Détecte les opérations à risque sans gestion d'erreur
Patterns à détecter :

Appels async sans await/catch
Opérations I/O sans try/catch
Promises sans .catch()

Logique :

Trouver les appels de fonctions à risque
Vérifier si dans un bloc try/catch
Vérifier si .catch() est appelé

Quick fix :

Wrapper dans try/catch
Ajouter .catch() handler

Severity : warning

Règle 9 : N+1 Queries
Description : Détecte les queries dans des boucles
Patterns à détecter :

Appel DB dans un for/while/map
for item in items: db.query(...)

Logique :

Trouver les boucles
Vérifier si contient des appels DB

Quick fix :

Suggérer bulk query
Expliquer le problème de performance

Severity : warning

Règle 10 : Memory Leaks
Description : Détecte les ressources non fermées
Patterns à détecter :

open() sans close() ou context manager
fs.createReadStream() sans event listener 'end'
Event listeners non supprimés

Logique :

Trouver les ouvertures de ressources
Vérifier si fermées dans le même scope
Python : vérifier si utilise with

Quick fix :

Python : wrapper dans with open(...) as f:
JavaScript : ajouter .on('end', () => stream.close())

Severity : warning

Algorithme d'analyse
Input : Code source (string) + Language
Steps :

Parser le code en AST avec tree-sitter
Pour chaque règle active :

Parcourir l'AST (visitor pattern)
Détecter les patterns de la règle
Générer un Finding si match


Pour chaque Finding :

Générer le quick fix si possible


Retourner la liste de Findings

Performance attendue :

Fichier < 500 lignes : < 100ms
Fichier < 2000 lignes : < 200ms
Fichier > 5000 lignes : timeout après 5s

Communication JSON-RPC
Mode de communication : stdio (standard input/output)
Pourquoi stdio :

Pas besoin de gérer les ports
Pas de conflits réseau
Plus simple à débugger
Standard pour LSP (Language Server Protocol)

Flow :

Extension lance le binaire Go en subprocess
Extension envoie JSON-RPC request via stdin
Moteur parse la request
Moteur analyse le code
Moteur envoie JSON-RPC response via stdout
Extension parse la response et affiche les warnings

Gestion des erreurs :

Timeout : abandonner après 5 secondes
Parse error : retourner error JSON-RPC
Panic : catch et log, retourner error gracefully

Build & Packaging
Cross-compilation requise :

macOS Intel (darwin/amd64)
macOS Apple Silicon (darwin/arm64)
Linux (linux/amd64)
Windows (windows/amd64)

Output attendu :
bin/
├── veil-darwin-amd64
├── veil-darwin-arm64
├── veil-linux-amd64
└── veil-windows-amd64.exe
Sélection du binaire :

Extension détecte l'OS/architecture au runtime
Lance le binaire correspondant


📦 COMPOSANT 2 : EXTENSION VS CODE (Frontend TypeScript)
Responsabilités

Détecter les changements de code
Envoyer le code au moteur pour analyse
Afficher les warnings inline
Gérer les quick fixes (corrections 1-clic)
Afficher les stats utilisateur
Gérer les settings

Architecture interne
Structure des dossiers
extension/
├── src/
│   ├── extension.ts           # Entry point
│   ├── engine/
│   │   ├── client.ts          # Client JSON-RPC
│   │   └── process.ts         # Gestion subprocess
│   ├── diagnostics/
│   │   ├── provider.ts        # DiagnosticsProvider
│   │   └── collection.ts      # Collection de diagnostics
│   ├── actions/
│   │   ├── quick-fix.ts       # Code Actions (fixes)
│   │   └── hover.ts           # Hover provider (explications)
│   ├── ui/
│   │   ├── status-bar.ts      # Icône status bar
│   │   ├── sidebar.ts         # Sidebar avec stats
│   │   └── settings.ts        # Panel settings
│   ├── storage/
│   │   └── stats.ts           # Stockage stats local
│   └── types/
│       └── index.ts           # Types partagés
├── webview/
│   ├── sidebar.html           # UI sidebar
│   ├── sidebar.css
│   └── sidebar.js
├── package.json
├── tsconfig.json
└── .vscodeignore
Fonctionnalités
1. Détection automatique
Trigger d'analyse :

À l'ouverture d'un fichier
À chaque modification (avec debounce 500ms)
À la sauvegarde du fichier

Langages supportés :

Python (.py)
JavaScript (.js)
TypeScript (.ts, .tsx)

Exclusions :

node_modules/
.venv/
pycache/
dist/
build/
Fichiers > 10,000 lignes (trop gros)

Logique :
OnDocumentChange:
  IF file.language NOT IN [python, javascript, typescript]:
    RETURN
  
  IF file.path MATCHES excluded_patterns:
    RETURN
  
  IF file.lines > 10000:
    RETURN
  
  DEBOUNCE 500ms:
    code = document.getText()
    findings = await engine.analyze(code, language)
    displayDiagnostics(findings)

2. Affichage des warnings (Diagnostics)
Utilisation de VS Code Diagnostics API
Visual :

Squiggly lines sous le code problématique (comme TypeScript)
Couleur selon severity :

Error : Rouge
Warning : Jaune
Info : Bleu



Dans la sidebar "Problems" :

Liste de tous les findings
Groupés par fichier
Cliquer = jump to line

Comportement :

Les diagnostics persistent jusqu'à correction
Disparaissent dès que le code est fixé
Temps réel (pas besoin de sauvegarder)


3. Quick Fixes (Code Actions)
Activation :

Lightbulb apparaît à gauche de la ligne problématique
Clic sur lightbulb = menu d'actions
Ou Cmd+. / Ctrl+. (shortcut standard)

Actions disponibles :

"Fix: [titre du fix]" (applique le quick fix)
"Ignore this rule" (désactive la règle pour ce fichier)
"Learn more" (ouvre la doc)

Animation :

Après application du fix : petit confetti subtil (émoji ✨)
Notification : "Fixed! 🛡️"


4. Hover (Explications détaillées)
Au survol d'un warning :
Contenu affiché :
┌─────────────────────────────────────────┐
│ ⚠️ SQL Injection vulnerability          │
│                                         │
│ Why it's dangerous:                     │
│ User input is directly concatenated     │
│ in SQL query. An attacker can          │
│ manipulate the query to access or      │
│ delete data.                           │
│                                         │
│ How to fix:                            │
│ Use parameterized queries with         │
│ bound parameters.                      │
│                                         │
│ [Learn more] [Quick fix]               │
└─────────────────────────────────────────┘
Design :

Background : #1E1E1E (dark) ou #FFFFFF (light)
Texte : clair et concis
Liens cliquables
Markdown support


5. Status Bar
Position : Bas de l'écran, à droite
États possibles :
État normal :
🛡️ Veil: Active
État analyse en cours :
⏳ Veil: Analyzing...
État erreur :
❌ Veil: Error (click for details)
État findings détectés :
🛡️ Veil: 3 issues found
Click sur l'icône : Ouvre la sidebar Veil

6. Sidebar (Statistiques)
Activation : Click sur l'icône status bar ou View > Veil
Contenu de la sidebar :
Section "Today"
🛡️ 12 vulnerabilities prevented
⚡ 47 total this week
🔥 14-day streak
Section "Top Risks"
Bar chart simple :
SQL Injection     ████████ 8
Hardcoded Secrets ██████   6
XSS               ████     4
Section "Quick Actions"
[Scan all open files]
[Settings]
[Documentation]
Stockage des stats :

LocalStorage de l'extension (globalState)
Format JSON
Pas de cloud (MVP = offline)


7. Settings
Accès : VS Code Settings > Extensions > Veil
Options configurables :
Veil: Enabled
☑ Enable Veil analysis

Veil: Auto Fix On Save
☐ Automatically apply fixes when saving

Veil: Rules
☑ Hardcoded Secrets (error)
☑ SQL Injection (error)
☑ XSS (error)
☑ Command Injection (error)
☑ Path Traversal (error)
☑ Weak Cryptography (warning)
☐ Dead Code (info)
☐ Missing Error Handling (warning)
☐ N+1 Queries (warning)
☐ Memory Leaks (warning)

Veil: Excluded Paths
node_modules/**, .venv/**, __pycache__/**
Implémentation :

Utiliser VS Code configuration API
Settings synchronisés avec VS Code Settings Sync


8. Onboarding (première utilisation)
Au premier lancement :
Popup welcome message :
┌──────────────────────────────────────────┐
│ 👋 Welcome to Veil!                      │
│                                          │
│ Veil protects your code by detecting    │
│ vulnerabilities in real-time.           │
│                                          │
│ ✓ Works offline                         │
│ ✓ No data sent to cloud                 │
│ ✓ Supports Python, JS, TS               │
│                                          │
│ [Get Started] [Watch Demo]              │
└──────────────────────────────────────────┘
Après "Get Started" :

Analyser automatiquement le fichier actif
Afficher les premiers findings (si trouvés)
Highlight le lightbulb pour montrer le quick fix


Gestion des performances
Problème : Analyse à chaque keystroke = CPU intensif
Solutions :
1. Debouncing

Ne pas analyser à chaque caractère
Attendre 500ms d'inactivité avant d'analyser
Annuler l'analyse en cours si nouvelle modification

2. Analyse incrémentale (optionnel pour MVP)

Pour l'instant : ré-analyser tout le fichier
V2 : analyser seulement les lignes modifiées

3. Worker thread

L'analyse ne doit pas bloquer l'UI
Le subprocess Go tourne en background

4. Timeout

Abandonner après 5 secondes
Afficher message : "File too large for analysis"


Packaging & Distribution
Format final : .vsix (VS Code Extension Package)
Contenu du package :
veil-1.0.0.vsix
├── extension.js (bundled)
├── package.json
├── README.md
├── LICENSE
├── CHANGELOG.md
├── icon.png (128x128)
└── bin/
    ├── veil-darwin-amd64
    ├── veil-darwin-arm64
    ├── veil-linux-amd64
    └── veil-windows-amd64.exe
Build process :

Compiler TypeScript → JavaScript
Bundle avec esbuild (1 seul fichier)
Copier les binaires Go dans bin/
Créer le .vsix avec vsce

Publication :

VS Code Marketplace (compte publisher requis)
Gratuit pour les users


🎨 DESIGN SYSTEM
Principes de design
1. Invisible jusqu'à nécessaire

Pas de popups intrusifs
Pas de notifications constantes
Interface discrète

2. Native VS Code

Utiliser les composants standards VS Code
Respecter le thème de l'utilisateur (dark/light)
Pas de custom UI inutile

3. Clarté > Quantité

Messages courts et clairs
Pas de jargon technique inutile
Actionable (toujours proposer une solution)

Couleurs
Palette (suit les standards VS Code) :
Diagnostics :

Error : #F48771 (rouge VS Code)
Warning : #CCA700 (jaune VS Code)
Info : #3794FF (bleu VS Code)

Status :

Success : #89D185 (vert)
Active : #007ACC (bleu VS Code)
Disabled : #858585 (gris)

PAS de violet/mauve dans l'UI (réservé pour le branding externe)
Respect du thème utilisateur :

Dark mode : backgrounds sombres
Light mode : backgrounds clairs
Auto-detect via VS Code API

Typographie
VS Code utilise :

Interface : System font (Segoe UI sur Windows, SF Pro sur macOS)
Code : User's editor font (généralement JetBrains Mono, Fira Code, etc.)

Ne pas override : respecter les choix utilisateur
Icônes
Status bar : 🛡️ (emoji shield)
Severity icons :

Error : ❌
Warning : ⚠️
Info : ℹ️

Pas de custom SVG icons pour le MVP (ajouter en V2)
Animations
Principe : Subtiles et rapides
Après quick fix appliqué :

Confetti léger (émoji ✨ qui fade out en 1s)
OU flash vert de la ligne corrigée (200ms)

Lors de l'analyse :

Spinner dans status bar
Pas de loading UI bloquante

Transitions :

Sidebar : slide in 200ms
Diagnostics : fade in 100ms


📊 DONNÉES & STOCKAGE
Stockage local uniquement (MVP)
VS Code GlobalState (extension.context.globalState)
Données stockées :
User stats :
json{
  "totalFindings": 142,
  "totalFixed": 89,
  "streak": {
    "current": 14,
    "longest": 18
  },
  "lastUsed": "2025-01-06",
  "findingsByRule": {
    "sql-injection": 23,
    "hardcoded-secrets": 45,
    "xss": 12
  }
}
User settings :
json{
  "enabledRules": ["sql-injection", "hardcoded-secrets", "xss"],
  "autoFixOnSave": false,
  "excludedPaths": ["node_modules/**", ".venv/**"]
}
PAS de telemetry pour le MVP

Aucune donnée envoyée à un serveur
Privacy-first
Peut être ajouté en V2 avec opt-in explicite


🧪 TESTING & QUALITÉ
Tests requis
Backend (Go) :
Tests unitaires (règles) :

Chaque règle doit avoir ≥ 5 test cases
Cas positifs (détection correcte)
Cas négatifs (pas de faux positifs)
Edge cases

Tests d'intégration :

JSON-RPC communication
Parsing de vrais fichiers
Performance (< 200ms sur 1000 lignes)

Coverage attendue : ≥ 80%
Frontend (TypeScript) :
Tests unitaires :

Fonctions utilitaires
Parsing des responses
Gestion d'erreurs

Tests E2E :

Installation de l'extension
Analyse d'un fichier
Application d'un quick fix
Affichage diagnostics

Outil recommandé : VS Code Extension Test Runner
Performance benchmarks
Critères de performance :
MétriqueTargetMaximumTemps d'analyse (500 lignes)< 100ms< 200msTemps d'analyse (2000 lignes)< 150ms< 300msTemps d'analyse (5000 lignes)< 300ms< 1000msMémoire moteur Go< 50MB< 100MBMémoire extension< 30MB< 50MBStartup time< 1s< 2s
Profiling :

Go : utiliser pprof
TypeScript : Chrome DevTools


🚀 DÉPLOIEMENT & RELEASE
Process de build
1. Build du moteur Go
bash# Cross-compile pour toutes les platforms
GOOS=darwin GOARCH=amd64 go build -o bin/veil-darwin-amd64
GOOS=darwin GOARCH=arm64 go build -o bin/veil-darwin-arm64
GOOS=linux GOARCH=amd64 go build -o bin/veil-linux-amd64
GOOS=windows GOARCH=amd64 go build -o bin/veil-windows-amd64.exe
2. Build de l'extension
bash# Installer les dépendances
npm install

# Compiler TypeScript
npm run compile

# Bundle avec esbuild
npm run bundle

# Créer le .vsix
vsce package
Output final : veil-1.0.0.vsix
Versioning
Stratégie : Semantic Versioning (semver)

v1.0.0 : MVP launch
v1.0.x : Bug fixes
v1.x.0 : Nouvelles features
v2.0.0 : Breaking changes

Changelog
Format (CHANGELOG.md) :
markdown# Changelog

## [1.0.0] - 2025-01-20

### Added
- Initial release
- 10 security rules
- Support for Python, JavaScript, TypeScript
- Real-time analysis
- Quick fixes
- Stats sidebar

### Security
- All analysis runs locally
- No data sent to cloud
Distribution
VS Code Marketplace :

Créer un compte publisher (Microsoft)
Upload du .vsix
Gratuit pour les utilisateurs

Alternative (beta) :

Distribuer le .vsix directement
Installation : code --install-extension veil-1.0.0.vsix


📚Continue8:24 PMDOCUMENTATION
README.md (pour VS Code Marketplace)
Contenu requis :
Hero section :

Titre : "Veil - Real-time security for AI-generated code"
Tagline
Screenshot principal (analyse en action)

Features :

Liste des 10 règles
Langages supportés
Quick fixes

Installation :

Lien marketplace
Commande install

Usage :

"Just install and code. Veil works automatically."

Privacy :

"100% offline. No data sent to cloud."

Support :

Email ou GitHub issues

Documentation technique (pour devs)
docs/architecture.md :

Diagramme architecture
Flow de communication
Types de données

docs/rules.md :

Description de chaque règle
Exemples de détection
Exemples de fixes

docs/contributing.md :

Comment ajouter une règle
Comment tester
Process de PR


⚙️ CONFIGURATION & DÉPLOIEMENT
Variables d'environnement
Aucune (tout est local pour MVP)
Fichiers de configuration
extension/package.json :
json{
  "name": "veil",
  "displayName": "Veil",
  "description": "Real-time security for AI-generated code",
  "version": "1.0.0",
  "publisher": "veil-dev",
  "icon": "icon.png",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Linters", "Programming Languages"],
  "keywords": ["security", "ai", "copilot", "vulnerabilities"],
  "activationEvents": [
    "onLanguage:python",
    "onLanguage:javascript",
    "onLanguage:typescript"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "Veil",
      "properties": {
        "veil.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable/disable Veil"
        },
        "veil.autoFixOnSave": {
          "type": "boolean",
          "default": false,
          "description": "Automatically apply fixes on save"
        }
      }
    }
  }
}

🎯 CRITÈRES DE VALIDATION MVP
Fonctionnel

 10 règles implémentées et testées
 Support Python, JavaScript, TypeScript
 Quick fixes fonctionnent (1-clic)
 Sidebar stats fonctionnelle
 Settings configurables
 0 crash en 1h d'utilisation

Performance

 Analyse < 200ms sur fichiers < 1000 lignes
 Pas de freeze de l'IDE
 Mémoire < 100MB

UX

 Installation en 1 clic
 Fonctionne sans configuration
 Messages clairs et actionnables
 Hover explanations complètes

Qualité

 Tests coverage > 80%
 Documentation complète
 Changelog
 README marketplace-ready


📅 PLANNING DÉTAILLÉ
Semaine 1-2 : Setup + Règle 1
Backend :

Setup projet Go
Architecture JSON-RPC
Parser AST Python
Règle Hardcoded Secrets
Tests unitaires

Frontend :

Setup projet TypeScript
Communication subprocess
Affichage diagnostics basique

Livrable : Détection de secrets fonctionne end-to-end

Semaine 3-4 : Règles 2-4 + Quick fixes
Backend :

Règle SQL Injection
Règle XSS
Règle Command Injection
Génération quick fixes
Tests

Frontend :

Quick fixes (Code Actions)
Hover provider
Status bar

Livrable : 4 règles + quick fixes fonctionnels

Semaine 5-6 : Règles 5-7 + Multi-language
Backend :

Règle Path Traversal
Règle Weak Crypto
Règle Dead Code
Parser JavaScript
Parser TypeScript

Frontend :

Support JS/TS
Tests E2E

Livrable : 7 règles, 3 langages

Semaine 7-8 : Règles 8-10 + Sidebar
Backend :

Règle Error Handling
Règle N+1 Queries
Règle Memory Leaks
Optimisation performance

Frontend :

Sidebar avec stats
Settings panel
Stockage local

Livrable : 10 règles, UI complète

Semaine 9-10 : Polish + Testing
Backend :

Optimisation mémoire
Error handling robuste
Performance benchmarks

Frontend :

Animations
Onboarding
Tests E2E complets

Livrable : MVP stable et testé

Semaine 11 : Beta testing

Packaging .vsix
Distribution à 50 beta testers
Bug fixes urgents
Itération sur feedback

Livrable : Product-market fit validé

Semaine 12 : Launch prep

Documentation finale
Assets marketplace
Changelog
Publish sur marketplace

Liverable : MVP public

📞 POINTS DE CONTACT & VALIDATION
Rituels
Daily standup (async) :

Ce qu'on a fait hier
Ce qu'on fait aujourd'hui
Blockers

Weekly demo (sync) :

Demo des features de la semaine
Feedback
Ajustements priorités

End of sprint (toutes les 2 semaines) :

Review complète
Validation livrables
Planning sprint suivant

Validation intermédiaire
Semaine 2 : Première détection doit fonctionner
Semaine 4 : Quick fixes doivent fonctionner
Semaine 6 : Multi-language doit fonctionner
Semaine 8 : 10 règles complètes
Semaine 10 : MVP complet et stable

❓ QUESTIONS FRÉQUENTES
Q: Peut-on ajouter d'autres règles facilement ?
R: Oui, architecture modulaire. Ajouter un fichier dans rules/, implémenter l'interface Rule.
Q: Comment débugger la communication extension ↔ moteur ?
R: Logs stdout du subprocess Go sont visibles dans VS Code Output > Veil.
Q: Que faire si un fichier est trop gros ?
R: Timeout après 5s, afficher message "File too large".
Q: Comment gérer les faux positifs ?
R: User peut désactiver une règle dans settings. À améliorer en V2 avec ML.
Q: Peut-on supporter d'autres IDEs ?
R: Pas pour MVP. V2 : JetBrains (IntelliJ, PyCharm).

🎯 DÉFINITION OF DONE
Un feature est "done" quand :

✅ Code écrit et testé
✅ Tests unitaires passent
✅ Tests E2E passent (si applicable)
✅ Documentation mise à jour
✅ Code review fait
✅ Merged dans main

Le MVP est "done" quand :

✅ Tous les critères de validation MVP sont ✅
✅ 50 beta testers satisfaits (NPS > 50)
✅ 0 bugs critiques
✅ Prêt pour publication marketplace

voici le repo :  https://github.com/NICE-DEV226/Veil.git fait comme un dev senior qui est expert dans le domaine du devops et du code quality. 


FIN DU CAHIER DES CHARGES

