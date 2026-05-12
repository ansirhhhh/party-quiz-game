import devServer from "@hono/vite-dev-server"
import path from "path"
const __dirname = import.meta.dirname
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { WebSocketServer, WebSocket as WsWebSocket } from "ws"
import { questions } from "./api/quiz/questions"
import {
  getGameState,
  resetGameState,
  addPlayer,
  disconnectPlayer,
  verifyHostPassword,
  setPhase,
  startRound,
  recordAnswer,
  endRound,
  nextQuestion,
  finishGame,
  getLeaderboard,
  exportResults,
} from "./api/quiz/gameState"

const clients = new Map<string, WsWebSocket>()
const hostClients = new Set<WsWebSocket>()

function broadcast(data: any) {
  const message = JSON.stringify(data)
  clients.forEach((ws) => {
    if (ws.readyState === WsWebSocket.OPEN) {
      ws.send(message)
    }
  })
}

function broadcastToHost(data: any) {
  const message = JSON.stringify(data)
  hostClients.forEach((ws) => {
    if (ws.readyState === WsWebSocket.OPEN) {
      ws.send(message)
    }
  })
}

function sendTo(clientId: string, data: any) {
  const ws = clients.get(clientId)
  if (ws && ws.readyState === WsWebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

function getPublicQuestion() {
  const state = getGameState()
  const q = state.questions[state.currentQuestionIndex]
  if (!q) return null
  return {
    id: q.id,
    difficulty: q.difficulty,
    points: q.points,
    question: q.question,
    options: q.options,
    timeLimit: q.timeLimit,
    index: state.currentQuestionIndex,
    total: state.questions.length,
  }
}

function getHostQuestion() {
  const state = getGameState()
  const q = state.questions[state.currentQuestionIndex]
  if (!q) return null
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
  }
}

function getGameSnapshot() {
  const state = getGameState()
  return {
    phase: state.phase,
    currentQuestion: state.currentQuestionIndex + 1,
    totalQuestions: state.questions.length,
    playerCount: Array.from(state.players.values()).filter(
      (p) => p.connected
    ).length,
    leaderboard: getLeaderboard(),
  }
}

function getPlayerCount() {
  return Array.from(getGameState().players.values()).filter(
    (p) => p.connected
  ).length
}

let countdownInterval: NodeJS.Timeout | null = null
let roundTimer: NodeJS.Timeout | null = null

function startCountdown() {
  setPhase("countdown")
  broadcast({ type: "phase_changed", payload: { phase: "countdown" } })

  let count = 3
  countdownInterval = setInterval(() => {
    broadcast({ type: "countdown", payload: { count } })
    if (count <= 0) {
      if (countdownInterval) clearInterval(countdownInterval)
      beginRound()
    }
    count--
  }, 1000)
}

function beginRound() {
  startRound()
  const publicQ = getPublicQuestion()
  const hostQ = getHostQuestion()

  broadcast({ type: "question", payload: { question: publicQ } })
  broadcastToHost({ type: "host_question", payload: { question: hostQ } })
  broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })

  const currentQ = getGameState().questions[getGameState().currentQuestionIndex]
  if (currentQ) {
    roundTimer = setTimeout(() => {
      if (getGameState().phase === "answering") {
        handleEndRound()
      }
    }, currentQ.timeLimit * 1000)
  }
}

function handleEndRound() {
  if (roundTimer) {
    clearTimeout(roundTimer)
    roundTimer = null
  }

  endRound()
  const state = getGameState()
  const q = state.questions[state.currentQuestionIndex]

  broadcast({
    type: "round_result",
    payload: {
      correctAnswer: q.correctAnswer,
      correctOption: q.options[q.correctAnswer],
      leaderboard: getLeaderboard(),
      answersCount: state.answersThisRound.size,
    },
  })

  state.answersThisRound.forEach((_, playerId) => {
    const player = state.players.get(playerId)
    if (player) {
      sendTo(playerId, { type: "player_score", payload: { score: player.score, name: player.name } })
    }
  })

  broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })
}

function handleMessage(clientId: string, ws: WsWebSocket, message: any) {
  const state = getGameState()

  switch (message.type) {
    case "host_login": {
      const { password } = message.payload || {}
      if (verifyHostPassword(password)) {
        hostClients.add(ws)
        ws.send(
          JSON.stringify({
            type: "host_authenticated",
            payload: { success: true, gameSnapshot: getGameSnapshot() },
          })
        )
      } else {
        ws.send(
          JSON.stringify({
            type: "host_authenticated",
            payload: { success: false, message: "密码错误" },
          })
        )
      }
      break
    }

    case "player_join": {
      const { name } = message.payload || {}
      if (!name || name.trim().length === 0) {
        ws.send(
          JSON.stringify({
            type: "player_joined",
            payload: { success: false, message: "请输入姓名" },
          })
        )
        return
      }

      const existing = Array.from(state.players.values()).find(
        (p) => p.name === name.trim()
      )
      if (existing && existing.id !== clientId) {
        ws.send(
          JSON.stringify({
            type: "player_joined",
            payload: { success: false, message: "该姓名已被使用" },
          })
        )
        return
      }

      const player = addPlayer(clientId, name.trim())
      ws.send(
        JSON.stringify({
          type: "player_joined",
          payload: {
            success: true,
            player: { id: player.id, name: player.name, score: player.score },
            gamePhase: state.phase,
          },
        })
      )

      broadcast({
        type: "player_joined_broadcast",
        payload: { name: player.name, playerCount: getPlayerCount() },
      })

      if (state.phase === "answering") {
        const q = getPublicQuestion()
        if (q) {
          ws.send(JSON.stringify({ type: "question", payload: { question: q } }))
        }
      }

      broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })
      break
    }

    case "start_game": {
      if (!hostClients.has(ws)) {
        ws.send(JSON.stringify({ type: "error", payload: "Unauthorized" }))
        return
      }
      resetGameState(questions)
      startCountdown()
      break
    }

    case "next_question": {
      if (!hostClients.has(ws)) return
      if (roundTimer) {
        clearTimeout(roundTimer)
        roundTimer = null
      }
      if (nextQuestion()) {
        startCountdown()
      } else {
        finishGame()
        broadcast({ type: "game_finished", payload: { leaderboard: getLeaderboard() } })
        broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })
      }
      break
    }

    case "submit_answer": {
      if (state.phase !== "answering") {
        ws.send(
          JSON.stringify({
            type: "answer_result",
            payload: { accepted: false, message: "答题已结束" },
          })
        )
        return
      }

      const { selectedOption } = message.payload || {}
      if (selectedOption === undefined || selectedOption === null) {
        ws.send(
          JSON.stringify({
            type: "answer_result",
            payload: { accepted: false, message: "无效选项" },
          })
        )
        return
      }

      const timeSpent = Date.now() - state.roundStartTime
      const accepted = recordAnswer(clientId, selectedOption, timeSpent)

      ws.send(
        JSON.stringify({
          type: "answer_result",
          payload: {
            accepted,
            message: accepted ? "答案已提交" : "答题失败（已答或已结束）",
          },
        })
      )

      if (accepted) {
        broadcastToHost({
          type: "answer_update",
          payload: {
            answeredCount: state.answersThisRound.size,
            totalPlayers: getPlayerCount(),
          },
        })
      }
      break
    }

    case "end_round": {
      if (!hostClients.has(ws)) return
      handleEndRound()
      break
    }

    case "finish_game": {
      if (!hostClients.has(ws)) return
      if (roundTimer) {
        clearTimeout(roundTimer)
        roundTimer = null
      }
      finishGame()
      const state = getGameState()
      broadcast({ type: "game_finished", payload: { leaderboard: getLeaderboard() } })
      state.players.forEach((player, playerId) => {
        sendTo(playerId, { type: "player_score", payload: { score: player.score, name: player.name } })
      })
      broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })
      break
    }

    case "export_results": {
      if (!hostClients.has(ws)) return
      const results = exportResults()
      ws.send(JSON.stringify({ type: "export_data", payload: { data: results } }))
      break
    }

    case "restart_game": {
      if (!hostClients.has(ws)) return
      if (roundTimer) {
        clearTimeout(roundTimer)
        roundTimer = null
      }
      if (countdownInterval) {
        clearInterval(countdownInterval)
        countdownInterval = null
      }
      resetGameState(questions)
      broadcast({ type: "game_restarted", payload: getGameSnapshot() })
      broadcastToHost({ type: "game_snapshot", payload: getGameSnapshot() })
      break
    }

    case "get_leaderboard": {
      ws.send(JSON.stringify({ type: "leaderboard", payload: { leaderboard: getLeaderboard() } }))
      break
    }

    case "ping": {
      ws.send(JSON.stringify({ type: "pong" }))
      break
    }
  }
}

export default defineConfig({
  plugins: [
    {
      name: "websocket-dev-server",
      configureServer(server) {
        server.httpServer?.on("upgrade", (request, socket, head) => {
          const url = new URL(request.url || "", `http://${request.headers.host}`)
          if (url.pathname === "/ws/quiz") {
            const wss = new WebSocketServer({ noServer: true })
            wss.handleUpgrade(request, socket, head, (ws) => {
              const w = ws as unknown as WsWebSocket
              const clientId = crypto.randomUUID()
              clients.set(clientId, w)

              w.on("message", (rawData) => {
                try {
                  const message = JSON.parse(rawData.toString())
                  handleMessage(clientId, w, message)
                } catch (e) {
                  w.send(JSON.stringify({ type: "error", payload: "Invalid message format" }))
                }
              })

              w.on("close", () => {
                clients.delete(clientId)
                hostClients.delete(w)
                disconnectPlayer(clientId)
                broadcast({
                  type: "player_left",
                  payload: { playerCount: getPlayerCount() },
                })
              })

              w.send(JSON.stringify({ type: "connected", payload: { clientId } }))
            })
          }
        })
      },
    },
    devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }),
    inspectAttr(),
    react(),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
})
