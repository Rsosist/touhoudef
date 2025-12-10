// stage1.js
// 맵 데이터 파일

window.stage1MapData = [
    [0,0,3,3,3,3,5,3,3,3,3,0,0,0],
    [0,0,3,3,3,4,1,4,4,3,3,0,0,0],
    [0,0,3,3,4,4,1,4,4,3,3,0,0,0],
    [0,0,5,1,1,1,1,1,1,1,6,0,0,0],
    [0,0,3,3,3,4,4,1,4,4,3,0,0,0],
    [0,0,3,3,3,4,4,1,4,3,3,0,0,0],
    [0,0,3,3,3,3,3,6,3,3,3,0,0,0], 
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

window.stage1MapInfo = {
  rows: 8,
  cols: 14,
  tileSize: 64,
  maxDeployCount: 8  // 배치 가능 인원
};

// 적 스폰 설정
window.stage1EnemySpawns = {
  // 적 지역과 아군 지역 매핑
  // 각 적 지역에서 어떤 아군 지역으로 이동할지 지정
  spawnToBaseMapping: [
    { spawnX: 2, spawnY: 3, baseX: 10, baseY: 3 }, // 왼쪽 적 지역(A) -> 오른쪽 아군 지역(A-1)
    { spawnX: 6, spawnY: 0, baseX: 7, baseY: 6 }  // 위쪽 적 지역(B) -> 아래쪽 아군 지역(B-1)
  ],
  
  // 적 출현 순서 및 정보
  // 각 항목: { delay: 출현 지연 시간(초), spawnX: 적 지역 X, spawnY: 적 지역 Y, enemyId: 적 ID, count: 스폰 개수 }
  spawnSequence: [
    { delay: 3, spawnX: 2, spawnY: 3, enemyId: 22, count: 2 }, // 3초 후 A에서 기본 적 1마리
    { delay: 1, spawnX: 2, spawnY: 3, enemyId: 1, count: 2 }, // 3초 후 A에서 기본 적 1마리
    { delay: 1, spawnX: 2, spawnY: 3, enemyId: 2, count: 2 }, // 3초 후 A에서 기본 적 1마리
    { delay: 1, spawnX: 2, spawnY: 3, enemyId: 3, count: 2 }, // 3초 후 A에서 기본 적 1마리
    { delay: 3, spawnX: 6, spawnY: 0, enemyId: 0, count: 1 }, // 3초 후 B에서 기본 적 1마리
    { delay: 3, spawnX: 2, spawnY: 3, enemyId: 0, count: 1 }, // 3초 후 A에서 기본 적 1마리
    { delay: 3, spawnX: 6, spawnY: 0, enemyId: 0, count: 1 }  // 3초 후 B에서 기본 적 1마리
  ],
  
  // 적의 최대 수 (동시에 존재할 수 있는 최대 적 수, 0이면 무제한)
  maxEnemies: 0
};