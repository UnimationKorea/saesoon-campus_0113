# 🌿 이음누리 캠퍼스 - 서버리스 예약 시스템 기술 명세서

본 문서는 현재 개발된 **이음누리 캠퍼스 프론트엔드**와 **구글 시트(DB)**를 **구글 앱스 크립트(API)**로 연결하기 위한 통합 가이드입니다.

---

## 1. 시스템 구성도 (Architecture)

1.  **Frontend**: React (Vite/ESM) + Tailwind CSS (UI)
2.  **Intelligence**: Google Gemini 1.5 Flash (AI 상담)
3.  **Backend (API)**: Google Apps Script (GAS)
4.  **Database**: Google Sheets (데이터 저장)

---

## 2. 구글 시트(DB) 설계

구글 시트 파일에 아래 이름의 시트(Tab)를 생성하고 첫 행에 헤더를 입력합니다.

### **① `reservations` 시트**
| 열 (Column) | 항목명 | 예시 데이터 |
| :--- | :--- | :--- |
| A | **id** | `res_9z1x2c` |
| B | **spaceId** | `ieum-hall` |
| C | **userName** | `홍길동` |
| D | **purpose** | `지역 소모임` |
| E | **date** | `2024-05-30` |
| F | **startTime** | `14:00` |
| G | **endTime** | `16:00` |
| H | **status** | `pending` |
| I | **createdAt** | `1716350000000` |

---

## 3. 구글 앱스 크립트(GAS) 소스 코드

구글 시트의 [확장 프로그램] -> [Apps Script]에 아래 코드를 복사하여 배포합니다.

```javascript
/**
 * 이음누리 캠퍼스 API 서버
 * GET: 데이터 조회 | POST: 데이터 추가/수정
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const RES_SHEET = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('reservations');

// 1. 데이터 조회 (GET)
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getReservations') {
    const data = RES_SHEET.getDataRange().getValues();
    const headers = data.shift();
    const json = data.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(json))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. 데이터 저장 및 상태 변경 (POST)
function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;

  if (action === 'saveReservation') {
    const res = params.data;
    RES_SHEET.appendRow([
      res.id, res.spaceId, res.userName, res.purpose, 
      res.date, res.startTime, res.endTime, res.status, res.createdAt
    ]);
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'updateStatus') {
    const { id, status } = params;
    const data = RES_SHEET.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { // id 열 매칭
        RES_SHEET.getRange(i + 1, 8).setValue(status); // status 열(H) 수정
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({result: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 4. 프론트엔드 연동 가이드

현재 `index.tsx`의 `CloudService` 객체를 아래와 같이 수정하여 연결할 수 있습니다.

### **API 호출 규격**
```typescript
const GAS_URL = "배포된_웹_앱_URL";

const CloudService = {
  // 예약 목록 가져오기
  getReservations: async () => {
    const res = await fetch(`${GAS_URL}?action=getReservations`);
    return await res.json();
  },

  // 예약 저장하기
  saveReservation: async (data) => {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveReservation', data })
    });
  },

  // 승인/거절 상태 업데이트
  updateStatus: async (id, status) => {
    await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'updateStatus', id, status })
    });
  }
};
```

---

## 5. 현재 앱 상태 요약 (Snapshot)

- **UI**: 100% (다크/라이트 모드 대응 클린 디자인)
- **Logic**: 100% (2시간/1시간 예약 정책 로직 포함)
- **AI**: 100% (Gemini 1.5 기반 시설 안내 시스템)
- **Server Connection**: 준비 완료 (비동기 처리 구조 설계됨)

---
**이 문서는 기술 가이드라인이며, 프론트엔드 코드는 본 명세서의 `CloudService` 구조를 따르고 있습니다.**
