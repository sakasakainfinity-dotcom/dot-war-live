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

const SUPER_CHAT_RULES = {
  JPY: {
    vote: 300,
    bomb: 500
  },
  USD: {
    vote: 3,
    bomb: 5
  }
};

function parseSuperChatAmount(details) {
  const micros = Number(details?.amountMicros);
  if (!Number.isFinite(micros)) return null;
  return micros / 1_000_000;
}

export function parseSuperChat(item) {
  const snippet = item?.snippet;
  const details = snippet?.superChatDetails;
  if (!details) return null;

  const text = `${snippet?.displayMessage ?? ""}`.trim().toUpperCase();
  if (text !== "A" && text !== "R") return null;

  const currency = `${details?.currency ?? ""}`.toUpperCase();
  const rules = SUPER_CHAT_RULES[currency];
  if (!rules) return null;

  const amount = parseSuperChatAmount(details);
  if (amount === null) return null;

  if (amount === rules.bomb) {
    return {
      type: "bomb",
      target: text === "A" ? "R" : "A",
      value: 3
    };
  }

  if (amount === rules.vote) {
    return {
      type: "vote",
      team: text,
      value: 3
    };
  }

  return null;
}
