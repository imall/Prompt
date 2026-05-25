# Prompt

AI 繪圖 Prompt 模組化管理系統，含素材庫與產生器工具。

## 專案結構

```
Prompt/
├── Prompt-Library/        # Prompt 模組素材庫
│   ├── 00_說明/           # 使用說明與命名規則
│   ├── 01_母版/           # 比例與畫風基準框架
│   ├── 02_角色/           # 角色外觀模組
│   ├── 03_服裝/           # 服裝設定模組
│   ├── 04_姿勢/           # 動作與姿勢模組
│   ├── 05_場景/           # 場景與環境模組
│   ├── 06_光影畫風/       # 燈光、光影、畫風模組
│   ├── 07_負面Prompt/     # 負面 Prompt 防崩壞模組
│   └── 08_成品Prompt/     # 組裝後的完整可用 Prompt
└── prompt-generate/       # 模組化 Prompt 產生器 Web App
```

---

## 新增模組

### 1. 在對應資料夾建立 `.md` 檔

| 想新增的類型 | 放到哪個資料夾 |
|---|---|
| 母版（比例/畫風基準） | `Prompt-Library/01_母版/` |
| 角色基底（臉/眼/氣質） | `Prompt-Library/02_角色/` |
| 髮型 | `Prompt-Library/02_角色/` |
| 身材 | `Prompt-Library/02_角色/` |
| 服裝 | `Prompt-Library/03_服裝/` |
| 姿勢 | `Prompt-Library/04_姿勢/` |
| 場景 | `Prompt-Library/05_場景/` |
| 光影畫風 | `Prompt-Library/06_光影畫風/` |
| 負面 Prompt | `Prompt-Library/07_負面Prompt/` |

### 2. 檔案格式

每個 `.md` 檔頂部必須有 YAML front matter，其餘內容就是 prompt 正文：

```markdown
---
id: 唯一識別碼（kebab-case，不可重複）
category: 對應類別（見下表）
label: UI 顯示名稱
tags: [選填, 標籤]
---

Prompt 正文內容...
```

**category 對照表：**

| category | 說明 |
|---|---|
| `template` | 母版（畫風/品質基準） |
| `size` | 尺寸（16:9 / 9:20） |
| `character` | 角色基底 |
| `character_hair` | 髮型 |
| `character_body` | 身材 |
| `outfit` | 服裝 |
| `pose` | 姿勢 |
| `scene` | 場景 |
| `lighting` | 光影畫風 |
| `negative` | 負面 Prompt |

### 3. 新增顏色/版本子選項（variants）

如果同一個模組有多個可抽換的版本（例如顏色），在 front matter 加 `variants`：

```markdown
---
id: outfit-example
category: outfit
label: 範例服裝
variants:
  - id: white
    label: 白色
    prompt: "white dress, clean and elegant."
  - id: black
    label: 黑色
    prompt: "black dress, sophisticated and stylish."
---

服裝共用描述...（不含顏色的部分放這裡）
```

選到該模組後，UI 會自動出現子選單供選擇版本。

### 4. 命名規則

- **模組檔名**：中文或英文皆可，直覺描述即可
  - 例：`短髮.md`、`咖啡廳.md`、`黃昏逆光.md`
- **角色拆分命名**：`[角色名]_基底.md`、`[角色名]_髮型.md`、`[角色名]_身材.md`
- **成品檔名**：`日期_角色_場景_服裝_動作_比例.md`
  - 例：`2026-05-22_紫髮少女_日本教室_校服_整理頭髮_16x9.md`

### 5. 套用到 App

編輯完 `.md` 後執行：

```bash
cd prompt-generate
pnpm build
```

重新整理瀏覽器即生效。

---

## 啟動 App

```bash
cd prompt-generate
pnpm install     # 第一次需要
pnpm build       # 重新產生 data.json
pnpm start       # 開啟 http://localhost:3000
```

---

## Prompt-Library

以「模組化」概念管理 AI 繪圖 Prompt。每個模組是獨立的 `.md` 檔案，組裝邏輯如下：

```
母版（比例 + 畫風基準）
+ 角色基底（臉/眼/氣質）
+ 髮型
+ 身材
+ 服裝（可多選）
+ 姿勢
+ 場景
+ 光影畫風
+ 負面 Prompt（可多選）
```

`08_成品Prompt/` 存放已組裝完成的完整 Prompt，依角色分資料夾，直接複製使用。

### 現有角色

| 角色 | 特徵 |
|------|------|
| 黑長直學姐（詩羽） | 黑長直髮、白色髮箍、紅棕色玻璃感眼睛 |
| 紫髮少女（費倫） | 極長紫色長髮、整齊厚瀏海、紫色玻璃感眼睛 |
