# 星 · 阶段一对话服务

> **当前网站已改为浏览器直连（2026-09-21）**：GitHub Pages 不需要部署本目录的 Python 服务。设置中只有访客自带 API，没有邀请码或 Anthony 额度入口。下面的后端部署说明保留供以后重新开放邀请码时使用。

## 当前 GitHub Pages 用法

1. 点击看板娘“和星聊聊”→设置。
2. 选择 DeepSeek 或千问（北京地域），填写该账户可用的模型名称和自己的 API Key，点击连接，再发送消息。
3. 浏览器直接向选定服务商发出请求，密钥只在当前页面内存中保存，离开或刷新页面需重新填写。不会调用 `/api/chat`、兑换邀请码或回退到 Anthony 的密钥。会话文字仍保存在当前标签页，可通过“清除会话与凭证”删除。

公开资料随 Jekyll 构建发布：`assets/stelle-knowledge.json` 为文章索引；`assets/stelle-context.json` 从 `_data/stelle_updates.json` 和 `_data/stelle_memes.json` 生成。近况只输出 public=true 且未撤回的记录，并由浏览器执行七天筛选。不要把私密资料放进公开 Git 仓库；构建过滤不是仓库内容的访问控制。旧 `companion-api/data` 文件仅供保留的后端使用，当前网站不读它们。

浏览器执行资料检索、近况判断、梗筛选、SSE 解析和表演允许列表验证。密钥仅通过 Authorization 请求头送往固定的服务商地址，静态资料请求不带密钥，重定向被拒绝。跨域或网络失败会明确提示，不尝试付费备用线路。

传输测试：`node --test companion-api/test_direct.cjs`。跨域预检已用网站 Origin 探测；真实 Key 的鉴权、付费生成质量仍需访客自己的账户验证。服务商的跨域策略以后可能变化，不能将当前结果视为长期保证。

## 保留的后端方案（当前网站不使用）

Python 3.11+ / FastAPI，静态网站继续由 Jekyll 构建。支持 DeepSeek、千问的兼容聊天接口；地址固定，访客不能配置任意转发 URL。千问当前使用北京地域接口，Key 必须匹配该地域。其他地域需要维护者修改允许列表后验证。

聊天请求显式关闭深度思考，减少等待并约束输出用量。参考 [DeepSeek 请求格式](https://api-docs.deepseek.com/api/create-chat-completion/) 与 [千问深度思考开关](https://help.aliyun.com/zh/model-studio/deep-thinking)。只选择支持关闭思考的聊天模型，具体模型兼容性仍需真实账户验证。

默认模型为 `deepseek-v4-flash`，切换千问时为 `qwen-plus`。DeepSeek 已公告于 2026-07-24 停用旧的 `deepseek-chat` / `deepseek-reasoner` 名称，见[官方更新记录](https://api-docs.deepseek.com/updates/)。这些默认值不代表已经完成真实 API 调用验收。

## 本地运行

从仓库根目录执行（PowerShell）：

```powershell
python -m venv local/ai-venv
local/ai-venv/Scripts/python -m pip install -r companion-api/requirements.txt
local/ai-venv/Scripts/python -m uvicorn app:app --app-dir companion-api --host 127.0.0.1 --port 8787 --no-access-log
```

先构建网站。默认从 `local/site-preview/assets/stelle-knowledge.json` 读取公开文章；生产环境通过 `STELLE_KNOWLEDGE` 指定构建产物，并随网站发布更新。构建时排除了整个 `companion-api` 目录，数据库和密钥不会进入静态站点。

本地 4181 端口的网站自动连接 8787。生产环境填写 `_config.yml` 的 `live2d.api_url` 为已部署的 HTTPS 后端地址，配置 `STELLE_ORIGINS` 为网站精确来源。不要将 API Key 写进 Jekyll 配置。

## 两种接入

- 自带 API：访客选择服务商、模型并填写 Key。后端为本次请求转发，不存储原始 Key；浏览器只在内存中持有，跳转后重新填写。不要在反向代理、APM 或错误报告中记录请求体与认证头。
- 邀请码：服务器环境变量配置 `STELLE_OWNER_KEY`、服务商、模型、每日和每月预算，以及保守的最高 token 单价后才开放。`.env.example` 仅列出变量，不会自动加载。
- 邀请码兑换凭证在当前标签页的 sessionStorage 保存，以支持页面跳转；它是具有有限消费权限的凭证，不是模型服务商的 API Key。清除会话会清除此凭证，一次兑换的邀请码不能重新兑换，遗失后由维护者重新签发。

```powershell
# 单位为微元人民币：1000000 = 1 元。这是体验额度，不是服务商报价。
local/ai-venv/Scripts/python companion-api/budget.py create --days 7 --total 1000000 --daily 200000
local/ai-venv/Scripts/python companion-api/budget.py revoke --code <要撤销的邀请码>
```

额度以 SQLite 原子事务预留，单凭证最多一个并发、每分钟六次、全站最多八个并发。根据可用的 usage 结算；没有 usage 的断流、取消或进程异常保留最高预留值。预留使用 UTF-8 输入字节数加框架余量与最大输出 token，计价对输入和输出都使用维护者配置的最高费率，因此界面体验额度是保守估计，不是服务商精确账单。务必核实费率并同时设置服务商账户预算；价格变动、非 token 附加费用不应被误认为已由此机制自动覆盖。当前没有联网收费工具和语音费用。

部署先使用单个 Uvicorn worker、持久化磁盘，不放在会丢失 SQLite 的临时文件系统。多实例需要迁移到共享数据库。反向代理应设置请求大小、连接数与读取超时，关闭流式缓冲；只信任指定代理的转发头。来源限制不是身份认证，真正的消费权限依靠凭证和服务端额度。

## 资料与人设

- `context.py` 的 PERSONA：淡定、可靠、克制幽默，称主人 Anthony，不把访客误认成主人。模型输出逐行 JSON，后端验证后发出文字与表演事件；前端不执行模型代码或渲染模型 HTML。
- 文章由 `assets/stelle-knowledge.json` 的 Liquid 模板索引公开页面。当前是中英文关键词检索，回复附上“参考页面”链接。不是向量检索；专业问题的召回质量仍需真实对话验收。
- `data/updates.json` 初始为空，不能捏造 Anthony 的近况。记录示例：

```json
{"text":"由 Anthony 填写的真实动态","topics":["网站"],"public":true,"occurred_at":"2026-09-21T10:00:00+08:00","confirmed_at":null,"expires_at":null,"revoked":false}
```

`occurred_at` 为实际发生时间，`confirmed_at` 只在主人确认仍有效时更新，修改错字不续期。程序按滚动七天筛选、处理相关性、公开与撤回状态。查询失败与无记录不同。第一版意图识别为规则实现，复杂隐含指代仍需完善。

- `data/memes.json`：一条已核对官方活动来源的垃圾桶梗及两条明确标注原创的玩笑。只有相关候选才入上下文，认真求助抑制玩梗；会话记录已使用 ID 去重。后续扩充需核实来源和剧透范围。
- 页面介绍不调用模型。可在任意页面 front matter 填写 `companion_intro`；没有时只根据标题介绍，不猜测文章结论。会话内去重、跨页一分钟冷却，聊天时不插话。

## 验证与边界

```powershell
local/ai-venv/Scripts/python -m unittest discover -s companion-api -p "test_*.py" -v
```

测试使用本地 MockTransport，不消耗任何账户额度。真实 Key 的鉴权、具体模型对逐行 JSON 的遵守程度、人设质量、响应速度和实际费用必须用已授权的账户另行验收；模拟通过不等于真人体验已验收。默认不启用语音，也未实现浏览器本地语言模型。看板娘延续桌面显示策略，小屏不加载模型。
