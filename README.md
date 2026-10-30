# Simba 的生活日記

為小狗 **Simba** 建立的靜態生活記錄網頁（第一版）。  
介面為繁體中文，可在瀏覽器直接開啟，無需安裝伺服器。

## 如何開啟

1. 用檔案總管進入資料夾 `simba-life`
2. 雙擊 **`index.html`**，或用瀏覽器「開啟檔案」選取它  
   （Chrome、Safari、Edge、Firefox 皆可）
3. 也可在本機用簡易伺服器開啟（可選）：
   ```bash
   cd simba-life
   python3 -m http.server 8080
   ```
   然後在瀏覽器開啟 `http://localhost:8080`

## 網站內容

| 區塊 | 說明 |
|------|------|
| 關於 Simba | 主視覺與簡介（主照片目前為預留格） |
| 生活日記 | 時間軸日記；含標示「範例」的示範文，可自行改寫或刪除 |
| 外出記錄 | 日期、地點與短記；含範例 |
| 相片與影片 | 相簿格位預留，之後換成真實媒體 |
| 寫下一筆 | 表單可新增日記／外出；資料存在瀏覽器 localStorage |

## 如何加入自己的照片／影片

1. 把照片放到 `images/`（例如 `images/simba-hero.jpg`）
2. 把影片放到 `videos/`
3. 編輯 `index.html`：
   - **主照片**：把「關於」區塊的 `.photo-placeholder` 換成  
     `<img src="images/simba-hero.jpg" alt="Simba" />`
   - **相簿**：把對應的預留格換成 `<img>` 或 `<video controls src="videos/xxx.mp4">`
4. 儲存後重新整理瀏覽器即可

建議先壓縮大圖，讓手機開啟也順暢。

## 檔案結構

```
simba-life/
├── index.html    # 主頁
├── styles.css    # 樣式
├── app.js        # 新增紀錄（localStorage）
├── images/       # 放照片
├── videos/       # 放影片
└── README.md
```

## 接下來可以做（第二版構想）

- 放到 GitHub Pages / Netlify 等免費空間，用手機隨時開
- 真正的上傳與雲端儲存（需後端或無程式碼工具）
- 依月份篩選日記、地圖標記外出地點
- 匯出成 PDF 小冊子

—

為 Simba 而寫 · 慢慢記錄就好。
