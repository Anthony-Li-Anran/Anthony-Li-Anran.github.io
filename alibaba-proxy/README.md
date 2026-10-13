# Stelle 阿里云聊天代理（alibaba-proxy）

把网站 AI 聊天的**免费通道**从 WorkBuddy Cloud 换成你自己的阿里云函数计算（FC）
代理。代理在服务端持有 DashScope（百炼）API Key，前端只发拼好的消息、不碰 Key。
这样 CORS 由你自控，`anthony-li-anran.github.io` 这个域名就能正常聊天。

## 架构

```
github.io 前端 ──POST /chat（带 x-stelle-token）──▶ 阿里云 FC 函数（server.js）
                                                         │ 服务端持有 DASHSCOPE_API_KEY
                                                         ▼
                                              百炼 DashScope /chat/completions（qwen-plus，流式）
```

前端业务逻辑（人设、公开资料检索、流式解析）完全复用 `assets/js/stelle-direct.js`，
本代理只做「转发 + 藏 Key」，不含任何业务代码。

## 前置条件（需你自己在阿里云操作）

1. 注册并**实名认证**阿里云账号（函数计算和百炼都要求实名）。
2. 开通**函数计算 FC**（免费额度：每月 100 万次调用 + 40 万 GB·秒；新用户另有 3 个月试用包）。
3. 开通**百炼大模型服务平台**，拿到 DashScope API Key（实名后每模型约 100 万 Token
   免费，qwen-plus 约 1200 万，90 天有效；**免费额度仅限华北2（北京）地域**）。
   - 建议开启「用完即停」开关，避免超额扣费。

## 部署步骤

1. 在 FC 控制台创建函数：
   - 运行时：**Custom Runtime**（本代码按 Custom Runtime 约定监听 9000 端口）。
   - 地域：**华北2（北京）**——和百炼免费额度地域一致，避免跨地域费用。
   - 上传本目录文件：`server.js`、`bootstrap`、`package.json`。
   - 启动命令：`node server.js`（Custom Runtime 用 `bootstrap` 入口亦可）。
2. 配置环境变量（函数「环境变量」面板）：
   - `DASHSCOPE_API_KEY` = 你的百炼 Key（sk-...）
   - `STELLE_TOKEN` = 任意字符串，例如 `stelle-anthony-2026`（需和网站里的 `data-stelle-alibaba-token` 一致）
   - `MODEL` = `qwen-plus`（默认）
   - `ALLOWED_ORIGIN` = `https://anthony-li-anran.github.io`
3. 创建 **HTTP 触发器**，拿到公网 URL（形如 `https://<id>.<region>.fc.aliyuncs.com`）。
4. 把该 URL 填进网站 `_config.yml` 的 `stelle.alibaba_url`（已留配置位），例如：
   ```yaml
   stelle:
     alibaba_url: "https://xxxx.cn-beijing.fc.aliyuncs.com/chat"
     alibaba_token: "stelle-anthony-2026"
   ```
5. 重新构建并推送网站（GitHub Pages）。

## 安全与限流

- 代理只放行 `ALLOWED_ORIGIN`（CORS 校验），并校验 `x-stelle-token`（弱校验，挡掉大部分
  非本站盗用）。Token 写在网页里属于公开值，仅作基本防护，不是机密。
- **按 IP 限流（防刷）本版未做**。个人站点访问量小、免费额度充足，可先上线观察；
  若需严格限流，在 `server.js` 里接入阿里云 TableStore 或 Redis 做 IP→计数。
- `DASHSCOPE_API_KEY` 只在 FC 服务端环境变量里，永不进前端。

## 本地调试

```bash
# 在本目录
ALLOWED_ORIGIN=http://localhost:4000 STELLE_TOKEN=stelle-anthony-2026 DASHSCOPE_API_KEY=sk-xxx node server.js

# 另开终端用 curl 测：
curl -X POST http://localhost:9000/chat \
  -H "Origin: http://localhost:4000" -H "x-stelle-token: stelle-anthony-2026" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

## 回退到 WorkBuddy Cloud（可选）

把 `assets/js/stelle-chat.js` 免费通道分支改回 `window.StelleCloud.stream(request)`，
并清空 `_config.yml` 的 `stelle.alibaba_url` 即可。
