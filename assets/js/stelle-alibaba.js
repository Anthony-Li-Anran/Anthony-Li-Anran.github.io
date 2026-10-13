/* Owner-funded Alibaba Cloud route.
   The browser assembles the full message list (persona + public evidence +
   history + user message) using StelleDirect's existing logic, then POSTs it
   to a self-hosted Alibaba FC proxy. The proxy holds the DashScope key and
   streams the reply back. No owner key ever reaches the browser. */
((scope) => {
  'use strict';
  const Direct = scope.StelleDirect;
  if (!Direct) { console.error('StelleAlibaba: StelleDirect must load first.'); return; }
  const root = document.getElementById('live2d-companion');
  const config = root ? {
    url: root.dataset.stelleAlibabaUrl,
    token: root.dataset.stelleAlibabaToken
  } : {};
  async function* stream(request) {
    if (!config.url) throw new Error('阿里云聊天代理尚未配置（缺少 data-stelle-alibaba-url）。');
    yield* Direct.stream({ endpoint: config.url, token: config.token, ...request });
  }
  scope.StelleAlibaba = Object.freeze({ stream });
})(globalThis);
