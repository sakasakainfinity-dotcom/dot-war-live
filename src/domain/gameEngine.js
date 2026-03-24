import { GAME_CONFIG } from "../config/gameConfig.js";

function toIndex(row, col, width) {
  return row * width + col;
}

function neighbors(id, width, height) {
  const row = Math.floor(id / width);
  const col = id % width;
  const out = [];
  if (row > 0) out.push(toIndex(row - 1, col, width));
  if (row < height - 1) out.push(toIndex(row + 1, col, width));
  if (col > 0) out.push(toIndex(row, col - 1, width));
  if (col < width - 1) out.push(toIndex(row, col + 1, width));
  return out;
}

function oppositeTeam(team) {
  return team === "A" ? "B" : "A";
}

export function createInitialState() {
  const { width, height } = GAME_CONFIG;
  const board = Array.from({ length: width * height }, (_, id) => {
    const row = Math.floor(id / width);
    const col = id % width;
    return { id, row, col, type: "EMPTY" };
  });

  for (let r = 0; r < height; r += 1) {
    if (r < GAME_CONFIG.initialLeftCells / 2) {
      board[toIndex(r, 0, width)].type = "A";
      board[toIndex(r, 1, width)].type = "A";
      board[toIndex(height - 1 - r, width - 1, width)].type = "B";
      board[toIndex(height - 1 - r, width - 2, width)].type = "B";
    }
  }

  [66, 99, 133].forEach((id) => {
    board[id].type = "RESOURCE";
  });

  [44, 45, 54, 55, 144, 145].forEach((id) => {
    board[id].type = "WALL";
    board[id].wallHp = GAME_CONFIG.wallHp;
  });

  return {
    board,
    turnIndex: 0,
    phase: "debate",
    width,
    height,
    bombs: { A: 0, B: 0 },
    actedUsers: new Set()
  };
}

function autoExpand(state, fromId, team, extraCount) {
  const targets = neighbors(fromId, state.width, state.height)
    .filter((id) => state.board[id].type === "EMPTY")
    .sort((a, b) => (team === "A" ? a - b : b - a));

  const changed = [];
  for (const id of targets.slice(0, extraCount)) {
    state.board[id].type = team;
    changed.push(id);
  }
  return changed;
}

function maybeApplyCenterBonus(state, team) {
  if (state.centerBonusClaimedBy) return [];
  const centerCols = new Set(GAME_CONFIG.centerColumns);
  const teamHasCenter = state.board.some((c) => c.type === team && centerCols.has(c.col));
  if (!teamHasCenter) return [];

  const candidates = state.board.filter((cell) => {
    if (cell.type !== "EMPTY") return false;
    if (Math.abs(cell.col - GAME_CONFIG.centerColumns[0]) > 2) return false;
    return neighbors(cell.id, state.width, state.height).some((nId) => state.board[nId].type === team);
  });

  const placed = candidates.slice(0, GAME_CONFIG.centerBreakthroughBonus).map((c) => c.id);
  placed.forEach((id) => {
    state.board[id].type = team;
  });

  if (placed.length > 0) {
    state.centerBonusClaimedBy = team;
  }

  return placed;
}

export function applyAction(state, input) {
  if (state.phase !== "action") {
    return { accepted: false, reason: "Action phase only", changedCellIds: [] };
  }
  if (state.actedUsers.has(input.userId)) {
    return { accepted: false, reason: "Already acted this turn", changedCellIds: [] };
  }

  const cell = state.board[input.cellId];
  if (!cell) {
    return { accepted: false, reason: "Invalid cell", changedCellIds: [] };
  }

  const changedCellIds = [];
  let awardedBomb = false;

  if (input.action === "place") {
    if (cell.type !== "EMPTY" && cell.type !== "RESOURCE") {
      return { accepted: false, reason: "Cannot place here", changedCellIds: [] };
    }
    const wasResource = cell.type === "RESOURCE";
    cell.type = input.team;
    changedCellIds.push(cell.id);

    if (wasResource) {
      state.bombs[input.team] += 1;
      awardedBomb = true;
    }

    if (input.paidTier === 300) {
      changedCellIds.push(...autoExpand(state, cell.id, input.team, 2));
    }
    if (input.paidTier === 500) {
      changedCellIds.push(...autoExpand(state, cell.id, input.team, 4));
    }
  }

  if (input.action === "attack") {
    const enemy = oppositeTeam(input.team);
    if (cell.shieldUntilTurn && cell.shieldUntilTurn >= state.turnIndex) {
      return { accepted: false, reason: "Cell is shielded", changedCellIds: [] };
    }

    const damage = input.paidTier === 500 ? 3 : input.paidTier === 300 ? 2 : 1;

    if (cell.type === "WALL") {
      cell.wallHp = Math.max(0, (cell.wallHp ?? GAME_CONFIG.wallHp) - damage);
      changedCellIds.push(cell.id);
      if (cell.wallHp === 0) {
        cell.type = "EMPTY";
        delete cell.wallHp;
      }
    } else if (cell.type === enemy) {
      cell.type = "EMPTY";
      changedCellIds.push(cell.id);
    } else {
      return { accepted: false, reason: "No valid target", changedCellIds: [] };
    }
  }

  if (input.action === "shield") {
    if (input.paidTier !== 500) {
      return { accepted: false, reason: "Shield requires paid tier 500", changedCellIds: [] };
    }
    if (cell.type !== input.team) {
      return { accepted: false, reason: "Can shield only own cell", changedCellIds: [] };
    }
    cell.shieldUntilTurn = state.turnIndex + 1;
    changedCellIds.push(cell.id);
  }

  if (input.action === "bomb") {
    if (state.bombs[input.team] <= 0) {
      return { accepted: false, reason: "No bombs", changedCellIds: [] };
    }
    const enemy = oppositeTeam(input.team);
    if (cell.type !== enemy) {
      return { accepted: false, reason: "Bomb only enemy cells", changedCellIds: [] };
    }
    cell.type = "EMPTY";
    state.bombs[input.team] -= 1;
    changedCellIds.push(cell.id);
  }

  const centerBonus = maybeApplyCenterBonus(state, input.team);
  changedCellIds.push(...centerBonus);

  state.actedUsers.add(input.userId);

  return {
    accepted: true,
    changedCellIds,
    awardedBomb,
    centerBonusApplied: centerBonus.length > 0
  };
}

export function advancePhase(state) {
  if (state.phase === "debate") {
    state.phase = "action";
  } else {
    state.phase = "debate";
    state.turnIndex += 1;
    state.actedUsers.clear();
  }
  return state;
}
