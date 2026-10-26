# 設定共用愛心 ❤️ 與留言（Firebase）

網站是 GitHub Pages 靜態站，愛心／留言要存在雲端才能「所有訪客共享」。
請用免費的 Firebase Realtime Database（約 5 分鐘）。

## 1. 建立專案

1. 開啟 https://console.firebase.google.com/
2. 新增專案（名稱隨意，例如 `simba-life`）
3. 關閉 Google Analytics 亦可

## 2. 建立 Realtime Database

1. 左側 **Build → Realtime Database → Create Database**
2. 地點選 `asia-southeast1`（或就近）
3. 先選 **Start in test mode**（稍後改規則）

## 3. 登錄網頁 App、複製設定

1. 專案設定（齒輪）→ **Your apps** → 加 **Web**（`</>`）
2. 暱稱填 `simba-life`
3. 複製 `firebaseConfig` 物件裡的欄位

## 4. 貼到網站設定檔

編輯 repo 根目錄的 `engagement-config.js`：

```js
window.SIMBA_ENGAGEMENT = {
  enabled: true,
  firebase: {
    apiKey: "AIza…",
    authDomain: "YOUR.firebaseapp.com",
    databaseURL: "https://YOUR-default-rtdb.REGION.firebasedatabase.app",
    projectId: "YOUR",
    storageBucket: "YOUR.appspot.com",
    messagingSenderId: "…",
    appId: "1:…:web:…"
  },
  rootPath: "simba-life/posts",
  maxCommentLength: 200
};
```

`databaseURL` 一定要填（Realtime Database 網址）。

## 5. 安全規則（只開放 likes／comments）

Realtime Database → Rules，改成：

```json
{
  "rules": {
    "simba-life": {
      "posts": {
        "$postId": {
          "likeCount": {
            ".read": true,
            ".write": true,
            ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() < 1000000"
          },
          "likes": {
            ".read": true,
            "$visitorId": {
              ".write": true,
              ".validate": "newData.isBoolean()"
            }
          },
          "comments": {
            ".read": true,
            "$commentId": {
              ".write": "!data.exists() && newData.hasChildren(['text', 'createdAt'])",
              ".validate": "newData.child('text').isString() && newData.child('text').val().length > 0 && newData.child('text').val().length <= 200 && newData.child('createdAt').isNumber()",
              "text": { ".validate": true },
              "createdAt": { ".validate": true },
              "name": {
                ".validate": "!newData.exists() || (newData.isString() && newData.val().length <= 40)"
              },
              "$other": { ".validate": false }
            }
          },
          "$other": { ".validate": false }
        }
      }
    }
  }
}
```

發布規則後，把更新後的 `engagement-config.js` 推上 `main`。

## 需要給助手的資料

只要把下面貼回來即可（都是**公開**前端金鑰，不是服務帳戶私鑰）：

- `apiKey`
- `authDomain`
- `databaseURL`
- `projectId`
- （可選）`appId` / `storageBucket` / `messagingSenderId`

## 備註

- 開放寫入仍可能被濫用；規則已限制路徑、讚數上限、留言長度。
- 若日後要鎖緊，可改匿名登入 + 每使用者寫入配額。
