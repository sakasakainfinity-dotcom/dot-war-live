const actionMap = {
  place: "place",
  "置く": "place",
  attack: "attack",
  "攻撃": "attack",
  shield: "shield",
  "防御": "shield",
  bomb: "bomb",
  "爆弾": "bomb"
};

const commandRegex = /^\s*([AB])\s+(place|attack|shield|bomb|置く|攻撃|防御|爆弾)\s+(\d{1,3})\s*$/i;

export function parseCommand(input) {
  const match = input.match(commandRegex);
  if (!match) return null;

  const [, rawTeam, rawAction, rawCellId] = match;
  const team = rawTeam.toUpperCase();
  const action = actionMap[rawAction.toLowerCase()] ?? actionMap[rawAction];
  const cellId = Number(rawCellId);

  if (!action || Number.isNaN(cellId) || cellId < 0 || cellId > 199) {
    return null;
  }

  return { team, action, cellId };
}
