Ok Vic Viper. Plus de markdown. Voici les fichiers bruts.

Fichier 1 : generate_review_prompt.py

import sys
from pathlib import Path

def generate_prompt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()
    prompt = "You are a senior software engineer.\n\nReview the following code:\n\n```javascript\n" + code + "\n```\n\nProvide a structured report with:\n- Architecture (modularity, structure)\n- Code quality (naming, comments, duplication)\n- Complexity (functions, conditions)\n- Bugs or edge cases\n- 5 concrete suggestions for improvement\n\nUse the format:\nCreate a file projects/roguelike/REVIEW.md\n[code]\n# Review of game.js\n...\n[/code]"
    return prompt

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_review_prompt.py <filepath>")
        sys.exit(1)
    prompt = generate_prompt(sys.argv[1])
    print(prompt)


Fichier 2 : plan_review_roguelike_auto.yaml

steps:
  - type: command
    command: python generate_review_prompt.py projects/roguelike/game.js > prompt.txt
  - type: ask
    prompt_file: prompt.txt
  - type: parse
    path: projects/roguelike/REVIEW.md
  - type: ask
    prompt: "Based on the review, apply the corrections to projects/roguelike/game.js. Provide the corrected file. Use the format: Create a file projects/roguelike/game.js [code] # content [/code]"
  - type: parse
    path: projects/roguelike/game.js
  - type: command
    command: node projects/roguelike/game.js
  - type: command
    command: cd projects/roguelike && git add . && git commit -m "Review and improve roguelike"
  - type: command
    command: cd projects/roguelike && git push origin master


Fichier 3 : modification dans agent/steps/engine.py (step ask)

elif step_type == "ask":
    ui = DeepSeekUI()
    prompt = step.get("prompt", "What do you suggest?")
    prompt_file = step.get("prompt_file")
    if prompt_file:
        with open(prompt_file, 'r', encoding='utf-8') as f:
            prompt = f.read()
    response = ui.ask(prompt)
    context["last_response"] = response
    print("📥 Réponse nettoyée reçue")


Lancement :

python cli.py plan_review_roguelike_auto.yaml