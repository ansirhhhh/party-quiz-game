// 10道党团知识竞赛题目 - 围绕二十届四中全会和十五五规划
export interface Question {
  id: number;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-based index
  timeLimit: number; // seconds
}

export const questions: Question[] = [
  {
    id: 1,
    difficulty: "easy",
    points: 10,
    question: `党的二十届四中全会审议通过了哪个重要文件？`,
    options: [
      `《中共中央关于制定国民经济和社会发展第十五个五年规划的建议》`,
      `《中共中央关于全面深化改革若干重大问题的决定》`,
      `《中共中央关于全面推进依法治国若干重大问题的决定》`,
      `《中共中央关于党的百年奋斗重大成就和历史经验的决议》`,
    ],
    correctAnswer: 0,
    timeLimit: 30,
  },
  {
    id: 2,
    difficulty: "easy",
    points: 10,
    question: `"十五五"时期在基本实现社会主义现代化进程中具有什么重要地位？`,
    options: [
      `收官决胜的关键时期`,
      `承前启后的关键时期`,
      `开篇布局的关键时期`,
      `战略转型的关键时期`,
    ],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 3,
    difficulty: "easy",
    points: 10,
    question: `"十五五"时期经济社会发展必须遵循的原则中，以下哪项是首要原则？`,
    options: [
      `坚持人民至上`,
      `坚持高质量发展`,
      `坚持党的全面领导`,
      `坚持全面深化改革`,
    ],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 4,
    difficulty: "medium",
    points: 20,
    question: `"十五五"规划中提出的新质生产力发展的核心驱动力是什么？`,
    options: [
      `扩大基础设施建设`,
      `科技创新和产业创新深度融合`,
      `增加劳动力投入`,
      `扩大外贸出口规模`,
    ],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 5,
    difficulty: "medium",
    points: 20,
    question: `关于"十五五"时期的科技自立自强目标，以下哪项表述正确？`,
    options: [
      `全面引进国外先进技术`,
      `关键核心技术依赖国际合作`,
      `重点领域关键核心技术攻关取得决定性突破`,
      `停止基础研究，专注应用开发`,
    ],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 6,
    difficulty: "medium",
    points: 20,
    question: `"十五五"规划中提到的未来产业不包括以下哪项？`,
    options: [
      `量子科技`,
      `生物制造`,
      `传统纺织`,
      `具身智能`,
    ],
    correctAnswer: 2,
    timeLimit: 30,
  },
  {
    id: 7,
    difficulty: "hard",
    points: 30,
    question: `"十五五"规划中提出的一体推进教育科技人才发展的"三个中心"建设目标是什么？`,
    options: [
      `教育中心、科学中心、人才中心`,
      `创新中心、产业中心、金融中心`,
      `文化中心、教育中心、医疗中心`,
      `科技中心、制造中心、贸易中心`,
    ],
    correctAnswer: 0,
    timeLimit: 30,
  },
  {
    id: 8,
    difficulty: "hard",
    points: 30,
    question: `关于"十五五"时期绿色转型目标，以下哪项表述正确？`,
    options: [
      `推迟碳达峰目标至2040年`,
      `绿色生产生活方式基本形成，碳达峰目标如期实现`,
      `暂停可再生能源开发`,
      `取消环保约束指标`,
    ],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 9,
    difficulty: "hard",
    points: 30,
    question: `"十五五"规划中提出的构建现代化产业体系的主要方向是什么？`,
    options: [
      `以房地产为支柱产业`,
      `以先进制造业为骨干，智能化、绿色化、融合化方向`,
      `以传统农业为主导产业`,
      `以金融服务业为核心产业`,
    ],
    correctAnswer: 1,
    timeLimit: 30,
  },
  {
    id: 10,
    difficulty: "hard",
    points: 30,
    question: `全会强调青年要深刻领悟"两个确立"的决定性意义，"两个确立"是指？`,
    options: [
      `确立社会主义初级阶段基本路线，确立改革开放政策`,
      `确立习近平同志党中央的核心、全党的核心地位，确立习近平新时代中国特色社会主义思想的指导地位`,
      `确立全面建设社会主义现代化国家目标，确立共同富裕目标`,
      `确立市场经济体制，确立依法治国方略`,
    ],
    correctAnswer: 1,
    timeLimit: 30,
  },
];

export const getQuestions = () => questions;
export const getQuestionById = (id: number) =>
  questions.find((q) => q.id === id);
