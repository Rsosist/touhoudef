// stage1.js
// 맵 데이터 파일

window.stage1MapData = [
    [3,3,3,3,3,3,3,3,3,3,3],
    [6,0,1,1,1,1,1,2,1,1,5],
    [3,3,4,4,1,4,3,4,2,4,3],
    [3,4,4,4,2,4,4,4,1,4,3],
    [5,1,2,2,1,1,1,1,1,2,6],
    [3,4,4,2,4,4,1,1,4,4,3],
    [5,1,2,2,1,1,1,1,4,3,3],
    [3,3,3,3,3,3,3,3,3,3,3]
];

window.stage1MapInfo = {
  rows: 8,
  cols: 11,
  tileSize: 64,
  maxDeployCount: 9,  // 배치 가능 인원
  playerHP: 10
};

// 적 스폰 설정
window.stage1EnemySpawns = {
  // 적 지역과 아군 지역 매핑
  // 각 적 지역에서 어떤 아군 지역으로 이동할지 지정
  spawnToBaseMapping: [
    { spawnX: 10, spawnY: 1, baseX: 0, baseY: 1 }, // 오른쪽 적 지역(A) -> 왼쪽 아군 지역(A-1)
    { spawnX: 0, spawnY: 4, baseX: 10, baseY: 4 },  // 왼쪽 적 지역(B) -> 아래쪽 아군 지역(B-1)
    { spawnX: 0, spawnY: 6, baseX: 10, baseY: 4 }  // 왼쪽 적 지역(C) -> 아래쪽 아군 지역(B-1)
  ],
  
  // 적 출현 순서 및 정보
  // 각 항목: { delay: 출현 지연 시간(초), spawnX: 적 지역 X, spawnY: 적 지역 Y, enemyId: 적 ID, count: 스폰 개수 }
  spawnSequence: [
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 0, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 0, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 0, count: 1 }, // B스폰
    { delay: 0.2, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 0, count: 1 }, // B스폰
    { delay: 0.2, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 5, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 5, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 5, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 2, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 4, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 2, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 0, count: 1 }, // C스폰
    { delay: 5, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 2, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 2, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 2, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 2, count: 1 }, // C스폰
    { delay: 4, spawnX: 0, spawnY: 4, enemyId: 4, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 4, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 4, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 4, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 4, spawnX: 10, spawnY: 1, enemyId: 5, count: 1 }, // A스폰
    { delay: 1, spawnX: 10, spawnY: 1, enemyId: 7, count: 1 }, // A스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 4, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 0.1, spawnX: 0, spawnY: 6, enemyId: 3, count: 1 }, // C스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 4, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 3, count: 1 }, // B스폰
    { delay: 4, spawnX: 10, spawnY: 1, enemyId: 5, count: 1 }, // A스폰
    { delay: 1, spawnX: 10, spawnY: 1, enemyId: 7, count: 1 }, // A스폰
    { delay: 1, spawnX: 10, spawnY: 1, enemyId: 8, count: 1 }, // A스폰
    { delay: 4, spawnX: 0, spawnY: 6, enemyId: 6, count: 1 }, // C스폰
    { delay: 1, spawnX: 0, spawnY: 4, enemyId: 7, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 4, enemyId: 8, count: 1 }, // B스폰
    { delay: 5, spawnX: 10, spawnY: 1, enemyId: 22, count: 1 }, // A스폰
    { delay: 3, spawnX: 0, spawnY: 4, enemyId: 5, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 7, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 8, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 6, count: 1 }, // C스폰
    { delay: 5, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 0.1, spawnX: 0, spawnY: 4, enemyId: 1, count: 1 }, // B스폰
    { delay: 1, spawnX: 0, spawnY: 6, enemyId: 21, count: 1 }, // C스폰
    { delay: 4, spawnX: 10, spawnY: 1, enemyId: 6, count: 1 }, // A스폰
    { delay: 1, spawnX: 10, spawnY: 1, enemyId: 5, count: 1 }, // A스폰
    { delay: 1, spawnX: 10, spawnY: 1, enemyId: 5, count: 1 } // A스폰
  ],
  
  // 적의 최대 수 (동시에 존재할 수 있는 최대 적 수, 0이면 무제한)
  maxEnemies: 108
};