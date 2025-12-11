// =========================
// 0. 기본 캔버스 설정
// =========================
// 이미 같은 코드가 있다면 이 부분은 중복으로 넣지 말고, 아래 "타일맵 설정"만 복사해서 사용해도 됨.
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 유닛 데이터 (operator.js와 enemy.js에서 전역 변수로 로드됨)
// window.operatorData와 window.enemyData를 사용

// 게임 루프용 기본 뼈대
let lastTime = 0;
let gameTime = 0; // 빗금 애니메이션용 시간
let isPaused = false; // 일시 정지 상태
let pauseBlinkTimer = 0; // PAUSE 텍스트 깜빡임 타이머
let gameTimeScale = 1.0; // 게임 속도 배율 (1.0 = 정상, 0.1 = 매우 느림)

// 게임 속도 업데이트 함수
function updateGameTimeScale() {
  // 드래그/배치 중이거나 유닛 선택 중이면 느리게
  const isDraggingOrPlacing = isDraggingOperator || placingOperator !== null || isSettingDirection;
  const isOperatorSelected = operators.some(op => op.showRetreatIcon || op.showSkillIcon);
  
  if (isDraggingOrPlacing || isOperatorSelected) {
    gameTimeScale = 0.1; // 매우 느리게
  } else {
    gameTimeScale = 1.0; // 정상 속도
  }
}

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (!isPaused) {
    gameTime += dt;
  update(dt);
    pauseBlinkTimer = 0; // 일시 정지 해제 시 타이머 리셋
  } else {
    // 일시 정지 중일 때 깜빡임 타이머 업데이트
    pauseBlinkTimer += dt;
  }
  
  draw(ctx);

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // 나중에 적/타워 업데이트 들어갈 자리
}

// draw 함수는 아래에 실제 구현됨

requestAnimationFrame(gameLoop);

// =========================
// 1. 타일맵 설정
// =========================

// 한 타일 크기(px)
const tileSize = 64;

// 캔버스 크기에 맞춰 가로/세로 타일 수 계산 (맵 데이터가 로드되면 업데이트됨)
let cols = Math.floor(canvas.width / tileSize);
let rows = Math.floor(canvas.height / tileSize);

// 타일 타입 상수
const TILE_EMPTY   = 0; // 빈 땅
const TILE_ROAD    = 1; // 적이 지나는 길
const TILE_UNROAD    = 2; // 적이 지나는 길(배치 불가)
const TILE_BLOCK   = 3; // 막힌 타일(벽)
const TILE_DEPLOY  = 4; // 배치 가능한 타일
const TILE_ENEMYBASE  = 5; // 적 등장 지역
const TILE_USERBASE  = 6; // 아군 지역
const TILE_DROP  = 7; // 낙하 지역

// 각 타일 타입별 색
const tileColors = {
  [TILE_EMPTY]:  '#2b2b2b', // 어두운 회색
  [TILE_ROAD]:   '#8b5a2b', // 갈색(길)
  [TILE_UNROAD]:   '#37200bff', // 진한 갈색(배치 불가 길)
  [TILE_BLOCK]:  '#444444', // 더 어두운 회색(벽)
  [TILE_DEPLOY]: '#1e90ff', // 파란색(배치 가능)
  [TILE_ENEMYBASE]: '#ff1e1eff', // 빨간색(적 등장 지역)
  [TILE_USERBASE]: '#1eff47ff', // 녹색(아군 지역)
  [TILE_DROP]: '#ffffffff', // 흰색(낙하 지역)
};

const MAX_TILE_TYPE = 7;

// 맵 데이터 (동적으로 로드됨)
let mapData = [];
let mapRows = 7;
let mapCols = 10;

// 스테이지 번호 가져오기 (URL 파라미터 또는 기본값 1)
function getStageNumber() {
  const urlParams = new URLSearchParams(window.location.search);
  const stage = urlParams.get('stage') || '1';
  return parseInt(stage) || 1;
}

// 적 지역-아군 지역 매핑 데이터
let spawnToBaseMapping = [];

// 코스트 시스템
let currentCost = 0; // 현재 코스트
let maxCost = 0; // 최대 코스트
let costRegenRate = 0; // 코스트 회복 속도 (초당)
let naturalRegenCost = 0; // 자연 회복으로만 증가한 코스트 (게이지 표시용)
let maxDeployCount = 0; // 배치 가능 인원
let currentDeployCount = 0; // 현재 배치된 인원

// 게임 상태 관리
let enemiesKilled = 0; // 적 처치 수
let currentPlayerHP = 0; // 현재 플레이어 HP
let maxPlayerHP = 0; // 최대 플레이어 HP
let gameState = 'ready'; // 'ready', 'playing', 'failure', 'clear', 'retry'
let failureAnimationTimer = 0; // MAP FAILURE 애니메이션 타이머
let clearAnimationTimer = 0; // MAP CLEAR 애니메이션 타이머
let screenFadeAlpha = 0; // 화면 페이드 알파값
let resultTextX = 0; // 결과 텍스트 X 위치
let resultText = ''; // 결과 텍스트
let resultWaitTimer = 0; // 결과 텍스트 대기 타이머
let retryBlinkTimer = 0; // RETRY 텍스트 깜빡임 타이머

// 맵 데이터 로드 함수
function loadMapData(stageNumber) {
  const stageData = window[`stage${stageNumber}MapData`];
  const stageInfo = window[`stage${stageNumber}MapInfo`];
  const stageEnemySpawns = window[`stage${stageNumber}EnemySpawns`];
  
  if (stageData) {
    mapData = stageData;
    if (stageInfo) {
      mapRows = stageInfo.rows || 8;
      mapCols = stageInfo.cols || 14;
      maxDeployCount = stageInfo.maxDeployCount || 8; // 배치 가능 인원 로드
      
      // 캔버스 크기를 맵 크기에 맞게 조정
      const tileSize = stageInfo.tileSize || 64;
      canvas.width = mapCols * tileSize;
      canvas.height = mapRows * tileSize;
    }
    
  // 코스트 시스템 초기화
  maxCost = 99; // 최대 코스트 (명일방주 스타일)
  currentCost = 30; // 시작 코스트
  naturalRegenCost = 30; // 자연 회복 코스트 (게이지 표시용, 시작 코스트와 동일)
  costRegenRate = 1.0; // 초당 코스트 회복 속도
  
  // 플레이어 HP 초기화
  if (stageInfo && stageInfo.playerHP) {
    maxPlayerHP = stageInfo.playerHP;
    currentPlayerHP = stageInfo.playerHP;
  }
  
  // 게임 상태 초기화
  enemiesKilled = 0;
  gameState = 'ready'; // 게임 시작 전 상태
  failureAnimationTimer = 0;
  clearAnimationTimer = 0;
  screenFadeAlpha = 0;
  resultTextX = 0;
  resultText = '';
  resultWaitTimer = 0;
    
    // 적 스폰 데이터 로드 (기존 형식 호환성)
    enemySpawnData.clear();
    spawnToBaseMapping = [];
    
    if (stageEnemySpawns) {
      // 새로운 형식 (객체)
      if (stageEnemySpawns.spawnToBaseMapping && Array.isArray(stageEnemySpawns.spawnToBaseMapping)) {
        spawnToBaseMapping = stageEnemySpawns.spawnToBaseMapping;
      }
      
      // 기존 형식 (배열) 호환성
      if (Array.isArray(stageEnemySpawns)) {
      stageEnemySpawns.forEach(spawn => {
        const key = `${spawn.x},${spawn.y}`;
        if (spawn.enemyId !== undefined) {
          enemySpawnData.set(key, spawn.enemyId);
        } else if (spawn.enemies && Array.isArray(spawn.enemies) && spawn.enemies.length > 0) {
          enemySpawnData.set(key, spawn.enemies[0].id);
        }
      });
      console.log(`스테이지 ${stageNumber} 적 스폰 데이터 로드 완료: ${stageEnemySpawns.length}개`);
      } else if (stageEnemySpawns.spawnToBaseMapping) {
        console.log(`스테이지 ${stageNumber} 적 스폰 매핑 데이터 로드 완료: ${spawnToBaseMapping.length}개`);
      }
    }
    
    // 스폰 시퀀스 초기화
    initSpawnSequence();
    
    console.log(`스테이지 ${stageNumber} 맵 데이터 로드 완료`);
  } else {
    console.warn(`스테이지 ${stageNumber} 맵 데이터를 찾을 수 없습니다. 기본 맵을 사용합니다.`);
    // 기본 맵 데이터
    mapData = [
      [0,0,3,3,3,3,5,3,3,3],
      [0,0,3,3,3,4,1,4,4,3],
      [0,0,3,3,4,4,1,4,4,3],
      [0,0,5,1,1,1,1,1,1,1],
      [0,0,3,3,3,4,4,1,4,4],
      [0,0,3,3,3,4,4,1,4,3],
      [0,0,3,3,3,3,3,6,3,3]
    ];
    enemySpawnData.clear();
    spawnToBaseMapping = [];
  }
}

// 적이 통과 가능한 타일인지 체크
function isWalkable(x, y) {
  const tile = mapData[y]?.[x];
  if (tile === undefined) return false;

  return (
    tile === TILE_ROAD      || // 일반 길
    tile === TILE_UNROAD    || // 배치 불가 길 (적은 지나감)
    tile === TILE_ENEMYBASE || // 적 스폰 위치
    tile === TILE_USERBASE  || // 아군 진영
    false
  );
}

function findPath(startX, startY, goalX, goalY) {
  const rows = mapData.length;
  const cols = mapData[0].length;

  const queue = [];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const prev = Array.from({ length: rows }, () => Array(cols).fill(null));

  queue.push({ x: startX, y: startY });
  visited[startY][startX] = true;

  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  while (queue.length > 0) {
    const { x, y } = queue.shift();

    if (x === goalX && y === goalY) {
      break; // 도착
    }

    for (const { dx, dy } of dirs) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (visited[ny][nx]) continue;
      if (!isWalkable(nx, ny)) continue;

      visited[ny][nx] = true;
      prev[ny][nx] = { x, y }; // 어디서 왔는지 기록
      queue.push({ x: nx, y: ny });
    }
  }

  // 도착점까지 경로가 없는 경우
  if (!visited[goalY][goalX]) {
    console.warn('목적지까지 경로를 찾을 수 없습니다.');
    return [];
  }

  // prev를 이용해 뒤에서부터 역추적해서 경로 만들기
  const path = [];
  let cx = goalX;
  let cy = goalY;

  while (!(cx === startX && cy === startY)) {
    path.push({ x: cx, y: cy });
    const p = prev[cy][cx];
    cx = p.x;
    cy = p.y;
  }
  path.push({ x: startX, y: startY });

  path.reverse(); // 시작→끝 순서로 뒤집기
  return path;    // [{x,y}, {x,y}, ...]
}

// =========================
// 타일 선택 패널 시스템
// =========================

// 현재 선택된 타일 타입
let selectedTileType = TILE_EMPTY;

// 타일 패널 요소 (나중에 초기화)
let tilePanel;
let tileOptions;

// 타일 타입 정보 (이름과 색상)
const tileInfo = [
  { type: TILE_EMPTY, name: '빈 땅', color: '#2b2b2b' },
  { type: TILE_ROAD, name: '길', color: '#8b5a2b' },
  { type: TILE_UNROAD, name: '배치 불가 길', color: '#37200bff' },
  { type: TILE_BLOCK, name: '벽', color: '#444444' },
  { type: TILE_DEPLOY, name: '배치 가능', color: '#1e90ff' },
  { type: TILE_ENEMYBASE, name: '적 지역', color: '#ff1e1eff' },
  { type: TILE_USERBASE, name: '아군 지역', color: '#1eff47ff' },
  { type: TILE_DROP, name: '낙하 지역', color: '#ffffffff' },
];

// 타일 선택 패널 초기화
function initTilePanel() {
  tilePanel = document.getElementById('tilePanel');
  tileOptions = document.getElementById('tileOptions');
  const panelTitle = document.getElementById('panelTitle');
  const enemyOptions = document.getElementById('enemyOptions');
  
  if (!tilePanel || !tileOptions) {
    console.error('타일 패널 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 패널 제목 클릭 시 모드 전환
  if (panelTitle) {
    panelTitle.addEventListener('click', () => {
      if (panelMode === 'tile') {
        panelMode = 'enemy';
        panelTitle.textContent = '적 스폰 선택';
        tileOptions.style.display = 'none';
        enemyOptions.style.display = 'block';
        initEnemyOptions();
      } else {
        panelMode = 'tile';
        panelTitle.textContent = '타일 선택';
        tileOptions.style.display = 'block';
        enemyOptions.style.display = 'none';
      }
    });
  }
  
  // 타일 옵션 생성
  tileInfo.forEach(info => {
    const option = document.createElement('div');
    option.className = 'tile-option';
    option.dataset.tileType = info.type;
    
    const preview = document.createElement('div');
    preview.className = 'tile-preview';
    preview.style.backgroundColor = info.color;
    
    const name = document.createElement('span');
    name.className = 'tile-name';
    name.textContent = info.name;
    
    option.appendChild(preview);
    option.appendChild(name);
    
    option.addEventListener('click', () => {
      selectedTileType = info.type;
      updateTilePanelSelection();
    });
    
    tileOptions.appendChild(option);
  });
  
  // 기본 선택
  selectedTileType = TILE_EMPTY;
  updateTilePanelSelection();
}

// 적 선택 옵션 초기화
function initEnemyOptions() {
  const enemyOptions = document.getElementById('enemyOptions');
  if (!enemyOptions) return;
  
  // 기존 옵션 제거
  enemyOptions.innerHTML = '';
  
  const enData = window.enemyData || [];
  enData.forEach(enemy => {
    const option = document.createElement('div');
    option.className = 'tile-option';
    option.dataset.enemyId = enemy.id;
    
    const preview = document.createElement('div');
    preview.className = 'tile-preview';
    preview.style.backgroundColor = enemy.color;
    
    const name = document.createElement('span');
    name.className = 'tile-name';
    name.textContent = enemy.name || `적 ${enemy.id}`;
    
    option.appendChild(preview);
    option.appendChild(name);
    
    option.addEventListener('click', () => {
      selectedEnemyId = enemy.id;
      updateEnemyPanelSelection();
    });
    
    enemyOptions.appendChild(option);
  });
  
  // 기본 선택
  selectedEnemyId = 0;
  updateEnemyPanelSelection();
}

// 적 패널 선택 상태 업데이트
function updateEnemyPanelSelection() {
  const enemyOptions = document.getElementById('enemyOptions');
  if (!enemyOptions) return;
  
  const options = enemyOptions.querySelectorAll('.tile-option');
  options.forEach(option => {
    if (parseInt(option.dataset.enemyId) === selectedEnemyId) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// 타일 패널 선택 상태 업데이트
function updateTilePanelSelection() {
  if (!tileOptions) return;
  
  const options = tileOptions.querySelectorAll('.tile-option');
  options.forEach(option => {
    if (parseInt(option.dataset.tileType) === selectedTileType) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// 타일 패널이 열려있는지 확인하는 변수
let isTilePanelOpen = false;

// 패널 모드 (타일 선택 / 적 스폰 선택)
let panelMode = 'tile'; // 'tile' or 'enemy'

// 적 스폰 정보 저장 (타일 좌표 -> 적 ID)
const enemySpawnData = new Map(); // key: "x,y", value: enemyId

// 현재 선택된 적 ID
let selectedEnemyId = 0;


// 우클릭으로 타일 패널 표시/숨김
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (tilePanel) {
    const isVisible = tilePanel.classList.contains('visible');
    if (isVisible) {
      tilePanel.classList.remove('visible');
      isTilePanelOpen = false;
    } else {
      tilePanel.classList.add('visible');
      isTilePanelOpen = true;
    }
  }
});

// 맵 데이터를 원래 형식으로 포맷팅하는 함수
function formatMapData(mapData) {
  let result = '[\n';
  for (let y = 0; y < mapData.length; y++) {
    const row = mapData[y];
    result += '    [';
    for (let x = 0; x < row.length; x++) {
      result += row[x];
      if (x < row.length - 1) {
        result += ',';
      }
    }
    result += ']';
    if (y < mapData.length - 1) {
      result += ',';
    }
    result += '\n';
  }
  result += ']';
  return result;
}

// 맵 저장 함수
function saveMap() {
  const fileNameInput = document.getElementById('mapFileName');
  if (!fileNameInput) {
    console.error('맵 파일명 입력 요소를 찾을 수 없습니다.');
    return;
  }
  
  const fileName = fileNameInput.value || 'stage1';
  const mapDataString = formatMapData(mapData);
  
  // 적 스폰 데이터를 배열로 변환
  const enemySpawnArray = [];
  enemySpawnData.forEach((enemyId, key) => {
    const [x, y] = key.split(',').map(Number);
    enemySpawnArray.push({ x, y, enemyId });
  });
  const enemySpawnString = JSON.stringify(enemySpawnArray, null, 2);
  
  // 맵 데이터를 export할 수 있는 형태로 변환
  const mapExport = `// ${fileName}.js
// 맵 데이터 파일

window.${fileName}MapData = ${mapDataString};

window.${fileName}MapInfo = {
  rows: ${rows},
  cols: ${cols},
  tileSize: ${tileSize}
};

window.${fileName}EnemySpawns = ${enemySpawnString};`;
  
  // Blob을 사용하여 파일 다운로드
  const blob = new Blob([mapExport], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.js`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('맵이 저장되었습니다:', fileName);
}

// =========================
// 아군 드래그 앤 드롭 시스템
// =========================

let draggedOperator = null;
let dragOffset = { x: 0, y: 0 };
let placingOperator = null; // 배치 중인 아군 (충돌 판정 없음)
let placingDirection = 0; // 배치 방향
let isSettingDirection = false; // 방향 설정 중인지
let isDraggingDirection = false; // 방향 설정 중 드래그 중인지
let currentMouseX = 0; // 현재 마우스 X 좌표
let currentMouseY = 0; // 현재 마우스 Y 좌표
let isDraggingOperator = false; // 유닛을 드래그 중인지 (마우스를 놓기 전까지)

// 유닛 아이템 요소 저장 (배치/퇴각 시 표시/숨김용)
const operatorItems = new Map();

// 아군 패널 초기화
function initOperatorPanel() {
  const operatorList = document.getElementById('operatorList');
  if (!operatorList) return;
  
  // 1행 그리드 레이아웃 설정 (가로로 나열)
  operatorList.style.display = 'grid';
  operatorList.style.gridTemplateColumns = 'repeat(auto-fit, minmax(64px, 1fr))'; // 가로로 나열
  operatorList.style.gridTemplateRows = '1fr'; // 1행
  operatorList.style.gap = '4px';
  operatorList.style.padding = '8px';
  operatorList.style.flexDirection = 'row';
  operatorList.style.overflowX = 'auto'; // 가로 스크롤 가능
  
  // operatorData를 사용하여 유닛 생성
  const opData = window.operatorData || [];
  opData.forEach((data, index) => {
    const operatorItem = document.createElement('div');
    operatorItem.className = 'operator-item';
    operatorItem.draggable = true;
    operatorItem.dataset.operatorId = data.id;
    operatorItem.style.position = 'relative';
    operatorItem.style.width = '100%';
    operatorItem.style.height = '64px'; // 사각형 높이 고정
    operatorItem.style.display = 'flex';
    operatorItem.style.alignItems = 'center';
    operatorItem.style.justifyContent = 'flex-start';
    operatorItem.style.cursor = 'grab';
    operatorItem.style.background = '#2b2b2b'; // 어두운 배경
    operatorItem.style.border = `2px solid ${data.borderColor}`;
    operatorItem.style.borderRadius = '4px';
    operatorItem.style.overflow = 'hidden';
    
    // 유닛 이미지 아이콘 (왼쪽)
    const unitIcon = document.createElement('img');
    // 각 유닛의 일반 PNG 경로 설정
    const unitImagePaths = {
      0: 'png/unit/id0/Aya.PNG',
      1: 'png/unit/id1/Flandre.PNG',
      2: 'png/unit/id2/Yukari.PNG',
      3: 'png/unit/id3/Mokou.PNG',
      4: 'png/unit/id4/Tenshi.PNG',
      5: 'png/unit/id5/Alice.PNG',
      6: 'png/unit/id6/Youmu.PNG',
      7: 'png/unit/id7/Momiji.PNG',
      8: 'png/unit/id8/Inaba.PNG',
      9: 'png/unit/id9/Cirno.PNG',
      10: 'png/unit/id10/Marisa.PNG',
      11: 'png/unit/id11/Remilia.PNG',
      12: 'png/unit/id12/Kaguya.PNG',
      13: 'png/unit/id13/Reimu.PNG',
      14: 'png/unit/id14/Ran.PNG',
      15: 'png/unit/id15/Sanae.PNG',
      16: 'png/unit/id16/Chen.PNG'
    };
    unitIcon.src = unitImagePaths[data.id] || '';
    unitIcon.style.width = '56px';
    unitIcon.style.height = '56px';
    unitIcon.style.minWidth = '56px';
    unitIcon.style.minHeight = '56px';
    unitIcon.style.objectFit = 'cover';
    unitIcon.style.borderRadius = '4px';
    unitIcon.style.border = `2px solid ${data.borderColor}`;
    unitIcon.style.margin = '4px';
    operatorItem.appendChild(unitIcon);
    
    // 클래스 이미지 경로 결정
    const getClassImage = (operatorId) => {
      if (operatorId >= 0 && operatorId <= 2) return 'png/unit/class/vanguard.png';
      if (operatorId === 16) return 'png/unit/class/vanguard.png';
      if (operatorId >= 3 && operatorId <= 4) return 'png/unit/class/defender.png';
      if (operatorId >= 5 && operatorId <= 7) return 'png/unit/class/guard.png';
      if (operatorId >= 8 && operatorId <= 10) return 'png/unit/class/sniper.png';
      if (operatorId >= 11 && operatorId <= 13) return 'png/unit/class/caster.png';
      if (operatorId >= 14 && operatorId <= 15) return 'png/unit/class/medic.png';
      return '';
    };
    
    // 코스트 표시 (클래스 이미지 | 코스트) - 작은 사각형 형태
    const costLabel = document.createElement('div');
    costLabel.style.position = 'absolute';
    costLabel.style.top = '4px';
    costLabel.style.right = '4px';
    costLabel.style.display = 'flex';
    costLabel.style.alignItems = 'center';
    costLabel.style.gap = '4px';
    costLabel.style.background = 'rgba(0, 0, 0, 0.8)';
    costLabel.style.padding = '2px 6px';
    costLabel.style.borderRadius = '4px';
    costLabel.style.fontSize = '14px';
    costLabel.style.fontWeight = 'bold';
    costLabel.style.zIndex = '10';
    costLabel.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    
    // 클래스 이미지
    const classImage = document.createElement('img');
    classImage.src = getClassImage(data.id);
    classImage.style.width = '16px';
    classImage.style.height = '16px';
    classImage.style.objectFit = 'contain';
    costLabel.appendChild(classImage);
    
    // 코스트 텍스트
    const costText = document.createElement('span');
    costText.style.color = '#ffffff';
    costText.textContent = data.cost || 0;
    costLabel.appendChild(costText);
    
    operatorItem.appendChild(costLabel);
    
    operatorItem.addEventListener('dragstart', (e) => {
      // 코스트 체크
      const requiredCost = data.cost || 0;
      if (currentCost < requiredCost || currentDeployCount >= maxDeployCount) {
        e.preventDefault();
        return;
      }
      draggedOperator = { id: data.id, data: data };
      isDraggingOperator = true; // 드래그 시작
      e.dataTransfer.effectAllowed = 'move';
      updateGameTimeScale(); // 게임 속도 업데이트
    });
    
    operatorItem.addEventListener('dragend', (e) => {
      // 드래그가 끝났지만 drop이 발생하지 않았을 수도 있음
      // drop 이벤트에서도 처리하지만 안전을 위해 여기서도 처리
      // placingOperator가 있으면 드래그 상태 유지 (배치 중이므로)
      if (!placingOperator) {
        isDraggingOperator = false;
        updateGameTimeScale(); // 게임 속도 업데이트
      }
    });
    
    operatorList.appendChild(operatorItem);
    operatorItems.set(data.id, operatorItem);
    
    // id:16 유닛은 초기에 숨김 (id:2가 배치되면 표시)
    if (data.id === 16) {
      operatorItem.style.display = 'none';
    }
  });
}

// 유닛 아이템 숨기기
function hideOperatorItem(operatorId) {
  const item = operatorItems.get(operatorId);
  if (item) {
    item.style.display = 'none';
  }
}

// 유닛 아이템 표시하기
function showOperatorItem(operatorId) {
  const item = operatorItems.get(operatorId);
  if (item) {
    item.style.display = 'block';
  }
}

// 캔버스 드래그 오버 이벤트
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // 방향 설정 중이면 무시
  if (isSettingDirection) return;
  
  if (!draggedOperator && !placingOperator) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  const tileX = Math.floor(mouseX / tileSize);
  const tileY = Math.floor(mouseY / tileSize);
  
  // 배치 가능한지 확인
  if (canDeployOperator(tileX, tileY, draggedOperator ? draggedOperator.id : null)) {
    // 타일 중앙에 고정
    if (!placingOperator && draggedOperator) {
      placingOperator = new Operator(tileX, tileY, draggedOperator.id);
      placingOperator.isPlacing = true;
      placingOperator.deployed = false;
      operators.push(placingOperator);
      // 유닛 아이템 숨기기
      hideOperatorItem(draggedOperator.id);
    } else if (placingOperator) {
      // 다른 배치 가능한 타일로 이동
      placingOperator.tileX = tileX;
      placingOperator.tileY = tileY;
      placingOperator.x = tileX * tileSize + tileSize / 2;
      // TILE_DEPLOY 타일에 배치될 경우 위쪽 3/4 지역의 중앙에 배치
      const tile = mapData[tileY]?.[tileX] ?? TILE_EMPTY;
      if (tile === TILE_DEPLOY) {
        placingOperator.y = tileY * tileSize + tileSize * 3 / 8 - 20; // 위쪽 3/4 지역의 중앙 (타일 상단 + tileSize * 3/8)
      } else {
      placingOperator.y = tileY * tileSize + tileSize / 2;
      }
    }
  } else if (placingOperator && !isSettingDirection) {
    // 배치 불가능한 타일로 이동하면 마우스 따라옴
    placingOperator.x = mouseX;
    placingOperator.y = mouseY;
    // 타일 좌표도 업데이트 (draw에서 올바른 체크를 위해)
    placingOperator.tileX = tileX;
    placingOperator.tileY = tileY;
  }
});

// 캔버스 드롭 이벤트
canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  
  // 방향 설정 중이면 무시 (마우스 클릭으로 처리)
  if (isSettingDirection) return;
  
  if (!draggedOperator && !placingOperator) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  const tileX = Math.floor(mouseX / tileSize);
  const tileY = Math.floor(mouseY / tileSize);
  
  // 드래그 시작한 경우
  if (draggedOperator) {
    // 배치 가능한지 확인
    if (canDeployOperator(tileX, tileY, draggedOperator.id)) {
      if (!placingOperator) {
        placingOperator = new Operator(tileX, tileY, draggedOperator.id);
        placingOperator.isPlacing = true;
        placingOperator.deployed = false;
        operators.push(placingOperator);
        // 유닛 아이템 숨기기
        hideOperatorItem(draggedOperator.id);
      }
      
      // 타일 중앙에 고정
      placingOperator.tileX = tileX;
      placingOperator.tileY = tileY;
      placingOperator.x = tileX * tileSize + tileSize / 2;
      // TILE_DEPLOY 타일에 배치될 경우 위쪽 3/4 지역의 중앙에 배치
      const tile = mapData[tileY]?.[tileX] ?? TILE_EMPTY;
      if (tile === TILE_DEPLOY) {
        placingOperator.y = tileY * tileSize + tileSize * 3 / 8; // 위쪽 3/4 지역의 중앙 (타일 상단 + tileSize * 3/8)
      } else {
      placingOperator.y = tileY * tileSize + tileSize / 2;
      }
      
      // 배치 중 상태 유지 (방향 설정은 나중에 클릭으로)
      // placingOperator는 그대로 유지, isPlacing도 true 유지
    } else {
      // 배치 불가 타일에서 드롭하면 placingOperator 제거
      if (placingOperator) {
        const operatorId = placingOperator.operatorId;
        const index = operators.indexOf(placingOperator);
        if (index > -1) {
          operators.splice(index, 1);
        }
        if (operatorId !== undefined) {
          showOperatorItem(operatorId);
        }
        placingOperator = null;
      }
    }
    
    draggedOperator = null;
    isDraggingOperator = false; // 드래그 종료
    updateGameTimeScale(); // 게임 속도 업데이트
  }
});

// 캔버스 밖으로 나갈 때 배치 상태 정리
canvas.addEventListener('dragleave', () => {
  if (placingOperator && !isSettingDirection) {
    const operatorId = placingOperator.operatorId;
    const index = operators.indexOf(placingOperator);
    if (index > -1) operators.splice(index, 1);
    if (operatorId !== undefined) {
      showOperatorItem(operatorId);
    }
    placingOperator = null;
    // isDraggingOperator는 유지 (여전히 드래그 중이므로)
    // draggedOperator도 유지 (dragend에서 처리)
    // updateGameTimeScale()은 매 프레임 update()에서 호출되므로 여기서는 호출하지 않아도 됨
  }
  // draggedOperator와 isDraggingOperator는 유지 (dragend에서 처리)
});

// 마우스 이동 이벤트 (방향 설정용 - 4방향으로 제한)
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  currentMouseX = (e.clientX - rect.left) * scaleX;
  currentMouseY = (e.clientY - rect.top) * scaleY;
  
  // 방향 설정 중 드래그 중일 때만 방향 업데이트
  if (placingOperator && isSettingDirection && isDraggingDirection) {
    const dx = currentMouseX - placingOperator.x;
    const dy = currentMouseY - placingOperator.y;
  
  // 4방향으로 제한 (상하좌우)
  if (Math.abs(dx) > Math.abs(dy)) {
    // 좌우
    placingDirection = dx > 0 ? 0 : Math.PI; // 우: 0, 좌: π
  } else {
    // 상하
    placingDirection = dy > 0 ? Math.PI / 2 : -Math.PI / 2; // 하: π/2, 상: -π/2
  }
  
  // placingOperator의 direction도 업데이트
  placingOperator.direction = placingDirection;
  }
});

// 마우스 다운 이벤트 (방향 설정 시작 - 마름모 안 클릭)
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  // 먼저 퇴각 아이콘 클릭 체크 (방향 설정 전에 우선 처리)
  for (const operator of operators) {
    if (!operator.showRetreatIcon) continue;
    
    const dx = mouseX - operator.retreatIconX;
    const dy = mouseY - operator.retreatIconY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 퇴각 아이콘을 클릭했다면 방향 설정 모드로 진입하지 않음
    if (distance <= 18) { // 퇴각 아이콘 크기의 절반 (36/2)
      return; // 퇴각 아이콘 클릭은 click 이벤트에서 처리
    }
  }
  
  // 방향 설정 중일 때 큰 마름모 안 클릭 체크 (드래그 시작)
  if (isSettingDirection && placingOperator) {
    const diamondSize = tileSize * 2;
    const dx = mouseX - placingOperator.x;
    const dy = mouseY - placingOperator.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 큰 마름모 안을 클릭하면 드래그 시작
    if (distance <= diamondSize) {
      isDraggingDirection = true;
      return;
    }
  }
  
  if (isSettingDirection) return; // 이미 방향 설정 중이면 무시
  
  // 배치 중인 유닛의 마름모 안 클릭 체크 (방향 설정 모드로 진입)
  for (const operator of operators) {
    if (!operator.isPlacing) continue; // 배치 중인 유닛만
    
    const diamondSize = tileSize * 2;
    const dx = mouseX - operator.x;
    const dy = mouseY - operator.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 마름모 안을 클릭하면 방향 설정 모드 시작 및 드래그 시작
    if (distance <= diamondSize) {
      placingOperator = operator;
      isSettingDirection = true;
      isDraggingDirection = true;
      placingDirection = operator.direction;
      return;
    }
  }
});

// 게임 재시작 함수
function restartGame() {
  const stageNumber = getStageNumber();
  
  // 모든 배열 초기화
  operators.length = 0;
  enemies.length = 0;
  projectiles.length = 0;
  skillZones.length = 0;
  hitEffects.length = 0;
  healEffects.length = 0;
  damageEffects.length = 0;
  
  // 스폰 시퀀스 초기화
  spawnSequenceIndex = 0;
  spawnSequenceTimer = 0;
  spawnSequenceActive = false;
  
  // 게임 상태 초기화
  currentDeployCount = 0;
  isPaused = false;
  pauseBlinkTimer = 0;
  gameTimeScale = 1.0;
  isDraggingOperator = false;
    placingOperator = null;
  draggedOperator = null;
    isSettingDirection = false;
  isDraggingDirection = false;
  placingDirection = 0;
  
  // 맵 데이터 다시 로드
  loadMapData(stageNumber);
  
  // cols와 rows 업데이트
  cols = mapCols;
  rows = mapRows;
  
  // 게임 상태를 ready로 설정 (게임 시작 버튼 표시)
  gameState = 'ready';
  
  // 유닛 창 다시 표시
  const operatorPanel = document.getElementById('operatorPanel');
  if (operatorPanel) {
    operatorPanel.style.display = 'block';
  }
  
  // 모든 유닛 아이템 다시 표시
  operatorItems.forEach((item, operatorId) => {
    if (operatorId !== 16) { // id:16은 id:2가 배치되면 표시
      item.style.display = 'block';
    } else {
      item.style.display = 'none'; // id:16은 초기에 숨김
    }
  });
  
  console.log('게임 재시작');
}

// 마우스 클릭 이벤트 (방향 설정 완료)
canvas.addEventListener('click', (e) => {
  // ready 상태일 때 게임 시작 버튼 클릭 체크
  if (gameState === 'ready') {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const buttonWidth = 300;
    const buttonHeight = 80;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 - buttonHeight / 2;
    
    // 버튼 영역 클릭 체크
    if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
        mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
      gameState = 'playing';
    return;
    }
  }
  
  // retry 상태일 때 클릭하면 게임 재시작
  if (gameState === 'retry') {
    restartGame();
    return;
  }
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;
  
  // 방향 설정 중 드래그 종료 처리
  if (isSettingDirection && placingOperator && isDraggingDirection) {
    // 유닛이 있는 타일인지 확인
    const mouseTileX = Math.floor(mouseX / tileSize);
    const mouseTileY = Math.floor(mouseY / tileSize);
    const unitTileX = placingOperator.tileX;
    const unitTileY = placingOperator.tileY;
    
    // 드래그 종료
    isDraggingDirection = false;
    
    // 마우스를 뗀 위치가 유닛이 있는 타일이면 방향 설정 취소
    if (mouseTileX === unitTileX && mouseTileY === unitTileY) {
      isSettingDirection = false;
      placingOperator.showRetreatIcon = false;
      placingOperator = null;
      return;
    }
    
    // 방향 확정 및 배치 완료
    placingOperator.direction = placingDirection;
    
    // 코스트 차감 및 배치 인원 체크
    const operatorData = window.operatorData || [];
    const opData = operatorData.find(op => op.id === placingOperator.operatorId);
    const requiredCost = opData ? (opData.cost || 0) : 0;
    
    if (currentCost >= requiredCost && currentDeployCount < maxDeployCount) {
      currentCost -= requiredCost;
      // naturalRegenCost도 비례적으로 감소 (자연 회복 부분만 유지)
      if (naturalRegenCost > currentCost) {
        naturalRegenCost = currentCost; // naturalRegenCost가 currentCost를 초과하지 않도록
      }
      currentDeployCount++;
    placingOperator.deployed = true;
    placingOperator.isPlacing = false;
      placingOperator.showRetreatIcon = false; // 퇴각 아이콘 숨김
      
      // id:2가 배치되면 id:16 유닛 표시
      if (placingOperator.operatorId === 2) {
        showOperatorItem(16);
      }
      
    placingOperator = null;
    isSettingDirection = false;
    } else {
      // 코스트 부족 또는 배치 인원 초과 시 배치 취소
      const operatorId = placingOperator.operatorId;
      const index = operators.indexOf(placingOperator);
      if (index > -1) {
        operators.splice(index, 1);
      }
      if (operatorId !== undefined) {
        showOperatorItem(operatorId);
      }
      placingOperator = null;
      isSettingDirection = false;
    }
    return;
  }
  
  // 방향 설정 중일 때 클릭 처리 (드래그 없이 클릭만)
  if (isSettingDirection && placingOperator && !isDraggingDirection) {
    // 유닛이 있는 타일인지 확인
    const mouseTileX = Math.floor(mouseX / tileSize);
    const mouseTileY = Math.floor(mouseY / tileSize);
    const unitTileX = placingOperator.tileX;
    const unitTileY = placingOperator.tileY;
    
    // 마우스를 뗀 위치가 유닛이 있는 타일이면 방향 설정 취소
    if (mouseTileX === unitTileX && mouseTileY === unitTileY) {
      isSettingDirection = false;
      placingOperator.showRetreatIcon = false;
      placingOperator = null;
      return;
    }
    
    // 방향 확정 및 배치 완료
    placingOperator.direction = placingDirection;
    
    // 코스트 차감 및 배치 인원 체크
    const operatorData = window.operatorData || [];
    const opData = operatorData.find(op => op.id === placingOperator.operatorId);
    const requiredCost = opData ? (opData.cost || 0) : 0;
    
    if (currentCost >= requiredCost && currentDeployCount < maxDeployCount) {
      currentCost -= requiredCost;
      // naturalRegenCost도 비례적으로 감소 (자연 회복 부분만 유지)
      if (naturalRegenCost > currentCost) {
        naturalRegenCost = currentCost; // naturalRegenCost가 currentCost를 초과하지 않도록
      }
      currentDeployCount++;
      placingOperator.deployed = true;
      placingOperator.isPlacing = false;
      placingOperator.showRetreatIcon = false; // 퇴각 아이콘 숨김
      
      // id:2가 배치되면 id:16 유닛 표시
      if (placingOperator.operatorId === 2) {
        showOperatorItem(16);
      }
      
      placingOperator = null;
      isSettingDirection = false;
      updateGameTimeScale(); // 게임 속도 업데이트
    } else {
      // 코스트 부족 또는 배치 인원 초과 시 배치 취소
      const operatorId = placingOperator.operatorId;
      const index = operators.indexOf(placingOperator);
      if (index > -1) {
        operators.splice(index, 1);
      }
      if (operatorId !== undefined) {
        showOperatorItem(operatorId);
      }
      placingOperator = null;
      isSettingDirection = false;
      updateGameTimeScale(); // 게임 속도 업데이트
    }
    return;
  }
  
  // 먼저 스킬 아이콘 클릭 체크
  for (const operator of operators) {
    if (operator.isPlacing || !operator.showSkillIcon) continue;
    
    const dx = mouseX - operator.skillIconX;
    const dy = mouseY - operator.skillIconY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= 24) { // 스킬 아이콘 크기의 절반 (48/2)
      // 스킬 사용
      if (operator.useSkill()) {
        // 모든 유닛의 스킬 아이콘 숨김
        operators.forEach(op => {
          op.showSkillIcon = false;
          op.showRetreatIcon = false;
        });
      }
      return;
    }
  }
  
  // 퇴각 아이콘 클릭 체크 (배치 중인 유닛도 포함)
  for (const operator of operators) {
    if (!operator.showRetreatIcon) continue;
    
    const dx = mouseX - operator.retreatIconX;
    const dy = mouseY - operator.retreatIconY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= 18) { // 퇴각 아이콘 크기의 절반 (36/2)
      // 퇴각 처리
      const operatorId = operator.operatorId;
      const index = operators.indexOf(operator);
      if (index > -1) {
        operators.splice(index, 1);
      }
      
      // 코스트 회복 및 배치 인원 감소
      if (operator.deployed) {
        const operatorData = window.operatorData || [];
        const opData = operatorData.find(op => op.id === operatorId);
        const refundCost = opData ? (opData.cost || 0) : 0;
        currentCost = Math.min(maxCost, currentCost + refundCost);
        currentDeployCount = Math.max(0, currentDeployCount - 1);
      }
      
      // 유닛 아이템 다시 표시
      if (operatorId !== undefined) {
        showOperatorItem(operatorId);
      }
      
      // placingOperator가 퇴각된 유닛이면 초기화
      if (placingOperator === operator) {
        placingOperator = null;
        isSettingDirection = false;
      }
      
      // 아이콘 숨김
      operators.forEach(op => {
        op.showSkillIcon = false;
        op.showRetreatIcon = false;
      });
      updateGameTimeScale(); // 게임 속도 업데이트
      
      return;
    }
  }
  
  // 아군 클릭 체크
  let clickedOperator = false;
  for (const operator of operators) {
    if (operator.isPlacing) continue; // 배치 중인 아군은 제외
    
    const dx = mouseX - operator.x;
    const dy = mouseY - operator.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= operator.radius) {
      // 모든 유닛의 아이콘 및 공격 범위 숨김
      operators.forEach(op => {
        op.showSkillIcon = false;
        op.showRetreatIcon = false;
        op.showAttackRange = false;
      });
      
      // 클릭한 유닛의 공격 범위 표시
      operator.showAttackRange = true;
      
      // 스킬 게이지가 가득 찬 유닛 0, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15인 경우 스킬 아이콘 표시
      if ((operator.operatorId === 0 || operator.operatorId === 2 || operator.operatorId === 3 || operator.operatorId === 6 || operator.operatorId === 7 || operator.operatorId === 8 || operator.operatorId === 9 || operator.operatorId === 10 || operator.operatorId === 13 || operator.operatorId === 14 || operator.operatorId === 15) && 
          operator.skillGauge >= operator.skillGaugeMax && !operator.skillActive) {
        // 한 타일 정도 오른쪽 대각선 아래에 스킬 아이콘 표시 (원래 위치)
        const iconOffsetX = tileSize * 0.7;
        const iconOffsetY = tileSize * 0.7;
        operator.skillIconX = operator.x + iconOffsetX;
        operator.skillIconY = operator.y + iconOffsetY;
        operator.showSkillIcon = true;
      }
      
      // id 1인 아군: 스킬 사용 가능 횟수 표시 위치 설정
      if (operator.operatorId === 1 && operator.deployed && !operator.isPlacing) {
        const iconOffsetX = tileSize * 0.7;
        const iconOffsetY = tileSize * 0.7;
        operator.skillIconX = operator.x + iconOffsetX;
        operator.skillIconY = operator.y + iconOffsetY;
      }
      
      // 퇴각 아이콘 표시 (항상 맨 위에)
      const retreatIconOffsetX = -tileSize * 0.7;
      const retreatIconOffsetY = -operator.radius - 18; // 항상 맨 위에 (아이콘 크기 고려)
      operator.retreatIconX = operator.x + retreatIconOffsetX;
      operator.retreatIconY = operator.y + retreatIconOffsetY;
      operator.showRetreatIcon = true;
      updateGameTimeScale(); // 게임 속도 업데이트
      
      clickedOperator = true;
      return;
    }
  }
  
  // 아군을 클릭하지 않았으면 모든 아이콘 및 공격 범위 숨김
  if (!clickedOperator && !isSettingDirection) {
    operators.forEach(op => {
      op.showSkillIcon = false;
      op.showRetreatIcon = false;
      op.showAttackRange = false;
    });
  }
  
  // 타일 패널이 열려있을 때만 처리
  if (!isTilePanelOpen) return;
  
  // 어떤 타일 위인지 계산
  const tileX = Math.floor(mouseX / tileSize);
  const tileY = Math.floor(mouseY / tileSize);

  // 범위 밖이면 무시
  if (tileX < 0 || tileX >= cols || tileY < 0 || tileY >= rows) return;

  // 적 스폰 모드인 경우
  if (panelMode === 'enemy') {
    const tile = mapData[tileY]?.[tileX];
    if (tile === TILE_ENEMYBASE) {
      // 적 지역에 적 스폰 정보 저장
      const key = `${tileX},${tileY}`;
      enemySpawnData.set(key, selectedEnemyId);
      console.log(`적 지역 (${tileX}, ${tileY})에 적 ID ${selectedEnemyId} 설정`);
    }
  } else {
    // 타일 선택 모드인 경우
    mapData[tileY][tileX] = selectedTileType;
    
    // 적 지역이 아닌 타일로 변경하면 적 스폰 정보 제거
    if (mapData[tileY][tileX] !== TILE_ENEMYBASE) {
      const key = `${tileX},${tileY}`;
      enemySpawnData.delete(key);
    }
  }
});


// 퇴각 패널 관련 코드 제거됨 (아이콘으로 대체)

// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  // 스테이지 번호 가져오기
  const stageNumber = getStageNumber();
  
  // 맵 데이터 로드
  loadMapData(stageNumber);
  
  // cols와 rows 업데이트
  cols = mapCols;
  rows = mapRows;
  
  // 타일 패널 초기화
  initTilePanel();
  
  // 아군 패널 초기화
  initOperatorPanel();
  
  // 저장 버튼 이벤트
  const saveButton = document.getElementById('saveButton');
  if (saveButton) {
    saveButton.addEventListener('click', saveMap);
  } else {
    console.error('저장 버튼을 찾을 수 없습니다.');
  }
  
  // 일시 정지 버튼 이벤트
  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      isPaused = !isPaused;
      pauseButton.textContent = isPaused ? '▶' : '⏸';
      pauseButton.title = isPaused ? '재개' : '일시 정지';
    });
  }
});

// =========================
// 2. 타일맵 그리기 함수
// =========================
function drawMap(ctx) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = mapData[y]?.[x] ?? TILE_EMPTY;
      const color = tileColors[tile] || '#ff00ff'; // 정의 안 된 값은 보라색으로 경고

      const px = x * tileSize;
      const py = y * tileSize;

      // 타일 채우기
      ctx.fillStyle = color;
      ctx.fillRect(px, py, tileSize, tileSize);

      // TILE_DEPLOY 타일의 경우 아래쪽 1/4 부분에 가로로 까만 선 그리기 (언덕 느낌)
      if (tile === TILE_DEPLOY) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        const lineY = py + tileSize * 0.75; // 아래쪽 1/4 지점
        ctx.beginPath();
        ctx.moveTo(px, lineY);
        ctx.lineTo(px + tileSize, lineY);
        ctx.stroke();
      }

      // 보기 쉽게 격자선
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1; // lineWidth를 명시적으로 설정하여 이전 값이 영향을 주지 않도록 함
      ctx.strokeRect(px, py, tileSize, tileSize);
    }
  }
}
// =========================
// 3. 아군 시스템
// =========================

// 배치된 아군 배열
const operators = [];

// 공격 투사체 클래스
class Projectile {
  constructor(startX, startY, targetEnemy, damage = 1, damageType = 'physical', isSkillAttack = false, attackerId = null) {
    this.x = startX;
    this.y = startY;
    this.targetEnemy = targetEnemy; // 추적할 적 객체
    this.radius = 8;
    this.speed = 1000; // 픽셀/초 (매우 빠른 속도로 변경)
    this.active = true;
    this.damage = damage; // 데미지 저장
    this.damageType = damageType; // 'physical' 또는 'magic'
    this.isSkillAttack = isSkillAttack; // 스킬로 인한 공격인지 여부
    this.attackerId = attackerId; // 공격자 ID
  }
  
  update(dt) {
    if (!this.active) return;
    
    // 적이 비활성화되었거나 존재하지 않으면 탄도 사라짐
    if (!this.targetEnemy || !this.targetEnemy.active) {
      this.active = false;
      return;
    }
    
    // 적의 현재 위치를 따라가도록 방향 계산
    const dx = this.targetEnemy.x - this.x;
    const dy = this.targetEnemy.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 적과의 거리가 매우 가까우면 이미 충돌한 것으로 간주 (충돌 체크에서 처리됨)
    if (distance < 0.1) {
      return;
    }
    
    // 적을 향해 이동
    const vx = (dx / distance) * this.speed;
    const vy = (dy / distance) * this.speed;
    this.x += vx * dt;
    this.y += vy * dt;
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    ctx.fillStyle = '#ffff00'; // 노란색
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// 공격 투사체 배열
const projectiles = [];

// id:13 스킬 장판 클래스
class SkillZone {
  constructor(centerX, centerY, attacker) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.attacker = attacker; // id:13 유닛 참조
    this.damageTimer = 0; // 대미지 주기 타이머 (1초)
    this.damageInterval = 1.0; // 1초마다 대미지
    this.active = true;
    // 공격 범위 타일들 계산
    this.attackTiles = this.calculateAttackTiles();
    // 마름모 애니메이션 관련
    this.diamondTimer = 0; // 마름모 애니메이션 타이머
    this.diamondRotation = 0; // 마름모 회전 각도 (라디안)
    this.diamondAlpha = 1.0; // 마름모 투명도 (반짝임용)
  }
  
  calculateAttackTiles() {
    if (!this.attacker) return [];
    
    const centerTileX = this.attacker.tileX;
    const centerTileY = this.attacker.tileY;
    const isUp = Math.abs(this.attacker.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.attacker.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.attacker.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.attacker.direction) < 0.2;
    
    const rangeInfo = this.attacker.parseAttackRange();
    let checkTiles = [];
    
    // 타일 범위 계산 (findTargetsInRange와 동일한 로직)
    if (rangeInfo.type === 'single') {
      for (let i = 0; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'straight-only') {
      for (let i = 1; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-extra') {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      for (let i = 1; i <= rangeInfo.extra; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - rangeInfo.forward - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + rangeInfo.forward + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - rangeInfo.forward - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + rangeInfo.forward + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-back') {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      for (let dy = 1; dy <= rangeInfo.back; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isLeft) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
        }
      }
    } else {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
    }
    
    return checkTiles;
  }
  
  update(dt) {
    if (!this.active) return;
    
    this.damageTimer += dt;
    
    // 1초마다 범위 안의 적에게 마법 대미지
    if (this.damageTimer >= this.damageInterval) {
      this.damageTimer = 0;
      this.dealDamage();
    }
    
    // 마름모 애니메이션 업데이트 - 매초마다 90도씩 부드럽게 회전
    this.diamondTimer += dt;
    // 1초마다 타이머 리셋 (0~1초 사이를 반복)
    if (this.diamondTimer >= 1.0) {
      this.diamondTimer -= 1.0;
    }
    // 1초 동안 0도에서 90도까지 부드럽게 회전
    this.diamondRotation = (this.diamondTimer / 1.0) * (Math.PI / 2); // 0~90도
    
    // 매초마다 반짝임 효과 (1초 주기로 밝아졌다가 어두워짐)
    this.diamondAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.diamondTimer * Math.PI * 2));
  }
  
  dealDamage() {
    if (!this.attacker || !this.attacker.deployed) {
      this.active = false;
      return;
    }
    
    const attackPower = this.attacker.attackPower;
    
    // 공격 범위 타일 내 적 찾기
    enemies.forEach(enemy => {
      if (!enemy.active) return;
      
      // 적이 있는 타일 좌표 계산
      const enemyTileX = Math.floor(enemy.x / tileSize);
      const enemyTileY = Math.floor(enemy.y / tileSize);
      
      // 공격 범위 타일 안에 있는지 확인
      const isInRange = this.attackTiles.some(tile => tile.x === enemyTileX && tile.y === enemyTileY);
      
      if (isInRange) {
        // 마법 대미지 적용
        const oldHealth = enemy.health;
        const finalDamage = calculateDamage(attackPower, 'magic', enemy.defense, enemy.magicResist);
        
        // 대미지가 0보다 큰지 확인
        if (finalDamage > 0) {
          enemy.health -= finalDamage;
          
          // 체력이 감소했는지 추적 (체력바 표시용)
          if (enemy.health < oldHealth) {
            enemy.hasTakenDamage = true;
          }
          
          // 피격 이펙트 생성
          hitEffects.push(new HitEffect(enemy.x, enemy.y));
        }
        
        // 적이 죽었는지 확인
        if (enemy.health <= 0) {
          enemy.active = false;
          // 처치 수 증가 (중복 카운트 방지)
          if (!enemy.isKilled && gameState === 'playing') {
            enemy.isKilled = true;
            enemiesKilled++;
          }
          // 적이 죽으면 모든 아군의 저지 목록에서 제거
          operators.forEach(operator => {
            const blockIndex = operator.blockedEnemies.indexOf(enemy);
            if (blockIndex > -1) {
              operator.blockedEnemies.splice(blockIndex, 1);
              operator.blockCount--;
              if (operator.blockCount === 0) {
                operator.isBlocking = false;
              }
            }
          });
        }
      }
    });
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    // 장판 범위 표시 (반투명 주황색 사각형 타일들)
    ctx.fillStyle = 'rgba(255, 165, 0, 0.3)'; // 반투명 주황색
    this.attackTiles.forEach(tile => {
      const px = tile.x * tileSize;
      const py = tile.y * tileSize;
      ctx.fillRect(px, py, tileSize, tileSize);
    });
    
    // 장판 테두리
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
    ctx.lineWidth = 2;
    this.attackTiles.forEach(tile => {
      const px = tile.x * tileSize;
      const py = tile.y * tileSize;
      ctx.strokeRect(px, py, tileSize, tileSize);
    });
    
    // 장판 중심 계산 (모든 타일의 중심점 평균)
    if (this.attackTiles.length > 0) {
      let sumX = 0;
      let sumY = 0;
      this.attackTiles.forEach(tile => {
        sumX += tile.x * tileSize + tileSize / 2;
        sumY += tile.y * tileSize + tileSize / 2;
      });
      const centerX = sumX / this.attackTiles.length;
      const centerY = sumY / this.attackTiles.length;
      
      // 장판 중심에 지름이 타일 3칸인 빈 노란색 마름모 그리기
      const diamondRadius = (tileSize * 3) / 2; // 지름이 타일 3칸이므로 반지름은 1.5칸
      ctx.strokeStyle = `rgba(255, 255, 0, ${this.diamondAlpha})`; // 노란색, 반짝임 효과
      ctx.lineWidth = 4; // 선 두께 증가
      
      // 회전 적용
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(this.diamondRotation);
      
      // 마름모 그리기 (안이 비어있음)
      ctx.beginPath();
      ctx.moveTo(0, -diamondRadius);
      ctx.lineTo(diamondRadius, 0);
      ctx.lineTo(0, diamondRadius);
      ctx.lineTo(-diamondRadius, 0);
      ctx.closePath();
      ctx.stroke();
      
      ctx.restore();
    }
  }
}

// 장판 배열
const skillZones = [];

// 피격 이펙트 클래스
class HitEffect {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.lifetime = 0.3; // 0.3초 동안 표시
    this.maxLifetime = 0.3;
    this.particles = [];
    
    // 파티클 생성 (작은 원형 이펙트들)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 30 + Math.random() * 20;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3
      });
    }
  }
  
  update(dt) {
    this.lifetime -= dt;
    
    // 파티클 이동
    this.particles.forEach(particle => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.9; // 감속
      particle.vy *= 0.9;
    });
  }
  
  draw(ctx) {
    if (this.lifetime <= 0) return;
    
    const alpha = this.lifetime / this.maxLifetime;
    
    // 파티클 그리기 (하얀색)
    this.particles.forEach(particle => {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  get active() {
    return this.lifetime > 0;
  }
}

// 회복 이펙트 클래스
class HealEffect {
  constructor(x, y, healAmount) {
    this.x = x;
    this.y = y;
    this.healAmount = healAmount;
    this.lifetime = 0.3; // 0.3초 동안 표시
    this.maxLifetime = 0.3;
    this.startY = y-5;
    this.offsetY = 0; // 위로 올라가는 오프셋
    
    // + 이펙트 3개 생성 (아래쪽 삼각형 형태)
    this.plusEffects = [];
    // 위쪽 중앙 (유닛 중앙보다 아래에서 시작, 수치와 겹치지 않도록)
    this.plusEffects.push({
      x: x,
      y: y + 13, // 수치 이펙트와 겹치지 않도록 더 아래로
      size: 5 // 고정 크기
    });
    // 아래 왼쪽 (중앙보다 아래)
    this.plusEffects.push({
      x: x - 12,
      y: y + 21, // 중앙 + 이펙트에 맞춰 조정
      size: 5 // 고정 크기
    });
    // 아래 오른쪽 (왼쪽과 중앙 사이 y 좌표)
    this.plusEffects.push({
      x: x + 12,
      y: y + 17, // 왼쪽(y + 13)과 중앙(y + 5) 사이
      size: 5 // 고정 크기
    });
    
    // + 이펙트 전용 lifetime (더 짧게)
    this.plusLifetime = 0.1; // 0.15초로 단축
    this.plusMaxLifetime = 0.1;
  }
  
  update(dt) {
    this.lifetime -= dt;
    this.plusLifetime -= dt; // + 이펙트 전용 lifetime
    
    // 위로 올라가기 (0.3초 동안 40픽셀 이동)
    this.offsetY = (1 - this.lifetime / this.maxLifetime) * 40;
  }
  
  draw(ctx) {
    if (this.lifetime <= 0) return;
    
    const alpha = this.lifetime / this.maxLifetime;
    const currentY = this.startY - this.offsetY;
    
    // + 이펙트 그리기 (3개) - 더 빨리 사라지도록 별도 alpha 사용
    if (this.plusLifetime > 0) {
      const plusAlpha = this.plusLifetime / this.plusMaxLifetime;
      ctx.strokeStyle = `rgba(100, 255, 100, ${plusAlpha})`;
      ctx.lineWidth = 2;
      this.plusEffects.forEach(plus => {
        const plusY = currentY + (plus.y - this.startY);
        ctx.beginPath();
        ctx.moveTo(plus.x - plus.size / 2, plusY);
        ctx.lineTo(plus.x + plus.size / 2, plusY);
        ctx.moveTo(plus.x, plusY - plus.size / 2);
        ctx.lineTo(plus.x, plusY + plus.size / 2);
        ctx.stroke();
      });
    }
    
    // 회복 수치 텍스트 그리기 (유닛 중간과 원 테두리 사이)
    ctx.fillStyle = `rgba(100, 255, 100, ${alpha})`;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`+${Math.floor(this.healAmount)}`, this.x, currentY);
  }
  
  get active() {
    return this.lifetime > 0;
  }
}

// 피해 수치 이펙트 클래스
class DamageEffect {
  constructor(x, y, damageAmount) {
    this.x = x;
    this.y = y;
    this.damageAmount = damageAmount;
    this.lifetime = 0.5; // 0.5초 동안 표시
    this.maxLifetime = 0.5;
    this.startY = y;
    this.offsetY = 0; // 위로 올라가는 오프셋
  }
  
  update(dt) {
    this.lifetime -= dt;
    
    // 위로 올라가기 (0.5초 동안 30픽셀 이동)
    this.offsetY = (1 - this.lifetime / this.maxLifetime) * 30;
  }
  
  draw(ctx) {
    if (this.lifetime <= 0) return;
    
    const alpha = this.lifetime / this.maxLifetime;
    const currentY = this.startY - this.offsetY;
    
    // 피해 수치 텍스트 그리기 (적 위에)
    ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`; // 빨간색
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`-${Math.floor(this.damageAmount)}`, this.x, currentY);
  }
  
  get active() {
    return this.lifetime > 0;
  }
}

// 이펙트 배열
const hitEffects = [];
const healEffects = [];
const damageEffects = []; // 피해 수치 이펙트

// 대미지 계산 함수
function calculateDamage(attackPower, damageType, targetDefense, targetMagicResist) {
  if (damageType === 'magic') {
    // 마법 대미지: 공격력 * (100 - 마법 저항)%
    const resistPercent = Math.max(0, Math.min(100, targetMagicResist));
    const magicDamage = attackPower * (100 - resistPercent) / 100;
    // 최소 공격력의 5% 보장
    return Math.max(attackPower * 0.05, magicDamage);
  } else {
    // 물리 대미지: 공격력 - 방어력 (최소 공격력의 5%)
    const physicalDamage = attackPower - targetDefense;
    // 최소 공격력의 5% 보장
    return Math.max(attackPower * 0.05, physicalDamage);
  }
}

// 대미지 타입 결정 함수
function getDamageType(attackerId, isOperator) {
  if (isOperator) {
    // 아군 id 11~13은 마법 대미지
    if (attackerId >= 11 && attackerId <= 13) {
      return 'magic';
    }
  } else {
    // 적 id 12는 마법 대미지
    if (attackerId === 12) {
      return 'magic';
    }
  }
  // 나머지는 물리 대미지
  return 'physical';
}

// 아군 클래스
class Operator {
  constructor(tileX, tileY, operatorId, direction = 0) {
    // operatorData에서 데이터 가져오기
    const opData = window.operatorData || [];
    const data = opData.find(op => op.id === operatorId) || opData[0] || {
      attackPower: 1,
      health: 100,
      maxHealth: 100,
      attackRange: 3,
      attackInterval: 0.5,
      radius: 20,
      color: '#4ade80',
      borderColor: '#22c55e'
    };
    
    this.operatorId = operatorId; // 유닛 ID 저장
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = tileX * tileSize + tileSize / 2;
    // TILE_DEPLOY 타일에 배치될 경우 위쪽 3/4 지역의 중앙에 배치
    const tile = mapData[tileY]?.[tileX] ?? TILE_EMPTY;
    if (tile === TILE_DEPLOY) {
      this.y = tileY * tileSize + tileSize * 3 / 8; // 위쪽 3/4 지역의 중앙 (타일 상단 + tileSize * 3/8)
    } else {
    this.y = tileY * tileSize + tileSize / 2;
    }
    this.radius = data.radius || 20;
    this.canRetreat = false; // 퇴각 가능 여부
    this.isBlocking = false; // 길을 막고 있는지
    this.maxBlockCount = data.blockCount || 3; // 최대 저지 가능 적 수 (operator.js에서 설정)
    this.blockCount = 0; // 현재 저지 중인 적 수
    this.blockedEnemies = []; // 현재 저지 중인 적 배열
    this.direction = direction; // 바라보는 방향 (라디안)
    // attackRange 파싱 (문자열 또는 숫자)
    const rawAttackRange = data.attackRange || 3;
    this.attackRange = rawAttackRange; // 원본 저장 (파싱용)
    this.attackPower = data.attackPower || 1; // 공격력
    this.health = data.health || 100; // 체력
    this.maxHealth = data.maxHealth || 100; // 최대 체력
    this.defense = data.defense || 0; // 방어력
    this.magicResist = data.magicResist || 0; // 마법 저항 (0~100)
    this.deployed = false; // 배치 완료 여부
    this.isPlacing = false; // 배치 중인지 (충돌 판정 없음)
    this.attackCooldown = 0; // 공격 쿨다운
    this.attackInterval = data.attackInterval || 0.5; // 공격 간격 (초)
    this.color = data.color || '#4ade80';
    this.borderColor = data.borderColor || '#22c55e';
    this.deployTime = Date.now(); // 배치 시간 (가장 최근 배치된 아군 찾기용)
    
    // 스킬 관련 속성
    // id 0인 아군은 초기 SP 10, 최대 SP 25
    if (operatorId === 0) {
      this.skillGauge = 10; // 초기 SP
      this.skillGaugeMax = 25; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 8; // 지속 시간 8초
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id0/Aya.PNG';
      this.images.attack.src = 'png/unit/id0/Aya2.PNG';
      this.images.skill.src = 'png/unit/id0/Aya_skill.PNG';
    } else if (operatorId === 1) {
      // id 1인 아군은 초기 SP 0, 최대 SP 15 (3회 사용 가능)
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 5; // 표시 최대 SP (게이지 표시용)
      this.skillGaugeMaxReal = 15; // 실제 최대 SP (3회 사용 가능)
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 1; // 스킬 지속시간 1초
      this.skillNextAttackTimer = 0; // 다음 공격까지의 타이머 (0.1초)
      this.skillHasAttacked = false; // 지속시간 동안 첫 공격을 했는지
      this.skillExtraAttackDone = false; // 추가 공격을 했는지 (1번만)
      this.skillCooldownAfterEnd = 0; // 스킬 종료 후 쿨다운 (재발동 방지)
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id1/Flandre.PNG';
      this.images.attack.src = 'png/unit/id1/Flandre2.PNG';
    } else if (operatorId === 2) {
      // id 2인 아군은 초기 SP 12, 최대 SP 50
      this.skillGauge = 12; // 초기 SP
      this.skillGaugeMax = 50; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 15; // 스킬 지속시간 15초
      this.skillCostTotal = 0; // 지속시간 동안 획득한 총 코스트
      this.skillCostTarget = 12; // 지속시간 동안 획득할 총 코스트
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id2/Yukari.PNG';
      this.images.attack.src = 'png/unit/id2/Yukari2.PNG';
      this.images.skill.src = 'png/unit/id2/Yukari_skill.PNG';
    } else if (operatorId === 3) {
      // id 3인 아군은 초기 SP 25, 최대 SP 50
      this.skillGauge = 25; // 초기 SP
      this.skillGaugeMax = 50; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 30; // 스킬 지속시간 30초
      this.baseDefense = this.defense; // 기본 방어력 저장
      this.baseMaxHealth = this.maxHealth; // 기본 최대 체력 저장
      this.baseAttackPower = this.attackPower; // 기본 공격력 저장
      this.baseAttackInterval = this.attackInterval; // 기본 공격 속도 저장
      this.skillDefenseBonus = 0; // 스킬로 인한 방어력 증가량
      this.specialAbilityUsed = false; // 특수 능력 사용 여부 (배치당 1번만)
      this.specialAbilityActive = false; // 특수 능력 활성화 여부
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id3/Mokou.PNG';
      this.images.attack.src = 'png/unit/id3/Mokou2.PNG';
      this.images.skill.src = 'png/unit/id3/Mokou_skill.PNG';
      this.images.skill2.src = 'png/unit/id3/Mokou_skill2.PNG';
    } else if (operatorId === 4) {
      // id 4인 아군은 초기 SP 0, 최대 SP 6 (1회 사용 가능)
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 6; // 최대 SP (1회 사용 가능)
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 0; // 즉시 발동 스킬 (지속시간 없음)
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드 (공격/스킬 동일)
      this.images.normal.src = 'png/unit/id4/Tenshi.PNG';
      this.images.attack.src = 'png/unit/id4/Tenshi2.PNG';
    } else if (operatorId === 5) {
      // id 5인 아군은 초기 SP 0, 최대 SP 4, 지속시간 1.3초
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 4; // 최대 SP
      this.skillGaugeChargeRate = 0; // 자연 회복 없음 (공격 시에만 회복)
      this.skillDurationMax = 1.4; // 스킬 지속시간 1.3초
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id5/Alice.PNG';
      this.images.attack.src = 'png/unit/id5/Alice2.PNG';
    } else if (operatorId === 6) {
      // id 6인 아군은 초기 SP 20, 최대 SP 45, 지속시간 10초
      this.skillGauge = 20; // 초기 SP
      this.skillGaugeMax = 45; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 10; // 스킬 지속시간 10초
      this.skillPostDuration = 0; // 스킬 종료 후 10초 타이머
      this.skillPostDurationMax = 10; // 스킬 종료 후 지속시간 10초
      this.isSkillDisabled = false; // 스킬 종료 후 공격 불가 상태
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id6/Youmu.PNG';
      this.images.attack.src = 'png/unit/id6/Youmu2.PNG';
      this.images.skill.src = 'png/unit/id6/Youmu_skill.PNG';
      this.images.skill2.src = 'png/unit/id6/Youmu_skill2.PNG';
    } else if (operatorId === 7) {
      // id 7인 아군은 초기 SP 0, 최대 SP 28, 지속시간 12초
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 28; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 12; // 스킬 지속시간 12초
      this.shield = 0; // 보호막 수치
      this.maxShield = 0; // 최대 보호막 수치
      this.shieldDecayRate = 0; // 보호막 감소 속도 (스킬 종료 후)
      this.baseAttackInterval = this.attackInterval; // 기본 공격 간격 저장
      this.cannotBeHealed = true; // 회복 대상이 되지 않음
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id7/Momiji.PNG';
      this.images.attack.src = 'png/unit/id7/Momiji2.PNG';
      this.images.skill.src = 'png/unit/id7/Momiji_skill.PNG';
      this.images.skill2.src = 'png/unit/id7/Momiji_skill2.PNG';
    } else if (operatorId === 8) {
      // id 8인 아군은 기본 스킬 설정 (작은 원 3개)
      this.skillGauge = 0; // 스킬 게이지 (0~100)
      this.skillGaugeMax = 100; // 최대 스킬 게이지
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 5; // 스킬 최대 지속 시간 (초)
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드 (공격/스킬 동일)
      this.images.normal.src = 'png/unit/id8/Inaba.PNG';
      this.images.attack.src = 'png/unit/id8/Inaba2.PNG';
    } else if (operatorId === 9) {
      // id 9인 아군은 초기 SP 5, 최대 SP 35, 지속시간 17초
      this.skillGauge = 5; // 초기 SP
      this.skillGaugeMax = 35; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 17; // 스킬 지속시간 17초
      this.baseAttackInterval = this.attackInterval; // 기본 공격 간격 저장
      this.originalAttackRange = this.attackRange; // 원본 공격 범위 저장
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id9/Cirno.PNG';
      this.images.attack.src = 'png/unit/id9/Cirno2.PNG';
      this.images.skill.src = 'png/unit/id9/Cirno_skill.PNG';
      this.images.skill2.src = 'png/unit/id9/Cirno_skill2.PNG';
    } else if (operatorId === 10) {
      // id 10인 아군은 초기 SP 15, 최대 SP 40, 공격 시에만 SP 회복
      this.skillGauge = 15; // 초기 SP
      this.skillGaugeMax = 38; // 최대 SP
      this.skillGaugeChargeRate = 0; // 자연 회복 없음 (공격 시에만 회복)
      this.skillDurationMax = 20; // 지속시간은 사격 횟수로 제어 (3번 사격)
      this.skillShotCount = 0; // 현재 사격 횟수
      this.skillMaxShots = 3; // 최대 사격 횟수
      this.skillShotTimer = 0; // 다음 사격까지의 타이머
      this.skillShotInterval = 0.1; // 사격 간격 0.2초
      this.originalAttackRange = this.attackRange; // 원본 공격 범위 저장
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id10/Marisa.PNG';
      this.images.attack.src = 'png/unit/id10/Marisa2.PNG';
      this.images.skill.src = 'png/unit/id10/Marisa_skill.PNG';
      this.images.skill2.src = 'png/unit/id10/Marisa_skill2.PNG';
    } else if (operatorId === 11) {
      // id 11인 아군은 초기 SP 0, 최대 SP 18 (2회 사용 가능)
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 9; // 표시 최대 SP (게이지 표시용, 1회 사용)
      this.skillGaugeMaxReal = 18; // 실제 최대 SP (2회 사용 가능)
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 2.9; // 스킬 지속시간 2.9초
      this.attackZoneEffect = null; // 공격 시 장판 이펙트
      this.skillCooldownAfterEnd = 0; // 스킬 종료 후 쿨다운 (재발동 방지)
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id11/Remilia.PNG';
      this.images.attack.src = 'png/unit/id11/Remilia2.PNG';
    } else if (operatorId === 12) {
      // id 12인 아군은 초기 SP 0, 최대 SP 7 (1회 사용 가능)
      this.skillGauge = 0; // 초기 SP
      this.skillGaugeMax = 7; // 표시 최대 SP (게이지 표시용, 1회 사용)
      this.skillGaugeMaxReal = 7; // 실제 최대 SP (1회 사용 가능)
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 1.7; // 스킬 지속시간 1.7초
      this.skillCooldownAfterEnd = 0; // 스킬 종료 후 쿨다운 (재발동 방지)
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id12/Kaguya.PNG';
      this.images.attack.src = 'png/unit/id12/Kaguya2.PNG';
    } else if (operatorId === 13) {
      // id 13인 아군은 초기 SP 5, 최대 SP 65, 지속시간 4초
      this.skillGauge = 5; // 초기 SP
      this.skillGaugeMax = 65; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 4; // 스킬 지속시간 4초
      this.skillZone = null; // 장판 오브젝트
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드 (공격/스킬 동일)
      this.images.normal.src = 'png/unit/id13/Reimu.PNG';
      this.images.attack.src = 'png/unit/id13/Reimu2.PNG';
    } else if (operatorId === 14) {
      // id 14인 아군은 초기 SP 10, 최대 SP 48, 지속시간 20초
      this.skillGauge = 10; // 초기 SP
      this.skillGaugeMax = 48; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 20; // 스킬 지속시간 20초
      this.baseAttackInterval = this.attackInterval; // 기본 공격 간격 저장
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드 (공격/회복/스킬 동일)
      this.images.normal.src = 'png/unit/id14/Ran.PNG';
      this.images.attack.src = 'png/unit/id14/Ran2.PNG';
    } else if (operatorId === 15) {
      // id 15인 아군은 초기 SP 20, 최대 SP 40, 지속시간 30초
      this.skillGauge = 20; // 초기 SP
      this.skillGaugeMax = 40; // 최대 SP
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 30; // 스킬 지속시간 30초
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.skillImageToggle = false; // 스킬 이미지 토글 (skill/skill2 전환)
      this.skillImageToggleTimer = 0; // 스킬 이미지 토글 타이머
      this.images = {
        normal: new Image(),
        attack: new Image(),
        skill: new Image(),
        skill2: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id15/Sanae.PNG';
      this.images.attack.src = 'png/unit/id15/Sanae2.PNG';
      this.images.skill.src = 'png/unit/id15/Sanae_skill.PNG';
      this.images.skill2.src = 'png/unit/id15/Sanae_skill2.PNG';
    } else if (operatorId === 16) {
      // id 16인 아군은 회복 상태 관련 속성
      this.isRecovering = false; // 회복 중인지
      this.recoveryTimer = 0; // 회복 타이머 (20초)
      this.recoveryDuration = 20; // 회복 지속시간
      this.baseAttackPower = this.attackPower; // 기본 공격력 저장
      this.baseDefense = this.defense; // 기본 방어력 저장
      this.skillAttackPowerBonus = 0; // 스킬로 인한 공격력 증가량
      this.skillDefenseBonus = 0; // 스킬로 인한 방어력 증가량
      // 이미지 관련 속성
      this.attackImageTimer = 0; // 공격 이미지 타이머
      this.images = {
        normal: new Image(),
        attack: new Image()
      };
      // 이미지 로드
      this.images.normal.src = 'png/unit/id16/Chen.PNG';
      this.images.attack.src = 'png/unit/id16/Chen2.PNG';
    } else {
      this.skillGauge = 0; // 스킬 게이지 (0~100)
      this.skillGaugeMax = 100; // 최대 스킬 게이지
      this.skillGaugeChargeRate = 2 // 초당 게이지 충전량
      this.skillDurationMax = 5; // 스킬 최대 지속 시간 (초)
    }
    this.skillActive = false; // 스킬 활성화 여부
    this.skillDuration = 0; // 스킬 지속 시간
    this.skillCostTimer = 0; // 코스트 획득 타이머 (매초마다)
    this.skillInstantCostGiven = false; // 스킬 발동 시 1회 지급 여부
    this.baseAttackPower = this.attackPower; // 기본 공격력 저장
    this.skillAttackPowerBonus = 0; // 스킬로 인한 공격력 증가량
    this.showSkillIcon = false; // 스킬 아이콘 표시 여부
    this.skillIconX = 0; // 스킬 아이콘 X 좌표
    this.skillIconY = 0; // 스킬 아이콘 Y 좌표
    this.showRetreatIcon = false; // 퇴각 아이콘 표시 여부
    this.retreatIconX = 0; // 퇴각 아이콘 X 좌표
    this.retreatIconY = 0; // 퇴각 아이콘 Y 좌표
    this.showAttackRange = false; // 공격 범위 표시 여부
    this.skillOrbs = []; // 유닛 8의 스킬 오브젝트 (작은 원들)
    
    // id:22 적의 폭발물 스킬 관련
    this.hasBomb = false; // 폭발물이 부착되었는지
    this.bombTimer = 0; // 폭발물 타이머 (3초)
    this.bombAttacker = null; // 폭발물을 부착한 적 (id:22)
  }
  
  // 공격 범위 내 적 찾기 (방향 기반, 항상 3x3)
  // attackRange 파싱 함수
  parseAttackRange() {
    const range = String(this.attackRange);
    
    // 0.11111 형식 (완전 일직선) - 먼저 체크해야 함
    if (range.startsWith('0.')) {
      const extra = range.split('.')[1];
      const extraCount = extra.split('').filter(c => c === '1').length;
      return {
        type: 'straight-only',
        forward: extraCount,
        side: 0 // 좌우 없음
      };
    }
    
    // 4-1, 3-1 형식 (앞쪽 범위-뒤쪽 범위)
    if (range.includes('-')) {
      const parts = range.split('-');
      return {
        type: 'forward-back',
        forward: parseInt(parts[0]) || 0,
        back: parseInt(parts[1]) || 0,
        side: 1 // 기본 좌우 1칸
      };
    }
    
    // 2.11 형식 (앞쪽 범위.일직선 추가 범위)
    if (range.includes('.') && range.split('.').length === 2) {
      const parts = range.split('.');
      const forward = parseInt(parts[0]) || 0;
      const extra = parts[1];
      // extra가 모두 1이면 일직선 추가 범위
      const extraCount = extra.split('').filter(c => c === '1').length;
      return {
        type: 'forward-extra',
        forward: forward,
        side: 1, // 기본 좌우 1칸
        extra: extraCount // 일직선 추가 범위
      };
    }
    
    // 1 형식 (자신의 타일 + 앞 1칸 = 2x1)
    const numRange = parseInt(range);
    if (numRange === 1) {
      return {
        type: 'single',
        forward: 1, // 자신의 타일 + 앞 1칸
        side: 0 // 좌우 없음
      };
    }
    
    // 일반 숫자 (앞쪽 범위, 기본 3x3)
    return {
      type: 'normal',
      forward: numRange - 1, // 유닛 위치 포함
      side: 1
    };
  }
  
  findTargetsInRange() {
    const targets = [];
    const centerTileX = this.tileX;
    const centerTileY = this.tileY;
    
    // 방향에 따라 공격 범위 결정
    // 상: -π/2, 하: π/2, 좌: π, 우: 0
    const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.direction) < 0.2;
    
    // id:9 스킬 활성화 시 공격 범위를 전방 일직선 4칸으로 변경 (자신 타일 포함)
    // id:10 스킬 활성화 시 공격 범위 1 증가
    let rangeInfo;
    if (this.operatorId === 9 && this.skillActive) {
      rangeInfo = {
        type: 'single',
        forward: 4 // 자신 타일 포함 5칸 (0~4)
      };
    } else {
      rangeInfo = this.parseAttackRange();
      // id:10 스킬 활성화 시 공격 범위 1 증가
      if (this.operatorId === 10 && this.skillActive && rangeInfo.forward !== undefined) {
        rangeInfo.forward += 1;
      }
    }
    
    let checkTiles = [];
    
    // 타일 범위 계산
    if (rangeInfo.type === 'single') {
      // 자신의 타일 + 앞 1칸 (2x1)
      for (let i = 0; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'straight-only') {
      // 완전 일직선
      for (let i = 1; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-extra') {
      // 앞쪽 사각형 범위
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      // 일직선 추가 범위
      for (let i = 1; i <= rangeInfo.extra; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - rangeInfo.forward - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + rangeInfo.forward + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - rangeInfo.forward - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + rangeInfo.forward + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-back') {
      // 앞쪽 범위
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      // 뒤쪽 범위
      for (let dy = 1; dy <= rangeInfo.back; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isLeft) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
        }
      }
    } else {
      // 일반 범위 (기본 3x3)
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
    }
    
    // 범위 내 적 찾기 (픽셀 좌표 기반으로 체크 - 적의 원이 범위와 겹치면 감지)
    enemies.forEach(enemy => {
      if (!enemy.active) return;
      
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      let isInRange = false;
      
      // 공격 범위 타입에 따른 픽셀 좌표 기반 체크 (적의 원을 고려)
      if (rangeInfo.type === 'single') {
        // 일직선 범위 (자신 타일 포함) - 적의 원이 일직선과 겹치는지 확인
        if (isUp) {
          const distToLine = Math.abs(enemy.x - this.x); // 일직선까지의 수직 거리
          const alongLine = this.y - enemy.y; // 일직선 방향으로의 거리
          isInRange = alongLine >= -enemy.radius && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
    } else if (isDown) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = enemy.y - this.y;
          isInRange = alongLine >= -enemy.radius && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        } else if (isLeft) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = this.x - enemy.x;
          isInRange = alongLine >= -enemy.radius && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        } else if (isRight) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = enemy.x - this.x;
          isInRange = alongLine >= -enemy.radius && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        }
      } else if (rangeInfo.type === 'straight-only') {
        // 완전 일직선 (자신 타일 제외) - 적의 원이 일직선과 겹치는지 확인
        if (isUp) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = this.y - enemy.y;
          isInRange = alongLine >= (tileSize / 2 - enemy.radius) && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        } else if (isDown) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = enemy.y - this.y;
          isInRange = alongLine >= (tileSize / 2 - enemy.radius) && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        } else if (isLeft) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = this.x - enemy.x;
          isInRange = alongLine >= (tileSize / 2 - enemy.radius) && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        } else if (isRight) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = enemy.x - this.x;
          isInRange = alongLine >= (tileSize / 2 - enemy.radius) && alongLine <= (tileSize * (rangeInfo.forward + 0.5) + enemy.radius) &&
                      distToLine <= (tileSize / 2 + enemy.radius);
        }
      } else if (rangeInfo.type === 'forward-extra') {
        // 앞쪽 사각형 범위 + 일직선 추가 범위 - 적의 원이 범위와 겹치는지 확인
        const forwardDist = tileSize * (rangeInfo.forward + 0.5);
        const sideDist = tileSize * (rangeInfo.side + 0.5);
        const extraDist = tileSize * (rangeInfo.extra + 0.5);
        
        if (isUp) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = this.y - enemy.y;
          // 앞쪽 사각형 범위 체크
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                               distToLine <= (sideDist + enemy.radius);
          // 일직선 추가 범위 체크
          const extraCheck = alongLine >= (forwardDist - enemy.radius) && 
                            alongLine <= (forwardDist + extraDist + enemy.radius) &&
                            distToLine <= (tileSize / 2 + enemy.radius);
          isInRange = forwardCheck || extraCheck;
        } else if (isDown) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = enemy.y - this.y;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                               distToLine <= (sideDist + enemy.radius);
          const extraCheck = alongLine >= (forwardDist - enemy.radius) && 
                            alongLine <= (forwardDist + extraDist + enemy.radius) &&
                            distToLine <= (tileSize / 2 + enemy.radius);
          isInRange = forwardCheck || extraCheck;
    } else if (isLeft) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = this.x - enemy.x;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                               distToLine <= (sideDist + enemy.radius);
          const extraCheck = alongLine >= (forwardDist - enemy.radius) && 
                            alongLine <= (forwardDist + extraDist + enemy.radius) &&
                            distToLine <= (tileSize / 2 + enemy.radius);
          isInRange = forwardCheck || extraCheck;
        } else if (isRight) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = enemy.x - this.x;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                               distToLine <= (sideDist + enemy.radius);
          const extraCheck = alongLine >= (forwardDist - enemy.radius) && 
                            alongLine <= (forwardDist + extraDist + enemy.radius) &&
                            distToLine <= (tileSize / 2 + enemy.radius);
          isInRange = forwardCheck || extraCheck;
        }
      } else if (rangeInfo.type === 'forward-back') {
        // 앞쪽 + 뒤쪽 범위 - 적의 원이 범위와 겹치는지 확인
        const forwardDist = tileSize * (rangeInfo.forward + 0.5);
        const backDist = tileSize * (rangeInfo.back + 0.5);
        const sideDist = tileSize * (rangeInfo.side + 0.5);
        
        if (isUp) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = this.y - enemy.y;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius);
          const backCheck = alongLine <= enemy.radius && alongLine >= -(backDist + enemy.radius);
          const sideCheck = distToLine <= (sideDist + enemy.radius);
          isInRange = (forwardCheck || backCheck) && sideCheck;
        } else if (isDown) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = enemy.y - this.y;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius);
          const backCheck = alongLine <= enemy.radius && alongLine >= -(backDist + enemy.radius);
          const sideCheck = distToLine <= (sideDist + enemy.radius);
          isInRange = (forwardCheck || backCheck) && sideCheck;
        } else if (isLeft) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = this.x - enemy.x;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius);
          const backCheck = alongLine <= enemy.radius && alongLine >= -(backDist + enemy.radius);
          const sideCheck = distToLine <= (sideDist + enemy.radius);
          isInRange = (forwardCheck || backCheck) && sideCheck;
        } else if (isRight) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = enemy.x - this.x;
          const forwardCheck = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius);
          const backCheck = alongLine <= enemy.radius && alongLine >= -(backDist + enemy.radius);
          const sideCheck = distToLine <= (sideDist + enemy.radius);
          isInRange = (forwardCheck || backCheck) && sideCheck;
        }
      } else {
        // 일반 범위 (normal) - 적의 원이 사각형 범위와 겹치는지 확인
        const forwardDist = tileSize * (rangeInfo.forward + 0.5);
        const sideDist = tileSize * (rangeInfo.side + 0.5);
        
        if (isUp) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = this.y - enemy.y;
          isInRange = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                      distToLine <= (sideDist + enemy.radius);
        } else if (isDown) {
          const distToLine = Math.abs(enemy.x - this.x);
          const alongLine = enemy.y - this.y;
          isInRange = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                      distToLine <= (sideDist + enemy.radius);
        } else if (isLeft) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = this.x - enemy.x;
          isInRange = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                      distToLine <= (sideDist + enemy.radius);
    } else if (isRight) {
          const distToLine = Math.abs(enemy.y - this.y);
          const alongLine = enemy.x - this.x;
          isInRange = alongLine >= -enemy.radius && alongLine <= (forwardDist + enemy.radius) &&
                      distToLine <= (sideDist + enemy.radius);
        }
      }
      
      if (isInRange && !targets.includes(enemy)) {
        targets.push(enemy);
      }
    });
    
    // 타겟 우선순위 정렬
    if (targets.length > 0) {
      // 현재 유닛이 배치된 타일 확인
      const currentTile = mapData[this.tileY]?.[this.tileX];
      const isOnRoad = currentTile === TILE_ROAD;
      
      // 적 출발지~도착지 거리 계산 및 우선순위 부여
      targets.sort((a, b) => {
        // TILE_ROAD에 배치된 아군은 저지한 적을 최우선
        if (isOnRoad) {
          const aIsBlocked = this.blockedEnemies.includes(a);
          const bIsBlocked = this.blockedEnemies.includes(b);
          
          if (aIsBlocked && !bIsBlocked) return -1;
          if (!aIsBlocked && bIsBlocked) return 1;
        }
        
        // 적 출발지~도착지 거리 계산 (경로 길이)
        const aDistance = a.path ? a.path.length : 0;
        const bDistance = b.path ? b.path.length : 0;
        
        // 거리가 짧은 적을 우선 (더 가까운 적)
        return aDistance - bDistance;
      });
    }
    
    return targets;
  }
  
  // 공격 범위 내 아군 찾기 (메딕용)
  // id:4 유닛용: 주변 3x3 범위 내 체력이 절반 이하인 아군 찾기
  findLowHealthAlliesIn3x3() {
    const allies = [];
    const centerTileX = this.tileX;
    const centerTileY = this.tileY;
    
    // 3x3 범위 체크 (방향과 관계없이 주변 타일)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkTileX = centerTileX + dx;
        const checkTileY = centerTileY + dy;
        
        // 맵 범위 체크
        if (checkTileX < 0 || checkTileX >= mapCols || checkTileY < 0 || checkTileY >= mapRows) {
          continue;
        }
        
        // 해당 타일에 배치된 아군 찾기 (자신 포함)
        operators.forEach(operator => {
          if (!operator.deployed || operator.isPlacing) return;
          if (operator.operatorId === 16 && operator.isRecovering) return; // 회복 중인 id:16 제외
          
          if (operator.tileX === checkTileX && operator.tileY === checkTileY) {
            // 체력이 절반 이하인 아군만 추가 (자신 포함)
            const healthRatio = operator.health / operator.maxHealth;
            if (healthRatio <= 0.5) {
              // 중복 체크
              if (!allies.includes(operator)) {
                allies.push(operator);
              }
            }
          }
        });
      }
    }
    
    return allies;
  }
  
  findAlliesInRange() {
    const allies = [];
    const centerTileX = this.tileX;
    const centerTileY = this.tileY;
    
    // 방향에 따라 공격 범위 결정
    const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.direction) < 0.2;
    
    const rangeInfo = this.parseAttackRange();
    let checkTiles = [];
    
    // 타일 범위 계산 (findTargetsInRange와 동일한 로직)
    if (rangeInfo.type === 'single') {
      for (let i = 0; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'straight-only') {
      for (let i = 1; i <= rangeInfo.forward; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-extra') {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      for (let i = 1; i <= rangeInfo.extra; i++) {
        if (isUp) checkTiles.push({ x: centerTileX, y: centerTileY - rangeInfo.forward - i });
        else if (isDown) checkTiles.push({ x: centerTileX, y: centerTileY + rangeInfo.forward + i });
        else if (isLeft) checkTiles.push({ x: centerTileX - rangeInfo.forward - i, y: centerTileY });
        else if (isRight) checkTiles.push({ x: centerTileX + rangeInfo.forward + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-back') {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      for (let dy = 1; dy <= rangeInfo.back; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isLeft) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
        }
      }
    } else {
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) checkTiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) checkTiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) checkTiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) checkTiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
    }
    
    // 범위 내 아군 찾기 (자신 포함, 체력이 최대가 아닌 아군만)
    checkTiles.forEach(tile => {
      operators.forEach(ally => {
        if (!ally.deployed || ally.isPlacing) return;
        if (ally.health >= ally.maxHealth) return; // 체력이 가득 찬 아군은 제외
        if (ally.operatorId === 7) return; // id:7은 회복 대상이 되지 않음
        
        const allyTileX = ally.tileX;
        const allyTileY = ally.tileY;
        
        if (allyTileX === tile.x && allyTileY === tile.y) {
          if (!allies.includes(ally)) {
            allies.push(ally);
          }
        }
      });
    });
    
    // 체력이 가장 낮은 아군 순으로 정렬
    allies.sort((a, b) => {
      // 체력 비율로 정렬 (낮은 체력 비율이 우선)
      const aHealthRatio = a.health / a.maxHealth;
      const bHealthRatio = b.health / b.maxHealth;
      return aHealthRatio - bHealthRatio;
    });
    
    return allies;
  }
  
  // 공격 범위 타일 가져오기 (그리기용)
  getAttackRangeTiles() {
    const centerTileX = this.tileX;
    const centerTileY = this.tileY;
    
    const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.direction) < 0.2;
    
    // id:9 스킬 활성화 시 공격 범위를 전방 일직선 4칸으로 변경 (자신 타일 포함)
    // id:10 스킬 활성화 시 공격 범위 1 증가
    let rangeInfo;
    if (this.operatorId === 9 && this.skillActive) {
      rangeInfo = {
        type: 'single',
        forward: 4 // 자신 타일 포함 5칸 (0~4)
      };
    } else {
      rangeInfo = this.parseAttackRange();
      // id:10 스킬 활성화 시 공격 범위 1 증가
      if (this.operatorId === 10 && this.skillActive && rangeInfo.forward !== undefined) {
        rangeInfo.forward += 1;
      }
    }
    
    const tiles = [];
    
    // 타일 범위 계산 (findTargetsInRange와 동일한 로직)
    if (rangeInfo.type === 'single') {
      // 자신의 타일 + 앞 1칸 (2x1)
      for (let i = 0; i <= rangeInfo.forward; i++) {
        if (isUp) tiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) tiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) tiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) tiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'straight-only') {
      // 완전 일직선
      for (let i = 1; i <= rangeInfo.forward; i++) {
        if (isUp) tiles.push({ x: centerTileX, y: centerTileY - i });
        else if (isDown) tiles.push({ x: centerTileX, y: centerTileY + i });
        else if (isLeft) tiles.push({ x: centerTileX - i, y: centerTileY });
        else if (isRight) tiles.push({ x: centerTileX + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-extra') {
      // 앞쪽 사각형 범위
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) tiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) tiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) tiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) tiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      // 일직선 추가 범위
      for (let i = 1; i <= rangeInfo.extra; i++) {
        if (isUp) tiles.push({ x: centerTileX, y: centerTileY - rangeInfo.forward - i });
        else if (isDown) tiles.push({ x: centerTileX, y: centerTileY + rangeInfo.forward + i });
        else if (isLeft) tiles.push({ x: centerTileX - rangeInfo.forward - i, y: centerTileY });
        else if (isRight) tiles.push({ x: centerTileX + rangeInfo.forward + i, y: centerTileY });
      }
    } else if (rangeInfo.type === 'forward-back') {
      // 앞쪽 범위
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) tiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) tiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) tiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) tiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
      // 뒤쪽 범위
      for (let dy = 1; dy <= rangeInfo.back; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) tiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isDown) tiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isLeft) tiles.push({ x: centerTileX + dy, y: centerTileY + dx });
          else if (isRight) tiles.push({ x: centerTileX - dy, y: centerTileY + dx });
        }
      }
    } else {
      // 일반 범위 (기본 3x3)
      for (let dy = 0; dy <= rangeInfo.forward; dy++) {
        for (let dx = -rangeInfo.side; dx <= rangeInfo.side; dx++) {
          if (isUp) tiles.push({ x: centerTileX + dx, y: centerTileY - dy });
          else if (isDown) tiles.push({ x: centerTileX + dx, y: centerTileY + dy });
          else if (isLeft) tiles.push({ x: centerTileX - dy, y: centerTileY + dx });
          else if (isRight) tiles.push({ x: centerTileX + dy, y: centerTileY + dx });
        }
      }
    }
    
    return tiles;
  }
  
  update(dt) {
    if (!this.deployed || this.isPlacing) return;
    
    this.attackCooldown -= dt;
    
    // 스킬 게이지 충전
    // id 1인 아군은 실제 최대 SP까지 계속 충전
    if (this.operatorId === 1) {
      if (!this.skillActive && this.skillGauge < this.skillGaugeMaxReal) {
        this.skillGauge = Math.min(this.skillGaugeMaxReal, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
      
      // 스킬 종료 후 쿨다운 감소
      if (this.skillCooldownAfterEnd > 0) {
        this.skillCooldownAfterEnd -= dt;
      }
      
      // SP가 5 이상이고 타겟이 있고 쿨다운이 없으면 자동으로 스킬 활성화
      if (!this.skillActive && this.skillGauge >= this.skillGaugeMax && this.skillCooldownAfterEnd <= 0) {
        const targets = this.findTargetsInRange();
        if (targets.length > 0) {
          this.skillActive = true;
          this.skillDuration = this.skillDurationMax;
          this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax); // SP 5 소모
          this.skillHasAttacked = false; // 첫 공격 플래그 초기화
          this.skillNextAttackTimer = 0; // 추가 공격 타이머 초기화
          this.skillExtraAttackDone = false; // 추가 공격 플래그 초기화
        }
      }
    } else if (this.operatorId === 11) {
      // id 11인 아군은 실제 최대 SP까지 계속 충전
      if (!this.skillActive && this.skillGauge < this.skillGaugeMaxReal) {
        this.skillGauge = Math.min(this.skillGaugeMaxReal, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
      
      // 스킬 종료 후 쿨다운 감소
      if (this.skillCooldownAfterEnd > 0) {
        this.skillCooldownAfterEnd -= dt;
      }
      
      // SP가 9 이상이고 타겟이 있고 쿨다운이 없으면 자동으로 스킬 활성화
      if (!this.skillActive && this.skillGauge >= this.skillGaugeMax && this.skillCooldownAfterEnd <= 0) {
        const targets = this.findTargetsInRange();
        if (targets.length > 0) {
          this.skillActive = true;
          this.skillDuration = this.skillDurationMax;
          this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax); // SP 9 소모
        }
      }
    } else if (this.operatorId === 12) {
      // id 12인 아군은 최대 SP까지 충전 (1회 사용 가능)
      if (!this.skillActive && this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
      
      // 스킬 종료 후 쿨다운 감소
      if (this.skillCooldownAfterEnd > 0) {
        this.skillCooldownAfterEnd -= dt;
      }
      
      // SP가 7 이상이고 타겟이 있고 쿨다운이 없으면 자동으로 스킬 활성화
      if (!this.skillActive && this.skillGauge >= this.skillGaugeMax && this.skillCooldownAfterEnd <= 0) {
        const targets = this.findTargetsInRange();
        if (targets.length > 0) {
          this.skillActive = true;
          this.skillDuration = this.skillDurationMax;
          this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax); // SP 7 소모
        }
      }
    } else if (this.operatorId === 4) {
      // id 4인 아군은 최대 SP까지 충전 (1회 사용 가능)
      if (!this.skillActive && this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
      
      // SP가 6 이상이고 주변 3x3 범위에 체력 절반 이하인 아군이 있으면 자동으로 스킬 발동
      if (!this.skillActive && this.skillGauge >= this.skillGaugeMax) {
        const lowHealthAllies = this.findLowHealthAlliesIn3x3();
        if (lowHealthAllies.length > 0) {
          // 가장 체력 비율이 낮은 아군 선택
          const target = lowHealthAllies.reduce((lowest, current) => {
            const lowestRatio = lowest.health / lowest.maxHealth;
            const currentRatio = current.health / current.maxHealth;
            return currentRatio < lowestRatio ? current : lowest;
          });
          
          // 스킬 발동: 체력 회복
          const healAmount = Math.floor(this.attackPower * 1.2); // 공격력의 120%
          const oldHealth = target.health;
          target.health = Math.min(target.maxHealth, target.health + healAmount);
          const actualHeal = target.health - oldHealth;
          
          // 회복 이펙트 생성
          if (actualHeal > 0) {
            healEffects.push(new HealEffect(target.x, target.y, actualHeal));
          }
          
          // SP 6 소모
          this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax);
        }
      }
    } else if (this.operatorId === 5) {
      // id 5인 아군은 공격 시에만 SP 회복 (update에서는 자동 발동만 처리)
      // SP가 4 이상이고 타겟이 있으면 자동으로 스킬 활성화
      if (!this.skillActive && this.skillGauge >= this.skillGaugeMax) {
        const targets = this.findTargetsInRange();
        if (targets.length > 0) {
          this.skillActive = true;
          this.skillDuration = this.skillDurationMax;
          this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax); // SP 4 소모
        }
      }
    } else if (this.operatorId === 9 && !this.skillActive) {
      // id 9인 아군: 스킬이 활성화되지 않았을 때만 충전
      if (this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
    } else if (this.operatorId === 2 && !this.skillActive) {
      // id 2인 아군은 스킬이 활성화되지 않았을 때만 충전
      if (this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
    } else if (this.operatorId === 14 && !this.skillActive) {
      // id 14인 아군은 스킬이 활성화되지 않았을 때만 충전
      if (this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
    } else if (this.operatorId === 15 && !this.skillActive) {
      // id 15인 아군은 스킬이 활성화되지 않았을 때만 충전
      if (this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
    }
    
    // id:15 유닛의 이미지 타이머 관리
    if (this.operatorId === 15) {
      // 공격 이미지 타이머 감소
      if (this.attackImageTimer > 0) {
        this.attackImageTimer -= dt;
      }
      
      // 스킬 이미지 토글 타이머 관리 (스킬 활성화 중일 때만)
      if (this.skillActive) {
        this.skillImageToggleTimer += dt;
        // 0.5초마다 토글
        if (this.skillImageToggleTimer >= 0.5) {
          this.skillImageToggle = !this.skillImageToggle;
          this.skillImageToggleTimer = 0;
        }
      } else {
        this.skillImageToggleTimer = 0;
        this.skillImageToggle = false;
      }
    }
    
    // 모든 유닛의 이미지 타이머 관리 (이미지 시스템이 있는 유닛)
    if (this.images && this.attackImageTimer !== undefined) {
      // 공격 이미지 타이머 감소
      if (this.attackImageTimer > 0) {
        this.attackImageTimer -= dt;
      }
    }
    
    if (!this.skillActive) {
      // 다른 유닛들은 스킬이 활성화되지 않았을 때만 충전
      if (this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + this.skillGaugeChargeRate * dt);
      }
    }
    
    // id:16 유닛 회복 상태 처리
    if (this.operatorId === 16 && this.isRecovering) {
      this.recoveryTimer -= dt;
      
      // 20초 동안 체력 100%까지 회복
      const recoveryProgress = 1 - (this.recoveryTimer / this.recoveryDuration);
      this.health = Math.min(this.maxHealth, this.maxHealth * recoveryProgress);
      
      // 회복 완료 시 정상 상태로 복귀
      if (this.recoveryTimer <= 0) {
        this.isRecovering = false;
        this.health = this.maxHealth;
        this.maxBlockCount = 1; // 기본 저지 수 복구
        this.blockCount = 0;
      }
      
      // 회복 중에는 다른 로직 실행하지 않음
      return;
    }
    
    // id:6 유닛 스킬 종료 후 10초 타이머 처리
    if (this.operatorId === 6 && this.isSkillDisabled) {
      this.skillPostDuration -= dt;
      
      // 10초 후 정상 상태로 복귀
      if (this.skillPostDuration <= 0) {
        this.isSkillDisabled = false;
        // 기본 저지 수 복구 (operator.js에서 설정된 값)
        const opData = window.operatorData || [];
        const data = opData.find(d => d.id === 6) || {};
        this.maxBlockCount = data.blockCount || 3;
      }
    }
    
    // id:7 유닛 보호막 감소 처리 (스킬 종료 후)
    if (this.operatorId === 7 && this.shieldDecayRate > 0) {
      this.shield = Math.max(0, this.shield - this.shieldDecayRate * dt);
      if (this.shield <= 0) {
        this.shield = 0;
        this.shieldDecayRate = 0;
      }
    }
    
    // id:7 유닛 체력에 따른 공격 속도 증가
    if (this.operatorId === 7) {
      const healthRatio = this.health / this.maxHealth;
      // 체력 비율에 따라 공격 속도 증가 (100%: 10%, 50%: 30%, 50% 이하: 30% 유지)
      let attackSpeedBonus;
      if (healthRatio >= 0.5) {
        // 체력 100%에서 50%까지: 10%에서 30%로 증가
        attackSpeedBonus = 0.1 + (1 - healthRatio) / 0.5 * 0.2; // 10% ~ 30%
      } else {
        // 체력 50% 이하: 최대값 30% 유지
        attackSpeedBonus = 0.3;
      }
      this.attackInterval = this.baseAttackInterval / (1 + attackSpeedBonus);
    }
    
    // id:10 유닛 스킬 사격 타이머 관리
    if (this.operatorId === 10 && this.skillActive) {
      // 사격 타이머 감소
      if (this.skillShotTimer > 0) {
        this.skillShotTimer -= dt;
      }
    }
    
    if (this.skillActive) {
      // 스킬 활성화 중: 지속 시간 감소
      this.skillDuration -= dt;
      
      // id 2인 아군: 지속시간 동안 id:16 유닛 버프 및 코스트 획득
      if (this.operatorId === 2) {
        // id:16 유닛 찾기 및 버프 적용
        const id16Operators = operators.filter(op => op.operatorId === 16 && op.deployed && !op.isRecovering);
        id16Operators.forEach(op => {
          if (op.skillAttackPowerBonus === 0) {
            op.skillAttackPowerBonus = 0.25; // 25% 증가
            op.skillDefenseBonus = 0.25; // 25% 증가
            op.attackPower = op.baseAttackPower * (1 + op.skillAttackPowerBonus);
            op.defense = op.baseDefense * (1 + op.skillDefenseBonus);
          }
        });
        
        // 지속시간 동안 총 12 코스트를 점진적으로 획득
        const costPerSecond = this.skillCostTarget / this.skillDurationMax;
        const costGain = costPerSecond * dt;
        this.skillCostTotal += costGain;
        if (this.skillCostTotal >= 1) {
          const costToAdd = Math.floor(this.skillCostTotal);
          currentCost = Math.min(maxCost, currentCost + costToAdd);
          this.skillCostTotal -= costToAdd;
        }
        
        // 지속시간 종료 시 스킬 비활성화 및 버프 제거
        if (this.skillDuration <= 0) {
          this.skillActive = false;
          this.skillGauge = 0; // 스킬 게이지 0으로 초기화
          // id:16 유닛 버프 제거
          id16Operators.forEach(op => {
            op.skillAttackPowerBonus = 0;
            op.skillDefenseBonus = 0;
            op.attackPower = op.baseAttackPower;
            op.defense = op.baseDefense;
          });
        }
      }
      
      // id 1인 아군: 지속시간 동안 추가 공격 타이머 처리
      if (this.operatorId === 1) {
        if (this.skillHasAttacked && !this.skillExtraAttackDone && this.skillNextAttackTimer > 0) {
          this.skillNextAttackTimer -= dt;
        }
        
        // 지속시간 종료 시 스킬 비활성화
        if (this.skillDuration <= 0) {
          this.skillActive = false;
          this.skillHasAttacked = false;
          this.skillExtraAttackDone = false;
          this.skillNextAttackTimer = 0;
          this.skillCooldownAfterEnd = this.attackInterval - 0.15; // 스킬 종료 후 공격 속도만큼 쿨다운 (재발동 방지)
        }
      }
      
      // id 0인 아군: 지속 시간 동안 매초마다 1.5 코스트 획득 (코스트 게이지와 별개, 즉시 지급)
      if (this.operatorId === 0) {
        if (!this.skillInstantCostGiven) {
          currentCost = Math.min(maxCost, currentCost + 1.5); // 발동 즉시 1틱 지급
          this.skillInstantCostGiven = true;
        }
        this.skillCostTimer += dt;
        if (this.skillCostTimer >= 1.0) {
          // 매초마다 1.5 코스트 획득
          currentCost = Math.min(maxCost, currentCost + 1.5);
          this.skillCostTimer = 0;
        }
        
        // 스킬 이펙트 업데이트 (왼쪽 -> 오른쪽 -> 중앙 -> 왼쪽 반복)
        this.skillEffectTimer += dt;
        const effectDuration = 1; // 각 C가 표시되는 시간 (0.1초)
        
        if (this.skillCEffects) {
          // 모든 C의 lifetime 업데이트 및 위로 올라가기
          this.skillCEffects.forEach(effect => {
            if (effect.show) {
              effect.lifetime += dt;
              // 위로 올라가기 (각 이펙트마다 다른 최대 이동 거리 사용)
              const offsetY = (effect.lifetime / effectDuration) * effect.maxOffset;
              effect.y = effect.startY - offsetY;
              
              // 0.1초 후 사라짐
              if (effect.lifetime >= effectDuration) {
                effect.show = false;
                effect.lifetime = 0;
                effect.y = effect.startY; // 위치 초기화
              }
            }
          });
          
          // 현재 인덱스의 C 표시 시작
          if (this.skillEffectTimer >= effectDuration) {
            this.skillEffectIndex = (this.skillEffectIndex + 1) % 3; // 0->1->2->0 반복
            this.skillEffectTimer = 0;
            
            // 다음 C 표시 시작
            const nextEffect = this.skillCEffects[this.skillEffectIndex];
            nextEffect.show = true;
            nextEffect.lifetime = 0;
            nextEffect.y = nextEffect.startY;
          }
          
          // 첫 번째 C 표시 시작 (스킬 발동 직후)
          if (this.skillEffectTimer < effectDuration && !this.skillCEffects[this.skillEffectIndex].show) {
            const firstEffect = this.skillCEffects[this.skillEffectIndex];
            firstEffect.show = true;
            firstEffect.lifetime = 0;
            firstEffect.y = firstEffect.startY;
          }
        }
      }
      
      // 유닛 8의 스킬 오브젝트 업데이트
      if (this.operatorId === 8 && this.skillOrbs.length > 0) {
        this.updateSkillOrbs(dt);
      }
      
      // 유닛 13의 장판 업데이트
      if (this.operatorId === 13 && this.skillZone && this.skillActive) {
        this.skillZone.update(dt);
      }
      
      // id:11 유닛의 장판 이펙트 업데이트
      if (this.operatorId === 11 && this.attackZoneEffect) {
        this.attackZoneEffect.timer -= dt;
        if (this.attackZoneEffect.timer <= 0) {
          this.attackZoneEffect = null; // 이펙트 제거
        }
      }
      
      if (this.skillDuration <= 0) {
        // 스킬 종료
        this.skillActive = false;
        if (this.operatorId === 0) {
          this.skillGauge = 0; // SP 0으로 초기화
          this.skillCostTimer = 0; // 타이머 초기화
          this.skillInstantCostGiven = false;
          // 스킬 이펙트 초기화
          this.skillEffectTimer = 0;
          this.skillEffectIndex = 0;
          if (this.skillCEffects) {
            this.skillCEffects.forEach(effect => effect.show = false);
          }
        } else if (this.operatorId === 6) {
          // id 6인 아군: 스킬 종료 후 10초 동안 저지 수 0, 공격 불가
          this.skillPostDuration = this.skillPostDurationMax;
          this.isSkillDisabled = true;
          // 저지 수 0으로 설정 (저지 중인 적 모두 해제)
          this.maxBlockCount = 0;
          this.blockedEnemies.forEach(enemy => {
            // 적의 저지 상태는 그대로 유지 (적이 이동 가능해짐)
          });
          this.blockedEnemies = [];
          this.blockCount = 0;
          this.isBlocking = false;
        } else if (this.operatorId === 7) {
          // id 7인 아군: 스킬 종료 시 보호막 감소 시작 및 저지 수 복구
          this.shieldDecayRate = this.maxShield / 5; // 5초에 걸쳐 보호막 감소
          // 저지 수 복구
          const opData = window.operatorData || [];
          const data = opData.find(d => d.id === 7) || {};
          this.maxBlockCount = data.blockCount || 3;
          // 현재 저지 중인 적 수가 최대 저지 수를 초과하면 초과분 해제
          if (this.blockCount > this.maxBlockCount) {
            const excessCount = this.blockCount - this.maxBlockCount;
            for (let i = 0; i < excessCount; i++) {
              if (this.blockedEnemies.length > 0) {
                const enemy = this.blockedEnemies.pop();
                this.blockCount--;
              }
            }
            if (this.blockCount === 0) {
              this.isBlocking = false;
            }
          }
        } else if (this.operatorId === 3) {
          this.skillGauge = 0; // SP 0으로 초기화
          // 스킬 종료 시 방어력 및 저지 수 복구
          this.skillDefenseBonus = 0;
          this.defense = this.baseDefense;
          this.maxBlockCount = 3; // 기본 저지 수로 복구
          // 현재 저지 중인 적 수가 최대 저지 수를 초과하면 초과분 해제
          if (this.blockCount > this.maxBlockCount) {
            const excessCount = this.blockCount - this.maxBlockCount;
            // 초과하는 적들을 해제
            for (let i = 0; i < excessCount; i++) {
              if (this.blockedEnemies.length > 0) {
                const enemy = this.blockedEnemies.pop();
                this.blockCount--;
              }
            }
            if (this.blockCount === 0) {
              this.isBlocking = false;
            }
          }
        } else if (this.operatorId === 8) {
          this.skillOrbs = []; // 오브젝트 제거
          this.skillGauge = 0; // 게이지 초기화
        } else if (this.operatorId === 9) {
          // id 9인 아군: 스킬 종료 시 공격 간격 복구
          this.attackInterval = this.baseAttackInterval;
        } else if (this.operatorId === 10) {
          // id 10인 아군: 스킬 종료 시 사격 횟수 및 타이머 초기화
          this.skillShotCount = 0;
          this.skillShotTimer = 0;
          this.attackRange = this.originalAttackRange; // 공격 범위 복구
        } else if (this.operatorId === 14) {
          // id 14인 아군: 스킬 종료 시 공격 간격 복구
          this.attackInterval = this.baseAttackInterval;
        } else if (this.operatorId === 13) {
          // 장판 제거
          if (this.skillZone) {
            this.skillZone.active = false;
            const zoneIndex = skillZones.indexOf(this.skillZone);
            if (zoneIndex > -1) {
              skillZones.splice(zoneIndex, 1);
            }
            this.skillZone = null;
          }
          this.skillOrbs = []; // 오브젝트 제거
          this.skillGauge = 0; // 게이지 초기화
        }
      }
    }
    
    // 메딕 (id 14~15)은 적을 공격하지 않고 아군 회복
    if (this.operatorId >= 14 && this.operatorId <= 15) {
      this.attackCooldown -= dt;
      
      if (this.attackCooldown <= 0) {
        const allies = this.findAlliesInRange();
        
        if (allies.length > 0) {
          // id 15는 아군 3명 동시 회복, id 14는 1명만 회복
          const healCount = this.operatorId === 15 ? Math.min(3, allies.length) : 1;
          
          for (let i = 0; i < healCount; i++) {
            const ally = allies[i];
            const healAmount = this.attackPower;
            const oldHealth = ally.health;
            
            // 체력 회복 (공격력만큼 회복, 최대 체력 초과 불가)
            ally.health = Math.min(ally.maxHealth, ally.health + healAmount);
            
            // 회복 이펙트 생성 (유닛 중앙에서 시작)
            healEffects.push(new HealEffect(ally.x, ally.y, healAmount));
          }
          
          this.attackCooldown = this.attackInterval;
        }
      }
      return; // 메딕은 공격하지 않음
    }
    
    // id 0인 아군은 스킬 활성화 중일 때 공격하지 않음
    if (this.operatorId === 0 && this.skillActive) {
      return; // 공격하지 않음
    }
    
    
    // id 13인 아군은 스킬 활성화 중일 때 공격하지 않음
    if (this.operatorId === 13 && this.skillActive) {
      return; // 공격하지 않음
    }
    
    // id:16 유닛은 회복 중일 때 공격하지 않음
    if (this.operatorId === 16 && this.isRecovering) {
      return; // 공격하지 않음
    }
    
    // id 6인 아군: 스킬 종료 후 10초 동안 공격 불가
    if (this.operatorId === 6 && this.isSkillDisabled) {
      return; // 공격하지 않음
    }
    
    // 일반 아군은 적 공격
    // 공격 범위 내 적 찾기
    const targets = this.findTargetsInRange();
    
    // id 1인 아군: 스킬 활성화 중이면 공격력 60% 증가
    // id 5인 아군: 스킬 활성화 중이면 공격력 100% 증가
    // id 6인 아군: 스킬 활성화 중이면 공격력 60% 증가
    // id 7인 아군: 스킬 활성화 중이면 공격력 100% 증가
    // id 9인 아군: 스킬 활성화 중이면 공격력 140% 증가, 공격 속도 0.4 감소
    // id 10인 아군: 스킬 활성화 중이면 공격력 5% 증가, 0.2초 간격으로 3번 사격, 최대 2명 동시 공격
    let attackCount = 1; // 기본 공격 횟수
    let currentAttackPower = this.attackPower; // 현재 공격력
    let isSkillAttack = false; // 스킬 공격 여부
    
    // 스킬 활성화 중이면 공격력 증가
    if (this.operatorId === 1 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.6; // 공격력 60% 증가
    } else if (this.operatorId === 5 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 2.0; // 공격력 100% 증가
    } else if (this.operatorId === 6 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.6; // 공격력 60% 증가
    } else if (this.operatorId === 7 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 2.0; // 공격력 100% 증가
    } else if (this.operatorId === 9 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 2.4; // 공격력 140% 증가
      // 공격 속도 0.4 감소 (공격 간격 증가)
      this.attackInterval = this.baseAttackInterval + 0.4;
    } else if (this.operatorId === 9 && !this.skillActive) {
      // 스킬 비활성화 시 기본 공격 간격으로 복구
      this.attackInterval = this.baseAttackInterval;
    } else if (this.operatorId === 10 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.05; // 공격력 5% 증가
    } else if (this.operatorId === 11 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.5; // 공격력 50% 증가
    } else if (this.operatorId === 12 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 2.6; // 공격력 160% 증가
    } else if (this.operatorId === 14 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.5; // 공격력 50% 증가
      // 공격 속도 10% 증가 (공격 간격 감소)
      this.attackInterval = this.baseAttackInterval / 1.1;
    } else if (this.operatorId === 14 && !this.skillActive) {
      // 스킬 비활성화 시 기본 공격 간격으로 복구
      this.attackInterval = this.baseAttackInterval;
    } else if (this.operatorId === 15 && this.skillActive) {
      isSkillAttack = true;
      currentAttackPower = this.attackPower * 1.5; // 공격력 50% 증가
    }
    
    // id 7인 아군: 스킬 활성화 중이면 저지 중인 모든 적을 동시에 공격
    // id 10인 아군: 스킬 활성화 중이면 최대 2명의 적을 동시에 공격
    // id 11인 아군: 공격 범위 안의 모든 적을 공격
    let targetsToAttack = [];
    if (this.operatorId === 7 && this.skillActive && this.blockedEnemies.length > 0) {
      targetsToAttack = this.blockedEnemies.filter(enemy => enemy.active);
    } else if (this.operatorId === 10 && this.skillActive) {
      // 최대 2명의 적을 동시에 공격
      targetsToAttack = targets.slice(0, 2);
    } else if (this.operatorId === 11) {
      // 공격 범위 안의 모든 적을 공격
      targetsToAttack = targets;
    } else {
      targetsToAttack = targets.length > 0 ? [targets[0]] : [];
    }
    
    // 공격 가능하고 타겟이 있으면 공격
    // id 1인 아군: 스킬 활성화 중이고 추가 공격 타이머가 0 이하이고 아직 추가 공격을 하지 않았으면 즉시 공격
    // id 10인 아군: 스킬 활성화 중이고 일반 공격 쿨다운이 0 이하일 때 첫 사격 시작, 이후 0.1초 간격으로 3발 사격
    const canAttack = this.attackCooldown <= 0 && targetsToAttack.length > 0;
    const canExtraAttack = this.operatorId === 1 && this.skillActive && this.skillHasAttacked && !this.skillExtraAttackDone && this.skillNextAttackTimer <= 0 && targets.length > 0;
    // id:10 스킬 사격: 일반 공격 쿨다운이 0이고 첫 사격이거나, 사격 횟수가 3번 미만이고 사격 타이머가 0 이하
    const canSkillShot = this.operatorId === 10 && this.skillActive && targets.length > 0 && 
                         ((this.attackCooldown <= 0 && this.skillShotCount === 0) || 
                          (this.skillShotCount > 0 && this.skillShotCount < this.skillMaxShots && this.skillShotTimer <= 0));
    
    if (canAttack || canExtraAttack || canSkillShot) {
      // 모든 유닛의 공격 이미지 타이머 설정 (이미지 시스템이 있는 유닛)
      if (this.images && this.attackImageTimer !== undefined && canAttack) {
        this.attackImageTimer = 0.5; // 0.5초 동안 공격 이미지 표시
      }
      
      // id 7인 경우 저지 중인 모든 적을 공격
      // id 10인 경우 스킬 사격 시 최대 2명의 적을 공격
      // 그 외는 첫 번째 타겟만 공격
      let targetsList;
      if (this.operatorId === 7 && this.skillActive && this.blockedEnemies.length > 0) {
        targetsList = targetsToAttack;
      } else if (canSkillShot) {
        targetsList = targetsToAttack; // 최대 2명
      } else {
        targetsList = canExtraAttack ? [targets[0]] : targetsToAttack;
      }
      
      const damageType = getDamageType(this.operatorId, true);
      // 공격력 결정 (스킬 활성화 중이면 증가된 공격력 사용)
      const attackPowerToUse = isSkillAttack ? currentAttackPower : this.attackPower;
      const rangeInfo = this.parseAttackRange();
      
      // id:11 유닛의 경우 장판 이펙트 생성 (이전 장판이 있으면 먼저 제거)
      if (this.operatorId === 11 && canAttack) {
        // 이전 장판이 있으면 제거
        if (this.attackZoneEffect) {
          this.attackZoneEffect = null;
        }
        this.attackZoneEffect = {
          timer: 0.3, // 0.3초 동안 표시
          tiles: this.getAttackRangeTiles() // 공격 범위 타일들
        };
      }
      
      targetsList.forEach(target => {
        // id:11 유닛은 장판형 공격으로 즉시 피해
        if (this.operatorId === 11) {
          // 즉시 피해
          const oldHealth = target.health;
          const finalDamage = calculateDamage(attackPowerToUse, damageType, target.defense, target.magicResist);
          target.health -= finalDamage;
          
          // 피격 이펙트 생성
          hitEffects.push(new HitEffect(target.x, target.y));
          
          // id:11 스킬로 인한 피해면 피해 수치 표시
          if (isSkillAttack) {
            damageEffects.push(new DamageEffect(target.x, target.y - target.radius, finalDamage));
          }
          
          // 체력이 감소했는지 추적
          if (target.health < oldHealth) {
            target.hasTakenDamage = true;
          }
          
          // 적이 죽었는지 확인
          if (target.health <= 0) {
            target.active = false;
            // 적이 죽으면 모든 아군의 저지 목록에서 제거
            operators.forEach(operator => {
              const blockIndex = operator.blockedEnemies.indexOf(target);
              if (blockIndex > -1) {
                operator.blockedEnemies.splice(blockIndex, 1);
                operator.blockCount--;
                if (operator.blockCount === 0) {
                  operator.isBlocking = false;
                }
              }
            });
          }
        }
        // 사거리가 1인 경우 즉시 피해 + 피격 이펙트
        else if (rangeInfo.type === 'single' && rangeInfo.forward === 1) {
          // 즉시 피해
          const oldHealth = target.health;
          const finalDamage = calculateDamage(attackPowerToUse, damageType, target.defense, target.magicResist);
          target.health -= finalDamage;
          
          // 피격 이펙트 생성
          hitEffects.push(new HitEffect(target.x, target.y));
          
          // id 1, 5, 9, 11, 12 유닛의 스킬로 인한 피해면 피해 수치 표시
          if ((this.operatorId === 1 || this.operatorId === 5 || this.operatorId === 9 || this.operatorId === 11 || this.operatorId === 12) && isSkillAttack) {
            damageEffects.push(new DamageEffect(target.x, target.y - target.radius, finalDamage));
          }
          
          // id:12 유닛의 스킬로 인한 피해면 주변 적들에게 스플래시 데미지
          if (this.operatorId === 12 && isSkillAttack) {
            this.applySplashDamage(target, finalDamage, damageType);
          }
          
          // id 9 유닛의 스킬로 인한 피해면 적에게 방어력 감소 디버프 적용
          if (this.operatorId === 9 && this.skillActive && isSkillAttack) {
            // baseDefense가 없거나 디버프가 비활성화되어 있으면 기본 방어력 저장
            if (!target.baseDefense || !target.defenseDebuffActive) {
              target.baseDefense = target.defense; // 기본 방어력 저장
            }
            target.defenseDebuffTimer = 5.0; // 5초간 지속
            target.defenseDebuffActive = true;
          }
          
          // 체력이 감소했는지 추적
          if (target.health < oldHealth) {
            target.hasTakenDamage = true;
          }
          
          // id 1 유닛의 스킬로 인한 피해로 적이 죽었으면 코스트 1 획득 (지속시간 안에 처치)
          if (target.health <= 0) {
            if (this.operatorId === 1 && this.skillActive && isSkillAttack) {
              currentCost = Math.min(maxCost, currentCost + 1);
            }
            // id:3 유닛은 HP 0이 되어도 퇴각하지 않고 특수 능력 발동 (배치당 1번만)
            if (target.operatorId === 3 && !target.specialAbilityUsed) {
              target.specialAbilityUsed = true;
              target.specialAbilityActive = true;
              // 최대 체력과 방어력 50% 감소 (먼저 적용)
              target.maxHealth = Math.floor(target.baseMaxHealth * 0.5);
              target.defense = Math.floor(target.baseDefense * 0.5);
              // 체력을 최대 체력으로 회복
              target.health = target.maxHealth;
              // 공격력과 공격 속도 18% 증가
              target.attackPower = Math.floor(target.baseAttackPower * 1.18);
              target.attackInterval = target.baseAttackInterval / 1.18; // 공격 속도 증가 (간격 감소)
            } else if (target.operatorId === 16 && !target.isRecovering) {
              // id:16 유닛은 HP 0이 되어도 퇴각하지 않고 회복 상태로 전환
              target.health = 0;
              target.isRecovering = true;
              target.recoveryTimer = target.recoveryDuration;
              target.blockCount = 0;
              target.maxBlockCount = 0;
              // 저지 중인 적들 해제
              target.blockedEnemies.forEach(enemy => {
                // 적의 저지 목록에서 이 유닛 제거
                const blockIndex = enemy.blockedEnemies ? enemy.blockedEnemies.indexOf(target) : -1;
                if (blockIndex > -1 && enemy.blockedEnemies) {
                  enemy.blockedEnemies.splice(blockIndex, 1);
                }
              });
              target.blockedEnemies = [];
              target.isBlocking = false;
            } else {
              // 일반 적은 죽음 처리
              target.active = false;
              // 적이 죽으면 모든 아군의 저지 목록에서 제거
              operators.forEach(operator => {
                const blockIndex = operator.blockedEnemies.indexOf(target);
                if (blockIndex > -1) {
                  operator.blockedEnemies.splice(blockIndex, 1);
                  operator.blockCount--;
                  if (operator.blockCount === 0) {
                    operator.isBlocking = false;
                  }
                }
              });
            }
          }
        } else if (this.operatorId !== 11) {
          // 원거리 공격: 투사체 발사 (적 객체를 전달하여 추적하도록 함)
          // id:11은 장판형 공격이므로 투사체 발사하지 않음
          projectiles.push(new Projectile(this.x, this.y, target, attackPowerToUse, damageType, isSkillAttack, this.operatorId));
        }
      }); // id:7의 forEach 종료
      
      // id 1인 아군: 스킬 활성화 중 첫 공격 후 0.1초 후 추가 공격 설정 (1번만)
      if (this.operatorId === 1 && this.skillActive) {
        if (!this.skillHasAttacked && canAttack && targetsList.length > 0) {
          // 첫 공격 완료
          this.skillHasAttacked = true;
          this.skillNextAttackTimer = 0.1; // 0.1초 후 추가 공격
        } else if (canExtraAttack && !this.skillExtraAttackDone && targetsList.length > 0) {
          // 추가 공격 완료 (1번만) - 추가 공격 후 스킬 종료
          this.skillExtraAttackDone = true;
          this.skillNextAttackTimer = 0; // 타이머 리셋
          this.skillActive = false; // 스킬 종료
          this.skillDuration = 0;
          this.skillCooldownAfterEnd = this.attackInterval - 0.15; // 스킬 종료 후 공격 속도만큼 쿨다운 (재발동 방지)
        }
      }
      
      // id 5, 11인 아군: 1회 공격 후 스킬 즉시 종료 (공격이 실제로 발생했을 때만)
      if ((this.operatorId === 5 || this.operatorId === 11) && this.skillActive && canAttack && targetsList.length > 0) {
        // 첫 공격 후 스킬 즉시 종료
        this.skillActive = false;
        this.skillDuration = 0;
        // id:11만 쿨다운 설정 (id:5는 충전형이 아님)
        if (this.operatorId === 11) {
          this.skillCooldownAfterEnd = this.attackInterval - 0.15; // 스킬 종료 후 공격 속도만큼 쿨다운 (재발동 방지)
        }
      }
      
      // id 10인 아군: 스킬 활성화 중 사격 횟수 증가 및 다음 사격 타이머 설정
      if (this.operatorId === 10 && this.skillActive && canSkillShot) {
        this.skillShotCount++;
        if (this.skillShotCount < this.skillMaxShots) {
          // 아직 3발 미완료면 다음 사격 타이머 설정
          this.skillShotTimer = this.skillShotInterval; // 0.1초 후 다음 사격
        } else {
          // 3발 사격 완료 시 일반 공격 쿨다운 적용
      this.attackCooldown = this.attackInterval;
          this.skillShotCount = 0; // 사격 횟수 리셋
          this.skillShotTimer = 0;
        }
      }
      
      // id 5인 아군: 공격 시 SP 1 회복 (스킬 활성화 중이 아니고 최대 SP 미만일 때만)
      if (this.operatorId === 5 && !this.skillActive && this.skillGauge < this.skillGaugeMax) {
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + 1);
      }
      
      // id 10인 아군: 공격 시 SP 회복 (스킬 활성화 중이 아니고 최대 SP 미만일 때만)
      if (this.operatorId === 10 && !this.skillActive && this.skillGauge < this.skillGaugeMax) {
        // 공격 시 SP 증가량은 적절히 설정 (예: 1 또는 공격력에 비례)
        this.skillGauge = Math.min(this.skillGaugeMax, this.skillGauge + 1);
      }
      
      // id 7인 아군: 공격 시 체력 30 회복
      if (this.operatorId === 7) {
        this.health = Math.min(this.maxHealth, this.health + 30);
      }
      
      // 일반 공격 쿨다운 설정
      // id:10 스킬 사격의 경우, 3발 사격 완료 후 attack 함수 내에서 쿨다운 적용되므로 여기서는 적용하지 않음
      if (!canExtraAttack && !canSkillShot) {
        this.attackCooldown = this.attackInterval;
      }
      
      // id:11 유닛의 공격이 완료되면 장판 이펙트 제거
      if (this.operatorId === 11 && this.attackZoneEffect) {
        this.attackZoneEffect = null;
      }
      
      // id:12 유닛의 공격이 완료되면 스킬 종료
      if (this.operatorId === 12 && this.skillActive && canAttack && targetsList.length > 0) {
        this.skillActive = false;
        this.skillDuration = 0;
        this.skillCooldownAfterEnd = this.attackInterval - 0.15; // 스킬 종료 후 공격 속도만큼 쿨다운 (재발동 방지)
      }
    }
  }
  
  // id:12 유닛의 스플래시 데미지 적용 함수
  applySplashDamage(primaryTarget, primaryDamage, damageType) {
    if (!primaryTarget || !primaryTarget.active) return;
    
    const splashRadius = tileSize * 0.5; // 0.5 타일 반경
    const splashDamage = primaryDamage * 0.5; // 절반의 피해
    
    // 모든 적을 확인하여 주변 적들에게 스플래시 데미지 적용
    enemies.forEach(enemy => {
      if (!enemy.active || enemy === primaryTarget) return; // 주 타겟은 제외
      
      // 주 타겟과의 거리 계산
      const dx = enemy.x - primaryTarget.x;
      const dy = enemy.y - primaryTarget.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 0.5 타일 반경 내에 있으면 스플래시 데미지 적용
      if (distance <= splashRadius + enemy.radius) {
        const oldHealth = enemy.health;
        const finalSplashDamage = calculateDamage(splashDamage, damageType, enemy.defense, enemy.magicResist);
        enemy.health -= finalSplashDamage;
        
        // 피격 이펙트 생성
        hitEffects.push(new HitEffect(enemy.x, enemy.y));
        
        // 피해 수치 표시
        damageEffects.push(new DamageEffect(enemy.x, enemy.y - enemy.radius, finalSplashDamage));
        
        // 체력이 감소했는지 추적
        if (enemy.health < oldHealth) {
          enemy.hasTakenDamage = true;
        }
        
        // 적이 죽었는지 확인
        if (enemy.health <= 0) {
          enemy.active = false;
          // 처치 수 증가 (중복 카운트 방지)
          if (!enemy.isKilled && gameState === 'playing') {
            enemy.isKilled = true;
            enemiesKilled++;
          }
          // 적이 죽으면 모든 아군의 저지 목록에서 제거
          operators.forEach(operator => {
            const blockIndex = operator.blockedEnemies.indexOf(enemy);
            if (blockIndex > -1) {
              operator.blockedEnemies.splice(blockIndex, 1);
              operator.blockCount--;
              if (operator.blockCount === 0) {
                operator.isBlocking = false;
              }
            }
          });
        }
      }
    });
  }
  
  // 유닛 8의 스킬 오브젝트 업데이트
  updateSkillOrbs(dt) {
    const orbSpacing = 8;
    const topY = this.y - this.radius; // 유닛의 가장 위 y 좌표
    
    // 배치 방향 확인
    const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.direction) < 0.2;
    
    // 적 지역이 있는 방향 찾기
    let enemyBaseX = 0;
    let enemyBaseY = 0;
    let foundEnemyBase = false;
    
    for (let y = 0; y < rows && !foundEnemyBase; y++) {
      for (let x = 0; x < cols && !foundEnemyBase; x++) {
        if (mapData[y]?.[x] === TILE_ENEMYBASE) {
          enemyBaseX = x;
          enemyBaseY = y;
          foundEnemyBase = true;
        }
      }
    }
    
    // 유닛의 타일 좌표
    const unitTileX = this.tileX;
    const unitTileY = this.tileY;
    
    // 적 지역이 있는 방향 결정
    let orbSide = 1; // 1: 오른쪽, -1: 왼쪽
    if (isUp || isDown) {
      // 위 또는 아래 방향일 경우 적 지역이 있는 방향의 반대편
      if (enemyBaseX > unitTileX) {
        orbSide = -1; // 적이 오른쪽에 있으면 왼쪽에 배치
      } else {
        orbSide = 1; // 적이 왼쪽에 있으면 오른쪽에 배치
      }
    } else if (isLeft || isRight) {
      // 좌우 방향일 경우 공격 방향의 반대편 (뒤쪽)
      if (isRight) {
        orbSide = -1; // 오른쪽을 향하면 왼쪽(뒤쪽)에 배치
      } else {
        orbSide = 1; // 왼쪽을 향하면 오른쪽(뒤쪽)에 배치
      }
    }
    
    // 유닛 8의 공격 범위 내 적 찾기 (작은 원이 아닌 유닛 8의 범위 사용)
    const targetsInRange = this.findTargetsInRange();
    
    this.skillOrbs.forEach((orb, i) => {
      orb.attackCooldown -= dt;
      
      // 위치 업데이트 (왼쪽 또는 오른쪽에만)
      const sideOffset = orbSide * (this.radius + 15 + i * orbSpacing * 0.5);
      orb.x = this.x + sideOffset;
      orb.y = topY; // 유닛의 가장 위 y 좌표와 같게
      
      // 유닛 8의 공격 범위 내 적만 공격
      if (orb.attackCooldown <= 0 && targetsInRange.length > 0) {
        const target = targetsInRange[0];
        const damageType = getDamageType(this.operatorId, true);
        projectiles.push(new Projectile(orb.x, orb.y, target, this.attackPower, damageType));
        orb.attackCooldown = orb.attackInterval;
      }
    });
  }
  
  // 스킬 사용
  useSkill() {
    // 유닛 0, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15만 스킬 사용 가능
    if (this.operatorId !== 0 && this.operatorId !== 2 && this.operatorId !== 3 && this.operatorId !== 6 && this.operatorId !== 7 && this.operatorId !== 8 && this.operatorId !== 9 && this.operatorId !== 10 && this.operatorId !== 13 && this.operatorId !== 14 && this.operatorId !== 15) return false;
    
    // 스킬 게이지가 가득 차있고, 스킬이 활성화되지 않았을 때만 사용 가능
    if (this.skillGauge >= this.skillGaugeMax && !this.skillActive) {
      this.skillActive = true;
      this.skillDuration = this.skillDurationMax;
      this.showSkillIcon = false; // 스킬 아이콘 숨김
      this.showAttackRange = false; // 공격 범위 표시 숨김
      
      // SP 소모
      this.skillGauge = Math.max(0, this.skillGauge - this.skillGaugeMax);
      
      // 유닛 0: 저지수 0으로 설정, 공격 불가
      if (this.operatorId === 0) {
        // 저지수 0으로 설정 (저지 중인 적 모두 해제)
        this.blockCount = 0;
        this.blockedEnemies.forEach(enemy => {
          // 적의 저지 상태는 그대로 유지 (적이 이동 가능해짐)
        });
        this.blockedEnemies = [];
        this.isBlocking = false;
        this.skillCostTimer = 0; // 코스트 타이머 초기화
        this.skillInstantCostGiven = false; // 즉시 코스트 지급 플래그 초기화
        // 스킬 이펙트 초기화
        this.skillEffectTimer = 0; // 스킬 이펙트 타이머
        this.skillEffectIndex = 0; // 현재 표시할 C 인덱스 (0: 왼쪽, 1: 오른쪽, 2: 중앙)
        this.skillCEffects = [
          { x: this.x - 12, y: this.y + 21, startY: this.y + 21, maxOffset: 200, lifetime: 0, show: false }, // 왼쪽
          { x: this.x + 12, y: this.y + 17, startY: this.y + 17, maxOffset: 200, lifetime: 0, show: false }, // 오른쪽
          { x: this.x, y: this.y + 13, startY: this.y + 13, maxOffset: 200, lifetime: 0, show: false } // 중앙
        ];
      } else if (this.operatorId === 2) {
        // id 2: 스킬 활성화 시 코스트 획득 타이머 초기화
        this.skillCostTotal = 0; // 코스트 획득 누적값 초기화
      } else if (this.operatorId === 3) {
        // id 3: 스킬 활성화 시 방어력 70% 증가 및 저지 수 1 증가
        this.skillDefenseBonus = 0.7; // 방어력 70% 증가
        this.defense = this.baseDefense * (1 + this.skillDefenseBonus);
        this.maxBlockCount = (this.maxBlockCount || 3) + 1; // 저지 수 1 증가
      }
      // 유닛 8: 작은 원 3개 생성
      else if (this.operatorId === 8) {
        this.createSkillOrbs();
      // 유닛 13: 장판 소환 및 공격 불가
      } else if (this.operatorId === 13) {
        // 기존 오브젝트 제거
        this.skillOrbs = [];
        // 장판 생성 (공격 범위 타일들을 계산하여 저장)
        this.skillZone = new SkillZone(this.x, this.y, this);
        skillZones.push(this.skillZone);
      } else if (this.operatorId === 7) {
        // id 7: 스킬 발동 시 체력 50% 감소 및 보호막 획득
        this.health = Math.max(1, Math.floor(this.health * 0.5)); // 체력 50% 감소 (최소 1)
        this.maxShield = Math.floor(this.maxHealth * 0.7); // 최대 체력의 70% 보호막
        this.shield = this.maxShield;
        this.shieldDecayRate = 0; // 스킬 활성화 중에는 보호막 감소하지 않음
        // 저지 수 1 증가
        this.maxBlockCount = (this.maxBlockCount || 3) + 1;
      } else if (this.operatorId === 10) {
        // id 10: 스킬 발동 시 사격 횟수 초기화
        this.skillShotCount = 0; // 사격 횟수 초기화
        this.skillShotTimer = 0; // 사격 타이머 초기화
      }
      
      return true;
    }
    return false;
  }
  
  // 유닛 8의 스킬 오브젝트 생성 (작은 원 3개)
  createSkillOrbs() {
    this.skillOrbs = [];
    const orbRadius = 6; // 작은 원의 반지름
    const orbSpacing = 8; // 원들 사이의 간격
    
    // 유닛의 가장 위 y 좌표
    const topY = this.y - this.radius;
    
    // 배치 방향 확인
    const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
    const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
    const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
    const isRight = Math.abs(this.direction) < 0.2;
    
    // 적 지역이 있는 방향 찾기
    let enemyBaseX = 0;
    let enemyBaseY = 0;
    let foundEnemyBase = false;
    
    for (let y = 0; y < rows && !foundEnemyBase; y++) {
      for (let x = 0; x < cols && !foundEnemyBase; x++) {
        if (mapData[y]?.[x] === TILE_ENEMYBASE) {
          enemyBaseX = x;
          enemyBaseY = y;
          foundEnemyBase = true;
        }
      }
    }
    
    // 유닛의 타일 좌표
    const unitTileX = this.tileX;
    const unitTileY = this.tileY;
    
    // 적 지역이 있는 방향 결정
    let orbSide = 1; // 1: 오른쪽, -1: 왼쪽
    if (isUp || isDown) {
      // 위 또는 아래 방향일 경우 적 지역이 있는 방향의 반대편
      if (enemyBaseX > unitTileX) {
        orbSide = -1; // 적이 오른쪽에 있으면 왼쪽에 배치
      } else {
        orbSide = 1; // 적이 왼쪽에 있으면 오른쪽에 배치
      }
    } else if (isLeft || isRight) {
      // 좌우 방향일 경우 공격 방향의 반대편 (뒤쪽)
      if (isRight) {
        orbSide = -1; // 오른쪽을 향하면 왼쪽(뒤쪽)에 배치
      } else {
        orbSide = 1; // 왼쪽을 향하면 오른쪽(뒤쪽)에 배치
      }
    }
    
    // 3개의 원을 왼쪽 또는 오른쪽에만 배치
    for (let i = 0; i < 3; i++) {
      const sideOffset = orbSide * (this.radius + 15 + i * orbSpacing * 0.5);
      
      this.skillOrbs.push({
        x: this.x + sideOffset,
        y: topY, // 유닛의 가장 위 y 좌표와 같게
        radius: orbRadius,
        attackCooldown: 0,
        attackInterval: 0.3 // 공격 간격
      });
    }
  }
  
  draw(ctx) {
    // 방향 설정 중일 때 공격 범위와 화살표 표시
    if (isSettingDirection && placingOperator === this) {
      // 마우스가 유닛이 있는 타일 밖에 있는지 확인
      const mouseTileX = Math.floor(currentMouseX / tileSize);
      const mouseTileY = Math.floor(currentMouseY / tileSize);
      const unitTileX = this.tileX;
      const unitTileY = this.tileY;
      const isMouseOutsideUnitTile = mouseTileX !== unitTileX || mouseTileY !== unitTileY;
      
      // 마우스가 유닛이 있는 타일 밖에 있을 때만 공격 범위 표시
      if (isMouseOutsideUnitTile) {
        // 공격 범위를 주황색 빗금으로 표시 (방향 기반)
        const attackTiles = this.getAttackRangeTiles();
        ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
        
        // 방향에 따라 빗금 방향 결정
        const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
        const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
        const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
        const isRight = Math.abs(this.direction) < 0.2;
        
        attackTiles.forEach(tile => {
          const px = tile.x * tileSize;
          const py = tile.y * tileSize;
          
          ctx.fillRect(px, py, tileSize, tileSize);
          
          // 방향에 따른 한쪽 빗금 패턴
          ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          if (isUp || isDown || isRight) {
            // 위, 아래, 오른쪽: 왼쪽 위에서 오른쪽 아래로 ↘
            ctx.moveTo(px, py);
            ctx.lineTo(px + tileSize, py + tileSize);
          } else if (isLeft) {
            // 왼쪽: 오른쪽 위에서 왼쪽 아래로 ↙
            ctx.moveTo(px + tileSize, py);
            ctx.lineTo(px, py + tileSize);
          }
          
          ctx.stroke();
        });
      }
      
      // 4방향 화살표 표시
      // 공격 범위가 표시될 때만 선택된 방향을 노란색으로, 아니면 모두 흰색
      const arrowLength = tileSize * 0.6;
      const showSelectedDirection = isMouseOutsideUnitTile; // 공격 범위가 표시될 때만 선택 표시
      
      // 상 (-90도 또는 -π/2)
      const isUpSelected = showSelectedDirection && Math.abs(this.direction + Math.PI / 2) < 0.2;
      ctx.strokeStyle = isUpSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isUpSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isUpSelected ? 4 : 3;
      this.drawArrow(ctx, this.x, this.y - arrowLength, 0, -1, arrowLength);
      
      // 하 (90도 또는 π/2)
      const isDownSelected = showSelectedDirection && Math.abs(this.direction - Math.PI / 2) < 0.2;
      ctx.strokeStyle = isDownSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isDownSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isDownSelected ? 4 : 3;
      this.drawArrow(ctx, this.x, this.y + arrowLength, 0, 1, arrowLength);
      
      // 좌 (180도 또는 π)
      const isLeftSelected = showSelectedDirection && Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
      ctx.strokeStyle = isLeftSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isLeftSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isLeftSelected ? 4 : 3;
      this.drawArrow(ctx, this.x - arrowLength, this.y, -1, 0, arrowLength);
      
      // 우 (0도)
      const isRightSelected = showSelectedDirection && Math.abs(this.direction) < 0.2;
      ctx.strokeStyle = isRightSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isRightSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isRightSelected ? 4 : 3;
      this.drawArrow(ctx, this.x + arrowLength, this.y, 1, 0, arrowLength);
    }
    
    // 배치 중일 때 배치 가능한 타일에만 마름모 표시
    if (this.isPlacing) {
      // 현재 위치의 타일 좌표 계산 (마우스를 따라다닐 때를 위해)
      const currentTileX = Math.floor(this.x / tileSize);
      const currentTileY = Math.floor(this.y / tileSize);
      
      // 배치 가능한 타일인지 확인 (현재 타일 좌표 사용)
      const canDeploy = canDeployOperator(currentTileX, currentTileY, this.operatorId);
      
      if (canDeploy) {
        // 배치 가능한 타일이면 타일 중앙에 고정
        this.tileX = currentTileX;
        this.tileY = currentTileY;
        this.x = currentTileX * tileSize + tileSize / 2;
        this.y = currentTileY * tileSize + tileSize / 2;
        
      // 큰 마름모 그리기
      const diamondSize = tileSize * 2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - diamondSize);
      ctx.lineTo(this.x + diamondSize, this.y);
      ctx.lineTo(this.x, this.y + diamondSize);
      ctx.lineTo(this.x - diamondSize, this.y);
      ctx.closePath();
      ctx.stroke();
      
        // 드래그 중일 때만 공격 범위 표시 (마우스를 놓기 전까지)
        if (isDraggingOperator) {
      // 공격 범위를 주황색 빗금으로 표시 (방향 기반)
      const attackTiles = this.getAttackRangeTiles();
      ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
      
      // 방향에 따라 빗금 방향 결정
      const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
      const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
      const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
      const isRight = Math.abs(this.direction) < 0.2;
      
      attackTiles.forEach(tile => {
        const px = tile.x * tileSize;
        const py = tile.y * tileSize;
        
        ctx.fillRect(px, py, tileSize, tileSize);
        
        // 방향에 따른 한쪽 빗금 패턴
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (isUp || isDown || isRight) {
          // 위, 아래, 오른쪽: 왼쪽 위에서 오른쪽 아래로 ↘
          ctx.moveTo(px, py);
          ctx.lineTo(px + tileSize, py + tileSize);
        } else if (isLeft) {
          // 왼쪽: 오른쪽 위에서 왼쪽 아래로 ↙
          ctx.moveTo(px + tileSize, py);
          ctx.lineTo(px, py + tileSize);
        }
        
        ctx.stroke();
      });
        }
      
        // 화살표는 배치 중일 때 항상 표시
              // 4방향 화살표 표시
      const arrowLength = tileSize * 0.6;
      
      // 상 (-90도 또는 -π/2)
      const isUpSelected = Math.abs(this.direction + Math.PI / 2) < 0.2;
      ctx.strokeStyle = isUpSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isUpSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isUpSelected ? 4 : 3;
      this.drawArrow(ctx, this.x, this.y - arrowLength, 0, -1, arrowLength);
      
      // 하 (90도 또는 π/2)
      const isDownSelected = Math.abs(this.direction - Math.PI / 2) < 0.2;
      ctx.strokeStyle = isDownSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isDownSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isDownSelected ? 4 : 3;
      this.drawArrow(ctx, this.x, this.y + arrowLength, 0, 1, arrowLength);
      
      // 좌 (180도 또는 π)
      const isLeftSelected = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
      ctx.strokeStyle = isLeftSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isLeftSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isLeftSelected ? 4 : 3;
      this.drawArrow(ctx, this.x - arrowLength, this.y, -1, 0, arrowLength);
      
      // 우 (0도)
      const isRightSelected = Math.abs(this.direction) < 0.2;
      ctx.strokeStyle = isRightSelected ? '#ffff00' : '#ffffff';
      ctx.fillStyle = isRightSelected ? '#ffff00' : '#ffffff';
      ctx.lineWidth = isRightSelected ? 4 : 3;
      this.drawArrow(ctx, this.x + arrowLength, this.y, 1, 0, arrowLength);
        
        // 퇴각 아이콘은 배치 중일 때 항상 표시
        const retreatIconOffsetX = -tileSize * 0.7;
        const retreatIconOffsetY = -this.radius - 18;
        this.retreatIconX = this.x + retreatIconOffsetX;
        this.retreatIconY = this.y + retreatIconOffsetY;
        this.showRetreatIcon = true;
      } else {
        // 배치 불가 타일일 때는 퇴각 아이콘 숨김
        this.showRetreatIcon = false;
      }
    }
    
    // 모든 유닛의 이미지 그리기
    if (this.images) {
      let currentImage = null;
      
      // id:0 유닛의 스킬 이미지 처리
      if (this.operatorId === 0) {
        // 스킬 활성화 중일 때는 항상 스킬 이미지 사용
        if (this.skillActive) {
          currentImage = this.images.skill;
        }
        // 공격 이미지 타이머가 활성화되어 있을 때
        else if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:1, id:5, id:11, id:12, id:16 유닛의 이미지 처리 (스킬 이미지 없음)
      else if (this.operatorId === 1 || this.operatorId === 5 || this.operatorId === 11 || this.operatorId === 12 || this.operatorId === 16) {
        // 공격 이미지 타이머가 활성화되어 있을 때
        if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:2 유닛의 스킬 이미지 처리
      else if (this.operatorId === 2) {
        // 스킬 활성화 중일 때는 항상 스킬 이미지 사용 (공격 이미지 무시)
        if (this.skillActive) {
          currentImage = this.images.skill;
        }
        // 공격 이미지 타이머가 활성화되어 있을 때
        else if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:3 유닛의 스킬 이미지 처리 (스킬 발동 또는 능력 발동 후 계속 스킬 이미지 유지)
      else if (this.operatorId === 3) {
        // 스킬 활성화 중이거나 특수 능력 활성화 중일 때
        if (this.skillActive || this.specialAbilityActive) {
          // 공격 이미지 타이머가 활성화되어 있으면 skill2, 아니면 skill
          currentImage = (this.attackImageTimer > 0) ? this.images.skill2 : this.images.skill;
        }
        // 공격 이미지 타이머가 활성화되어 있을 때
        else if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:4, id:8, id:13 유닛의 이미지 처리 (공격/스킬 동일)
      else if (this.operatorId === 4 || this.operatorId === 8 || this.operatorId === 13) {
        // 스킬 활성화 중이거나 공격 이미지 타이머가 활성화되어 있을 때
        if (this.skillActive || this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:6, id:7, id:9, id:10 유닛의 스킬 이미지 처리 (스킬 발동 후 공격 이미지 있음)
      else if (this.operatorId === 6 || this.operatorId === 7 || this.operatorId === 9 || this.operatorId === 10) {
        // 스킬 활성화 중일 때
        if (this.skillActive) {
          // 공격 이미지 타이머가 활성화되어 있으면 skill2, 아니면 skill
          currentImage = (this.attackImageTimer > 0) ? this.images.skill2 : this.images.skill;
        }
        // 공격 이미지 타이머가 활성화되어 있을 때
        else if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:14 유닛의 이미지 처리 (공격/회복/스킬 동일)
      else if (this.operatorId === 14) {
        // 공격 이미지 타이머가 활성화되어 있거나 스킬 활성화 중일 때
        if (this.attackImageTimer > 0 || this.skillActive) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      // id:15 유닛의 스킬 이미지 처리
      else if (this.operatorId === 15) {
        // 스킬 활성화 중일 때
        if (this.skillActive) {
          currentImage = this.skillImageToggle ? this.images.skill2 : this.images.skill;
        }
        // 공격 이미지 타이머가 활성화되어 있을 때
        else if (this.attackImageTimer > 0) {
          currentImage = this.images.attack;
        }
        // 기본 이미지
        else {
          currentImage = this.images.normal;
        }
      }
      
      // 이미지가 로드되었으면 그리기
      if (currentImage && currentImage.complete && currentImage.naturalWidth > 0) {
        const imageWidth = this.radius * 2;
        const imageHeight = this.radius * 3; // 위아래 길이를 늘림
        ctx.save();
        // 방향에 따라 좌우 반전만 적용 (상하 반전 없음)
        ctx.translate(this.x, this.y);
        // 좌우 방향만 반영 (direction이 왼쪽이면 좌우 반전)
        const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
        if (isLeft) {
          ctx.scale(-1, 1); // 좌우 반전만
        }
        ctx.drawImage(currentImage, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
        ctx.restore();
      } else {
        // 이미지가 로드되지 않았으면 기본 원형으로 표시
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // 이미지 시스템이 없는 유닛은 기본 원형으로 표시
    ctx.fillStyle = this.color; // 유닛 데이터의 색상 사용
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    }
    
    // 테두리
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // 방향 표시 (배치 완료 후)
    if (this.deployed && !this.isPlacing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(
        this.x + Math.cos(this.direction) * (this.radius + 10),
        this.y + Math.sin(this.direction) * (this.radius + 10)
      );
      ctx.stroke();
    }
    
    // 배치 완료된 아군을 클릭했을 때 공격 범위 표시
    if (this.deployed && !this.isPlacing && this.showAttackRange) {
      // 공격 범위를 주황색 빗금으로 표시 (방향 기반)
      const attackTiles = this.getAttackRangeTiles();
      ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
      
      // 방향에 따라 빗금 방향 결정
      const isUp = Math.abs(this.direction + Math.PI / 2) < 0.2;
      const isDown = Math.abs(this.direction - Math.PI / 2) < 0.2;
      const isLeft = Math.abs(Math.abs(this.direction) - Math.PI) < 0.2;
      const isRight = Math.abs(this.direction) < 0.2;
      
      attackTiles.forEach(tile => {
        const px = tile.x * tileSize;
        const py = tile.y * tileSize;
        
        ctx.fillRect(px, py, tileSize, tileSize);
        
        // 방향에 따른 한쪽 빗금 패턴
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        if (isUp || isDown || isRight) {
          // 위, 아래, 오른쪽: 왼쪽 위에서 오른쪽 아래로 ↘
          ctx.moveTo(px, py);
          ctx.lineTo(px + tileSize, py + tileSize);
        } else if (isLeft) {
          // 왼쪽: 오른쪽 위에서 왼쪽 아래로 ↙
          ctx.moveTo(px + tileSize, py);
          ctx.lineTo(px, py + tileSize);
        }
        
        ctx.stroke();
      });
    }
    
    // 체력바와 스킬 게이지 바 그리기 (배치 완료된 아군만)
    if (this.deployed && !this.isPlacing) {
      this.drawBars(ctx);
    }
    
    // 폭발물 카운트다운 표시 (id:22 적의 스킬)
    if (this.deployed && !this.isPlacing && this.hasBomb && this.bombTimer > 0) {
      const countdownY = this.y - this.radius; // 아군 원의 테두리에 표시
      const countdownText = Math.ceil(this.bombTimer).toString(); // 올림하여 정수로 표시
      
      // 배경 원
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(this.x, countdownY, 16, 0, Math.PI * 2);
      ctx.fill();
      
      // 카운트다운 텍스트
      ctx.fillStyle = '#ff0000'; // 빨간색
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(countdownText, this.x, countdownY);
    }
    
    // 스킬 게이지가 가득 찼을 때 노란색 마름모 표시 (유닛 0, 2, 3, 6, 7, 8, 9, 10, 13, 14, 15만, 스킬 활성화되지 않았을 때)
    if (this.deployed && !this.isPlacing && (this.operatorId === 0 || this.operatorId === 2 || this.operatorId === 3 || this.operatorId === 6 || this.operatorId === 7 || this.operatorId === 8 || this.operatorId === 9 || this.operatorId === 10 || this.operatorId === 13 || this.operatorId === 14 || this.operatorId === 15) && 
        this.skillGauge >= this.skillGaugeMax && !this.skillActive) {
      const diamondSize = 12;
      ctx.fillStyle = '#ffff00'; // 노란색
      ctx.beginPath();
      // 마름모 위치를 더 위로 올림
      ctx.moveTo(this.x, this.y - this.radius - diamondSize - 16);
      ctx.lineTo(this.x + diamondSize, this.y - this.radius - 16);
      ctx.lineTo(this.x, this.y - this.radius - 16 + diamondSize);
      ctx.lineTo(this.x - diamondSize, this.y - this.radius - 16);
      ctx.closePath();
      ctx.fill();
    }
    
    // id 1인 아군: 스킬 사용 가능 횟수 표시 (마름모 위치에 빈 원 안에 숫자)
    if (this.deployed && !this.isPlacing && this.operatorId === 1 && !this.skillActive) {
      const availableUses = Math.floor(this.skillGauge / this.skillGaugeMax);
      if (availableUses > 0) {
        const circleRadius = 12;
        const circleY = this.y - this.radius - circleRadius - 16; // 마름모 위치와 동일
        
        // 빈 원 그리기
        ctx.strokeStyle = '#ffff00'; // 노란색
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, circleY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 사용 가능 횟수 텍스트 표시
        ctx.fillStyle = '#ffff00'; // 노란색
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(availableUses.toString(), this.x, circleY);
      }
    }
    
    // id 4인 아군: 스킬 사용 가능 여부 표시 (스킬 게이지가 가득 찼을 때만)
    if (this.deployed && !this.isPlacing && this.operatorId === 4 && !this.skillActive && this.skillGauge >= this.skillGaugeMax) {
      const circleRadius = 12;
      const circleY = this.y - this.radius - circleRadius - 16; // 마름모 위치와 동일
      
      // 빈 원 그리기
      ctx.strokeStyle = '#ffff00'; // 노란색
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, circleY, circleRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // 사용 가능 표시 (1)
      ctx.fillStyle = '#ffff00'; // 노란색
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', this.x, circleY);
    }
    
    // id 11인 아군: 스킬 사용 가능 횟수 표시 (마름모 위치에 빈 원 안에 숫자)
    if (this.deployed && !this.isPlacing && this.operatorId === 11 && !this.skillActive) {
      const availableUses = Math.floor(this.skillGauge / this.skillGaugeMax);
      if (availableUses > 0) {
        const circleRadius = 12;
        const circleY = this.y - this.radius - circleRadius - 16; // 마름모 위치와 동일
        
        // 빈 원 그리기
        ctx.strokeStyle = '#ffff00'; // 노란색
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, circleY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 사용 가능 횟수 텍스트 표시
        ctx.fillStyle = '#ffff00'; // 노란색
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(availableUses.toString(), this.x, circleY);
      }
    }
    
    // id 12인 아군: 스킬 사용 가능 횟수 표시 (마름모 위치에 빈 원 안에 숫자)
    if (this.deployed && !this.isPlacing && this.operatorId === 12 && !this.skillActive) {
      const availableUses = Math.floor(this.skillGauge / this.skillGaugeMax);
      if (availableUses > 0) {
        const circleRadius = 12;
        const circleY = this.y - this.radius - circleRadius - 16; // 마름모 위치와 동일
        
        // 빈 원 그리기
        ctx.strokeStyle = '#ffff00'; // 노란색
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, circleY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 사용 가능 횟수 텍스트 표시
        ctx.fillStyle = '#ffff00'; // 노란색
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(availableUses.toString(), this.x, circleY);
      }
    }
    
    // 유닛 0의 스킬 이펙트 그리기 (C 이펙트: 왼쪽 -> 오른쪽 -> 중앙 -> 왼쪽 반복)
    if (this.skillActive && this.operatorId === 0 && this.skillCEffects) {
      this.skillCEffects.forEach(effect => {
        if (effect.show) {
          const effectDuration = 0.1;
          const alpha = 1 - (effect.lifetime / effectDuration); // 시간에 따라 투명해짐
          ctx.fillStyle = `rgba(100, 255, 100, ${alpha})`; // 초록색
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('C', effect.x, effect.y);
        }
      });
    }
    
    // id:11 유닛의 장판 이펙트 그리기
    if (this.operatorId === 11 && this.attackZoneEffect && this.attackZoneEffect.timer > 0) {
      // 장판 범위 표시 (반투명 빨간색 사각형 타일들)
      const alpha = Math.min(1.0, this.attackZoneEffect.timer / 0.3); // 시간에 따라 투명해짐
      ctx.fillStyle = `rgba(255, 0, 0, ${0.3 * alpha})`; // 반투명 빨간색
      this.attackZoneEffect.tiles.forEach(tile => {
        const px = tile.x * tileSize;
        const py = tile.y * tileSize;
        ctx.fillRect(px, py, tileSize, tileSize);
      });
      
      // 장판 테두리
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 * alpha})`;
      ctx.lineWidth = 2;
      this.attackZoneEffect.tiles.forEach(tile => {
        const px = tile.x * tileSize;
        const py = tile.y * tileSize;
        ctx.strokeRect(px, py, tileSize, tileSize);
      });
    }
    
    // 유닛 8의 스킬 오브젝트 그리기 (작은 원 3개)
    if (this.skillActive && this.operatorId === 8 && this.skillOrbs.length > 0) {
      this.skillOrbs.forEach(orb => {
        ctx.fillStyle = '#88ccff'; // 연한 파란색
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }
    
    // 아이콘들은 전체 draw 함수의 마지막에 그려서 가장 위에 표시되도록 함
  }
  
  // 체력바와 스킬 게이지 바 그리기
  drawBars(ctx) {
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barSpacing = 2;
    const barY = this.y + this.radius + 8;
    
    // 체력바 배경 (테두리)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    
    // 체력바 (파란색)
    const healthRatio = this.health / this.maxHealth;
    ctx.fillStyle = '#0000ff'; // 파란색
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthRatio, barHeight);
    
    // id:7 유닛 보호막 표시 (하얀색, 체력바 위에)
    if (this.operatorId === 7 && this.shield > 0) {
      // 보호막은 최대 체력의 70%가 최대이므로, 체력바 전체 길이를 기준으로 표시
      const maxShieldValue = this.maxHealth * 0.7;
      const shieldRatio = this.shield / maxShieldValue;
      const shieldWidth = barWidth * shieldRatio;
      // 보호막은 체력바 위에 표시 (체력바와 겹치지 않도록 약간 위에)
      const shieldBarY = barY - barHeight - 1;
      ctx.fillStyle = '#ffffff'; // 하얀색
      ctx.fillRect(this.x - barWidth / 2, shieldBarY, shieldWidth, barHeight);
      // 보호막 테두리
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - barWidth / 2, shieldBarY, barWidth, barHeight);
    }
    
    // 스킬 게이지 바
    const skillBarY = barY + barHeight + barSpacing;
    let skillGaugeColor = '#00ff00'; // 초록색 (기본)
    
    if (this.skillActive) {
      skillGaugeColor = '#ff8800'; // 주황색 (스킬 활성화 중)
      // 지속 시간에 따라 게이지 감소
      const skillRatio = this.skillDuration / this.skillDurationMax;
      ctx.fillStyle = skillGaugeColor;
      ctx.fillRect(this.x - barWidth / 2, skillBarY, barWidth * skillRatio, barHeight);
    } else {
      // 스킬 게이지 충전 상태
      // id 1, 11, 12인 아군은 표시 최대값 기준으로 게이지 표시, 실제 SP는 더 많이 가능
      let skillRatio;
      if (this.operatorId === 1 || this.operatorId === 11 || this.operatorId === 12) {
        // 표시 게이지는 skillGaugeMax 기준, 나머지 부분은 표시하지 않음
        skillRatio = (this.skillGauge % this.skillGaugeMax) / this.skillGaugeMax;
      } else {
        skillRatio = this.skillGauge / this.skillGaugeMax;
      }
      ctx.fillStyle = skillGaugeColor;
      ctx.fillRect(this.x - barWidth / 2, skillBarY, barWidth * skillRatio, barHeight);
    }
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth / 2, skillBarY, barWidth, barHeight);
  }
  
  // 화살표 그리기 함수
  drawArrow(ctx, x, y, dirX, dirY, length) {
    const arrowSize = 10;
    const centerX = this.x;
    const centerY = this.y;
    
    // 화살표 끝 위치
    const endX = x;
    const endY = y;
    
    // 화살표 그리기
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // 화살표 머리
    const angle = Math.atan2(dirY, dirX);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - Math.cos(angle) * arrowSize + Math.sin(angle) * arrowSize * 0.5,
      endY - Math.sin(angle) * arrowSize - Math.cos(angle) * arrowSize * 0.5
    );
    ctx.lineTo(
      endX - Math.cos(angle) * arrowSize - Math.sin(angle) * arrowSize * 0.5,
      endY - Math.sin(angle) * arrowSize + Math.cos(angle) * arrowSize * 0.5
    );
    ctx.closePath();
    ctx.fill();
  }
  
  // 타일 좌표로 변환
  getTilePos() {
    return { x: this.tileX, y: this.tileY };
  }
}

// 아군 배치 가능한지 확인
function canDeployOperator(tileX, tileY, operatorId = null) {
  const tile = mapData[tileY]?.[tileX];
  if (tile === undefined) return false;
  
  // 배치 중인 아군은 충돌 체크에서 제외
  if (operators.some(op => op.tileX === tileX && op.tileY === tileY && !op.isPlacing)) {
    return false;
  }
  
  // operatorId가 제공된 경우 배치 조건 체크
  if (operatorId !== null) {
    // id 16: TILE_ROAD에서만 배치 가능 + id:2 유닛의 공격 범위 안에 있어야 함
    if (operatorId === 16) {
      if (tile !== TILE_ROAD) return false;
      
      // id:2 유닛 찾기
      const id2Operator = operators.find(op => op.operatorId === 2 && op.deployed && !op.isPlacing);
      if (!id2Operator) return false; // id:2 유닛이 배치되지 않았으면 배치 불가
      
      // id:2 유닛의 공격 범위 타일 가져오기
      const attackRangeTiles = id2Operator.getAttackRangeTiles();
      
      // 배치하려는 타일이 공격 범위 안에 있는지 확인
      const isInRange = attackRangeTiles.some(rangeTile => rangeTile.x === tileX && rangeTile.y === tileY);
      return isInRange;
    }
    // id 0~1, 3~7: TILE_ROAD에서만 배치 가능
    else if ((operatorId >= 0 && operatorId <= 1) || (operatorId >= 3 && operatorId <= 7)) {
      return tile === TILE_ROAD;
    }
    // 그 외 나머지: TILE_DEPLOY 타일에만 배치 가능
    else {
      return tile === TILE_DEPLOY;
    }
  }
  
  // operatorId가 없으면 기존 로직 (길 또는 배치 가능 타일)
  return (tile === TILE_ROAD || tile === TILE_DEPLOY);
}

// =========================
// 4. 적 시스템
// =========================

// 적 배열
const enemies = [];

// 적 클래스
class Enemy {
  constructor(x, y, enemyId = 0, targetBaseX = null, targetBaseY = null) {
    // enemyData에서 데이터 가져오기
    const enData = window.enemyData || [];
    const data = enData.find(en => en.id === enemyId) || enData[0] || {
      health: 5,
      maxHealth: 5,
      speed: 100,
      radius: 12,
      color: '#ff6b6b',
      borderColor: '#cc0000'
    };
    
    // 픽셀 좌표 (타일 중심)
    this.x = x * tileSize + tileSize / 2;
    this.y = y * tileSize + tileSize / 2;
    
    // 시작 타일 좌표
    this.startTileX = x;
    this.startTileY = y;
    
    // 목표 타일 좌표 찾기 (targetBaseX, targetBaseY가 지정되면 사용, 아니면 findUserBase 사용)
    let goal;
    if (targetBaseX !== null && targetBaseY !== null) {
      goal = { x: targetBaseX, y: targetBaseY };
    } else {
      goal = findUserBase(x, y);
    }
    this.goalTileX = goal.x;
    this.goalTileY = goal.y;
    
    // 경로 계산
    this.path = findPath(this.startTileX, this.startTileY, this.goalTileX, this.goalTileY);
    this.pathIndex = 0; // 현재 경로 인덱스
    
    // 데이터에서 속성 가져오기
    this.enemyId = enemyId; // 적 ID 저장
    this.speed = data.speed || 100;
    this.radius = data.radius || 12;
    this.health = data.health || 5;
    this.maxHealth = data.maxHealth || 5;
    this.color = data.color || '#ff6b6b';
    this.borderColor = data.borderColor || '#cc0000';
    this.defense = data.defense || 0; // 방어력
    this.magicResist = data.magicResist || 0; // 마법 저항 (0~100)
    
    // 공격 관련 속성 (모든 적이 공격 가능)
    this.attackRange = data.attackRange || 0; // 타일 단위 (0이면 저지한 아군만 공격)
    this.attackPower = data.attackPower || 0;
    this.attackInterval = data.attackInterval || 1.0;
    this.attackCooldown = 0; // 스폰 시 즉시 공격 가능
    this.attackStunTime = 0;
    this.isKilled = false; // 처치 여부 (중복 카운트 방지) // 공격 후 경직 시간 (2초)
    
    // 배치 시간 추적용 (가장 최근 배치된 아군 찾기)
    this.deployTime = Date.now();
    
    // 활성 상태
    this.active = true;
    
    // 체력바 표시 여부 (체력이 감소했는지 추적)
    this.hasTakenDamage = false;
    this.lastHealth = this.health;
    
    // id:9 스킬로 인한 방어력 감소 디버프
    this.baseDefense = this.defense; // 기본 방어력 저장
    this.defenseDebuffTimer = 0; // 방어력 감소 디버프 타이머
    this.defenseDebuffActive = false; // 방어력 감소 디버프 활성화 여부
    
    // id:21 적의 저지 시 이동 스킬
    if (enemyId === 21) {
      this.dashSkillCooldown = 0; // 스킬 쿨타임 (스폰 시 즉시 사용 가능)
      this.dashSkillCooldownMax = 15; // 스킬 쿨타임 최대값 (15초)
      this.isBlocked = false; // 저지 상태 추적
    }
    
    // id:22 적의 폭발물 스킬
    if (enemyId === 22) {
      this.skillCooldown = 9; // 스폰 9초 후 첫 사용
      this.skillCooldownMax = 21; // 이후 21초 쿨타임
      this.skillTargets = []; // 폭발물이 부착된 아군 목표들
    }
  }
  
  // 공격 범위 내 아군 찾기 (attackRange: 0이면 저지한 아군만)
  findTargetsInRange() {
    const targets = [];
    const blockingOperators = []; // 저지한 아군 (최우선)
    const otherTargets = []; // 다른 타겟들
    
    // 먼저 저지한 아군 찾기 (회복 중인 id:16 유닛 제외)
    operators.forEach(operator => {
      if (!operator.deployed || operator.isPlacing) return;
      if (operator.operatorId === 16 && operator.isRecovering) return; // 회복 중인 id:16 유닛 제외
      if (operator.blockedEnemies.includes(this)) {
        blockingOperators.push(operator);
      }
    });
    
    // attackRange가 0이면 저지한 아군만 반환
    if (!this.attackRange || this.attackRange <= 0) {
      return blockingOperators;
    }
    
    // 원거리 공격 범위 내 아군 찾기
    const attackRangePixels = this.attackRange * tileSize;
    
    operators.forEach(operator => {
      if (!operator.deployed || operator.isPlacing) return;
      if (operator.operatorId === 16 && operator.isRecovering) return; // 회복 중인 id:16 유닛 제외
      // 이미 저지한 아군 목록에 있으면 건너뛰기
      if (blockingOperators.includes(operator)) return;
      
      const dx = this.x - operator.x;
      const dy = this.y - operator.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= attackRangePixels) {
        otherTargets.push(operator);
      }
    });
    
    // 저지한 아군을 최우선으로, 그 다음 다른 타겟들
    return [...blockingOperators, ...otherTargets];
  }
  
  // 공격 범위 내 가장 마지막으로 배치된 아군 찾기
  findMostRecentTarget(targets) {
    if (targets.length === 0) return null;
    
    // 배치 시간을 기준으로 정렬 (가장 마지막으로 배치된 아군 = 가장 큰 deployTime)
    let mostRecent = targets[0];
    let maxDeployTime = mostRecent.deployTime || 0;
    
    targets.forEach(target => {
      const deployTime = target.deployTime || 0;
      if (deployTime > maxDeployTime) {
        maxDeployTime = deployTime;
        mostRecent = target;
      }
    });
    
    return mostRecent;
  }
  
  update(dt) {
    if (!this.active || this.path.length === 0) return;
    
    // id:9 스킬로 인한 방어력 감소 디버프 타이머 관리
    if (this.defenseDebuffActive && this.defenseDebuffTimer > 0) {
      this.defenseDebuffTimer -= dt;
      // 방어력을 10% 감소 (기본 방어력의 90%)
      this.defense = Math.floor(this.baseDefense * 0.9);
      
      if (this.defenseDebuffTimer <= 0) {
        // 디버프 종료 시 기본 방어력으로 복구
        this.defenseDebuffActive = false;
        this.defense = this.baseDefense;
      }
    }
    
    // id:21 적의 저지 시 이동 스킬 쿨타임 관리
    if (this.enemyId === 21) {
      // 저지 상태 확인
      let currentlyBlocked = false;
      let blockingOperator = null;
      for (const operator of operators) {
        if (operator.deployed && !operator.isPlacing && operator.blockedEnemies.includes(this)) {
          currentlyBlocked = true;
          blockingOperator = operator;
          break;
        }
      }
      
      // 저지 상태가 변경되었을 때 처리
      if (currentlyBlocked && !this.isBlocked) {
        // 저지되기 시작함 - 즉시 스킬 발동
        this.isBlocked = true;
        
        // 저지되었고 쿨타임이 지났으면 스킬 발동
        if (this.dashSkillCooldown <= 0 && this.path.length > 0) {
          // 진행 방향 계산 (다음 경로 지점 방향)
          let directionX = 0;
          let directionY = 0;
          
          if (this.pathIndex < this.path.length) {
            const nextPathPoint = this.path[this.pathIndex];
            const currentTileX = Math.floor(this.x / tileSize);
            const currentTileY = Math.floor(this.y / tileSize);
            
            directionX = nextPathPoint.x - currentTileX;
            directionY = nextPathPoint.y - currentTileY;
            
            // 현재 타일과 다음 경로 지점이 같으면 다음 경로 지점으로 이동
            if (directionX === 0 && directionY === 0 && this.pathIndex + 1 < this.path.length) {
              const nextNextPathPoint = this.path[this.pathIndex + 1];
              directionX = nextNextPathPoint.x - currentTileX;
              directionY = nextNextPathPoint.y - currentTileY;
            }
          } else {
            // 경로 끝에 도달했으면 목표 방향으로
            const currentTileX = Math.floor(this.x / tileSize);
            const currentTileY = Math.floor(this.y / tileSize);
            directionX = this.goalTileX - currentTileX;
            directionY = this.goalTileY - currentTileY;
          }
          
          // 방향 정규화
          const distance = Math.sqrt(directionX * directionX + directionY * directionY);
          if (distance > 0) {
            directionX /= distance;
            directionY /= distance;
          }
          
          // 1.5타일 앞으로 순간 이동
          const dashDistance = tileSize * 1.5;
          const newX = this.x + directionX * dashDistance;
          const newY = this.y + directionY * dashDistance;
          
          // 맵 경계 체크
          const newTileX = Math.floor(newX / tileSize);
          const newTileY = Math.floor(newY / tileSize);
          if (newTileX >= 0 && newTileX < mapCols && newTileY >= 0 && newTileY < mapRows) {
            // 순간 이동 (즉시 위치 업데이트)
            this.x = newX;
            this.y = newY;
            
            // 경로 인덱스 업데이트 (새 위치에 맞게)
            const newPathIndex = this.path.findIndex((point, index) => {
              const pointX = point.x * tileSize + tileSize / 2;
              const pointY = point.y * tileSize + tileSize / 2;
              const dist = Math.sqrt((this.x - pointX) ** 2 + (this.y - pointY) ** 2);
              return dist < tileSize / 2;
            });
            
            if (newPathIndex >= 0) {
              this.pathIndex = newPathIndex;
            }
            
            // 저지 상태 해제 (순간 이동 후 저지 해제)
            if (blockingOperator) {
              const blockIndex = blockingOperator.blockedEnemies.indexOf(this);
              if (blockIndex > -1) {
                blockingOperator.blockedEnemies.splice(blockIndex, 1);
                blockingOperator.blockCount--;
                if (blockingOperator.blockCount === 0) {
                  blockingOperator.isBlocking = false;
                }
              }
            }
            this.isBlocked = false;
            
            // 쿨타임 재설정
            this.dashSkillCooldown = this.dashSkillCooldownMax;
          }
        }
      } else if (!currentlyBlocked && this.isBlocked) {
        // 저지 해제됨
        this.isBlocked = false;
      }
      
      // 쿨타임 감소
      if (this.dashSkillCooldown > 0) {
        this.dashSkillCooldown -= dt;
      }
    }
    
    // id:22 적의 폭발물 스킬 관리
    if (this.enemyId === 22) {
      // 스킬 시전 중 여부 확인 (폭발물이 부착된 아군이 있으면 시전 중)
      const isCastingSkill = this.skillTargets.some(target => 
        target && target.deployed && target.hasBomb && target.bombTimer > 0
      );
      
      // 폭발물 타이머 관리 및 폭발 처리 (스킬 시전 중에도 계속 실행)
      for (let i = this.skillTargets.length - 1; i >= 0; i--) {
        const target = this.skillTargets[i];
        
        // 아군이 제거되었거나 비활성화되었으면 목록에서 제거
        if (!target || !target.deployed || !operators.includes(target)) {
          this.skillTargets.splice(i, 1);
          continue;
        }
        
        // 폭발물 타이머 감소
        if (target.hasBomb && target.bombTimer > 0) {
          target.bombTimer -= dt;
          
          // 타이머가 0 이하가 되면 폭발
          if (target.bombTimer <= 0) {
            // 폭발 피해 적용 (공격력의 180% 물리 피해)
            const explosionDamage = this.attackPower * 1.8;
            const finalDamage = calculateDamage(explosionDamage, 'physical', target.defense, target.magicResist);
            
            const oldHealth = target.health;
            
            // id:7 유닛 보호막 처리
            if (target.operatorId === 7 && target.shield > 0) {
              if (target.shield >= finalDamage) {
                target.shield -= finalDamage;
              } else {
                const remainingDamage = finalDamage - target.shield;
                target.shield = 0;
                target.health -= remainingDamage;
              }
            } else {
              target.health -= finalDamage;
            }
            
            // id:6 유닛 스킬 활성화 중: 체력이 1 이하로 내려가지 않음
            if (target.operatorId === 6 && target.skillActive && target.health < 1) {
              target.health = 1;
            }
            
            // 피격 이펙트 생성
            hitEffects.push(new HitEffect(target.x, target.y));
            
            // 피해 수치 표시
            damageEffects.push(new DamageEffect(target.x, target.y - target.radius, finalDamage));
            
            // 체력이 감소했는지 추적
            if (target.health < oldHealth) {
              target.hasTakenDamage = true;
            }
            
            // 폭발물 제거 (폭발 후 즉시 제거하여 공격 재개)
            target.hasBomb = false;
            target.bombTimer = 0;
            target.bombAttacker = null;
            this.skillTargets.splice(i, 1);
            
            // 폭발 후 공격 쿨다운 초기화하여 즉시 공격 가능하도록
            target.attackCooldown = 0;
            
            // 아군이 죽었는지 확인
            if (target.health <= 0) {
              // id:3 유닛은 HP 0이 되어도 퇴각하지 않고 특수 능력 발동 (배치당 1번만)
              if (target.operatorId === 3 && !target.specialAbilityUsed) {
                target.specialAbilityUsed = true;
                target.specialAbilityActive = true;
                target.maxHealth = Math.floor(target.baseMaxHealth * 0.5);
                target.defense = Math.floor(target.baseDefense * 0.5);
                target.health = target.maxHealth;
                target.attackPower = Math.floor(target.baseAttackPower * 1.18);
                target.attackInterval = target.baseAttackInterval / 1.18;
              }
              // id:16 유닛은 HP 0이 되어도 퇴각하지 않고 회복 상태로 전환
              else if (target.operatorId === 16 && !target.isRecovering) {
                target.health = 0;
                target.isRecovering = true;
                target.recoveryTimer = target.recoveryDuration;
                target.blockCount = 0;
                target.maxBlockCount = 0;
                target.blockedEnemies = [];
                target.isBlocking = false;
              }
              // 다른 유닛은 체력이 0 이하가 되면 제거
              else if (target.health <= 0 && (target.operatorId !== 3 || target.specialAbilityUsed) && target.operatorId !== 16) {
                const index = operators.indexOf(target);
                if (index > -1) {
                  operators.splice(index, 1);
                  showOperatorItem(target.operatorId);
                }
              }
            }
          }
        }
      }
      
      // 스킬 시전 중이면 공격/이동 중지 (폭발물 타이머 관리 후)
      if (isCastingSkill) {
        return; // 공격/이동 중지
      }
      
      // 쿨타임 감소
      if (this.skillCooldown > 0) {
        this.skillCooldown -= dt;
      }
      
      // 쿨타임이 지났고 사거리 내 아군이 있으면 스킬 발동
      if (this.skillCooldown <= 0) {
      const targets = this.findTargetsInRange();
      if (targets.length > 0) {
          // 체력 50% 이하일 때는 3명, 그 외에는 1명
          const targetCount = this.health <= this.maxHealth * 0.5 ? 3 : 1;
          const selectedTargets = targets.slice(0, targetCount);
          
          // 선택된 아군들에게 폭발물 부착
          selectedTargets.forEach(target => {
            if (!target.hasBomb) {
              target.hasBomb = true;
              target.bombTimer = 3.0; // 3초 타이머
              target.bombAttacker = this;
              this.skillTargets.push(target);
            }
          });
          
          // 쿨타임 재설정
          this.skillCooldown = this.skillCooldownMax;
        }
      }
    }
    
    // 모든 적은 공격 가능 (attackRange가 0이면 저지한 아군만 공격)
    this.attackCooldown -= dt;
    this.attackStunTime -= dt; // 경직 시간 감소
    
    // 장판 내에 있으면 공격 불가 (타일 기반)
    let isInZone = false;
    const enemyTileX = Math.floor(this.x / tileSize);
    const enemyTileY = Math.floor(this.y / tileSize);
    for (const zone of skillZones) {
      if (!zone.active) continue;
      const isInRange = zone.attackTiles.some(tile => tile.x === enemyTileX && tile.y === enemyTileY);
      if (isInRange) {
        isInZone = true;
        break;
      }
    }
    
    const targets = this.findTargetsInRange();
    if (targets.length > 0 && !isInZone) {
      // 저지한 아군이 있으면 최우선으로 선택, 없으면 가장 최근 배치된 아군 선택
      let target = null;
      const blockingTargets = targets.filter(t => t.blockedEnemies.includes(this));
      if (blockingTargets.length > 0) {
        // 저지한 아군 중 하나 선택 (가장 최근 배치된 것)
        target = this.findMostRecentTarget(blockingTargets);
      } else {
        // 저지한 아군이 없으면 가장 최근 배치된 아군 선택
        target = this.findMostRecentTarget(targets);
      }
      
      if (target) {
        // id:16 유닛이 회복 중이면 공격하지 않음
        if (target.operatorId === 16 && target.isRecovering) {
          // 회복 중인 유닛은 공격하지 않음
        } else if (this.attackCooldown <= 0) {
          // 공격 가능하면 공격 (경직 중이어도 공격 쿨다운이 0이면 공격 가능)
          // 대미지 타입 결정 및 계산
          const damageType = getDamageType(this.enemyId, false);
          const finalDamage = calculateDamage(this.attackPower, damageType, target.defense, target.magicResist);
          
          // id:16 유닛이 회복 중이면 피해를 받지 않음
          if (target.operatorId === 16 && target.isRecovering) {
            // 회복 중인 유닛은 피해를 받지 않음
            this.attackCooldown = this.attackInterval;
            this.attackStunTime = 2.0; // 공격 후 2초 경직
            // 경직 중이어도 공격 쿨다운은 계속 감소하므로 return하지 않음
          } else {
          // 아군 공격
            const oldHealth = target.health;
            let remainingDamage = finalDamage;
            
            // id:7 유닛 보호막 처리
            if (target.operatorId === 7 && target.shield > 0) {
              // 보호막이 피해를 대신 받음
              if (target.shield >= remainingDamage) {
                target.shield -= remainingDamage;
                remainingDamage = 0;
              } else {
                remainingDamage -= target.shield;
                target.shield = 0;
              }
            }
            
            // 남은 피해를 체력에 적용
            if (remainingDamage > 0) {
              target.health -= remainingDamage;
            }
            
            // id:6 유닛 스킬 활성화 중: 체력이 1 이하로 내려가지 않음
            if (target.operatorId === 6 && target.skillActive && target.health < 1) {
              target.health = 1;
            }
            
          this.attackCooldown = this.attackInterval;
            this.attackStunTime = 2.0; // 공격 후 2초 경직
            
            // id:3 유닛은 HP 0이 되어도 퇴각하지 않고 특수 능력 발동 (배치당 1번만)
            if (target.health <= 0 && target.operatorId === 3 && !target.specialAbilityUsed) {
              target.specialAbilityUsed = true;
              target.specialAbilityActive = true;
              // 최대 체력과 방어력 50% 감소 (먼저 적용)
              target.maxHealth = Math.floor(target.baseMaxHealth * 0.5);
              target.defense = Math.floor(target.baseDefense * 0.5);
              // 체력을 최대 체력으로 회복
              target.health = target.maxHealth;
              // 공격력과 공격 속도 18% 증가
              target.attackPower = Math.floor(target.baseAttackPower * 1.18);
              target.attackInterval = target.baseAttackInterval / 1.18; // 공격 속도 증가 (간격 감소)
            }
            // id:16 유닛은 HP 0이 되어도 퇴각하지 않고 회복 상태로 전환
            else if (target.health <= 0 && target.operatorId === 16 && !target.isRecovering) {
              target.health = 0;
              target.isRecovering = true;
              target.recoveryTimer = target.recoveryDuration;
              target.blockCount = 0;
              target.maxBlockCount = 0;
              // 저지 중인 적들 해제 (적은 계속 이동 가능)
              target.blockedEnemies.forEach(enemy => {
                // 적이 더 이상 저지되지 않음을 표시 (적 객체에 직접 접근 불가하므로 여기서는 목록만 비움)
              });
              target.blockedEnemies = [];
              target.isBlocking = false;
            }
            // 다른 유닛은 체력이 0 이하가 되면 제거
            // id:3 유닛은 특수 능력 발동 후에는 일반 유닛처럼 퇴각
            else if (target.health <= 0 && (target.operatorId !== 3 || target.specialAbilityUsed) && target.operatorId !== 16) {
            const index = operators.indexOf(target);
            if (index > -1) {
              operators.splice(index, 1);
              // 유닛 아이템 다시 표시
              showOperatorItem(target.operatorId);
              }
            }
            }
          }
          
        // 공격 후 2초 동안은 이동만 멈춤 (공격 쿨다운은 계속 감소)
        if (this.attackStunTime > 0) {
          return; // 이동하지 않음 (하지만 공격 쿨다운은 계속 감소)
        }
        // 2초 후부터 다음 공격까지는 이동 가능
      }
    }
    
    // 아군과 충돌 체크 (배치 완료된 아군만)
    for (const operator of operators) {
      if (!operator.deployed || operator.isPlacing) continue;
      
      const dx = this.x - operator.x;
      const dy = this.y - operator.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 아군과 충돌했고, 아군이 길 위에 있으면 멈춤
      if (distance < this.radius + operator.radius) {
        const tile = mapData[operator.tileY]?.[operator.tileX];
        if (tile === TILE_ROAD) {
          // id 0이 스킬 중이면 저지하지 않음 (적 통과)
          if (operator.operatorId === 0 && operator.skillActive) {
            // 스킬 중일 때는 block 처리 스킵
          } else if (operator.operatorId === 16 && operator.isRecovering) {
            // id:16 유닛이 회복 중이면 저지하지 않음 (적 통과)
          } else if (operator.operatorId === 6 && operator.isSkillDisabled) {
            // id:6 유닛이 스킬 종료 후 10초 동안은 저지하지 않음 (적 통과)
          } else {
            // 이미 이 적이 저지 중인지 확인
            const isAlreadyBlocked = operator.blockedEnemies.includes(this);
            
            if (!isAlreadyBlocked) {
              // 저지 가능 수 체크
              if (operator.blockCount < operator.maxBlockCount) {
                operator.blockCount++;
                operator.blockedEnemies.push(this);
          operator.isBlocking = true;
              }
            }
            
            // 저지 중이면 이동 중지
            if (operator.blockedEnemies.includes(this)) {
          return; // 이동 중지
            }
          }
        }
      } else {
        // 거리가 멀어지면 저지 해제
        const blockIndex = operator.blockedEnemies.indexOf(this);
        if (blockIndex > -1) {
          operator.blockedEnemies.splice(blockIndex, 1);
          operator.blockCount--;
          if (operator.blockCount === 0) {
            operator.isBlocking = false;
          }
        }
      }
    }
    
    // 목표 타일의 중심 좌표
    const targetTile = this.path[this.pathIndex];
    const targetX = targetTile.x * tileSize + tileSize / 2;
    const targetY = targetTile.y * tileSize + tileSize / 2;
    
    // 목표까지의 거리
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 목표에 도달했는지 확인
    if (distance < 5) {
      this.pathIndex++;
      
      // 경로 끝에 도달 (아군 지역 도착)
      if (this.pathIndex >= this.path.length) {
        // 플레이어 HP 감소
        if (gameState === 'playing' && currentPlayerHP > 0) {
          currentPlayerHP--;
          if (currentPlayerHP <= 0) {
            currentPlayerHP = 0;
            // 1초 후 MAP FAILURE 애니메이션 시작
            failureAnimationTimer = 1.0;
            resultText = 'MAP FAILURE';
          }
        }
        this.active = false;
        return;
      }
    } else {
      // id:13이 배치되어 있으면 이동 속도 10% 감소
      let currentSpeed = this.speed;
      const id13Deployed = operators.some(op => op.operatorId === 13 && op.deployed && !op.isPlacing);
      if (id13Deployed) {
        currentSpeed = this.speed * 0.9; // 10% 감소
      }
      
      // 장판 내에 있으면 이동 불가 (타일 기반)
      let isInZone = false;
      const enemyTileX = Math.floor(this.x / tileSize);
      const enemyTileY = Math.floor(this.y / tileSize);
      for (const zone of skillZones) {
        if (!zone.active) continue;
        const isInRange = zone.attackTiles.some(tile => tile.x === enemyTileX && tile.y === enemyTileY);
        if (isInRange) {
          isInZone = true;
          break;
        }
      }
      
      if (!isInZone) {
      // 목표 방향으로 이동
        const moveDistance = currentSpeed * dt;
      if (distance > 0) {
        this.x += (dx / distance) * moveDistance;
        this.y += (dy / distance) * moveDistance;
        }
      }
    }
  }
  
  draw(ctx) {
    if (!this.active) return;
    
    // 공격 범위 표시 (id: 2인 적만)
    if (this.attackRange > 0) {
      const attackRangePixels = this.attackRange * tileSize;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, attackRangePixels, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.fillStyle = this.color; // 적 데이터의 색상 사용
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // 테두리
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 체력바 그리기 (체력이 감소했을 때만 표시)
    if (this.hasTakenDamage && this.health < this.maxHealth) {
      this.drawHealthBar(ctx);
    }
    
    // 체력이 100%가 되면 체력바 숨김
    if (this.health >= this.maxHealth) {
      this.hasTakenDamage = false;
    }
    
    // id:9 스킬로 인한 방어력 감소 디버프 표시 (방패 갈라진 마크)
    if (this.defenseDebuffActive && this.defenseDebuffTimer > 0) {
      const markY = this.y - this.radius - 20; // 머리 위 위치
      const markSize = 16; // 마크 크기
      
      ctx.save();
      ctx.translate(this.x, markY);
      
      // 방패 모양 그리기 (대각선으로 갈라진 모양, 위아래 반전)
      ctx.strokeStyle = '#ff6b6b'; // 빨간색
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // 방패 윗부분 (직선)
      ctx.moveTo(-markSize / 2, -markSize / 2);
      ctx.lineTo(-markSize / 2, markSize / 4);
      ctx.lineTo(markSize / 2, markSize / 4);
      ctx.lineTo(markSize / 2, -markSize / 2);
      
      // 방패 아래부분 (반원)
      ctx.arc(0, markSize / 4, markSize / 2, 0, Math.PI, false);
      
      // 대각선으로 갈라진 선 (왼쪽 아래에서 오른쪽 위로)
      ctx.moveTo(-markSize / 2, markSize / 2);
      ctx.lineTo(markSize / 2, -markSize / 2);
      
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  // 체력바 그리기
  drawHealthBar(ctx) {
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barY = this.y - this.radius - 8;
    
    const healthRatio = this.health / this.maxHealth;
    ctx.fillStyle = '#ff0000'; // 빨간색
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthRatio, barHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x - barWidth / 2, barY, barWidth, barHeight);
  }
}

// 아군 지역 찾기 함수
// 특정 적 지역에 대응하는 아군 지역 찾기
function findUserBase(spawnX, spawnY) {
  // 매핑 데이터가 있으면 사용
  if (spawnToBaseMapping && spawnToBaseMapping.length > 0) {
    const mapping = spawnToBaseMapping.find(m => m.spawnX === spawnX && m.spawnY === spawnY);
    if (mapping) {
      return { x: mapping.baseX, y: mapping.baseY };
    }
  }
  
  // 매핑이 없으면 첫 번째 아군 지역 반환
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (mapData[y]?.[x] === TILE_USERBASE) {
        return { x, y };
      }
    }
  }
  // 아군 지역이 없으면 기본값 반환
  return { x: cols - 1, y: rows - 1 };
}

// 적 지역에서 적 스폰 함수
function spawnEnemy(spawnX, spawnY, enemyId = 0, count = 1) {
  // 최대 적 수 체크
  const stageNumber = getStageNumber();
  const stageEnemySpawns = window[`stage${stageNumber}EnemySpawns`];
  const maxEnemies = (stageEnemySpawns && stageEnemySpawns.maxEnemies) || 0;
  
  if (maxEnemies > 0 && enemies.length >= maxEnemies) {
    return; // 최대 적 수에 도달했으면 스폰하지 않음
  }
  
  // 목표 아군 지역 찾기
  const goal = findUserBase(spawnX, spawnY);
  
  // 지정된 개수만큼 적 스폰
  for (let i = 0; i < count; i++) {
    if (maxEnemies > 0 && enemies.length >= maxEnemies) {
      break; // 최대 적 수에 도달하면 중단
    }
    enemies.push(new Enemy(spawnX, spawnY, enemyId, goal.x, goal.y));
  }
}

// 스폰 시퀀스 관리
let spawnSequence = [];
let spawnSequenceIndex = 0;
let spawnSequenceTimer = 0;
let spawnSequenceActive = false;

// 스폰 시퀀스 초기화
function initSpawnSequence() {
  const stageNumber = getStageNumber();
  const stageEnemySpawns = window[`stage${stageNumber}EnemySpawns`];
  
  spawnSequence = [];
  spawnSequenceIndex = 0;
  spawnSequenceTimer = 0;
  spawnSequenceActive = false;
  
  if (stageEnemySpawns && stageEnemySpawns.spawnSequence && Array.isArray(stageEnemySpawns.spawnSequence)) {
    spawnSequence = stageEnemySpawns.spawnSequence;
    spawnSequenceActive = spawnSequence.length > 0;
    console.log(`스폰 시퀀스 초기화: ${spawnSequence.length}개 항목`);
  }
}

// update 함수 수정
function update(dt) {
  // 게임이 시작되지 않았거나 일시 정지 중이면 업데이트 중단
  if (gameState !== 'playing' || isPaused) return;
  
  // 게임 속도 조절 적용
  updateGameTimeScale();
  dt = dt * gameTimeScale;
  
  // 코스트 자연 회복
  if (currentCost < maxCost) {
    const regenAmount = costRegenRate * dt;
    currentCost = Math.min(maxCost, currentCost + regenAmount);
    naturalRegenCost = Math.min(maxCost, naturalRegenCost + regenAmount); // 자연 회복만 별도 추적
  }
  
  // 코스트가 99 이상이 되면 게이지를 0%로 리셋 (소수점 부분 제거)
  if (currentCost >= maxCost) {
    naturalRegenCost = Math.floor(naturalRegenCost); // 소수점 부분 제거하여 게이지 0%
  }
  
  // naturalRegenCost가 currentCost를 초과하지 않도록 보정
  if (naturalRegenCost > currentCost) {
    naturalRegenCost = currentCost;
  }
  
  // 스폰 시퀀스 처리
  if (spawnSequenceActive && spawnSequenceIndex < spawnSequence.length) {
    const currentSpawn = spawnSequence[spawnSequenceIndex];
    
    // 누적 지연 시간 계산 (이전 항목들의 delay 합계)
    let totalDelay = 0;
    for (let i = 0; i <= spawnSequenceIndex; i++) {
      totalDelay += spawnSequence[i].delay;
    }
    
    spawnSequenceTimer += dt;
    
    if (spawnSequenceTimer >= totalDelay) {
      // 스폰 실행
      spawnEnemy(
        currentSpawn.spawnX,
        currentSpawn.spawnY,
        currentSpawn.enemyId || 0,
        currentSpawn.count || 1
      );
      
      spawnSequenceIndex++;
      
      // 모든 시퀀스 완료
      if (spawnSequenceIndex >= spawnSequence.length) {
        spawnSequenceActive = false;
        console.log('모든 스폰 시퀀스 완료');
      }
    }
  }
  
  // 아군 업데이트 (공격 등)
  operators.forEach(operator => operator.update(dt));
  
  // 투사체 업데이트
  projectiles.forEach(projectile => projectile.update(dt));
  
  // 이펙트 업데이트
  hitEffects.forEach(effect => effect.update(dt));
  healEffects.forEach(effect => effect.update(dt));
  damageEffects.forEach(effect => effect.update(dt));
  
  // 투사체와 적 충돌 체크 (추적 중인 적과만 체크)
  projectiles.forEach(projectile => {
    if (!projectile.active) return;
    if (!projectile.targetEnemy || !projectile.targetEnemy.active) {
      projectile.active = false;
      return;
    }
    
    const enemy = projectile.targetEnemy;
      const dx = projectile.x - enemy.x;
      const dy = projectile.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < projectile.radius + enemy.radius) {
      // 충돌 - 대미지 타입에 따라 계산
      const oldHealth = enemy.health;
      const finalDamage = calculateDamage(projectile.damage, projectile.damageType, enemy.defense, enemy.magicResist);
      enemy.health -= finalDamage;
        projectile.active = false;
        
      // 피격 이펙트 생성
      hitEffects.push(new HitEffect(enemy.x, enemy.y));
      
      // id 1, 5, 9, 12 유닛의 스킬로 인한 피해면 피해 수치 표시
      if ((projectile.attackerId === 1 || projectile.attackerId === 5 || projectile.attackerId === 9 || projectile.attackerId === 12) && projectile.isSkillAttack) {
        damageEffects.push(new DamageEffect(enemy.x, enemy.y - enemy.radius, finalDamage));
      }
      
      // id:12 유닛의 스킬로 인한 피해면 주변 적들에게 스플래시 데미지
      if (projectile.attackerId === 12 && projectile.isSkillAttack) {
        const attacker = operators.find(op => op.operatorId === 12 && op.deployed);
        if (attacker) {
          attacker.applySplashDamage(enemy, finalDamage, projectile.damageType);
        }
      }
      
      // id 9 유닛의 스킬로 인한 피해면 적에게 방어력 감소 디버프 적용
      if (projectile.attackerId === 9 && projectile.isSkillAttack) {
        const attacker = operators.find(op => op.operatorId === 9 && op.deployed);
        if (attacker && attacker.skillActive) {
          // baseDefense가 없거나 디버프가 비활성화되어 있으면 기본 방어력 저장
          if (!enemy.baseDefense || !enemy.defenseDebuffActive) {
            enemy.baseDefense = enemy.defense; // 기본 방어력 저장
          }
          enemy.defenseDebuffTimer = 5.0; // 5초간 지속
          enemy.defenseDebuffActive = true;
        }
      }
      
      // 체력이 감소했는지 추적
      if (enemy.health < oldHealth) {
        enemy.hasTakenDamage = true;
      }
      
      // id 1 유닛의 스킬로 인한 피해로 적이 죽었으면 코스트 1 획득 (지속시간 안에 처치)
        if (enemy.health <= 0) {
        // 투사체를 발사한 operator 찾기
        const attacker = operators.find(op => op.operatorId === projectile.attackerId);
        if (attacker && attacker.operatorId === 1 && attacker.skillActive && projectile.isSkillAttack) {
          currentCost = Math.min(maxCost, currentCost + 1);
        }
          enemy.active = false;
        // 적이 죽으면 모든 아군의 저지 목록에서 제거
        operators.forEach(operator => {
          const blockIndex = operator.blockedEnemies.indexOf(enemy);
          if (blockIndex > -1) {
            operator.blockedEnemies.splice(blockIndex, 1);
            operator.blockCount--;
            if (operator.blockCount === 0) {
              operator.isBlocking = false;
        }
      }
    });
      }
    }
  });
  
  // 비활성 투사체 제거
  for (let i = projectiles.length - 1; i >= 0; i--) {
    if (!projectiles[i].active) {
      projectiles.splice(i, 1);
    }
  }
  
  // 비활성 장판 제거
  for (let i = skillZones.length - 1; i >= 0; i--) {
    if (!skillZones[i].active) {
      skillZones.splice(i, 1);
    }
  }
  
  // 비활성 이펙트 제거
  for (let i = hitEffects.length - 1; i >= 0; i--) {
    if (!hitEffects[i].active) {
      hitEffects.splice(i, 1);
    }
  }
  for (let i = healEffects.length - 1; i >= 0; i--) {
    if (!healEffects[i].active) {
      healEffects.splice(i, 1);
    }
  }
  for (let i = damageEffects.length - 1; i >= 0; i--) {
    if (!damageEffects[i].active) {
      damageEffects.splice(i, 1);
    }
  }
  
  // 적 업데이트
  enemies.forEach(enemy => enemy.update(dt));
  
  // 비활성 적 제거
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].active) {
      const removedEnemy = enemies[i];
      // 적이 제거되면 모든 아군의 저지 목록에서 제거
      operators.forEach(operator => {
        const blockIndex = operator.blockedEnemies.indexOf(removedEnemy);
        if (blockIndex > -1) {
          operator.blockedEnemies.splice(blockIndex, 1);
          operator.blockCount--;
          if (operator.blockCount === 0) {
            operator.isBlocking = false;
          }
        }
      });
      enemies.splice(i, 1);
    }
  }
  
  // 게임 상태 체크 및 애니메이션 업데이트
  if (gameState === 'playing') {
    // MAP CLEAR 체크
    const stageNumber = getStageNumber();
    const stageEnemySpawns = window[`stage${stageNumber}EnemySpawns`];
    const maxEnemies = (stageEnemySpawns && stageEnemySpawns.maxEnemies) || 0;
    if (maxEnemies > 0 && enemiesKilled >= maxEnemies) {
      // 1초 후 MAP CLEAR 애니메이션 시작
      if (clearAnimationTimer === 0) {
        clearAnimationTimer = 1.0;
        resultText = 'MAP CLEAR';
      }
    }
  }
  
  // MAP FAILURE 애니메이션 업데이트
  if (failureAnimationTimer > 0) {
    failureAnimationTimer -= dt;
    if (failureAnimationTimer <= 0) {
      gameState = 'failure';
      resultTextX = -canvas.width / 2; // 왼쪽 바깥에서 시작
      failureAnimationTimer = 0;
      // 모든 UI 숨김 처리
      operators.forEach(operator => {
        operator.showSkillIcon = false;
        operator.showRetreatIcon = false;
      });
      // 유닛 창 숨김
      const operatorPanel = document.getElementById('operatorPanel');
      if (operatorPanel) {
        operatorPanel.style.display = 'none';
      }
    }
  }
  
  // MAP CLEAR 애니메이션 업데이트
  if (clearAnimationTimer > 0) {
    clearAnimationTimer -= dt;
    if (clearAnimationTimer <= 0) {
      gameState = 'clear';
      resultTextX = -canvas.width / 2; // 왼쪽 바깥에서 시작
      clearAnimationTimer = 0;
      // 모든 UI 숨김 처리
      operators.forEach(operator => {
        operator.showSkillIcon = false;
        operator.showRetreatIcon = false;
      });
      // 유닛 창 숨김
      const operatorPanel = document.getElementById('operatorPanel');
      if (operatorPanel) {
        operatorPanel.style.display = 'none';
      }
    }
  }
  
  // 결과 애니메이션 업데이트
  if (gameState === 'failure' || gameState === 'clear') {
    const centerX = canvas.width / 2;
    const targetX = centerX;
    const exitX = canvas.width + canvas.width / 2;
    
    // 텍스트가 중앙에 도달하기 전
    if (resultTextX < targetX) {
      resultTextX += 800 * dt; // 이동 속도
      if (resultTextX >= targetX) {
        resultTextX = targetX;
        // 2초 대기 타이머 시작
        if (resultWaitTimer === 0) {
          resultWaitTimer = 2.0;
        }
      }
    } else if (resultTextX === targetX && resultWaitTimer > 0) {
      // 2초 대기
      resultWaitTimer -= dt;
      if (resultWaitTimer <= 0) {
        resultWaitTimer = 0;
      }
    } else if (resultTextX === targetX && resultWaitTimer === 0) {
      // 오른쪽으로 이동
      resultTextX += 800 * dt;
      if (resultTextX >= exitX) {
        resultTextX = exitX;
      }
    }
    
    // 화면 페이드 (천천히) - 텍스트가 오른쪽으로 이동하기 시작하면 페이드 시작
    if (resultTextX > targetX && screenFadeAlpha < 1) {
      screenFadeAlpha = Math.min(1, screenFadeAlpha + 0.3 * dt); // 천천히 페이드
      // 화면이 완전히 까매지면 retry 상태로 전환
      if (screenFadeAlpha >= 1) {
        gameState = 'retry';
        retryBlinkTimer = 0;
      }
    }
  }
  
  // retry 상태일 때 깜빡임 타이머 업데이트
  if (gameState === 'retry') {
    retryBlinkTimer += dt;
  }
}

// 게임 정보 UI 그리기 함수
function drawGameInfoUI(ctx) {
  const stageNumber = getStageNumber();
  const stageEnemySpawns = window[`stage${stageNumber}EnemySpawns`];
  const maxEnemies = (stageEnemySpawns && stageEnemySpawns.maxEnemies) || 0;
  
  // 타일맵 중간 위에 정보 창 그리기
  const infoBoxWidth = canvas.width * 0.25; // 화면 너비의 60%
  const infoBoxHeight = 25;
  const infoBoxX = (canvas.width - infoBoxWidth) / 2;
  const infoBoxY = 2; // 타일맵 중간 위
  
  // 배경 사각형
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight);
  
  // 텍스트 표시
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const infoText = `ENEMY ${enemiesKilled}/${maxEnemies} | ${currentPlayerHP}`;
  ctx.fillText(infoText, canvas.width / 2, infoBoxY + infoBoxHeight / 2);
}

// 결과 애니메이션 그리기 함수
function drawResultAnimation(ctx) {
  if (resultText && resultTextX > -canvas.width / 2) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(resultText, resultTextX, canvas.height / 2);
    ctx.restore();
  }
}

// draw 함수 수정
function draw(ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // === 타일맵 그리기 ===
  drawMap(ctx);
  
  // === 아군 그리기 ===
  operators.forEach(operator => operator.draw(ctx));
  
  // === 장판 그리기 ===
  skillZones.forEach(zone => zone.draw(ctx));
  
  // === 투사체 그리기 ===
  projectiles.forEach(projectile => projectile.draw(ctx));
  
  // === 적 그리기 ===
  enemies.forEach(enemy => enemy.draw(ctx));
  
  // === 피격 이펙트 그리기 (적과 탄보다 위에) ===
  hitEffects.forEach(effect => effect.draw(ctx));
  
  // === 회복 이펙트 그리기 ===
  healEffects.forEach(effect => effect.draw(ctx));
  
  // === 피해 수치 이펙트 그리기 ===
  damageEffects.forEach(effect => effect.draw(ctx));
  
  // === UI 표시 (게임 진행 중일 때만) ===
  if (gameState === 'playing') {
    // === 게임 정보 UI 표시 ===
    drawGameInfoUI(ctx);
    
    // === 아이콘 그리기 (가장 위에 표시되도록 마지막에 그리기) ===
    operators.forEach(operator => {
      // 스킬 아이콘 그리기
      if (operator.showSkillIcon) {
        const iconSize = 48; // 2배 크기
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(operator.skillIconX - iconSize / 2, operator.skillIconY - iconSize / 2, iconSize, iconSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(operator.skillIconX - iconSize / 2, operator.skillIconY - iconSize / 2, iconSize, iconSize);
      }
      
      
      // 퇴각 아이콘 그리기 (배치 방향 지정 중 또는 클릭했을 때만 표시)
      if (operator.showRetreatIcon) {
        const iconSize = 36; // 1.5배 크기
        ctx.fillStyle = '#ff4444'; // 빨간색
        ctx.fillRect(operator.retreatIconX - iconSize / 2, operator.retreatIconY - iconSize / 2, iconSize, iconSize);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(operator.retreatIconX - iconSize / 2, operator.retreatIconY - iconSize / 2, iconSize, iconSize);
        
        // X 표시 그리기
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(operator.retreatIconX - iconSize / 3, operator.retreatIconY - iconSize / 3);
        ctx.lineTo(operator.retreatIconX + iconSize / 3, operator.retreatIconY + iconSize / 3);
        ctx.moveTo(operator.retreatIconX + iconSize / 3, operator.retreatIconY - iconSize / 3);
        ctx.lineTo(operator.retreatIconX - iconSize / 3, operator.retreatIconY + iconSize / 3);
        ctx.stroke();
      }
    });
    
    // === 코스트 UI 그리기 (가장 위에) ===
    drawCostUI(ctx);
  }
  
  // === 결과 애니메이션 그리기 ===
  if (gameState === 'failure' || gameState === 'clear') {
    drawResultAnimation(ctx);
  }
  
  // === 게임 시작 화면 그리기 ===
  if (gameState === 'ready') {
    // 반투명 검은색 오버레이
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 게임 시작 버튼
    const buttonWidth = 300;
    const buttonHeight = 80;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height / 2 - buttonHeight / 2;
    
    // 버튼 배경
    ctx.fillStyle = '#1e90ff';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    // 버튼 텍스트
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('게임 시작', canvas.width / 2, canvas.height / 2);
    
    // 클릭 안내 텍스트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '18px Arial';
    ctx.fillText('버튼을 클릭하여 게임을 시작하세요', canvas.width / 2, canvas.height / 2 + 80);
  }
  
  // === 재시작 화면 그리기 ===
  if (gameState === 'retry') {
    // 깜빡임 효과 (sin 함수 사용, 1.5초 주기로 천천히)
    const blinkAlpha = (Math.sin(retryBlinkTimer * Math.PI * 2 / 1.5) + 1) / 2; // 0~1 사이 값
    const minAlpha = 0.3; // 최소 알파값 (완전히 사라지지 않게)
    const alpha = minAlpha + (1 - minAlpha) * blinkAlpha;
    
    ctx.save();
    // RETRY? 텍스트 (크게)
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 96px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RETRY?', canvas.width / 2, canvas.height / 2 - 30);
    
    // 클릭으로 게임을 재시작합니다 텍스트 (작게)
    ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
    ctx.font = '18px Arial';
    ctx.fillText('클릭으로 게임을 재시작합니다', canvas.width / 2, canvas.height / 2 + 50);
    ctx.restore();
  }
  
  // === 일시 정지 표시 ===
  if (isPaused) {
    // 깜빡임 효과 (sin 함수 사용, 1초 주기)
    const blinkAlpha = (Math.sin(pauseBlinkTimer * Math.PI * 2) + 1) / 2; // 0~1 사이 값
    const minAlpha = 0.3; // 최소 알파값 (완전히 사라지지 않게)
    const alpha = minAlpha + (1 - minAlpha) * blinkAlpha;
    
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = 'bold 96px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSE', canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }
  
  // === 화면 페이드 ===
  if (screenFadeAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${screenFadeAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// 코스트 UI 그리기
function drawCostUI(ctx) {
  const uiX = canvas.width - 120; // 오른쪽에서 150px 떨어진 위치
  const uiY = canvas.height - 120; // 아래쪽 여백
  const uiWidth = 120;
  const uiHeight = 80;
  
  // 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(uiX, uiY, uiWidth, uiHeight);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(uiX, uiY, uiWidth, uiHeight);
  
  // 코스트 다이아몬드 아이콘
  const diamondSize = 20;
  const diamondX = uiX + 15;
  const diamondY = uiY + 15;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(diamondX, diamondY - diamondSize / 2);
  ctx.lineTo(diamondX + diamondSize / 2, diamondY);
  ctx.lineTo(diamondX, diamondY + diamondSize / 2);
  ctx.lineTo(diamondX - diamondSize / 2, diamondY);
  ctx.closePath();
  ctx.fill();
  
  // C 문자
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', diamondX, diamondY);
  
  // 현재 코스트 숫자
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(Math.floor(currentCost).toString(), diamondX + diamondSize / 2 + 5, diamondY - 8);
  
  // 코스트 회복 게이지 (1코스트 회복 진행도)
  const gaugeX = uiX + 10;
  const gaugeY = uiY + 40;
  const gaugeWidth = uiWidth - 20;
  const gaugeHeight = 8;
  
  // 게이지 배경
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(gaugeX, gaugeY, gaugeWidth, gaugeHeight);
  
  // 게이지 (1코스트 회복 진행도: 자연 회복 코스트의 소수점 부분만 표시)
  const costProgress = naturalRegenCost - Math.floor(naturalRegenCost);
  ctx.fillStyle = '#4ade80'; // 초록색
  ctx.fillRect(gaugeX, gaugeY, gaugeWidth * costProgress, gaugeHeight);
  
  // 배치 가능 인원
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`배치 가능 인원: ${maxDeployCount - currentDeployCount}`, uiX + 10, gaugeY + gaugeHeight + 10);
}