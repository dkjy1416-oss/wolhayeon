/**
 * 11/26 운영자 요청: 영상 탭 — 월하연 공식 유튜브(@thewolha) 쇼츠를 묘수 /watch 처럼 모아 보기.
 * 썸네일은 유튜브 쇼츠 세로 썸네일(oar2), 재생은 유튜브 임베드. 새 쇼츠가 올라오면 맨 위에 한 줄 추가.
 */
export const YT_CHANNEL = "https://www.youtube.com/@thewolha";

export type Short = { id: string; title: string; tag: string };

export const SHORTS_YT: Short[] = [
  { id: "T0AhlWKnETU", title: "천 일 케이크 들고 갔더니 돌아온 말 ‘그게 그렇게 중요해?’", tag: "갈등" },
  { id: "eXFxVyY_Q7E", title: "헤어지고 첫 비, ‘난 괜찮아, 너 써’ 하던 사람", tag: "이별 회상" },
  { id: "zBuWxW7KLuo", title: "헤어지고 ‘오늘부터 갓생’ 선언한 날, 친구가 본 현실", tag: "웃픈 이별" },
  { id: "-lu6gCIXsfY", title: "헤어지며 들은 ‘좋은 사람 만나’… 2주째 못 보낸 연락", tag: "연락 고민" },
  { id: "SaIBi8pDVLE", title: "얼마나 좋아해야 사랑인 걸까?", tag: "월화의 한 줄" },
  { id: "5FuHU8olDWg", title: "헤어질 때 ‘힘들면 연락해’… 그 말만 3주째 붙잡는 중", tag: "연락 고민" },
  { id: "-0Xaq07EaGE", title: "전남친인 줄 알고 횡단보도 뛰어가 잡았는데…", tag: "웃픈 이별" },
  { id: "xCy5ALX0y7Q", title: "‘말을 해야 알지’ 처음엔 다 알아주던 사람이었는데", tag: "이별 회상" },
  { id: "A6ZCzFbe6DI", title: "‘나중에 연락할게’ 그 말만 믿고 한 달 기다린 여자", tag: "연락 고민" },
  { id: "4Zwfp2HL1KE", title: "야근하고 나왔더니 “나 이제 안 기다릴래”… 회사 앞 이별", tag: "갈등" },
  { id: "9Ex278z96Aw", title: "힘들었다고 울었더니 ‘그래서 결론이 뭔데?’", tag: "갈등" },
  { id: "lMHD1SXc1Ks", title: "차단당하고 친구 폰까지 빌린 여자… 근데 어제 이미 보냈다고?", tag: "연락 고민" },
  { id: "3RWCoqcER7I", title: "내 카톡은 안 읽으면서… 하루 종일 기다린 사람", tag: "연락 고민" },
  { id: "A7W_aBM-fzI", title: "새벽에 전남친 프사 보다가 실수로 눌러버림", tag: "웃픈 이별" },
  { id: "r7-OOdStniE", title: "하루종일 연락 없는 남친한테 결국 터졌다 “또 내가 해야 돼?”", tag: "갈등" },
  { id: "F0-Bb9RHJhA", title: "5년 사귄 남친에게 ‘우린 언제 해?’ 물었더니", tag: "갈등" },
  { id: "2oQbVpk47Xs", title: "새벽 2시, 폰 뒤집어 두는 남친… 근데 나 어제 네 폰 봤어", tag: "갈등" },
  { id: "WzdYnPZZElI", title: "남친 폰에서 발견한 다른 여자 사진", tag: "갈등" },
  { id: "Ixy898DTHjQ", title: "술 좀 쉬자고 했을 뿐인데… 보자고도 안 하는 남친", tag: "갈등" },
  { id: "pEoT9fQEx6c", title: "“오빠, 한 번만 다시 만나자니까!”", tag: "이별 회상" },
  { id: "Lvsshhk3Y74", title: "친구들이 아는 내 이별 vs 진짜 내 이별", tag: "웃픈 이별" },
  { id: "ZPvxbwGfYmQ", title: "맨날 친구, 술, 친구, 술… 결국 폭발한 여자친구", tag: "갈등" },
  { id: "ISj1Yz0X7LM", title: "맨날 계란 넣어주던 전남친… 사실 나 계란 안 좋아해", tag: "이별 회상" },
  { id: "tTtIFOsza5k", title: "다시 만나면 이번엔 다를까?", tag: "월화의 한 줄" },
  { id: "W5lAdcSHPwU", title: "새벽 2시 택시에서 전남친한테 ‘자니’ 보냈는데… 받는 사람이 엄마였음", tag: "웃픈 이별" },
  { id: "boKLRjFv6DE", title: "경찰도 못 말리는 이별 후유증", tag: "웃픈 이별" },
  { id: "ZW4usVG3JG8", title: "헤어지고 차단했는데 배달기사가 전남친", tag: "웃픈 이별" },
];

export const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/oar2.jpg`;
export const ytThumbH = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
