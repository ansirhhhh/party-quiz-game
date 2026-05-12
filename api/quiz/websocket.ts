import type { Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { questions } from "./questions";
import {
  getGameState,
  resetGameState,
  addPlayer,
  disconnectPlayer,
  reconnectPlayer,
  verifyHostPassword,
  setPhase,
  startRound,
  recordAnswer,
  endRound,
  nextQuestion,
  finishGame,
  getLeaderboard,
  exportResults,
  type Player,
} from "./gameState";

// 客户端连接映射
const clients = new Map<string, WebSocket>();
const hostClients = new Set<WebSocket>();

// WebSocket消息类型
interface WSMessage {
  type: string;
  payload?: any;
}

// 广播给所有客户端
function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// 广播给主持人
function broadcastToHost(data: any) {
  const message = JSON.stringify(data);
  hostClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// 发送给特定客户端
function sendTo(clientId: string, data: any) {
  const ws = clients.get(clientId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// 获取当前问题（隐藏正确答案）
function getPublicQuestion() {
  const state = getGameState();
  const q = state.questions[state.currentQuestionIndex];
  if (!q) return null;
  return {
    id: q.id,
    difficulty: q.difficulty,
    points: q.points,
    question: q.question,
    options: q.options,
    timeLimit: q.timeLimit,
    index: state.currentQuestionIndex,
    total: state.questions.length,
  };
}

// 获取当前问题（包含正确答案 - 仅主持人）
function getHostQuestion() {
  const state = getGameState();
  const q = state.questions[state.currentQuestionIndex];
  if (!q) return null;
  return {
    id: q.id,
    difficulty: q.difficulty,
    points: q.points,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    timeLimit: q.timeLimit,
    index: state.currentQuestionIndex,
    total: state.questions.length,
  };
}

// 获取游戏状态快照
function getGameSnapshot() {
  const state = getGameState();
  return {
    phase: state.phase,
    currentQuestion: state.currentQuestionIndex + 1,
    totalQuestions: state.questions.length,
    playerCount: Array.from(state.players.values()).filter(
      (p) => p.connected
    ).length,
    leaderboard: getLeaderboard(),
  };
}

// 初始化WebSocket服务器
export function initQuizWebSocket(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/quiz",
  });

  wss.on("connection", (ws) => {
    const clientId = crypto.randomUUID();
    clients.set(clientId, ws);

    ws.on("message", (rawData) => {
      try {
        const message: WSMessage = JSON.parse(rawData.toString());
        handleMessage(clientId, ws, message);
      } catch (e) {
        ws.send(
          JSON.stringify({ type: "error", payload: "Invalid message format" })
        );
      }
    });

    ws.on("close", () => {
      clients.delete(clientId);
      hostClients.delete(ws);
      disconnectPlayer(clientId);
      // 广播玩家离开
      broadcast({
        type: "player_left",
        payload: { playerCount: getPlayerCount() },
      });
    });

    // 发送连接确认
    ws.send(
      JSON.stringify({
        type: "connected",
        payload: { clientId },
      })
    );
  });

  // 倒计时定时器
  let countdownInterval: NodeJS.Timeout | null = null;
  let roundTimer: NodeJS.Timeout | null = null;

  function getPlayerCount() {
    return Array.from(getGameState().players.values()).filter(
      (p) => p.connected
    ).length;
  }

  function startCountdown() {
    setPhase("countdown");
    broadcast({ type: "phase_changed", payload: { phase: "countdown" } });

    let count = 3;
    countdownInterval = setInterval(() => {
      broadcast({ type: "countdown", payload: { count } });
      if (count <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        beginRound();
      }
      count--;
    }, 1000);
  }

  function beginRound() {
    startRound();
    const publicQ = getPublicQuestion();
    const hostQ = getHostQuestion();

    // 给选手发送题目（不含正确答案）
    broadcast({ type: "question", payload: { question: publicQ } });

    // 给主持人发送题目（含正确答案）
    broadcastToHost({
      type: "host_question",
      payload: { question: hostQ },
    });

    // 更新状态
    broadcastToHost({
      type: "game_snapshot",
      payload: getGameSnapshot(),
    });

    // 设置计时器，时间到自动结束
    const currentQ =
      getGameState().questions[getGameState().currentQuestionIndex];
    if (currentQ) {
      roundTimer = setTimeout(() => {
        if (getGameState().phase === "answering") {
          handleEndRound();
        }
      }, currentQ.timeLimit * 1000);
    }
  }

  function handleEndRound() {
    if (roundTimer) {
      clearTimeout(roundTimer);
      roundTimer = null;
    }

    endRound();
    const state = getGameState();
    const q = state.questions[state.currentQuestionIndex];

    // 广播答案和本轮结果
    broadcast({
      type: "round_result",
      payload: {
        correctAnswer: q.correctAnswer,
        correctOption: q.options[q.correctAnswer],
        leaderboard: getLeaderboard(),
        answersCount: state.answersThisRound.size,
      },
    });

    broadcastToHost({
      type: "game_snapshot",
      payload: getGameSnapshot(),
    });
  }

  function handleMessage(
    clientId: string,
    ws: WebSocket,
    message: WSMessage
  ) {
    const state = getGameState();

    switch (message.type) {
      // 主持人登录
      case "host_login": {
        const { password } = message.payload || {};
        if (verifyHostPassword(password)) {
          hostClients.add(ws);
          ws.send(
            JSON.stringify({
              type: "host_authenticated",
              payload: {
                success: true,
                gameSnapshot: getGameSnapshot(),
              },
            })
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "host_authenticated",
              payload: { success: false, message: "密码错误" },
            })
          );
        }
        break;
      }

      // 选手加入
      case "player_join": {
        const { name } = message.payload || {};
        if (!name || name.trim().length === 0) {
          ws.send(
            JSON.stringify({
              type: "player_joined",
              payload: { success: false, message: "请输入姓名" },
            })
          );
          return;
        }

        // 检查是否有重名
        const existing = Array.from(state.players.values()).find(
          (p) => p.name === name.trim()
        );
        if (existing && existing.id !== clientId) {
          ws.send(
            JSON.stringify({
              type: "player_joined",
              payload: { success: false, message: "该姓名已被使用" },
            })
          );
          return;
        }

        const player = addPlayer(clientId, name.trim());
        ws.send(
          JSON.stringify({
            type: "player_joined",
            payload: {
              success: true,
              player: {
                id: player.id,
                name: player.name,
                score: player.score,
              },
              gamePhase: state.phase,
            },
          })
        );

        // 广播玩家加入
        broadcast({
          type: "player_joined_broadcast",
          payload: {
            name: player.name,
            playerCount: getPlayerCount(),
          },
        });

        // 如果当前正在答题，发送当前题目
        if (state.phase === "answering") {
          const q = getPublicQuestion();
          if (q) {
            ws.send(
              JSON.stringify({
                type: "question",
                payload: { question: q },
              })
            );
          }
        }

        // 通知主持人
        broadcastToHost({
          type: "game_snapshot",
          payload: getGameSnapshot(),
        });
        break;
      }

      // 开始比赛
      case "start_game": {
        if (!hostClients.has(ws)) {
          ws.send(
            JSON.stringify({
              type: "error",
              payload: "Unauthorized",
            })
          );
          return;
        }
        resetGameState(questions);
        startCountdown();
        break;
      }

      // 下一题
      case "next_question": {
        if (!hostClients.has(ws)) return;
        if (roundTimer) {
          clearTimeout(roundTimer);
          roundTimer = null;
        }
        if (nextQuestion()) {
          startCountdown();
        } else {
          finishGame();
          broadcast({
            type: "game_finished",
            payload: {
              leaderboard: getLeaderboard(),
            },
          });
          broadcastToHost({
            type: "game_snapshot",
            payload: getGameSnapshot(),
          });
        }
        break;
      }

      // 提交答案
      case "submit_answer": {
        if (state.phase !== "answering") {
          ws.send(
            JSON.stringify({
              type: "answer_result",
              payload: { accepted: false, message: "答题已结束" },
            })
          );
          return;
        }

        const { selectedOption } = message.payload || {};
        if (selectedOption === undefined || selectedOption === null) {
          ws.send(
            JSON.stringify({
              type: "answer_result",
              payload: { accepted: false, message: "无效选项" },
            })
          );
          return;
        }

        const timeSpent = Date.now() - state.roundStartTime;
        const accepted = recordAnswer(clientId, selectedOption, timeSpent);

        ws.send(
          JSON.stringify({
            type: "answer_result",
            payload: {
              accepted,
              message: accepted ? "答案已提交" : "答题失败（已答或已结束）",
            },
          })
        );

        if (accepted) {
          // 通知主持人答题人数
          broadcastToHost({
            type: "answer_update",
            payload: {
              answeredCount: state.answersThisRound.size,
              totalPlayers: getPlayerCount(),
            },
          });
        }
        break;
      }

      // 结束当前回合（主持人手动结束）
      case "end_round": {
        if (!hostClients.has(ws)) return;
        handleEndRound();
        break;
      }

      // 结束比赛
      case "finish_game": {
        if (!hostClients.has(ws)) return;
        if (roundTimer) {
          clearTimeout(roundTimer);
          roundTimer = null;
        }
        finishGame();
        broadcast({
          type: "game_finished",
          payload: { leaderboard: getLeaderboard() },
        });
        broadcastToHost({
          type: "game_snapshot",
          payload: getGameSnapshot(),
        });
        break;
      }

      // 导出结果
      case "export_results": {
        if (!hostClients.has(ws)) return;
        const results = exportResults();
        ws.send(
          JSON.stringify({
            type: "export_data",
            payload: { data: results },
          })
        );
        break;
      }

      // 获取排行榜
      case "get_leaderboard": {
        ws.send(
          JSON.stringify({
            type: "leaderboard",
            payload: { leaderboard: getLeaderboard() },
          })
        );
        break;
      }

      // 心跳
      case "ping": {
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      }
    }
  }

  return wss;
}
