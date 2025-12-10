// 적 유닛 데이터
const enemyData = [
  {
    // 0~10 까지 근접, 11~20 원거리, 21, 22 보스
    id: 0,
    name: '사냥개',
    health: 820,
    maxHealth: 820,
    speed: 140,
    radius: 12,
    attackRange: 0,
    attackPower: 260,
    attackInterval: 1.4,
    magicResist: 20,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 1,
    name: '사냥개-P',
    health: 1700,
    maxHealth: 1700,
    speed: 140,
    radius: 12,
    attackRange: 0,
    attackPower: 370,
    attackInterval: 1.4,
    magicResist: 20,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 2,
    name: '드론-a',
    health: 1050,
    maxHealth: 1050,
    speed: 90,
    radius: 12,
    attackRange: 0,
    attackPower: 185,
    attackInterval: 1.7,
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 3,
    name: '드론-b',
    health: 1550,
    maxHealth: 1550,
    speed: 90,
    radius: 12,
    attackRange: 0,
    attackPower: 240,
    attackInterval: 1.7,
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 4,
    name: '폭도',
    health: 1700,
    maxHealth: 1700,
    speed: 100,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 250,
    attackInterval: 2, // 초
    defense: 50,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 5,
    name: '병사',
    health: 1650,
    maxHealth: 1650,
    speed: 100,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 200,
    attackInterval: 2, // 초
    defense: 100,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 6,
    name: '기동방패병',
    health: 2050,
    maxHealth: 2050,
    speed: 90,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 240,
    attackInterval: 1, // 초
    defense: 250,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 7,
    name: '부랑자',
    health: 5000,
    maxHealth: 5000,
    speed: 70,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 500,
    attackInterval: 3, // 초
    defense: 50,        // 방어력 (물리 대미지 감소)
    magicResist: 20,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 8,
    name: '공중 드론',
    health: 800,
    maxHealth: 800,
    speed: 80,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 0,
    attackInterval: 2.3, // 초
    defense: 50,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 9,
    name: '쌍검사',
    health: 2000,
    maxHealth: 2000,
    speed: 100,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 350,
    attackInterval: 1.2, // 초
    defense: 100,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 10,
    name: '중기갑병',
    health: 6000,
    maxHealth: 6000,
    speed: 75,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 600,
    attackInterval: 2.6, // 초
    defense: 800,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 11,
    name: '화염병 투척병',
    health: 1550,
    maxHealth: 1550,
    speed: 90,
    radius: 12,
    attackRange: 1.75, // 타일 단위
    attackPower: 180,
    attackInterval: 2.7, // 초
    defense: 50,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 12,
    name: '캐스터',
    health: 1600,
    maxHealth: 1600,
    speed: 70,
    radius: 12,
    attackRange: 1.8, // 타일 단위
    attackPower: 200,
    attackInterval: 4, // 초
    defense: 50,        // 방어력 (물리 대미지 감소)
    magicResist: 50,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 13,
    name: '석궁병',
    health: 1400,
    maxHealth: 1400,
    speed: 70,
    radius: 12,
    attackRange: 1.9, // 타일 단위
    attackPower: 240,
    attackInterval: 2.4, // 초
    defense: 100,        // 방어력 (물리 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 21,
    name: '알파',
    health: 6000,
    maxHealth: 6000,
    speed: 120,
    radius: 12,
    attackRange: 0, // 타일 단위
    attackPower: 400,
    attackInterval: 2.8, // 초
    defense: 120,        // 방어력 (물리 대미지 감소)
    magicResist: 50,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
  {
    id: 22,
    name: '베타',
    health: 10000,
    maxHealth: 10000,
    speed: 110,
    radius: 12,
    attackRange: 2.5, // 타일 단위
    attackPower: 470,
    attackInterval: 4, // 초
    defense: 100,        // 방어력 (물리 대미지 감소)
    magicResist: 50,     // 마법 저항 (마법 대미지 감소)
    color: '#ff6b6b',
    borderColor: '#cc0000'
  },
];

// 전역 변수로 설정
window.enemyData = enemyData;

