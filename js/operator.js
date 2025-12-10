// 아군 유닛 데이터
const operatorData = [
  {
    //0~2 뱅가드, 3~4 디펜더, 5~7 가드, 8~10 스나이퍼, 11~13 캐스터, 14~15 메딕
    //뱅가드
    id: 0,
    name: '머틀',
    attackPower: 331,
    health: 902,
    maxHealth: 902,
    attackRange: 1,
    attackInterval: 1.3,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 193,        // 방어력 (물리 대미지 감소)
    cost: 8,             // 배치 필요 코스트
    color: '#e04cc8ff',
    borderColor: '#22c55e'
  },
  {
    id: 1,
    name: '백파이프',
    attackPower: 369,
    health: 1355,
    maxHealth: 1355,
    attackRange: 1,
    attackInterval: 1,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 241,        // 방어력 (물리 대미지 감소)
    cost: 9,             // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 2,
    name: '블랙나이트',
    attackPower: 275,
    health: 1038,
    maxHealth: 1038,
    attackRange: 4,
    attackInterval: 1,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 78,        // 방어력 (물리 대미지 감소)
    cost: 10,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  //디펜더
  {
    id: 3,
    name: '호시구마',
    attackPower: 284,
    health: 2165,
    maxHealth: 2165,
    attackRange: 1,
    attackInterval: 1.2,
    radius: 20,
    blockCount: 3, // 최대 저지 가능 적 수
    defense: 384,        // 방어력 (물리 대미지 감소)
    cost: 12,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  {
    id: 4,
    name: '사리아',
    attackPower: 287,
    health: 1769,
    maxHealth: 1769,
    attackRange: 1,
    attackInterval: 1.2,
    radius: 20,
    blockCount: 3, // 최대 저지 가능 적 수
    defense: 365,        // 방어력 (물리 대미지 감소)
    magicResist: 10,     // 마법 저항 (마법 대미지 감소)
    cost: 11,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  //가드
  {
    id: 5,
    name: '실버애쉬',
    attackPower: 444,
    health: 1536,
    maxHealth: 1536,
    attackRange: 1.11,
    attackInterval: 1.3,
    radius: 20,
    blockCount: 2, // 최대 저지 가능 적 수
    defense: 259,        // 방어력 (물리 대미지 감소)
    magicResist: 5,     // 마법 저항 (마법 대미지 감소)
    cost: 13,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  {
    id: 6,
    name: '스펙터',
    attackPower: 407,
    health: 1538,
    maxHealth: 1538,
    attackRange: 1,
    attackInterval: 1.2,
    radius: 20,
    blockCount: 3, // 최대 저지 가능 적 수
    defense: 215,        // 방어력 (물리 대미지 감소)
    cost: 11,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  {
    id: 7,
    name: '좌락',
    attackPower: 498,
    health: 2198,
    maxHealth: 2198,
    attackRange: 1,
    attackInterval: 1.2,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 208,        // 방어력 (물리 대미지 감소)
    cost: 14,            // 배치 필요 코스트
    color: '#35bcc5ff',
    borderColor: '#22c55e'
  },
  //스나이퍼
  {
    id: 8,
    name: '엑시아',
    attackPower: 305,
    health: 1016,
    maxHealth: 1016,
    attackRange: 4,
    attackInterval: 1,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 95,        // 방어력 (물리 대미지 감소)
    cost: 10,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 9,
    name: '슈바르츠',
    attackPower: 490,
    health: 1086,
    maxHealth: 1086,
    attackRange: 3,
    attackInterval: 1.6,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 123,        // 방어력 (물리 대미지 감소)
    cost: 16,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 10,
    name: '나란투야',
    attackPower: 382,
    health: 1520,
    maxHealth: 1520,
    attackRange: '3-1',
    attackInterval: 1,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 100,        // 방어력 (물리 대미지 감소)
    cost: 12,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  //캐스터
  {
    id: 11,
    name: '이프리트',
    attackPower: 563,
    health: 982,
    maxHealth: 982,
    attackRange: 0.11111,
    attackInterval: 2.9,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 79,        // 방어력 (물리 대미지 감소)
    magicResist: 10,     // 마법 저항 (마법 대미지 감소)
    cost: 20,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 12,
    name: '에이야퍄들라',
    attackPower: 406,
    health: 1046,
    maxHealth: 1046,
    attackRange: 2.1,
    attackInterval: 1.6,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 79,        // 방어력 (물리 대미지 감소)
    magicResist: 10,     // 마법 저항 (마법 대미지 감소)
    cost: 18,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 13,
    name: '모스티마',
    attackPower: 546,
    health: 1142,
    maxHealth: 1142,
    attackRange: 3,
    attackInterval: 2.9,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 80,        // 방어력 (물리 대미지 감소)
    magicResist: 10,     // 마법 저항 (마법 대미지 감소)
    cost: 19,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  //메딕
  {
    id: 14,
    name: '샤이닝',
    attackPower: 296,
    health: 1204,
    maxHealth: 1204,
    attackRange: 4,
    attackInterval: 2.4,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 88,        // 방어력 (물리 대미지 감소)
    cost: 15,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
  {
    id: 15,
    name: '나이팅게일',
    attackPower: 210,
    health: 1076,
    maxHealth: 1076,
    attackRange: '2-1',
    attackInterval: 3,
    radius: 20,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 107,        // 방어력 (물리 대미지 감소)
    magicResist: 5,     // 마법 저항 (마법 대미지 감소)
    cost: 16,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
    {
    id: 16,
    name: '소환물',
    attackPower: 273,
    health: 1527,
    maxHealth: 1527,
    attackRange: 1,
    attackInterval: 1.25,
    radius: 15,
    blockCount: 1, // 최대 저지 가능 적 수
    defense: 189,        // 방어력 (물리 대미지 감소)
    magicResist: 20,     // 마법 저항 (마법 대미지 감소)
    cost: 16,            // 배치 필요 코스트
    color: '#4ade80',
    borderColor: '#22c55e'
  },
];

// 전역 변수로 설정
window.operatorData = operatorData;

