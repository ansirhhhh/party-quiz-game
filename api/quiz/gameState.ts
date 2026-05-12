// 游戏状态管理 - 内存存储
import type { Question } from "./questions";

export type GamePhase =
  | "waiting" // 等待开始
  | "countdown" // 倒计时准备
  | "answering" // 答题中
  | "showAnswer" // 显示答案
  | "showScores" // 显示积分榜
  | "finished"; // 比赛结束

export interface Player {
  id: string;
  name: string;
  score: number;
  answers: {
    questionId: number;
    selectedOption: number;
    isCorrect: boolean;
    timeSpent: number; // milliseconds
    points: number;
  }[];
  connected: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentQuestionIndex: number;
  questions: Question[];
  players: Map<string, Player>;
  answersThisRound: Map<string, { selectedOption: number; timeSpent: number }>;
  roundStartTime: number;
  roundEndTime: number;
  hostPassword: string;
}

// 游戏状态实例
let gameState: GameState = {
  phase: "waiting",
  currentQuestionIndex: 0,
  questions: [],
  players: new Map(),
  answersThisRound: new Map(),
  roundStartTime: 0,
  roundEndTime: 0,
  hostPassword: "3251",
};

// 重置游戏状态
export function resetGameState(questions: Question[]) {
  gameState = {
    phase: "waiting",
    currentQuestionIndex: 0,
    questions,
    players: new Map(),
    answersThisRound: new Map(),
    roundStartTime: 0,
    roundEndTime: 0,
    hostPassword: "3251",
  };
  return gameState;
}

export function getGameState(): GameState {
  return gameState;
}

// 添加玩家
export function addPlayer(id: string, name: string): Player {
  const existing = gameState.players.get(id);
  if (existing) {
    existing.connected = true;
    return existing;
  }
  const player: Player = {
    id,
    name,
    score: 0,
    answers: [],
    connected: true,
  };
  gameState.players.set(id, player);
  return player;
}

// 移除/断开玩家
export function disconnectPlayer(id: string) {
  const player = gameState.players.get(id);
  if (player) {
    player.connected = false;
  }
}

// 重新连接玩家
export function reconnectPlayer(id: string): Player | undefined {
  const player = gameState.players.get(id);
  if (player) {
    player.connected = true;
    return player;
  }
  return undefined;
}

// 验证主持人密码
export function verifyHostPassword(password: string): boolean {
  return password === gameState.hostPassword || password === "Cya";
}

// 设置游戏阶段
export function setPhase(phase: GamePhase) {
  gameState.phase = phase;
}

// 开始新回合
export function startRound() {
  gameState.answersThisRound = new Map();
  gameState.roundStartTime = Date.now();
  gameState.roundEndTime =
    gameState.roundStartTime +
    gameState.questions[gameState.currentQuestionIndex].timeLimit * 1000;
  gameState.phase = "answering";
}

// 记录答案
export function recordAnswer(
  playerId: string,
  selectedOption: number,
  timeSpent: number
): boolean {
  if (gameState.phase !== "answering") return false;
  if (gameState.answersThisRound.has(playerId)) return false; // 已答题
  gameState.answersThisRound.set(playerId, { selectedOption, timeSpent });
  return true;
}

// 结束当前回合并计算得分
export function endRound() {
  const question = gameState.questions[gameState.currentQuestionIndex];
  if (!question) return;

  // 收集所有正确答案的玩家并按时间排序
  const correctAnswers: {
    playerId: string;
    timeSpent: number;
    option: number;
  }[] = [];

  gameState.answersThisRound.forEach((answer, playerId) => {
    if (answer.selectedOption === question.correctAnswer) {
      correctAnswers.push({
        playerId,
        timeSpent: answer.timeSpent,
        option: answer.selectedOption,
      });
    }
  });

  // 按时间排序（快的在前）
  correctAnswers.sort((a, b) => a.timeSpent - b.timeSpent);

  // 计算速度加分
  const speedBonus = [5, 3, 1]; // 前3名额外加分

  // 更新玩家分数
  gameState.answersThisRound.forEach((answer, playerId) => {
    const player = gameState.players.get(playerId);
    if (!player) return;

    const isCorrect = answer.selectedOption === question.correctAnswer;
    let points = 0;

    if (isCorrect) {
      points = question.points;
      // 速度加分
      const rank = correctAnswers.findIndex(
        (ca) => ca.playerId === playerId
      );
      if (rank >= 0 && rank < 3) {
        points += speedBonus[rank];
      }
    }

    player.score += points;
    player.answers.push({
      questionId: question.id,
      selectedOption: answer.selectedOption,
      isCorrect,
      timeSpent: answer.timeSpent,
      points,
    });
  });

  gameState.phase = "showAnswer";
}

// 下一题
export function nextQuestion(): boolean {
  if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
    gameState.currentQuestionIndex++;
    gameState.answersThisRound = new Map();
    return true;
  }
  return false;
}

// 结束比赛
export function finishGame() {
  gameState.phase = "finished";
}

// 获取排行榜（按分数排序）
export function getLeaderboard() {
  return Array.from(gameState.players.values())
    .filter((p) => p.connected || p.score > 0 || p.answers.length > 0)
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      rank: index + 1,
      name: p.name,
      score: p.score,
      correctCount: p.answers.filter((a) => a.isCorrect).length,
    }));
}

// 导出比赛结果
export function exportResults(): string {
  const allPlayers = Array.from(gameState.players.values());
  const leaderboard = getLeaderboard();
  const lines: string[] = [];
  lines.push("=".repeat(50));
  lines.push("    党团知识竞赛 - 比赛结果");
  lines.push("=".repeat(50));
  lines.push(`比赛时间: ${new Date().toLocaleString("zh-CN")}`);
  lines.push(`总题目数: ${gameState.questions.length}`);
  lines.push(`参赛人数: ${allPlayers.length}`);
  lines.push("-".repeat(50));
  lines.push("排行榜:");
  leaderboard.forEach((p, i) => {
    lines.push(
      `  ${i + 1}. ${p.name} - ${p.score}分 (答对${p.correctCount}题)`
    );
  });
  lines.push("-".repeat(50));
  lines.push("各题答题情况:");
  gameState.questions.forEach((q, qi) => {
    lines.push(`\n第${qi + 1}题 [${q.difficulty === "easy" ? "基础" : q.difficulty === "medium" ? "进阶" : "挑战"}题, ${q.points}分]`);
    lines.push(`题目: ${q.question}`);
    lines.push(`正确答案: ${String.fromCharCode(65 + q.correctAnswer)}. ${q.options[q.correctAnswer]}`);
    lines.push("答题情况:");
    allPlayers.forEach((p) => {
      const ans = p.answers.find((a) => a.questionId === q.id);
      if (ans) {
        const status = ans.isCorrect ? "正确" : "错误";
        lines.push(
          `  ${p.name}: ${String.fromCharCode(65 + ans.selectedOption)} (${status}, ${ans.timeSpent / 1000}s, ${ans.points}分)`
        );
      } else {
        lines.push(`  ${p.name}: 未作答`);
      }
    });
  });
  lines.push("\n" + "=".repeat(50));
  return lines.join("\n");
}
