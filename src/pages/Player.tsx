import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Trophy,
  ArrowLeft,
  Signal,
  SignalZero,
} from "lucide-react";

export default function Player() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get("name") || "";
  const {
    state,
    playerJoin,
    submitAnswer,
    clearError,
  } = useQuizSocket();
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // 从排行榜中计算自己的分数（比hook中的myScore更可靠）
  const playerScore = useMemo(() => {
    if (!state.myName || !state.leaderboard.length) return state.myScore;
    const myLower = state.myName.trim().toLowerCase();
    const entry = state.leaderboard.find((e: any) => {
      const eName = (e.name || "").trim().toLowerCase();
      return eName === myLower;
    });
    return entry ? entry.score : state.myScore;
  }, [state.myName, state.leaderboard, state.myScore]);

  // 加入比赛
  useEffect(() => {
    if (name && state.connected && !joined) {
      playerJoin(name);
      setJoined(true);
    }
  }, [name, state.connected, joined, playerJoin]);

  // 如果没有name参数，返回首页
  useEffect(() => {
    if (!name) {
      navigate("/");
    }
  }, [name, navigate]);

  // 倒计时
  useEffect(() => {
    if (state.phase === "answering" && state.currentQuestionData) {
      setTimeLeft(state.currentQuestionData.timeLimit);
      setShowResult(false);
    }
  }, [state.phase, state.currentQuestionData]);

  useEffect(() => {
    if (state.phase === "answering" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [state.phase, timeLeft]);

  // 显示结果
  useEffect(() => {
    if (state.phase === "showAnswer") {
      const myAnswer = state.selectedOption;
      const correct = myAnswer === state.correctAnswer;
      setIsCorrect(correct);
      setShowResult(true);
    }
  }, [state.phase, state.correctAnswer, state.selectedOption]);

  const handleSelectOption = (index: number) => {
    if (
      state.phase === "answering" &&
      !state.answerAccepted &&
      !showResult &&
      timeLeft > 0
    ) {
      submitAnswer(index);
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case "easy":
        return { text: "基础题", color: "bg-green-100 text-green-700" };
      case "medium":
        return { text: "进阶题", color: "bg-yellow-100 text-yellow-700" };
      case "hard":
        return { text: "挑战题", color: "bg-red-100 text-red-700" };
      default:
        return { text: "未知", color: "bg-gray-100 text-gray-700" };
    }
  };

  if (!name) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-red-700 text-white shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center text-red-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            退出
          </button>
          <h1 className="font-bold text-lg">党团知识竞赛</h1>
          <div className="flex items-center gap-2">
            {state.connected ? (
              <Signal className="w-5 h-5 text-green-300" />
            ) : (
              <SignalZero className="w-5 h-5 text-red-300" />
            )}
            <span className="text-sm text-red-200">{state.myName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 错误提示 */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{state.error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* 等待阶段 */}
        {state.phase === "waiting" && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                已加入比赛
              </h2>
              <p className="text-gray-500 mb-4">
                欢迎，<span className="font-medium text-red-600">{state.myName}</span>
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700 text-sm">
                  请等待主持人开始比赛...
                </p>
                <div className="mt-3 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 倒计时 */}
        {state.phase === "countdown" && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4 text-lg">准备答题</p>
            <div className="text-8xl font-bold text-red-600 animate-pulse">
              {state.countdown > 0 ? state.countdown : "GO!"}
            </div>
          </div>
        )}

        {/* 答题中 */}
        {state.phase === "answering" && state.currentQuestionData && (
          <div className="space-y-4">
            {/* 题目信息 */}
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={`${getDifficultyLabel(state.currentQuestionData.difficulty).color}`}
              >
                {getDifficultyLabel(state.currentQuestionData.difficulty).text}
              </Badge>
              <span className="text-sm text-gray-500">
                第 {state.currentQuestionData.index + 1} /{" "}
                {state.currentQuestionData.total} 题
              </span>
            </div>

            {/* 计时器 */}
            <div className="flex items-center gap-3">
              <Timer
                className={`w-5 h-5 ${timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-gray-500"}`}
              />
              <Progress
                value={(timeLeft / (state.currentQuestionData.timeLimit || 30)) * 100}
                className="flex-1 h-2"
              />
              <span
                className={`font-mono font-bold text-lg ${timeLeft <= 5 ? "text-red-600" : "text-gray-700"}`}
              >
                {timeLeft}s
              </span>
            </div>

            {/* 题目 */}
            <Card className="border-0 shadow-md">
              <CardContent className="pt-5 pb-5">
                <p className="text-lg font-medium text-gray-800 leading-relaxed">
                  {state.currentQuestionData.question}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  分值: {state.currentQuestionData.points}分
                </p>
              </CardContent>
            </Card>

            {/* 选项 */}
            <div className="space-y-3">
              {state.currentQuestionData.options.map((option, index) => {
                let buttonStyle = "border-gray-200 hover:border-red-300 hover:bg-red-50";
                if (state.answerAccepted && state.selectedOption === index) {
                  buttonStyle = "border-red-500 bg-red-50 ring-2 ring-red-200";
                }
                if (showResult) {
                  if (index === state.correctAnswer) {
                    buttonStyle = "border-green-500 bg-green-50";
                  } else if (
                    state.selectedOption === index &&
                    index !== state.correctAnswer
                  ) {
                    buttonStyle = "border-red-500 bg-red-50";
                  } else {
                    buttonStyle = "border-gray-100 opacity-60";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    disabled={state.answerAccepted || showResult || timeLeft <= 0}
                    className={`w-full p-4 border-2 rounded-xl text-left transition-all ${buttonStyle} disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          showResult && index === state.correctAnswer
                            ? "bg-green-500 text-white"
                            : showResult && state.selectedOption === index
                              ? "bg-red-500 text-white"
                              : state.answerAccepted &&
                                  state.selectedOption === index
                                ? "bg-red-600 text-white"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {showResult && index === state.correctAnswer ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : showResult && state.selectedOption === index ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          getOptionLabel(index)
                        )}
                      </span>
                      <span className="text-gray-700 pt-1">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 答题状态 */}
            {state.answerAccepted && !showResult && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle2 className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <p className="text-blue-700 text-sm">答案已提交，请等待其他选手...</p>
              </div>
            )}
          </div>
        )}

        {/* 显示答案 */}
        {state.phase === "showAnswer" && showResult && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 pb-6 text-center">
              {isCorrect ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-green-700 mb-2">
                    回答正确！
                  </h2>
                </>
              ) : state.selectedOption !== null ? (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-red-700 mb-2">
                    回答错误
                  </h2>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Timer className="w-8 h-8 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-700 mb-2">
                    时间到
                  </h2>
                </>
              )}

              <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                <p className="text-sm text-gray-500 mb-1">正确答案</p>
                <p className="font-medium text-gray-800">
                  {getOptionLabel(state.correctAnswer || 0)}. {state.correctOption}
                </p>
              </div>

              <p className="mt-4 text-gray-500 text-sm">
                请等待主持人发布下一题...
              </p>
            </CardContent>
          </Card>
        )}

        {/* 比赛结束 */}
        {state.phase === "finished" && (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 pb-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-yellow-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  比赛结束
                </h2>
                <p className="text-gray-500">感谢参与！</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-center">
                  最终排名
                </h3>
                <div className="space-y-2">
                  {state.leaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.name === state.myName
                          ? "bg-red-50 border border-red-200"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-400 text-white"
                              : index === 1
                                ? "bg-gray-400 text-white"
                                : index === 2
                                  ? "bg-orange-400 text-white"
                                  : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {entry.rank}
                        </span>
                        <span className="font-medium text-gray-700">
                          {entry.name}
                          {entry.name === state.myName && (
                            <span className="text-xs text-red-500 ml-1">
                              (你)
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="font-bold text-gray-800">
                        {entry.score}分
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分数显示（始终在底部） */}
        {(state.phase === "answering" ||
          state.phase === "showAnswer" ||
          state.phase === "finished") && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">我的得分</span>
              <span className="text-xl font-bold text-red-600">
                {playerScore}分
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
