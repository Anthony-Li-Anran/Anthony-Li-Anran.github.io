# 阿里云函数计算（FC）代理部署指南

把网站 AI 聊天的免费通道，从「WorkBuddy Cloud（线上因来源域名被拒）」改为「你自己部署在阿里云 FC 的代理」。
代理在服务端藏好 DashScope Key 去调通义千问，再把回复流式传回浏览器。CORS 由你自己的代码控制，`anthony-li-anran.github.io` 即可正常聊天。

> 以下步骤的字段名均来自阿里云官方文档（函数计算 3.0）。

---

## 架构

```
浏览器(github.io) ──POST /chat──▶ 阿里云 FC 代理(自定义运行时)
                                      │ 校验 origin + x-stelle-token
                                      └─▶ 百炼 DashScope qwen-plus(服务端藏 Key)
```

---

## 前置准备（一次性）

1. **阿里云账号实名认证**（FC 与百炼都要求实名）。
2. 开通 **函数计算 FC**：https://fc.console.aliyun.com
3. 开通 **百炼（DashScope）**：https://bailian.console.aliyun.com
   - **关键**：进百炼控制台后，先把右上角**地域切到「华北2（北京）**，再点「API-KEY 管理 → 创建 API-KEY」。
   - 复制形如 `sk-xxxx` 的 Key（免费额度仅限北京地域、且 Key 不通用，必须在北京建）。
   - 确认模型列表有 **qwen-plus**（默认就有，约 1200 万 Token 免费，90 天有效）。建议打开「用完即停」防超额。

---

## 第 1 步：创建 Web 函数

1. 登录**函数计算 3.0 控制台**。
2. 左侧导航栏点 **函数**，进入函数页面。**顶部菜单栏选地域：华北2（北京）**。
3. 点 **创建函数** → 选择 **Web 函数**（别选事件函数）。
4. 逐项填写：

| 区域 | 字段 | 填什么 |
|---|---|---|
| 基本设置 | 函数名称 | `stelle-proxy`（字母/数字/下划线/中划线，不以数字或中划线开头，1–64 位） |
| 函数代码 | 运行环境 | **自定义运行时 / Linux / Debian 10**（或 Debian 12，任选 custom.debian 即可） |
| 函数代码 | 代码上传方式 | **通过 ZIP 包上传** → 选择本目录的 `proxy.zip` |
| 函数代码 | 启动命令 | **`sh /code/bootstrap`**（推荐，最稳）。本 `proxy.zip` 已内置 Node.js，但 Windows 打的 zip 会丢 node 的 +x 位，所以 `bootstrap` 脚本在运行时先 `chmod +x /code/nodejs/bin/node` 再启动。⚠️ **FC 对「启动命令」是直接按空格拆分当 `exec` 参数、不做 shell 解析也不处理引号**，因此不要写 `bash -c "..."` 或 `node server.js` 这类带引号/分号的命令（会被拆碎导致 9ms 即退出 / permission denied）。`sh /code/bootstrap` 只有一个脚本路径参数，绝不会被拆坏；本 `proxy.zip` 里 `bootstrap` 与 `node` 的执行位也已预先写入，双保险。 |
| 函数代码 | 监听端口 | `9000` |

> Web 函数 = 一个你自己监听端口的 HTTP 服务，正好对应本仓库的 `server.js` + `bootstrap`。

---

## 第 2 步：高级配置（不改会被流式中途杀掉）

创建页展开 **高级配置**（或创建后到「配置 → 高级配置 → 编辑」）：

| 字段 | 填什么 | 为什么 |
|---|---|---|
| 规格方案 → 内存 | `256 MB` | 流式响应需要稍多内存（默认 128 偏紧） |
| 执行超时时间 | `60` 秒 | 大模型首字延迟 + 流式，默认 3 秒必超时 |

其余默认，点 **创建**。

---

## 第 3 步：配置环境变量

函数创建后进入详情页 → **配置** 页签 → **环境变量** → 编辑，新增 4 条：

| 变量名 | 值 | 说明 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 第 0 步的 `sk-xxxx` | 藏在服务端，绝不下发浏览器 |
| `STELLE_TOKEN` | `stelle-zrsnzps-9868` | **必须与前端 `_config.yml` 的 `alibaba_token` 完全一致** |
| `MODEL` | `qwen-plus` | 想更省可用 `qwen-turbo` |
| `ALLOWED_ORIGIN` | `https://anthony-li-anran.github.io` | 只放行你的站点，其它来源返回 403 |

**可选（成本防护，不填用默认值）**：

| 变量名 | 默认值 | 作用 |
|---|---|---|
| `DAY_TOKEN_BUDGET` | `8000000` | 单实例**每日 token 预算**上限（留安全余量低于 1200 万免费），到顶返回 `429` + 提示明日恢复 |
| `MAX_IP_PER_MIN` | `8` | 单 IP 每分钟最多请求数，防单 IP 刷接口 |
| `MAX_IP_PER_DAY` | `300` | 单 IP 每天最多请求数 |

> 这 3 条是代码层**尽力而为**的软防护（FC 多实例下计数不跨实例共享）。**真正不会超额的硬保险在下面「费用与免费额度保护」章节的 3 个控制台设置**——务必都做。

保存。

---

## 第 4 步：检查 / 配置 HTTP 触发器

Web 函数创建时会**自动建好一个 HTTP 触发器**。去 **触发器** 页签确认：

| 配置项 | 值 |
|---|---|
| 触发器类型 | HTTP 触发器 |
| 名称 | 任意（如 `http-trigger`） |
| 版本或别名 | `LATEST`（默认） |
| 请求方法 | 至少勾 **POST** 和 **OPTIONS**（OPTIONS 是浏览器 CORS 预检，必须开） |
| 禁用公网访问 URL | **不开启**（否则没有公网域名） |
| 认证方式 | **无需认证**（匿名；鉴权靠 origin + token，不靠 FC 鉴权） |

若默认没勾 OPTIONS，编辑加上；认证方式确认是「无需认证」。

复制触发器的 **公网访问地址**，形如：
`https://xxxx.cn-beijing.fcapp.run`

---

## 第 5 步：把地址填回站点配置

1. 公网地址**末尾加 `/chat`**：
   `https://xxxx.cn-beijing.fcapp.run/chat`
2. 打开 `Anthony-Li-Anran.io/_config.yml`，把第 28 行的空值填上：
   ```yaml
   stelle:
     alibaba_url: "https://xxxx.cn-beijing.fcapp.run/chat"
     alibaba_token: "stelle-zrsnzps-9868"
   ```
   （`alibaba_token` 已经是这个值，不用动。）

---

## 第 6 步：本地验证

```bash
# 健康检查（应返回 stelle-alibaba-proxy ok）
curl https://<你的FC域名>/health

# 真实对话（应流式返回文字）
curl -X POST https://<你的FC域名>/chat \
  -H "Content-Type: application/json" \
  -H "x-stelle-token: stelle-zrsnzps-9868" \
  -d '{"messages":[{"role":"user","content":"你好，介绍一下你自己"}]}'
```

---

## 报错对照

| 现象 | 原因 |
|---|---|
| `403 forbidden_origin` | `ALLOWED_ORIGIN` 没填对，或访问站点域名不是它 |
| `401 unauthorized` | `x-stelle-token` 与 `STELLE_TOKEN` 不一致 |
| `500 server_not_configured` | `DASHSCOPE_API_KEY` 没设或为空 |
| 函数一直超时 / 无响应 | 超时时间没改（默认 3s），按第 2 步改 60s |
| 浏览器报 CORS | 触发器没开 OPTIONS，或认证方式不是「无需认证」 |

---

## 费用与免费额度保护（2026 核实 · 必做）

免费额度：

- **函数计算 FC**：账号级每月 100 万次调用 + 40 万 CU·秒免费，**全地域通用**（不限北京）。
- **百炼 qwen-plus**：约 1200 万 Token 免费（90 天有效，**仅限华北2 北京地域**；API Key 不通用，必须在北京建）。

代码层已有软防护（per-IP 限流 + 每日 token 预算 + 请求体 ≤64KB + 单次 `max_tokens:900`）。但 FC 多实例下内存计数不跨实例共享，**不足以单独防超额**。以下 3 个**控制台硬保险**必须都设置——它们由阿里云直接拦截，超过免费额度自动停，**绝不会产生付费账单**：

1. **百炼：给 API Key 设额度上限 + 开「用完即停」**（最关键）
   百炼控制台 → API-KEY 管理 → 选中该 Key → 设置**额度上限 / 余额预警**，并打开「**用完即停**」。这样即便请求量异常，到达免费额度后阿里云直接拒绝，不会扣费。
2. **FC：限制函数最大实例数**
   函数详情 → 配置 → 弹性管理 / 实例伸缩 → 把**最大实例数**设为较小值（如 `2`–`5`）。防止被刷时横向扩容产生大量调用与 GB·秒消耗。
3. **两处都开用量告警**
   百炼与 FC 控制台分别配置**用量监控 / 额度告警**（如用量达 80% 通知），便于你提前介入。

> 个人站正常访问量下基本白嫖；以上硬保险是「绝不超额」的兜底，强烈建议全做。

---

## 重建部署包（如需）

```bash
cd alibaba-proxy
chmod +x bootstrap        # Windows 压缩会丢执行位，先加上
zip -r proxy.zip .
```
