import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import WinModal from './WinModal';
import { PinchZoom } from './PinchZoom';
import { ReviewBar } from './ReviewBar';

// 復盤用棋譜快照（空＝'.'）
const snapOf = (board: string[]) => board.map(c => c || '.').join('');
const snapToArr = (s: string) => s.split('').map(c => (c === '.' ? '' : c));

const SW = Dimensions.get('window').width;
// 留足夠邊距（遊戲頁面有 padding 16*2 + 安全邊距）
const MAX_BOARD = Math.min(SW - 56, 340);

// ── Star points per board size ────────────────────────────────
function getStars(n: number): number[] {
  if (n === 9)  return [2*n+2, 2*n+6, 4*n+4, 6*n+2, 6*n+6];
  if (n === 13) return [3*n+3, 3*n+9, 6*n+6, 9*n+3, 9*n+9];
  if (n === 19) return [3*n+3, 3*n+9, 3*n+15, 9*n+3, 9*n+9, 9*n+15, 15*n+3, 15*n+9, 15*n+15];
  return [];
}

// ── Game logic ────────────────────────────────────────────────
function neighbors(i: number, n: number): number[] {
  const x = i % n, y = Math.floor(i / n);
  const ns: number[] = [];
  if (x > 0) ns.push(i - 1);
  if (x < n-1) ns.push(i + 1);
  if (y > 0) ns.push(i - n);
  if (y < n-1) ns.push(i + n);
  return ns;
}
function getGroup(board: string[], start: number, n: number): number[] {
  const color = board[start]; if (!color) return [];
  const group: number[] = []; const seen = new Set<number>([start]);
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    group.push(i);
    for (const nb of neighbors(i, n)) {
      if (!seen.has(nb) && board[nb] === color) { seen.add(nb); stack.push(nb); }
    }
  }
  return group;
}
function liberties(board: string[], group: number[], n: number): number {
  const seen = new Set<number>(); let libs = 0;
  for (const i of group)
    for (const nb of neighbors(i, n))
      if (!seen.has(nb) && board[nb] === '') { libs++; seen.add(nb); }
  return libs;
}
function tryPlace(board: string[], x: number, y: number, color: 'B'|'W', prevBoard: string[], cap: { B: number; W: number }, n: number) {
  const idx = y * n + x;
  if (board[idx]) return null;
  const nb = [...board]; nb[idx] = color;
  const opp = color === 'B' ? 'W' : 'B';
  const newCap = { ...cap };
  let capturedAny = false;
  for (const adjIdx of new Set(neighbors(idx, n).filter(ni => nb[ni] === opp))) {
    const g = getGroup(nb, adjIdx, n);
    if (liberties(nb, g, n) === 0) { g.forEach(gi => nb[gi] = ''); newCap[color] += g.length; capturedAny = true; }
  }
  if (!capturedAny) { const myG = getGroup(nb, idx, n); if (liberties(nb, myG, n) === 0) return null; }
  if (nb.join('') === prevBoard.join('')) return null;
  return { board: nb, captured: newCap, prevBoard: board };
}
function countScore(board: string[], captured: { B: number; W: number }, n: number) {
  const seen = new Set<number>(); const territory = { B: 0, W: 0 };
  for (let i = 0; i < n * n; i++) {
    if (board[i] !== '' || seen.has(i)) continue;
    const region: number[] = []; const borders = new Set<string>();
    const stack = [i]; const rseen = new Set<number>();
    while (stack.length) {
      const j = stack.pop()!; if (rseen.has(j)) continue; rseen.add(j);
      if (board[j] !== '') { borders.add(board[j]); continue; }
      region.push(j);
      for (const nb of neighbors(j, n)) stack.push(nb);
    }
    region.forEach(j => seen.add(j));
    if (borders.size === 1) territory[[...borders][0] as 'B'|'W'] += region.length;
  }
  return { B: territory.B + captured.B, W: territory.W + captured.W - 6.5 };
}

// ── Component ─────────────────────────────────────────────────
interface Props { coupleId: string; myId: string; partnerName: string; partnerId: string; }

export default function GoBoard13({ coupleId, myId, partnerName, partnerId }: Props) {
  const [data, setData] = useState<any>(null);
  const [sizeChoice, setSizeChoice] = useState<9|13|19>(13);
  const [handicap, setHandicap] = useState(0);
  const [iWantBlack, setIWantBlack] = useState(true);
  const [showResign, setShowResign] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [review, setReview] = useState<number | null>(null); // 復盤中顯示第幾手

  useEffect(() => {
    if (!coupleId) return;
    return onSnapshot(doc(db, 'couples', coupleId, 'game', 'go13'), s => setData(s.exists() ? s.data() : null));
  }, [coupleId]);

  // Dynamic board dimensions
  const N: number = data?.boardSize ?? sizeChoice;
  // Board total width = N × CELL → must fit in MAX_BOARD
  const CELL = Math.floor(MAX_BOARD / N);
  const BPX = CELL * (N - 1); // distance between first and last line
  const ST = Math.max(Math.round(CELL * 0.88), 8);
  const STARS = getStars(N);

  const board: string[] = data?.board ?? Array(N * N).fill('');
  const turn: string = data?.turn ?? 'B';
  const players: Record<string, string> = data?.players ?? {};
  const captured: { B: number; W: number } = data?.captured ?? { B: 0, W: 0 };
  const prevBoard: string[] = data?.prevBoard ?? Array(N * N).fill('');
  const passCount: number = data?.passCount ?? 0;
  const gameOver: boolean = data?.gameOver ?? false;
  const lastMove = data?.lastMove ?? null;
  const prevState = data?.prevState ?? null;

  // 復盤棋譜
  const history: string[] = data?.history ?? [];
  const marks: ({ x: number; y: number } | null)[] = data?.marks ?? [];
  const reviewing = review !== null && history.length > 0;
  const displayBoard = reviewing ? snapToArr(history[review!]) : board;
  const displayLast = reviewing
    ? marks[review!]
    : (lastMove && lastMove !== 'pass' ? lastMove : null);

  const myColor: 'B'|'W'|'' = players.B === myId ? 'B' : players.W === myId ? 'W' : '';
  const isMyTurn = turn === myColor && !gameOver;
  const started = Object.keys(players).length > 0;
  const canUndo = !gameOver && !!prevState && myColor !== turn; // you just moved

  const save = async (payload: any) =>
    setDoc(doc(db, 'couples', coupleId, 'game', 'go13'), payload, { merge: true });

  const startGame = async () => {
    const n = sizeChoice; // 用新選的尺寸，避免讀到舊遊戲的 N
    const pId = partnerId || myId;
    const blackId = iWantBlack ? myId : pId;
    const whiteId = iWantBlack ? pId : myId;

    const HOSHI: Record<number, [number,number][]> = {
      9:  [[6,2],[2,6],[6,6],[2,2],[4,4],[4,2],[4,6],[2,4],[6,4]],
      13: [[9,3],[3,9],[9,9],[3,3],[6,6],[3,6],[9,6],[6,3],[6,9]],
      19: [[15,3],[3,15],[15,15],[3,3],[9,9],[3,9],[15,9],[9,3],[9,15]],
    };
    const hPos = HOSHI[n] ?? HOSHI[13];

    const initBoard = handicap > 0 ? (() => {
      const b = Array(n * n).fill('');
      hPos.slice(0, handicap).forEach(([x, y]) => { b[y * n + x] = 'B'; });
      return b;
    })() : Array(n * n).fill('');

    setReview(null);
    await save({
      board: initBoard, prevBoard: Array(n * n).fill(''),
      turn: handicap > 0 ? 'W' : 'B',
      players: { B: blackId, W: whiteId },
      captured: { B: 0, W: 0 }, passCount: 0,
      gameOver: false, winner: null, winReason: null,
      score: null, lastMove: null, prevState: null,
      boardSize: n, handicap,
      history: [snapOf(initBoard)], marks: [null],
      startedAt: serverTimestamp(),
    });
  };

  const handlePlace = async (x: number, y: number) => {
    if (!isMyTurn || !started || !myColor) return;
    const result = tryPlace(board, x, y, myColor, prevBoard, captured, N);
    if (!result) return;
    const snapshot = { board, prevBoard, turn, captured, passCount, lastMove }; // for undo
    const prevHistory = history.length ? history : [snapOf(board)];
    const prevMarks = marks.length ? marks : [null];
    await save({
      board: result.board, prevBoard: result.prevBoard,
      captured: result.captured, turn: turn === 'B' ? 'W' : 'B',
      passCount: 0, lastMove: { x, y }, prevState: snapshot,
      history: [...prevHistory, snapOf(result.board)],
      marks: [...prevMarks, { x, y }],
    });
  };

  const handlePass = async () => {
    if (!isMyTurn || !started) return;
    const newPassCount = passCount + 1;
    const over = newPassCount >= 2;
    const score = over ? countScore(board, captured, N) : null;
    const winner = over ? (score!.B > score!.W ? 'B' : 'W') : null;
    const snapshot = { board, prevBoard, turn, captured, passCount, lastMove };
    const prevHistory = history.length ? history : [snapOf(board)];
    const prevMarks = marks.length ? marks : [null];
    await save({
      turn: turn === 'B' ? 'W' : 'B', passCount: newPassCount,
      gameOver: over, winner,
      winReason: over ? 'score' : null, // explicitly 'score' for territory count
      score, lastMove: 'pass',
      prevState: over ? null : snapshot,
      history: [...prevHistory, snapOf(board)],
      marks: [...prevMarks, null],
    });
  };

  const handleUndo = async () => {
    if (!prevState) return;
    await save({
      ...prevState, prevState: null,
      history: history.length > 1 ? history.slice(0, -1) : history,
      marks: marks.length > 1 ? marks.slice(0, -1) : marks,
    });
  };

  const handleResign = async () => {
    if (!myColor || !started || gameOver) return;
    const winner = myColor === 'B' ? 'W' : 'B';
    await save({ gameOver: true, winner, winReason: '投降', prevState: null });
    setShowResign(false);
  };

  // Win display
  const winner = data?.winner ?? null;

  // Show win modal only when game just ended (after winner is defined)
  useEffect(() => {
    if (gameOver && winner) setShowWinModal(true);
  }, [gameOver, winner]);
  const isMyWin = !!winner && players[winner] === myId;
  const winnerName = winner ? (players[winner] === myId ? '你' : partnerName) : '';
  const winReason = (() => {
    const wr = data?.winReason;
    if (wr === '投降') return `${winner === 'B' ? '白棋' : '黑棋'}投降`;
    if (wr === 'score') {
      const sc = data?.score;
      if (sc) {
        const myScore = sc[myColor || 'B']?.toFixed(1);
        const ptScore = sc[myColor === 'B' ? 'W' : 'B']?.toFixed(1);
        return `目數計算：我 ${myScore} vs 對方 ${ptScore}`;
      }
      return '目數計算';
    }
    return '遊戲結束';
  })();

  const statusText = () => {
    if (!started) return `按「開始」開始 ${N}×${N} 圍棋`;
    if (gameOver) return '';
    if (!myColor) return '等待加入...';
    return isMyTurn ? `輪到你（${myColor === 'B' ? '黑' : '白'}）` : `等待 ${partnerName}...`;
  };
  const myLabel = myColor === 'B' ? '⚫ 我（黑）' : myColor === 'W' ? '⚪ 我（白）' : '';
  const ptLabel = myColor === 'B' ? `⚪ ${partnerName}（白）` : `⚫ ${partnerName}（黑）`;

  return (
    <View style={styles.container}>
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{statusText()}</Text>
        {myLabel ? <Text style={styles.labelText}>{myLabel}　{ptLabel}</Text> : null}
        {started && (
          <Text style={styles.captureText}>
            我提子 {captured[myColor as 'B'|'W'] ?? 0}　對方提子 {captured[myColor === 'B' ? 'W' : 'B'] ?? 0}
            {(data?.handicap ?? 0) > 0 ? `　讓子 ${data.handicap}` : ''}
          </Text>
        )}
      </View>

      {/* Board */}
      <PinchZoom style={[styles.board, { width: BPX + CELL, height: BPX + CELL }]}>
          {Array.from({ length: N }).map((_, r) => (
            <View key={`h${r}`} style={[styles.line, { top: CELL/2 + r*CELL, left: CELL/2, width: BPX, height: 1 }]} />
          ))}
          {Array.from({ length: N }).map((_, c) => (
            <View key={`v${c}`} style={[styles.line, { left: CELL/2 + c*CELL, top: CELL/2, width: 1, height: BPX }]} />
          ))}
          {STARS.map(idx => {
            const sx = idx % N, sy = Math.floor(idx / N);
            const ss = Math.max(6, Math.round(CELL * 0.2));
            return <View key={`s${idx}`} style={[styles.star, { left: CELL/2 + sx*CELL - ss/2, top: CELL/2 + sy*CELL - ss/2, width: ss, height: ss, borderRadius: ss/2 }]} />;
          })}
          {displayBoard.map((cell, idx) => {
            if (!cell) return null;
            const x = idx % N, y = Math.floor(idx / N);
            const isLast = !!displayLast && displayLast.x === x && displayLast.y === y;
            return (
              <View key={idx} style={[
                styles.stone,
                cell === 'B' ? styles.stoneB : styles.stoneW,
                { left: CELL/2 + x*CELL - ST/2, top: CELL/2 + y*CELL - ST/2, width: ST, height: ST, borderRadius: ST/2 },
                isLast && styles.stoneLast,
              ]} />
            );
          })}
          {Array.from({ length: N * N }).map((_, idx) => {
            const x = idx % N, y = Math.floor(idx / N);
            return (
              <TouchableOpacity key={`t${idx}`}
                style={[styles.touch, { left: x*CELL, top: y*CELL, width: CELL, height: CELL }]}
                onPress={() => handlePlace(x, y)}
                disabled={reviewing || !!gameOver || !isMyTurn || !started || board[idx] !== ''}
              />
            );
          })}
        </PinchZoom>
      {reviewing && (
        <ReviewBar
          index={review!}
          total={history.length - 1}
          onSet={setReview}
          onExit={() => setReview(null)}
        />
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {(!started || gameOver) ? (
          <View style={styles.startSection}>
            {/* Board size */}
            <Text style={styles.handicapLabel}>棋盤：</Text>
            <View style={styles.sizeRow}>
              {([9, 13, 19] as const).map(sz => (
                <TouchableOpacity key={sz}
                  style={[styles.sizeBtn, sizeChoice === sz && styles.sizeBtnActive]}
                  onPress={() => setSizeChoice(sz)}
                >
                  <Text style={[styles.sizeBtnText, sizeChoice === sz && styles.sizeBtnTextActive]}>{sz}×{sz}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Color */}
            <Text style={styles.handicapLabel}>我執：</Text>
            <View style={styles.colorRow}>
              <TouchableOpacity style={[styles.colorBtn, iWantBlack && styles.colorBtnActive]} onPress={() => setIWantBlack(true)}>
                <Text style={styles.colorEmoji}>⚫</Text>
                <Text style={[styles.colorText, iWantBlack && styles.colorTextActive]}>黑棋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.colorBtn, !iWantBlack && styles.colorBtnActive]} onPress={() => setIWantBlack(false)}>
                <Text style={styles.colorEmoji}>⚪</Text>
                <Text style={[styles.colorText, !iWantBlack && styles.colorTextActive]}>白棋</Text>
              </TouchableOpacity>
            </View>
            {/* Handicap */}
            <View style={styles.handicapRow}>
              <Text style={styles.handicapLabel}>讓子：</Text>
              <TouchableOpacity style={styles.handicapBtn} onPress={() => setHandicap(h => Math.max(0, h-1))}>
                <Text style={styles.handicapBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.handicapValue}>{handicap === 0 ? '無' : `${handicap} 子`}</Text>
              <TouchableOpacity style={styles.handicapBtn} onPress={() => setHandicap(h => Math.min(9, h+1))}>
                <Text style={styles.handicapBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            {handicap > 0 && <Text style={styles.handicapNote}>黑棋預先落 {handicap} 子，白棋先走</Text>}
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <Text style={styles.startBtnText}>{started ? '⬜ 開始新對局' : '⬜ 開始'}</Text>
            </TouchableOpacity>
            {gameOver && history.length > 1 && !reviewing && (
              <TouchableOpacity style={styles.reviewEntryBtn} onPress={() => setReview(history.length - 1)}>
                <Text style={styles.reviewEntryText}>🔍 復盤這局</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          !gameOver && (
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.passBtn, !isMyTurn && styles.btnDisabled]} onPress={handlePass} disabled={!isMyTurn}>
                <Text style={styles.passBtnText}>棄手</Text>
              </TouchableOpacity>
              {canUndo && (
                <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
                  <Text style={styles.undoBtnText}>↩ 悔棋</Text>
                </TouchableOpacity>
              )}
              {myColor && (
                <TouchableOpacity style={styles.resignBtn} onPress={() => setShowResign(true)}>
                  <Text style={styles.resignBtnText}>🏳️ 投降</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </View>
      <Text style={styles.note}>黑先 · 提無氣棋組 · 連續雙棄手結束 · Komi 6.5</Text>

      {/* Resign confirm */}
      <Modal visible={showResign} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>確定要投降嗎？</Text>
            <Text style={styles.confirmMsg}>投降後對方獲勝，無法反悔。</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setShowResign(false)}>
                <Text style={styles.confirmCancelText}>繼續下</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDel} onPress={handleResign}>
                <Text style={styles.confirmDelText}>投降</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Win modal — 關掉後回到設定畫面讓用戶選設定再開局 */}
      <WinModal
        visible={showWinModal}
        isMyWin={isMyWin}
        winnerName={winnerName}
        reason={winReason}
        onNewGame={() => setShowWinModal(false)}
        onReview={history.length > 1 ? () => { setShowWinModal(false); setReview(history.length - 1); } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  statusCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statusText: { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  labelText: { fontSize: 12, color: '#888', marginTop: 4 },
  captureText: { fontSize: 11, color: '#555', marginTop: 4 },
  board: { backgroundColor: '#C8A46E', borderRadius: 6, position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6 },
  line: { position: 'absolute', backgroundColor: '#6B4C11' },
  star: { position: 'absolute', backgroundColor: '#6B4C11' },
  stone: { position: 'absolute' },
  stoneB: { backgroundColor: '#111', shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.45, shadowRadius: 2, elevation: 4 },
  stoneW: { backgroundColor: '#f4f4f4', borderWidth: 0.5, borderColor: '#bbb', shadowColor: '#000', shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  stoneLast: { borderWidth: 2, borderColor: '#FF6B9D' },
  touch: { position: 'absolute' },
  controls: { marginTop: 12, marginBottom: 8, alignItems: 'center' },
  startSection: { alignItems: 'center', gap: 10 },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F5F5F5' },
  sizeBtnActive: { backgroundColor: '#2D2D2D' },
  sizeBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  sizeBtnTextActive: { color: '#fff' },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorBtn: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#F5F5F5', borderRadius: 14 },
  colorBtnActive: { backgroundColor: '#2D2D2D' },
  colorEmoji: { fontSize: 28, marginBottom: 4 },
  colorText: { fontSize: 13, fontWeight: '600', color: '#555' },
  colorTextActive: { color: '#fff' },
  handicapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  handicapLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  handicapBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  handicapBtnText: { fontSize: 20, color: '#555', fontWeight: '700' },
  handicapValue: { fontSize: 16, fontWeight: '700', color: '#2D2D2D', minWidth: 50, textAlign: 'center' },
  handicapNote: { fontSize: 12, color: '#888' },
  startBtn: { backgroundColor: '#2D2D2D', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewEntryBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#FF6B9D' },
  reviewEntryText: { color: '#FF6B9D', fontWeight: '700', fontSize: 14 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  passBtn: { backgroundColor: '#56CFE1', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  passBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  undoBtn: { backgroundColor: '#FFF8E1', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, borderWidth: 1.5, borderColor: '#FFE082' },
  undoBtnText: { color: '#8B6914', fontWeight: '700', fontSize: 14 },
  resignBtn: { backgroundColor: '#FFF0F0', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18, borderWidth: 1.5, borderColor: '#FFB3B3' },
  resignBtnText: { color: '#E53935', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 290 },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: '#2D2D2D', marginBottom: 8 },
  confirmMsg: { fontSize: 14, color: '#555', marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmDel: { flex: 1, backgroundColor: '#E53935', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  confirmDelText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  note: { fontSize: 11, color: '#BBBBBB', textAlign: 'center' },
});
