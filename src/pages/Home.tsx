import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Trophy, User, ArrowRight, PartyPopper } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [role, setRole] = useState<string>("");
  const [playerName, setPlayerName] = useState("");
  const [hostPassword, setHostPassword] = useState("");

  const handleContinue = () => {
    if (role === "player" && playerName.trim()) {
      navigate(`/player?name=${encodeURIComponent(playerName.trim())}`);
    } else if (role === "host" && hostPassword.trim()) {
      navigate(`/host?password=${encodeURIComponent(hostPassword.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-4 shadow-lg">
            <PartyPopper className="w-10 h-10 text-red-700" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            "一战到底"
          </h1>
          <p className="text-red-200 text-lg">党团知识攻擂赛</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center text-red-700">
              选择你的身份
            </CardTitle>
            <CardDescription className="text-center">
              请选择你是主持人还是参赛选手
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 角色选择 */}
            <RadioGroup
              value={role}
              onValueChange={setRole}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="player"
                  id="player"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="player"
                  className="flex flex-col items-center justify-center p-4 border-2 border-muted rounded-lg cursor-pointer transition-all hover:border-red-300 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50"
                >
                  <User className="w-8 h-8 mb-2 text-red-600" />
                  <span className="font-medium">我是选手</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="host"
                  id="host"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="host"
                  className="flex flex-col items-center justify-center p-4 border-2 border-muted rounded-lg cursor-pointer transition-all hover:border-red-300 peer-data-[state=checked]:border-red-600 peer-data-[state=checked]:bg-red-50"
                >
                  <Trophy className="w-8 h-8 mb-2 text-red-600" />
                  <span className="font-medium">我是主持人</span>
                </Label>
              </div>
            </RadioGroup>

            {/* 选手：输入姓名 */}
            {role === "player" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <Label htmlFor="name" className="text-red-700 font-medium">
                  输入你的姓名
                </Label>
                <Input
                  id="name"
                  placeholder="请输入姓名"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && playerName.trim()) handleContinue();
                  }}
                  className="border-red-200 focus:border-red-500 focus:ring-red-500"
                  maxLength={20}
                />
              </div>
            )}

            {/* 主持人：输入密码 */}
            {role === "host" && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                <Label
                  htmlFor="password"
                  className="text-red-700 font-medium"
                >
                  输入主持人密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={hostPassword}
                  onChange={(e) => setHostPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hostPassword.trim())
                      handleContinue();
                  }}
                  className="border-red-200 focus:border-red-500 focus:ring-red-500"
                />
              </div>
            )}

            {/* 继续按钮 */}
            <Button
              onClick={handleContinue}
              disabled={
                !role ||
                (role === "player" && !playerName.trim()) ||
                (role === "host" && !hostPassword.trim())
              }
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 text-lg"
            >
              进入比赛
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <p className="text-center text-red-200 text-sm mt-6">
          深入学习贯彻二十届四中全会精神
        </p>
      </div>
    </div>
  );
}
