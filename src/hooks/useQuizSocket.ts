import { useEffect, useRef, useState, useCallback } from "react";

export type GamePhase =
  | "waiting"
  | "countdown"
  | "answering"
  | "showAnswer"
  | "showScores"
  | "finished";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  correctCount: number;
}

export interface Question {
  id: number;
  difficulty: string;
  points: number;
  question: string;
  options: string[];
  timeLimit: number;
  index: number;
  total: number;
}

export interface QuizState {
  phase: GamePhase;
  currentQuestion: number;
  totalQuestions: number;
  playerCount: number;
  leaderboard: LeaderboardEntry[];
  currentQuestionData: Question | null;
  correctAnswer: number | null;
  correctOption: string | null;
  countdown: number;
  selectedOption: number | null;
  answerAccepted: boolean;
  myScore: number;
  myName: string;
  isHost: boolean;
  connected: boolean;
  error: string | null;
  answeredCount: number;
  exportData: string | null;
}

const initialState: QuizState = {
  phase: "waiting",
  currentQuestion: 0,
  totalQuestions: 10,
  playerCount: 0,
  leaderboard: [],
  currentQuestionData: null,
  correctAnswer: null,
  correctOption: null,
  countdown: 0,
  selectedOption: null,
  answerAccepted: false,
  myScore: 0,
  myName: "",
  isHost: false,
  connected: false,
  error: null,
  answeredCount: 0,
  exportData: null,
};

export function useQuizSocket() {
  const [state, setState] = useState<QuizState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>("");
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const getWsUrl = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws/quiz`;
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({ ...prev, connected: true, error: null }));
        // 开始心跳
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error("Failed to parse message:", e);
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, connected: false }));
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        // 尝试重连
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = () => {
        setState((prev) => ({
          ...prev,
          connected: false,
          error: "连接错误，正在重试...",
        }));
      };
    } catch (e) {
      setState((prev) => ({ ...prev, error: "无法连接到服务器" }));
    }
  }, []);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case "connected":
        clientIdRef.current = message.payload.clientId;
        break;

      case "host_authenticated":
        if (message.payload.success) {
          setState((prev) => ({
            ...prev,
            isHost: true,
            phase: message.payload.gameSnapshot?.phase || prev.phase,
            playerCount: message.payload.gameSnapshot?.playerCount || 0,
            leaderboard: message.payload.gameSnapshot?.leaderboard || [],
            currentQuestion:
              message.payload.gameSnapshot?.currentQuestion || 0,
            totalQuestions:
              message.payload.gameSnapshot?.totalQuestions || 10,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: message.payload.message || "认证失败",
          }));
        }
        break;

      case "player_joined":
        if (message.payload.success) {
          setState((prev) => ({
            ...prev,
            myName: message.payload.player?.name || "",
            myScore: message.payload.player?.score || 0,
            phase: message.payload.gamePhase || prev.phase,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: message.payload.message || "加入失败",
          }));
        }
        break;

      case "phase_changed":
        setState((prev) => ({
          ...prev,
          phase: message.payload.phase,
          correctAnswer: null,
          correctOption: null,
        }));
        break;

      case "countdown":
        setState((prev) => ({
          ...prev,
          countdown: message.payload.count,
        }));
        break;

      case "question":
        setState((prev) => ({
          ...prev,
          phase: "answering",
          currentQuestionData: message.payload.question,
          correctAnswer: null,
          correctOption: null,
          selectedOption: null,
          answerAccepted: false,
          countdown: message.payload.question?.timeLimit || 30,
        }));
        break;

      case "host_question":
        setState((prev) => ({
          ...prev,
          currentQuestionData: message.payload.question,
        }));
        break;

      case "answer_result":
        setState((prev) => ({
          ...prev,
          answerAccepted: message.payload.accepted,
        }));
        break;

      case "round_result":
        setState((prev) => ({
          ...prev,
          phase: "showAnswer",
          correctAnswer: message.payload.correctAnswer,
          correctOption: message.payload.correctOption,
          leaderboard: message.payload.leaderboard || prev.leaderboard,
        }));
        break;

      case "game_finished":
        setState((prev) => ({
          ...prev,
          phase: "finished",
          leaderboard: message.payload.leaderboard || prev.leaderboard,
        }));
        break;

      case "leaderboard":
        setState((prev) => ({
          ...prev,
          leaderboard: message.payload.leaderboard,
        }));
        break;

      case "game_snapshot":
        setState((prev) => ({
          ...prev,
          phase: message.payload.phase || prev.phase,
          currentQuestion:
            message.payload.currentQuestion || prev.currentQuestion,
          totalQuestions:
            message.payload.totalQuestions || prev.totalQuestions,
          playerCount: message.payload.playerCount ?? prev.playerCount,
          leaderboard: message.payload.leaderboard || prev.leaderboard,
        }));
        break;

      case "answer_update":
        setState((prev) => ({
          ...prev,
          answeredCount: message.payload.answeredCount,
        }));
        break;

      case "player_joined_broadcast":
        setState((prev) => ({
          ...prev,
          playerCount: message.payload.playerCount,
        }));
        break;

      case "export_data":
        setState((prev) => ({
          ...prev,
          exportData: message.payload.data,
        }));
        break;

      case "error":
        setState((prev) => ({ ...prev, error: message.payload }));
        break;
    }
  };

  const sendMessage = useCallback((type: string, payload?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // 主持人登录
  const hostLogin = useCallback(
    (password: string) => {
      sendMessage("host_login", { password });
    },
    [sendMessage]
  );

  // 选手加入
  const playerJoin = useCallback(
    (name: string) => {
      setState((prev) => ({ ...prev, myName: name }));
      sendMessage("player_join", { name });
    },
    [sendMessage]
  );

  // 开始比赛
  const startGame = useCallback(() => {
    sendMessage("start_game");
  }, [sendMessage]);

  // 下一题
  const nextQuestion = useCallback(() => {
    sendMessage("next_question");
  }, [sendMessage]);

  // 提交答案
  const submitAnswer = useCallback(
    (selectedOption: number) => {
      setState((prev) => ({ ...prev, selectedOption }));
      sendMessage("submit_answer", { selectedOption });
    },
    [sendMessage]
  );

  // 结束回合
  const endRound = useCallback(() => {
    sendMessage("end_round");
  }, [sendMessage]);

  // 结束比赛
  const finishGame = useCallback(() => {
    sendMessage("finish_game");
  }, [sendMessage]);

  // 导出结果
  const exportResults = useCallback(() => {
    sendMessage("export_results");
  }, [sendMessage]);

  // 获取排行榜
  const getLeaderboard = useCallback(() => {
    sendMessage("get_leaderboard");
  }, [sendMessage]);

  // 清除错误
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 清除导出数据
  const clearExport = useCallback(() => {
    setState((prev) => ({ ...prev, exportData: null }));
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return {
    state,
    hostLogin,
    playerJoin,
    startGame,
    nextQuestion,
    submitAnswer,
    endRound,
    finishGame,
    exportResults,
    getLeaderboard,
    clearError,
    clearExport,
    connect,
  };
}
