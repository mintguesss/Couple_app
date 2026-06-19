import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal,
} from 'react-native';
import GoBoard13 from '@/components/GoBoard13';
import WinModal from '@/components/WinModal';
import { PinchZoom } from '@/components/PinchZoom';
import { ReviewBar } from '@/components/ReviewBar';
import { useAuth } from '@/context/AuthContext';
import { useCouple } from '@/context/CoupleContext';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

// ── 選選看 14天 × 5題 ─────────────────────────────────────────
const TOT: { a: string; b: string }[][] = [
  [{ a:'☕ 咖啡', b:'🍵 茶' }, { a:'🌅 早起鳥', b:'🌙 夜貓子' }, { a:'🌊 海邊', b:'⛰️ 山上' }, { a:'🐱 貓', b:'🐶 狗' }, { a:'🍰 甜食', b:'🍟 鹹食' }],
  [{ a:'🎬 電影院', b:'🛋️ 在家追劇' }, { a:'✈️ 旅行', b:'🏠 窩在家' }, { a:'📱 手機', b:'💻 電腦' }, { a:'🎂 蛋糕', b:'🍦 冰淇淋' }, { a:'☀️ 夏天', b:'❄️ 冬天' }],
  [{ a:'🍳 早餐', b:'🌙 晚餐' }, { a:'📖 看書', b:'🎮 打電動' }, { a:'🎵 音樂', b:'🎬 電影' }, { a:'🏙️ 城市', b:'🌿 鄉村' }, { a:'🙋 主動', b:'😊 被動' }],
  [{ a:'💰 節省', b:'🎁 享受當下' }, { a:'📋 計畫', b:'🎲 隨性' }, { a:'🔇 獨處', b:'🎉 社交' }, { a:'🏃 運動', b:'😴 休息' }, { a:'🍜 外食', b:'👩‍🍳 自煮' }],
  [{ a:'🗼 日本', b:'🗺️ 歐洲' }, { a:'🦞 海鮮', b:'🥩 牛肉' }, { a:'📞 電話', b:'💬 傳訊息' }, { a:'🌞 早睡早起', b:'🌙 晚睡晚起' }, { a:'❄️ 冷氣', b:'🌀 電扇' }],
  [{ a:'🎁 生日驚喜', b:'🗓️ 一起計畫' }, { a:'✈️ 分開旅行', b:'👫 一起去' }, { a:'🤳 自拍', b:'📸 被拍' }, { a:'✨ 買新的', b:'🔧 修舊的' }, { a:'🧠 邏輯', b:'💝 感情' }],
  [{ a:'🚀 快節奏城市', b:'🌾 慢活小鎮' }, { a:'🏃 跑步', b:'🏊 游泳' }, { a:'🇰🇷 韓劇', b:'🇺🇸 美劇' }, { a:'☕ 熱咖啡', b:'🧊 冰拿鐵' }, { a:'📕 買書', b:'📚 借書' }],
  [{ a:'🎵 聽音樂', b:'📺 看影片' }, { a:'🌶️ 辣的', b:'🥛 不辣' }, { a:'🏄 衝浪', b:'🤿 潛水' }, { a:'👥 大群朋友', b:'💎 幾個好友' }, { a:'💬 直接說', b:'🌸 委婉說' }],
  [{ a:'🍢 路邊攤', b:'🍽️ 餐廳' }, { a:'🖤 黑色系', b:'🌈 鮮豔色' }, { a:'🏛️ 歷史博物館', b:'🎨 現代藝術館' }, { a:'✉️ 手寫信', b:'📧 電子郵件' }, { a:'🧗 爬山', b:'⛺ 露營' }],
  [{ a:'💼 辦公室', b:'🏡 在家工作' }, { a:'🥚 早餐吃鹹', b:'🥞 早餐吃甜' }, { a:'✈️ 飛機', b:'🚄 高鐵' }, { a:'💍 閃婚', b:'💪 長跑' }, { a:'⚡ 衝動買', b:'🤔 考慮很久再買' }],
  [{ a:'💬 一直說話', b:'🤝 安靜陪伴' }, { a:'📷 拍照留念', b:'👁️ 活在當下' }, { a:'🍳 料理課', b:'🍷 品酒課' }, { a:'🎢 冒險刺激', b:'🛋️ 安穩舒適' }, { a:'⚖️ 重量感', b:'🪶 輕巧感' }],
  [{ a:'📝 清單控', b:'🎲 隨便啦' }, { a:'🎁 送禮', b:'🥰 收禮' }, { a:'📦 網購', b:'🛍️ 實體店' }, { a:'🍯 甜蜜膩死人', b:'🌿 淡淡的剛好' }, { a:'😂 搞笑', b:'🌹 浪漫' }],
  [{ a:'🧹 打掃', b:'📦 整理收納' }, { a:'🧋 珍奶', b:'🥤 果汁' }, { a:'🚶 徒步', b:'🚴 騎腳踏車' }, { a:'🎵 即興演奏', b:'📄 照譜彈' }, { a:'🎶 舊歌', b:'🆕 新歌' }],
  [{ a:'🛒 只買需要的', b:'💫 買想要的' }, { a:'🏖️ 一個長假', b:'✈️ 多個短假' }, { a:'👋 早點說再見', b:'🥺 依依不捨' }, { a:'🖐️ 親手做', b:'🛍️ 買現成' }, { a:'🗂️ 保留回憶', b:'🎒 輕裝前行' }],
];

// ── 益智問答 14天 × 5題 ───────────────────────────────────────
const TRIVIA: { e: string; q: string; opts: string[]; ans: number }[][] = [
  [
    { e:'🌊', q:'世界上最大的海洋是？', opts:['大西洋','印度洋','太平洋','北冰洋'], ans:2 },
    { e:'⛰️', q:'台灣最高的山是？', opts:['合歡山','玉山','雪山','阿里山'], ans:1 },
    { e:'💧', q:'水的化學式是？', opts:['CO₂','H₂O₂','H₂O','NaCl'], ans:2 },
    { e:'🦟', q:'蚊子叮人是為了？', opts:['喝水','喝血','求偶','找食物'], ans:1 },
    { e:'🫀', q:'人體最大的器官是？', opts:['肝臟','心臟','肺臟','皮膚'], ans:3 },
  ],
  [
    { e:'🍕', q:'披薩起源於哪個國家？', opts:['美國','法國','義大利','西班牙'], ans:2 },
    { e:'🌙', q:'月亮繞地球一圈約幾天？', opts:['7天','14天','27天','365天'], ans:2 },
    { e:'🦋', q:'蝴蝶有幾條腿？', opts:['4條','6條','8條','10條'], ans:1 },
    { e:'🏛️', q:'金字塔在哪個國家？', opts:['希臘','墨西哥','埃及','印度'], ans:2 },
    { e:'🏔️', q:'世界第一高峰是？', opts:['K2','聖母峰','干城章嘉','洛子峰'], ans:1 },
  ],
  [
    { e:'🪐', q:'太陽系有幾顆行星？', opts:['7顆','8顆','9顆','10顆'], ans:1 },
    { e:'🗻', q:'富士山在哪個國家？', opts:['中國','韓國','日本','台灣'], ans:2 },
    { e:'💎', q:'鑽石主要由什麼元素組成？', opts:['矽','鋁','碳','鐵'], ans:2 },
    { e:'⚡', q:'光速大約是每秒幾萬公里？', opts:['10萬','20萬','30萬','40萬'], ans:2 },
    { e:'🦴', q:'成人有幾塊骨頭？', opts:['186塊','196塊','206塊','216塊'], ans:2 },
  ],
  [
    { e:'✍️', q:'莎士比亞是哪國人？', opts:['法國','德國','英國','義大利'], ans:2 },
    { e:'🌊', q:'世界最長的河流是？', opts:['亞馬遜河','長江','密西西比河','尼羅河'], ans:3 },
    { e:'☕', q:'咖啡豆原產於哪個洲？', opts:['亞洲','美洲','非洲','歐洲'], ans:2 },
    { e:'🎹', q:'標準鋼琴有幾個琴鍵？', opts:['72個','76個','88個','96個'], ans:2 },
    { e:'🌍', q:'地球自轉一圈約幾小時？', opts:['12小時','18小時','24小時','36小時'], ans:2 },
  ],
  [
    { e:'🪐', q:'太陽系中最大的行星是？', opts:['土星','木星','天王星','海王星'], ans:1 },
    { e:'🧬', q:'人和黑猩猩的基因相似度約是？', opts:['80%','90%','95%','98%'], ans:3 },
    { e:'🌈', q:'彩虹有幾種顏色？', opts:['5種','6種','7種','8種'], ans:2 },
    { e:'🩸', q:'血液呈紅色是因為含有？', opts:['鈣','鉀','鐵（血紅素）','鋅'], ans:2 },
    { e:'🫁', q:'人體有幾個肺？', opts:['1個','2個','3個','4個'], ans:1 },
  ],
  [
    { e:'🧋', q:'珍珠奶茶起源於哪個城市？', opts:['台北','高雄','台中','台南'], ans:2 },
    { e:'😊', q:'人一天平均眨眼幾次？', opts:['5,000次','10,000次','15,000次','25,000次'], ans:2 },
    { e:'🍫', q:'巧克力的原料是？', opts:['可可豆','咖啡豆','花生','榛果'], ans:0 },
    { e:'🌍', q:'地球和太陽的距離約幾億公里？', opts:['0.5億','1億','1.5億','2億'], ans:2 },
    { e:'🦷', q:'人體最硬的物質是？', opts:['骨頭','指甲','牙齒琺瑯質','頭骨'], ans:2 },
  ],
  [
    { e:'🌍', q:'世界最小的國家是？', opts:['摩納哥','聖馬利諾','列支敦斯登','梵蒂岡'], ans:3 },
    { e:'🦟', q:'蚊子只有雌性才會叮人嗎？', opts:['對','不對','雌雄都會','看情況'], ans:0 },
    { e:'🐱', q:'貓咪尾巴主要功能是？', opts:['散熱','平衡','溝通（三者皆是）','吸引配偶'], ans:2 },
    { e:'🏳', q:'台灣國旗的顏色有？', opts:['紅黃','紅藍白','紅白','藍白'], ans:1 },
    { e:'🐟', q:'鯊魚是魚類嗎？', opts:['是','不是，是哺乳類','不是，是爬蟲類','不是，是甲殼類'], ans:0 },
  ],
  [
    { e:'🐆', q:'陸地上跑最快的動物是？', opts:['老虎','馬','獵豹','非洲野狗'], ans:2 },
    { e:'🏅', q:'奧林匹克運動會幾年舉辦一次？', opts:['2年','4年','5年','8年'], ans:1 },
    { e:'🎈', q:'氣球裡充的氣體通常是？', opts:['氧氣','氫氣','氦氣','氮氣'], ans:2 },
    { e:'🐧', q:'企鵝只生活在哪裡？', opts:['北極','南極及附近','赤道','各大洲都有'], ans:1 },
    { e:'🌡️', q:'水的沸點（標準大氣壓）是？', opts:['90°C','95°C','100°C','105°C'], ans:2 },
  ],
  [
    { e:'🔬', q:'阿基米德的著名發現是？', opts:['萬有引力','浮力原理','電磁感應','相對論'], ans:1 },
    { e:'🌺', q:'世界上最貴的香料是？', opts:['黑松露','藏紅花（番紅花）','香草','肉桂'], ans:1 },
    { e:'💧', q:'人一天建議喝多少水？', opts:['500毫升','1000毫升','2000毫升','3000毫升'], ans:2 },
    { e:'🧠', q:'人腦重量約是多少？', opts:['0.5公斤','1.4公斤','2公斤','3公斤'], ans:1 },
    { e:'🐙', q:'章魚有幾個心臟？', opts:['1個','2個','3個','4個'], ans:2 },
  ],
  [
    { e:'🗼', q:'台北101大樓有幾層？', opts:['88層','91層','101層','108層'], ans:2 },
    { e:'🌍', q:'地球上最深的海溝是？', opts:['波多黎各海溝','爪哇海溝','馬里亞納海溝','東加海溝'], ans:2 },
    { e:'🎨', q:'蒙娜麗莎是誰畫的？', opts:['米開朗基羅','拉斐爾','達文西','波提切利'], ans:2 },
    { e:'🦶', q:'人體中最小的骨頭在哪裡？', opts:['手指','腳趾','耳朵（鐙骨）','鼻子'], ans:2 },
    { e:'🚄', q:'台灣高鐵是哪一年通車的？', opts:['2000年','2003年','2007年','2010年'], ans:2 },
  ],
  [
    { e:'🌿', q:'義大利麵使用哪種麵粉？', opts:['中筋麵粉','低筋麵粉','杜蘭小麥粉','全麥粉'], ans:2 },
    { e:'🐬', q:'海豚屬於哪類動物？', opts:['魚類','爬蟲類','哺乳類','兩棲類'], ans:2 },
    { e:'😴', q:'REM睡眠指的是？', opts:['深度睡眠','快速動眼期','淺眠','打盹'], ans:1 },
    { e:'☕', q:'世界上生產最多咖啡的國家是？', opts:['哥倫比亞','越南','衣索比亞','巴西'], ans:3 },
    { e:'🧬', q:'DNA完整展開後長約多少？', opts:['20公分','2公尺','20公尺','200公尺'], ans:1 },
  ],
  [
    { e:'🌍', q:'哪種語言使用人數最多（母語）？', opts:['英語','西班牙語','中文（普通話）','印地語'], ans:2 },
    { e:'🩸', q:'人類血型主要有幾種？', opts:['2種','3種','4種','5種'], ans:2 },
    { e:'🧭', q:'哥倫布是哪國人？', opts:['西班牙','葡萄牙','義大利','英國'], ans:2 },
    { e:'🏞️', q:'台灣最大的天然湖泊是？', opts:['鯉魚潭','澄清湖','日月潭','虎頭埤'], ans:2 },
    { e:'🌊', q:'台灣最長的河是？', opts:['淡水河','高屏溪','濁水溪','大甲溪'], ans:2 },
  ],
  [
    { e:'🚀', q:'第一個登上月球的人是？', opts:['約翰·葛倫','尤里·加加林','尼爾·阿姆斯壯','愛德溫·艾德林'], ans:2 },
    { e:'☀️', q:'太陽系最小的行星是？', opts:['冥王星','火星','水星','金星'], ans:2 },
    { e:'🌙', q:'月球重力約是地球的幾分之幾？', opts:['1/3','1/4','1/6','1/8'], ans:2 },
    { e:'🧮', q:'電腦是哪年發明的？', opts:['1936年','1945年','1958年','1970年'], ans:1 },
    { e:'🎵', q:'音樂中 Do Re Mi 對應哪個大調？', opts:['A大調','B大調','C大調','D大調'], ans:2 },
  ],
  [
    { e:'⭐', q:'距地球最近的恆星（除太陽外）是？', opts:['天狼星','半人馬座α','南門二','比鄰星（比鄰星=南門二C）'], ans:3 },
    { e:'🦁', q:'獅子屬於哪科動物？', opts:['犬科','熊科','貓科','鼬科'], ans:2 },
    { e:'🌏', q:'亞洲面積佔地球陸地面積約多少？', opts:['20%','25%','30%','40%'], ans:2 },
    { e:'🍺', q:'啤酒的主要原料是？', opts:['小麥或大麥','葡萄','蘋果','玉米'], ans:0 },
    { e:'🧊', q:'水在幾度結冰（標準大氣壓）？', opts:['-5°C','0°C','5°C','10°C'], ans:1 },
  ],
];

// ── 棋譜快照工具（復盤用）────────────────────────────────────
// 棋盤每手存成字串（空＝'.'），復盤時直接 index 還原，不必重算
const snapOf = (board: string[]) => board.map(c => c || '.').join('');
const snapToArr = (s: string) => s.split('').map(c => (c === '.' ? '' : c));

// ── Gomoku ────────────────────────────────────────────────────
const BS = 15;
function checkWin(board: string[], x: number, y: number, p: string): boolean {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dx,dy] of dirs) {
    let n = 1;
    for (let i=1;i<5;i++) { const nx=x+dx*i,ny=y+dy*i; if(nx<0||nx>=BS||ny<0||ny>=BS||board[ny*BS+nx]!==p)break; n++; }
    for (let i=1;i<5;i++) { const nx=x-dx*i,ny=y-dy*i; if(nx<0||nx>=BS||ny<0||ny>=BS||board[ny*BS+nx]!==p)break; n++; }
    if (n>=5) return true;
  }
  return false;
}

function useGameDoc(coupleId: string, gameId: string) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, 'couples', coupleId, 'game', gameId), s => setData(s.exists() ? s.data() : null));
  }, [coupleId, gameId]);
  return data;
}
async function saveGame(coupleId: string, gameId: string, payload: any) {
  await setDoc(doc(db, 'couples', coupleId, 'game', gameId), payload, { merge: true });
}

// Days since a timestamp
function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / 86400000);
}

export default function GamesScreen() {
  const { user, profile } = useAuth();
  const { partner } = useCouple();
  const [tab, setTab] = useState<'tot' | 'trivia' | 'gomoku' | 'go'>('tot');

  const coupleId = profile?.coupleId ?? '';
  const myId = user?.uid ?? '';
  const partnerName = partner?.name ?? '對方';

  // ── 選選看 ──────────────────────────────────────────────────
  const totDoc = useGameDoc(coupleId, 'thisorthat');
  const totStart: number = totDoc?.startTs ?? 0;
  const totDayAnswers: Record<string, Record<string, number[]>> = totDoc?.d ?? {};
  const availableTotDays = totStart ? Math.min(daysSince(totStart), 13) : 0;
  const [totDay, setTotDay] = useState(0);
  const [totQ, setTotQ] = useState(0); // current question within day (0-4)

  const myTotAns: number[] = totDayAnswers[totDay]?.[myId] ?? Array(5).fill(-1);
  const ptTotAns: number[] = totDayAnswers[totDay]?.[partner?.uid ?? ''] ?? Array(5).fill(-1);
  const bothTotDone = myTotAns.every(a => a !== -1) && ptTotAns.every(a => a !== -1);
  const totMatches = bothTotDone ? myTotAns.filter((a, i) => a === ptTotAns[i]).length : 0;

  const pendingTotDays = Array.from({ length: availableTotDays + 1 }, (_, i) => i)
    .filter(d => !(totDayAnswers[d]?.[myId] ?? []).every((a: number) => a !== -1));

  // When switching days, jump to first unanswered question
  useEffect(() => {
    const ans = totDayAnswers[totDay]?.[myId] ?? Array(5).fill(-1);
    const first = ans.findIndex((a: number) => a === -1);
    setTotQ(first === -1 ? 4 : first);
  }, [totDay]);

  const answerTot = async (choice: number) => {
    if (myTotAns[totQ] !== -1) return;
    const cur = [...myTotAns]; cur[totQ] = choice;
    const startTs = totStart || Date.now();
    await saveGame(coupleId, 'thisorthat', {
      startTs,
      d: { ...totDayAnswers, [totDay]: { ...(totDayAnswers[totDay] ?? {}), [myId]: cur } },
    });
  };

  // ── 益智問答 ─────────────────────────────────────────────────
  const trivDoc = useGameDoc(coupleId, 'trivia');
  const trivStart: number = trivDoc?.startTs ?? 0;
  const trivDayAnswers: Record<string, Record<string, number[]>> = trivDoc?.d ?? {};
  const trivScore: Record<string, number> = trivDoc?.score ?? {};
  const availableTrivDays = trivStart ? Math.min(daysSince(trivStart), 13) : 0;
  const [trivDay, setTrivDay] = useState(0);
  const [trivQ, setTrivQ] = useState(0); // current question within day

  const myTrivAns: number[] = trivDayAnswers[trivDay]?.[myId] ?? Array(5).fill(-1);
  const ptTrivAns: number[] = trivDayAnswers[trivDay]?.[partner?.uid ?? ''] ?? Array(5).fill(-1);
  const bothTrivDone = myTrivAns.every(a => a !== -1) && ptTrivAns.every(a => a !== -1);

  const pendingTrivDays = Array.from({ length: availableTrivDays + 1 }, (_, i) => i)
    .filter(d => !(trivDayAnswers[d]?.[myId] ?? []).every((a: number) => a !== -1));

  useEffect(() => {
    const ans = trivDayAnswers[trivDay]?.[myId] ?? Array(5).fill(-1);
    const first = ans.findIndex((a: number) => a === -1);
    setTrivQ(first === -1 ? 4 : first);
  }, [trivDay]);

  const answerTriv = async (choice: number) => {
    if (myTrivAns[trivQ] !== -1) return;
    const cur = [...myTrivAns]; cur[trivQ] = choice;
    const isCorrect = choice === TRIVIA[trivDay][trivQ].ans;
    const startTs = trivStart || Date.now();
    const newScore = { ...trivScore, [myId]: (trivScore[myId] ?? 0) + (isCorrect ? 1 : 0) };
    await saveGame(coupleId, 'trivia', {
      startTs,
      d: { ...trivDayAnswers, [trivDay]: { ...(trivDayAnswers[trivDay] ?? {}), [myId]: cur } },
      score: newScore,
    });
  };

  // ── 五子棋 ─────────────────────────────────────────────────
  const goDoc = useGameDoc(coupleId, 'gomoku');
  const goBoard: string[] = goDoc?.board ?? Array(BS*BS).fill('');
  const goTurn: string = goDoc?.turn ?? 'B';
  const goPlayers: Record<string,string> = goDoc?.players ?? {};
  const goWinner: string | null = goDoc?.winner ?? null;
  const goStarted = Object.keys(goPlayers).length > 0;
  const myColor = goPlayers.B === myId ? 'B' : goPlayers.W === myId ? 'W' : '';
  const isMyTurn = goTurn === myColor;

  const [goFirstChoice, setGoFirstChoice] = useState(true);
  const [showGomokuWin, setShowGomokuWin] = useState(false);
  const [gomokuReview, setGomokuReview] = useState<number | null>(null); // 復盤中顯示第幾手（null=非復盤）

  // 復盤用棋譜：每手的棋盤快照與落子位置
  const gomokuHistory: string[] = goDoc?.history ?? [];
  const gomokuMarks: ({ x: number; y: number } | null)[] = goDoc?.marks ?? [];
  const gomokuReviewing = gomokuReview !== null && gomokuHistory.length > 0;
  const gomokuDisplayBoard = gomokuReviewing ? snapToArr(gomokuHistory[gomokuReview!]) : goBoard;
  const gomokuDisplayLast = gomokuReviewing ? gomokuMarks[gomokuReview!] : (goDoc?.lastMove ?? null);

  useEffect(() => {
    if (goWinner) setShowGomokuWin(true);
  }, [goWinner]);

  const startGomoku = async () => {
    const pId = partner?.uid ?? myId;
    const blackId = goFirstChoice ? myId : pId;
    const whiteId = goFirstChoice ? pId : myId;
    setGomokuReview(null);
    await saveGame(coupleId, 'gomoku', {
      board: Array(BS*BS).fill(''), turn: 'B',
      players: { B: blackId, W: whiteId },
      winner: null, winReason: null, lastMove: null, moveCount: 0,
      history: [snapOf(Array(BS*BS).fill(''))], marks: [null],
      startedAt: serverTimestamp(),
    });
  };

  const placeStone = async (x: number, y: number) => {
    const idx = y * BS + x;
    if (goBoard[idx] !== '' || goWinner || !isMyTurn || !goStarted) return;
    const newBoard = [...goBoard];
    newBoard[idx] = myColor;
    const won = checkWin(newBoard, x, y, myColor);
    const prevHistory = gomokuHistory.length ? gomokuHistory : [snapOf(goBoard)];
    const prevMarks = gomokuMarks.length ? gomokuMarks : [null];
    await saveGame(coupleId, 'gomoku', {
      board: newBoard, turn: goTurn === 'B' ? 'W' : 'B',
      winner: won ? myColor : null,
      winReason: won ? '五子連線' : null,
      lastMove: { x, y }, moveCount: (goDoc?.moveCount ?? 0) + 1,
      history: [...prevHistory, snapOf(newBoard)],
      marks: [...prevMarks, { x, y }],
    });
  };

  const resignGomoku = async () => {
    if (!myColor || !goStarted || goWinner) return;
    await saveGame(coupleId, 'gomoku', { winner: myColor === 'B' ? 'W' : 'B', winReason: '投降' });
    setShowResignConfirm(false);
  };

  const goIsMyWin = !!goWinner && goPlayers[goWinner] === myId;
  const goWinnerName = goWinner ? (goPlayers[goWinner] === myId ? '你' : partnerName) : '';
  const goWinReason = goDoc?.winReason === '投降' ? `${goWinner === 'B' ? '白棋' : '黑棋'}投降` : '五子連線';
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // ── 圍棋 ─────────────────────────────────────────────────────
  const goDoc13 = useGameDoc(coupleId, 'go13');
  const goBoardSize: number = goDoc13?.boardSize ?? 13;

  // ── Day selector component ────────────────────────────────────
  const DaySelector = ({ available, current, answers, userId, onSelect }: {
    available: number; current: number;
    answers: Record<string, Record<string, number[]>>;
    userId: string; onSelect: (d: number) => void;
  }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={styles.dayScrollContent}>
      {Array.from({ length: available + 1 }, (_, d) => {
        const done = (answers[d]?.[userId] ?? []).every((a: number) => a !== -1);
        const started = (answers[d]?.[userId] ?? []).some((a: number) => a !== -1);
        return (
          <TouchableOpacity
            key={d}
            style={[styles.dayChip, current === d && styles.dayChipActive, done && styles.dayChipDone]}
            onPress={() => onSelect(d)}
          >
            <Text style={[styles.dayChipText, current === d && styles.dayChipTextActive]}>
              第{d+1}天{done ? ' ✓' : started ? ' …' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {[['tot','🎭'], ['trivia','🧠'], ['gomoku','⚫'], ['go','⬜']].map(([k, emoji]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab === k && styles.tabActive]} onPress={() => setTab(k as any)}>
            <Text style={styles.tabText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'tot' && <Text style={styles.tabTitle}>選選看</Text>}
      {tab === 'trivia' && <Text style={styles.tabTitle}>益智問答</Text>}
      {tab === 'gomoku' && <Text style={styles.tabTitle}>五子棋</Text>}
      {tab === 'go' && <Text style={styles.tabTitle}>圍棋 {goBoardSize}×{goBoardSize}</Text>}

      {/* ── 選選看 ── */}
      {tab === 'tot' && (
        <>
          {/* Pending notice */}
          {pendingTotDays.length > 1 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingText}>📋 有 {pendingTotDays.length} 天的題目還沒完成！</Text>
            </View>
          )}
          <DaySelector available={availableTotDays} current={totDay} answers={totDayAnswers} userId={myId} onSelect={setTotDay} />

          <View style={styles.gameCard}>
            {/* Progress */}
            <View style={styles.progressRow}>
              {Array.from({length:5},(_,i)=>(
                <View key={i} style={[styles.progressDot, i===totQ&&styles.progressDotActive, myTotAns[i]!==-1&&styles.progressDotDone]}/>
              ))}
              <Text style={styles.progressText}>{totQ+1}/5</Text>
            </View>

            {/* One question at a time */}
            {(() => {
              const q = TOT[totDay][totQ];
              const myA = myTotAns[totQ];
              const ptA = ptTotAns[totQ];
              const revealed = myA !== -1 && ptA !== -1;
              const match = revealed && myA === ptA;
              return (
                <>
                  <Text style={styles.questionText}>你比較喜歡？</Text>
                  <View style={styles.totBigChoices}>
                    {[q.a, q.b].map((opt, ci) => (
                      <TouchableOpacity key={ci}
                        style={[styles.totBigOpt, ci===0?styles.totOptA:styles.totOptB, myA===ci&&styles.totOptMine, myA!==-1&&styles.totOptDisabled]}
                        onPress={() => answerTot(ci)} disabled={myA!==-1}
                      >
                        <Text style={styles.totBigOptText}>{opt}</Text>
                        {myA===ci && <Text style={styles.totBadge}>我選了</Text>}
                        {revealed && ptA===ci && <Text style={[styles.totBadge,styles.totBadgePt]}>{partnerName}選了</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {myA!==-1 && ptA===-1 && <Text style={styles.waiting}>等待 {partnerName} 作答...</Text>}
                  {revealed && <Text style={[styles.totMatchIcon,{color:match?'#4CAF50':'#888'}]}>{match?'💞 選一樣！':'💬 選不同'}</Text>}
                  {myA!==-1 && totQ<4 && (
                    <TouchableOpacity style={styles.nextBtn} onPress={()=>setTotQ(q=>q+1)}>
                      <Text style={styles.nextBtnText}>下一題 →</Text>
                    </TouchableOpacity>
                  )}
                  {bothTotDone && totQ===4 && (
                    <View style={styles.totSummary}>
                      <Text style={styles.totSummaryText}>
                        今天默契：{totMatches}/5 {totMatches>=4?'🎉 超有默契！':totMatches>=2?'😊 還不錯':'🤔 繼續加油'}
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </>
      )}

      {/* ── 益智問答 ── */}
      {tab === 'trivia' && (
        <>
          {pendingTrivDays.length > 1 && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingText}>📋 有 {pendingTrivDays.length} 天的題目還沒完成！</Text>
            </View>
          )}
          <View style={styles.trivScoreRow}>
            <View style={styles.trivScoreItem}><Text style={styles.trivScoreNum}>{trivScore[myId] ?? 0}</Text><Text style={styles.trivScoreName}>我的分數</Text></View>
            <Text style={styles.trivScoreDivider}>vs</Text>
            <View style={styles.trivScoreItem}><Text style={styles.trivScoreNum}>{trivScore[partner?.uid ?? ''] ?? 0}</Text><Text style={styles.trivScoreName}>{partnerName}的分數</Text></View>
          </View>
          <DaySelector available={availableTrivDays} current={trivDay} answers={trivDayAnswers} userId={myId} onSelect={setTrivDay} />

          <View style={styles.gameCard}>
            <View style={styles.progressRow}>
              {Array.from({length:5},(_,i)=>(
                <View key={i} style={[styles.progressDot, i===trivQ&&styles.progressDotActive, myTrivAns[i]!==-1&&styles.progressDotDone]}/>
              ))}
              <Text style={styles.progressText}>{trivQ+1}/5</Text>
            </View>

            {(() => {
              const q = TRIVIA[trivDay][trivQ];
              const myA = myTrivAns[trivQ];
              const ptA = ptTrivAns[trivQ];
              const revealed = myA !== -1;
              return (
                <>
                  <Text style={styles.trivEmoji}>{q.e}</Text>
                  <Text style={styles.questionText}>{q.q}</Text>
                  <View style={styles.trivOpts}>
                    {q.opts.map((opt, oi) => (
                      <TouchableOpacity key={oi}
                        style={[styles.trivOpt, revealed&&oi===q.ans&&styles.trivOptOk, revealed&&myA===oi&&oi!==q.ans&&styles.trivOptErr]}
                        onPress={() => answerTriv(oi)} disabled={myA!==-1}
                      >
                        <Text style={styles.trivOptLtr}>{['A','B','C','D'][oi]}</Text>
                        <Text style={styles.trivOptTxt}>{opt}</Text>
                        <View style={styles.trivBadges}>
                          {myA===oi && <Text style={styles.trivBadge}>我</Text>}
                          {revealed && ptA===oi && <Text style={[styles.trivBadge,styles.trivBadgePt]}>{partnerName}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {myA!==-1 && ptA===-1 && <Text style={styles.waiting}>等待 {partnerName} 作答...</Text>}
                  {myA!==-1 && trivQ<4 && (
                    <TouchableOpacity style={styles.nextBtn} onPress={()=>setTrivQ(q=>q+1)}>
                      <Text style={styles.nextBtnText}>下一題 →</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        </>
      )}

      {/* ── 五子棋 ── */}
      {tab === 'gomoku' && (
        <>
          <View style={styles.goStatusCard}>
            <Text style={styles.goStatus}>
              {!goStarted ? '按下方「開始新對局」' : goWinner ? '' : isMyTurn ? '輪到你了！' : `等待 ${partnerName} 落子...`}
            </Text>
            {goStarted && !goWinner && myColor && (
              <Text style={styles.goLabel}>
                {myColor === 'B' ? `⚫ 你（黑）　⚪ ${partnerName}（白）` : `⚫ ${partnerName}（黑）　⚪ 你（白）`}
              </Text>
            )}
          </View>
          <View style={styles.boardWrap}>
            <PinchZoom style={[styles.board, { width: BS*CW, height: BS*CW }]}>
              {/* Grid lines */}
              {Array.from({length:BS}).map((_,r)=>(
                <View key={`h${r}`} style={[styles.line,{top:(r+0.5)*CW,left:0.5*CW,width:(BS-1)*CW,height:1}]}/>
              ))}
              {Array.from({length:BS}).map((_,c)=>(
                <View key={`v${c}`} style={[styles.line,{left:(c+0.5)*CW,top:0.5*CW,width:1,height:(BS-1)*CW}]}/>
              ))}
              {/* Star points 星位 for 15×15 */}
              {[3*BS+3,3*BS+7,3*BS+11,7*BS+3,7*BS+7,7*BS+11,11*BS+3,11*BS+7,11*BS+11].map(idx=>{
                const x=idx%BS,y=Math.floor(idx/BS);
                const ss=Math.max(4,Math.round(CW*0.22));
                return <View key={`s${idx}`} style={{position:'absolute',left:(x+0.5)*CW-ss/2,top:(y+0.5)*CW-ss/2,width:ss,height:ss,borderRadius:ss/2,backgroundColor:'#6B4C11'}}/>;
              })}
              {/* Stones */}
              {gomokuDisplayBoard.map((cell,idx)=>{
                if(!cell)return null;
                const x=idx%BS,y=Math.floor(idx/BS);
                const isLast=gomokuDisplayLast?.x===x&&gomokuDisplayLast?.y===y;
                const ss=Math.round(CW*0.88);
                return(
                  <View key={idx} style={[{position:'absolute',left:(x+0.5)*CW-ss/2,top:(y+0.5)*CW-ss/2,width:ss,height:ss,borderRadius:ss/2},
                    cell==='B'?styles.stoneB:styles.stoneW,isLast&&styles.stoneLast]}/>
                );
              })}
              {/* Touch targets */}
              {Array.from({length:BS*BS}).map((_,idx)=>{
                const x=idx%BS,y=Math.floor(idx/BS);
                return(
                  <TouchableOpacity key={`t${idx}`} style={{position:'absolute',left:x*CW,top:y*CW,width:CW,height:CW}}
                    onPress={()=>placeStone(x,y)} disabled={gomokuReviewing||!!goWinner||!isMyTurn||!goStarted||goBoard[idx]!==''}/>
                );
              })}
            </PinchZoom>
          </View>
          {gomokuReviewing && (
            <ReviewBar
              index={gomokuReview!}
              total={gomokuHistory.length - 1}
              onSet={setGomokuReview}
              onExit={() => setGomokuReview(null)}
            />
          )}
          <View style={styles.goControls}>
            {(!goStarted || goWinner) ? (
              <View style={{alignItems:'center',gap:10}}>
                <Text style={styles.goSetupLabel}>誰先下（黑棋先）</Text>
                <View style={styles.goFirstRow}>
                  <TouchableOpacity style={[styles.goFirstBtn,goFirstChoice&&styles.goFirstBtnActive]} onPress={()=>setGoFirstChoice(true)}>
                    <Text style={styles.goFirstEmoji}>⚫</Text>
                    <Text style={[styles.goFirstText,goFirstChoice&&styles.goFirstTextActive]}>我先下</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.goFirstBtn,!goFirstChoice&&styles.goFirstBtnActive]} onPress={()=>setGoFirstChoice(false)}>
                    <Text style={styles.goFirstEmoji}>⚪</Text>
                    <Text style={[styles.goFirstText,!goFirstChoice&&styles.goFirstTextActive]}>{partnerName}先下</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.goStartBtn} onPress={startGomoku}>
                  <Text style={styles.goStartBtnText}>⚫ 開始新對局</Text>
                </TouchableOpacity>
                {!!goWinner && gomokuHistory.length > 1 && !gomokuReviewing && (
                  <TouchableOpacity style={styles.reviewEntryBtn} onPress={() => setGomokuReview(gomokuHistory.length - 1)}>
                    <Text style={styles.reviewEntryText}>🔍 復盤這局</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              !goWinner && myColor && (
                <TouchableOpacity style={styles.resignBtn} onPress={() => setShowResignConfirm(true)}>
                  <Text style={styles.resignBtnText}>🏳️ 投降</Text>
                </TouchableOpacity>
              )
            )}
          </View>
          <Text style={styles.goNote}>黑棋先走 · 五子連線獲勝</Text>
          <Modal visible={showResignConfirm} transparent animationType="fade">
            <View style={styles.confirmOverlay}><View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>確定要投降嗎？</Text>
              <Text style={styles.confirmMsg}>投降後對方獲勝，無法反悔。</Text>
              <View style={styles.confirmBtns}>
                <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowResignConfirm(false)}>
                  <Text style={styles.confirmCancelText}>繼續下</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmDel} onPress={resignGomoku}>
                  <Text style={styles.confirmDelText}>投降</Text>
                </TouchableOpacity>
              </View>
            </View></View>
          </Modal>
          <WinModal
            visible={showGomokuWin}
            isMyWin={goIsMyWin}
            winnerName={goWinnerName}
            reason={goWinReason}
            onNewGame={() => setShowGomokuWin(false)}
            onReview={gomokuHistory.length > 1 ? () => { setShowGomokuWin(false); setGomokuReview(gomokuHistory.length - 1); } : undefined}
          />
        </>
      )}

      {/* ── 圍棋 ── */}
      {tab === 'go' && (
        <GoBoard13 coupleId={coupleId} myId={myId} partnerName={partnerName} partnerId={partner?.uid ?? myId} />
      )}
    </ScrollView>
  );
}

// 15×15 board cell size — cap at 330px total to prevent overflow on web desktop
const CW = Math.floor(Math.min(Dimensions.get('window').width - 64, 330) / 15);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  content: { padding: 16, paddingBottom: 50 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4, marginBottom: 8, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#FF6B9D' },
  tabText: { fontSize: 20 },
  tabTitle: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', textAlign: 'center', marginBottom: 12 },
  pendingBanner: { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center' },
  pendingText: { fontSize: 13, color: '#E65100' },
  dayScroll: { marginBottom: 12 },
  dayScrollContent: { gap: 8, paddingHorizontal: 2 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F5F5F5' },
  dayChipActive: { backgroundColor: '#FF6B9D' },
  dayChipDone: { backgroundColor: '#E8F5E9' },
  dayChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
  dayChipTextActive: { color: '#fff' },
  gameCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  qNum: { fontSize: 12, color: '#BBBBBB', marginBottom: 12, textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  progressDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F0E0E5' },
  progressDotActive: { backgroundColor: '#FF6B9D', width: 14, height: 14, borderRadius: 7 },
  progressDotDone: { backgroundColor: '#4CAF50' },
  progressText: { fontSize: 12, color: '#888', marginLeft: 6 },
  questionText: { fontSize: 18, fontWeight: '700', color: '#2D2D2D', textAlign: 'center', marginBottom: 20 },
  nextBtn: { backgroundColor: '#FF6B9D', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 16 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // ToT
  totQuestion: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  totQNum: { fontSize: 12, color: '#888', width: 24, fontWeight: '700' },
  totChoices: { flex: 1, flexDirection: 'row', gap: 6 },
  totBigChoices: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  totBigOpt: { flex: 1, borderRadius: 16, padding: 18, alignItems: 'center', minHeight: 80, justifyContent: 'center' },
  totBigOptText: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', textAlign: 'center' },
  totOpt: { flex: 1, borderRadius: 10, padding: 8, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
  totOptA: { backgroundColor: '#E8F9FC' },
  totOptB: { backgroundColor: '#F3E8FF' },
  totOptMine: { borderWidth: 2, borderColor: '#FF6B9D' },
  totOptDisabled: { opacity: 0.85 },
  totOptText: { fontSize: 11, fontWeight: '600', color: '#2D2D2D', textAlign: 'center' },
  totBadge: { fontSize: 9, color: '#FF6B9D', fontWeight: '800', marginTop: 2 },
  totBadgePt: { color: '#C77DFF' },
  totMatchIcon: { fontSize: 18, marginLeft: 4 },
  waiting: { fontSize: 13, color: '#BBBBBB', textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  totSummary: { backgroundColor: '#FFF0F5', borderRadius: 10, padding: 12, marginTop: 10, alignItems: 'center' },
  totSummaryText: { fontSize: 14, fontWeight: '700', color: '#FF6B9D' },
  // Trivia
  trivScoreRow: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  trivScoreItem: { flex: 1, alignItems: 'center' },
  trivScoreNum: { fontSize: 28, fontWeight: '800', color: '#FF6B9D' },
  trivScoreName: { fontSize: 12, color: '#888' },
  trivScoreDivider: { fontSize: 13, color: '#BBBBBB', fontWeight: '700' },
  trivEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  trivQBlock: { marginBottom: 14 },
  trivQText: { fontSize: 14, fontWeight: '700', color: '#2D2D2D', marginBottom: 8 },
  trivOpts: { gap: 6 },
  trivOpt: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10 },
  trivOptOk: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  trivOptErr: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#EF5350' },
  trivOptLtr: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', textAlign: 'center', lineHeight: 24, fontSize: 11, fontWeight: '700', color: '#888', marginRight: 8 },
  trivOptTxt: { flex: 1, fontSize: 13, color: '#2D2D2D' },
  trivBadges: { flexDirection: 'row', gap: 4 },
  trivBadge: { backgroundColor: '#FF6B9D', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, fontSize: 10, color: '#fff', fontWeight: '700' },
  trivBadgePt: { backgroundColor: '#C77DFF' },
  // Gomoku board
  goStatusCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  goStatus: { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  goLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  boardWrap: { alignItems: 'center', marginBottom: 12 },
  board: { backgroundColor: '#C8A46E', borderRadius: 6, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  cell: { width: CW },
  line: { position: 'absolute', backgroundColor: '#6B4C11' },
  stoneB: { backgroundColor: '#111', position: 'absolute', shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.4, shadowRadius: 2, elevation: 3 },
  stoneW: { backgroundColor: '#f0f0f0', position: 'absolute', borderWidth: 0.5, borderColor: '#bbb', shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  stoneLast: { borderWidth: 2, borderColor: '#FF6B9D' },
  goControls: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 6 },
  goSetupLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  goFirstRow: { flexDirection: 'row', gap: 12 },
  goFirstBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#F5F5F5', borderRadius: 14 },
  goFirstBtnActive: { backgroundColor: '#2D2D2D' },
  goFirstEmoji: { fontSize: 24, marginBottom: 4 },
  goFirstText: { fontSize: 12, fontWeight: '600', color: '#555' },
  goFirstTextActive: { color: '#fff' },
  goStartBtn: { backgroundColor: '#2D2D2D', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  goStartBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resignBtn: { backgroundColor: '#FFF0F0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1.5, borderColor: '#FFB3B3' },
  resignBtnText: { color: '#E53935', fontWeight: '700', fontSize: 14 },
  reviewEntryBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#FF6B9D' },
  reviewEntryText: { color: '#FF6B9D', fontWeight: '700', fontSize: 14 },
  goNote: { fontSize: 12, color: '#BBBBBB', textAlign: 'center' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 290 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#E53935', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
