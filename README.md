# MyHealth MVP

MyHealth 是一个本地优先的 AI 健康生活方式助手 MVP。用户档案、每日建议、每日打卡和设置都保存在浏览器本地；建议由确定性规则生成，饮食/运动卡片可通过豆包 Seedream 生成配图，接口不可用时使用 SVG 降级图。

## 页面范围

- `/`：今日建议、饮食/运动卡片、BMR/TDEE/目标热量/BMI/宏量指标、提醒与免责声明
- `/profile`：8 字段档案表单，使用 `react-hook-form` + `zod` 做校验
- `/log`：饮食、运动、体重、心情打卡，支持 7 天内补录
- `/history`：30 天日历、体重趋势、心情趋势、连续打卡与勋章
- `/settings`：主题、本地数据导出、清除数据、云同步占位
- `/auth`：本地模式说明与未来 Supabase 魔法链接登录占位

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
npm run test:e2e
```

## 本地数据

当前实现使用浏览器本地存储作为本地数据库兜底层。未来接入 IndexedDB、Supabase 或同步服务时，可保留页面层调用的 repository 风格接口。

## 未来云端变量

参考 `.env.example`：Supabase URL/Anon Key、Ark/Doubao/Seedream API Key。请勿提交真实密钥。

豆包文生图使用服务器端 `/api/advise` 调用，支持以下变量：

- `ARK_API_KEY`、`DOUBAO_API_KEY` 或 `SEEDREAM_API_KEY`：三者任一可用即可。
- `ARK_BASE_URL`：默认 `https://ark.cn-beijing.volces.com/api/v3`。
- `DOUBAO_IMAGE_MODEL`：默认 `doubao-seedream-5-0-260128`。
- `DOUBAO_IMAGE_SIZE`：默认 `2K`。

## 豆包配图：临时 URL、代理与导出

- 豆包 Seedream 返回的图片 URL 是带签名的临时地址（`X-Tos-Expires=86400`，24 小时内有效）。
- 当前实现把 URL 缓存在浏览器 localStorage 里以支持「重新生成前的快照」和首屏秒开；
  但 24 小时后原 URL 会失效，历史回看 / 离线缓存需要先转存到 IndexedDB / Supabase Storage。
- 跨域导出：首页「保存卡片」通过 `/api/image-proxy?url=...`（仅白名单 `*.volces.com`、`ark.cn-beijing.volces.com` 等）把图拉回同源并附 `Access-Control-Allow-Origin: *`，
  再用 html2canvas 把整个今日建议区转成 PNG 下载，规避豆包 CDN 不带 CORS 头导致画布被污染的问题。

## 健康边界

MyHealth 只提供生活方式参考，不做医疗诊断。如有疾病、孕产、未成年或身体不适，请咨询医生。
