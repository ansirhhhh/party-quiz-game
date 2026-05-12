import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuizSocket } from "@/hooks/useQuizSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Users,
  CheckCircle2,
  Signal,
  SignalZero,
  Crown,
  Medal,
  Award,
} from "lucide-react";

export default function Host() {
  const [searchParams] = useSearchParams();
  const password = searchParams.get("password") || "";
  const {
    state,
    hostLogin,
    startGame,
    nextQuestion,
    endRound,
    finishGame,
    exportResults,
    clearError,
    clearExport,
    connect,
  } = useQuizSocket();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (password && state.connected && !authenticated) {
      hostLogin(password);
    }
  }, [password, state.connected, authenticated, hostLogin]);

  useEffect(() => {
    if (state.isHost) {
      setAuthenticated(true);
    }
  }, [state.isHost]);

  useEffect(() => {
    if (state.exportData) {
      const blob = new Blob([state.exportData], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `党团知识竞赛结果_${new Date().toLocaleDateString("zh-CN")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      clearExport();
    }
  }, [state.exportData, clearExport]);

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case "easy":
        return { text: "基础", color: "bg-green-100 text-green-700" };
      case "medium":
        return { text: "进阶", color: "bg-yellow-100 text-yellow-700" };
      case "hard":
        return { text: "挑战", color: "bg-red-100 text-red-700" };
      default:
        return { text: "未知", color: "bg-gray-100 text-gray-700" };
    }
  };

  const getOptionLabel = (index: number) => String.fromCharCode(65 + index);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="text-gray-500 font-medium">{rank}</span>;
    }
  };

  // 未认证状态
  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#111827", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {state.connected ? (
                <Signal className="w-8 h-8 text-green-600" />
              ) : (
                <SignalZero className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">主持人登录</h2>
            {state.error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
                <p className="text-red-700 text-sm">{state.error}</p>
                <button onClick={() => { clearError(); connect(); }} style={{ padding: "8px 16px", border: "1px solid #dc2626", borderRadius: "4px", color: "#dc2626", background: "#fff", cursor: "pointer", marginTop: "8px" }}>重试</button>
              </div>
            ) : (
              <p className="text-gray-500">正在验证身份...</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 顶部导航栏 */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h1 className="font-bold text-lg">主持人控制台</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span className="text-sm">{state.playerCount} 人在线</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 错误提示 */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
            <span className="text-sm">{state.error}</span>
            <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：题目和控制 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 比赛信息 */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">当前进度</p>
                      <p className="text-xl font-bold text-white">
                        {state.currentQuestion} / {state.totalQuestions} 题
                      </p>
                    </div>
                    <div className="w-px h-10 bg-gray-700"></div>
                    <div>
                      <p className="text-gray-400 text-sm">当前状态</p>
                      <Badge variant="secondary" className={`${
                        state.phase === "waiting" ? "bg-blue-900 text-blue-200" :
                        state.phase === "countdown" ? "bg-yellow-900 text-yellow-200" :
                        state.phase === "answering" ? "bg-green-900 text-green-200" :
                        state.phase === "showAnswer" ? "bg-purple-900 text-purple-200" :
                        state.phase === "finished" ? "bg-red-900 text-red-200" :
                        "bg-gray-700 text-gray-300"
                      }`}>
                        {state.phase === "waiting" ? "等待开始" :
                         state.phase === "countdown" ? "倒计时" :
                         state.phase === "answering" ? "答题中" :
                         state.phase === "showAnswer" ? "显示答案" :
                         state.phase === "finished" ? "比赛结束" : "未知"}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={(state.currentQuestion / state.totalQuestions) * 100} className="w-32 h-2" />
                </div>
              </CardContent>
            </Card>

            {/* 控制按钮区域 */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>

              {state.phase === "waiting" && (
                <button
                  onClick={() => startGame?.()}
                  style={{ flex: 1, padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#fff", backgroundColor: "#16a34a", border: "none", borderRadius: "8px", cursor: "pointer" }}
                >▶ 开始比赛</button>
              )}

              {state.phase === "showAnswer" && (
                <>
                  <button onClick={() => nextQuestion?.()} style={{ flex: 1, padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#fff", backgroundColor: "#2563eb", border: "none", borderRadius: "8px", cursor: "pointer" }}>⏭ 下一题</button>
                  <button onClick={() => finishGame?.()} style={{ padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#fff", backgroundColor: "#dc2626", border: "none", borderRadius: "8px", cursor: "pointer" }}>🚪 提前结束</button>
                </>
              )}

              {state.phase === "answering" && (
                <button onClick={() => endRound?.()} style={{ flex: 1, padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#fde047", backgroundColor: "#422006", border: "2px solid #ca8a04", borderRadius: "8px", cursor: "pointer" }}>⏱ 结束本轮</button>
              )}

              {state.phase === "finished" && (
                <>
                  <button onClick={() => exportResults?.()} style={{ flex: 1, padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#fff", backgroundColor: "#9333ea", border: "none", borderRadius: "8px", cursor: "pointer" }}>📥 导出比赛结果</button>
                  <button
                    onClick={() => {
                      const ws = new WebSocket(`ws://${window.location.host}/ws/quiz`);
                      ws.onopen = () => ws.send(JSON.stringify({ type: "host_login", payload: { password: "3251" } }));
                      ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === "host_authenticated" && msg.payload.success) ws.send(JSON.stringify({ type: "restart_game" })); };
                      setTimeout(() => ws.close(), 2000);
                    }}
                    style={{ padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#4ade80", backgroundColor: "#064e3b", border: "2px solid #22c55e", borderRadius: "8px", cursor: "pointer" }}
                  >🔄 重启比赛</button>
                </>
              )}

              {(state.phase === "waiting" || state.phase === "showAnswer") && (
                <button
                  onClick={() => {
                    const ws = new WebSocket(`ws://${window.location.host}/ws/quiz`);
                    ws.onopen = () => ws.send(JSON.stringify({ type: "host_login", payload: { password: "3251" } }));
                    ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.type === "host_authenticated" && msg.payload.success) ws.send(JSON.stringify({ type: "restart_game" })); };
                    setTimeout(() => ws.close(), 2000);
                  }}
                  style={{ padding: "16px 24px", fontSize: "18px", fontWeight: "bold", color: "#4ade80", backgroundColor: "#064e3b", border: "2px solid #22c55e", borderRadius: "8px", cursor: "pointer" }}
                >🔄 重启比赛</button>
              )}
            </div>

            {/* 题目显示 */}
            {(state.phase === "answering" || state.phase === "showAnswer" || state.phase === "countdown") &&
              state.currentQuestionData && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getDifficultyLabel(state.currentQuestionData.difficulty).color}`}>
                          {getDifficultyLabel(state.currentQuestionData.difficulty).text}
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          第 {state.currentQuestionData.index + 1} / {state.currentQuestionData.total} 题
                        </span>
                      </div>
                      <span className="text-yellow-400 font-bold">{state.currentQuestionData.points}分</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-medium text-white mb-6">{state.currentQuestionData.question}</p>

                    <div className="space-y-3">
                      {state.currentQuestionData.options.map((option, index) => {
                        const isCorrect = "correctAnswer" in state.currentQuestionData! && state.currentQuestionData.correctAnswer === index;
                        const showCorrect = state.phase === "showAnswer" && isCorrect;
                        return (
                          <div key={index} className={`p-4 rounded-lg border-2 flex items-center gap-3 ${
                            showCorrect ? "border-green-500 bg-green-900/30" : "border-gray-600 bg-gray-700/50"
                          }`}>
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              showCorrect ? "bg-green-500 text-white" : "bg-gray-600 text-gray-300"
                            }`}>
                              {showCorrect ? <CheckCircle2 className="w-5 h-5" /> : getOptionLabel(index)}
                            </span>
                            <span className="text-gray-200">{option}</span>
                            {showCorrect && <Badge className="ml-auto bg-green-600 text-white">正确答案</Badge>}
                          </div>
                        );
                      })}
                    </div>

                    {state.phase === "answering" && (
                      <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300 text-sm">已答题人数</span>
                          <span className="text-blue-200 font-bold">{state.answeredCount} / {state.playerCount}</span>
                        </div>
                        <Progress value={state.playerCount > 0 ? (state.answeredCount / state.playerCount) * 100 : 0} className="mt-2 h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            {/* 倒计时显示 */}
            {state.phase === "countdown" && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-8 pb-8 text-center">
                  <p className="text-gray-400 text-lg mb-4">准备开始</p>
                  <div className="text-8xl font-bold text-yellow-400">
                    {state.countdown > 0 ? state.countdown : "GO!"}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：积分榜 */}
          <div>
            <Card className="bg-gray-800 border-gray-700 sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Trophy className="w-5 h-5 text-yellow-400" /> 实时积分榜
                </CardTitle>
              </CardHeader>
              <CardContent>
                {state.leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>暂无选手</p>
                    <p className="text-sm mt-1">等待选手加入...</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {state.leaderboard.map((entry) => (
                      <div key={entry.rank} className={`flex items-center gap-3 p-3 rounded-lg ${
                        entry.rank <= 3 ? "bg-yellow-900/20 border border-yellow-700/30" : "bg-gray-700/50"
                      }`}>
                        <div className="w-8 h-8 flex items-center justify-center">{getRankIcon(entry.rank)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{entry.name}</p>
                          <p className="text-xs text-gray-400">答对 {entry.correctCount} 题</p>
                        </div>
                        <span className="font-bold text-yellow-400">{entry.score}分</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 比赛结束后的完整排行榜 */}
        {state.phase === "finished" && state.leaderboard.length > 0 && (
          <Card className="bg-gray-800 border-gray-700 mt-6">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-white">
                <Trophy className="w-6 h-6 text-yellow-400" /> 最终排行榜
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">排名</TableHead>
                    <TableHead className="text-gray-400">姓名</TableHead>
                    <TableHead className="text-gray-400 text-right">答对题数</TableHead>
                    <TableHead className="text-gray-400 text-right">总得分</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.leaderboard.map((entry) => (
                    <TableRow key={entry.rank} className={`border-gray-700 ${entry.rank <= 3 ? "bg-yellow-900/10" : ""}`}>
                      <TableCell><div className="flex items-center gap-2">{getRankIcon(entry.rank)}</div></TableCell>
                      <TableCell className="font-medium text-white">{entry.name}</TableCell>
                      <TableCell className="text-right text-gray-300">{entry.correctCount} / {state.totalQuestions}</TableCell>
                      <TableCell className="text-right"><span className="font-bold text-yellow-400 text-lg">{entry.score}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
