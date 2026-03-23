# 中英文切换功能实现计划

## 目标
实现全局中英文切换功能，点击导航栏的"中/En"按钮后，所有页面的内容都切换到对应语言。

## 实现方案

### 方案概述
使用 JavaScript + localStorage 实现客户端语言切换，无需服务器端支持。

## 实现步骤

### 步骤 1：创建语言数据文件
**文件**：`_data/languages.yml`

创建语言配置文件，包含所有需要翻译的文本：
- 导航栏标题
- 页面标题
- 页面内容
- 按钮文本

### 步骤 2：为主要页面添加中英文内容
**需要更新的文件**：
- `_pages/about.md`（首页）
- `_pages/markdown.md`（Guide 页面）
- `_pages/interests.md`（Interests 页面）
- `_pages/cv.md`（CV 页面）
- `_pages/learning.html`（Learning 页面）
- `_pages/projects.html`（Projects 页面）
- `_pages/publications.html`（Publications 页面）
- `_pages/guestbook.md`（Guestbook 页面）

**实现方式**：
在每个页面的 frontmatter 中添加 `lang` 字段，并在页面内容中使用条件渲染。

### 步骤 3：更新语言切换 JavaScript
**文件**：`_includes/footer/custom.html`

**功能**：
1. 检测当前语言（默认为 'en'）
2. 切换语言时更新 localStorage
3. 重新加载页面或动态更新内容
4. 更新导航栏按钮文本（显示"中/En"或"En/中"）

### 步骤 4：创建语言切换辅助函数
**文件**：`_includes/language-switch.html`

创建可重用的语言切换组件，包含：
- 语言检测函数
- 语言切换函数
- 文本翻译函数

### 步骤 5：更新导航栏
**文件**：`_includes/masthead.html`

更新导航栏链接，使其支持中英文：
- 导航项标题使用语言变量
- 语言切换按钮动态显示当前语言

### 步骤 6：更新主题样式
**文件**：`_includes/head/custom.html`

确保语言切换按钮的样式正确显示。

## 详细实现

### 1. 语言数据结构
```yaml
# _data/languages.yml
en:
  nav:
    home: "Homepage"
    guide: "Guide"
    cv: "CV"
    learning: "Learning"
    projects: "Projects"
    publications: "Publications"
    blog: "Blog Posts"
    interests: "Interests"
    guestbook: "Guestbook"
  pages:
    about:
      title: "Anran Li's Personal Website"
      greeting: "Hello, I'm Anran Li (Anthony Li)"
      intro: "As an undergraduate student majoring in Data Science at Shanghai University of Finance and Economics..."
    interests:
      title: "Interests"
      research: "Research Interests"
      personal: "Personal Interests"
      hobbies: "Hobbies"

zh:
  nav:
    home: "首页"
    guide: "指南"
    cv: "简历"
    learning: "学习"
    projects: "项目"
    publications: "出版物"
    blog: "博客"
    interests: "兴趣"
    guestbook: "留言板"
  pages:
    about:
      title: "李安然的个人网站"
      greeting: "你好，我是李安然（Anthony Li）"
      intro: "作为上海财经大学数据科学专业的本科生..."
    interests:
      title: "兴趣"
      research: "研究兴趣"
      personal: "个人兴趣"
      hobbies: "爱好"
```

### 2. JavaScript 实现逻辑
```javascript
// 语言切换功能
let currentLang = localStorage.getItem('language') || 'en';

function switchLanguage(lang) {
    localStorage.setItem('language', lang);
    currentLang = lang;
    updatePageContent();
    updateNavText();
}

function updatePageContent() {
    // 根据当前语言更新页面内容
    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(el => {
        const enText = el.getAttribute('data-lang-en');
        const zhText = el.getAttribute('data-lang-zh');
        el.textContent = currentLang === 'zh' ? zhText : enText;
    });
}

function updateNavText() {
    // 更新导航栏文本
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        const span = langToggle.querySelector('span');
        span.textContent = currentLang === 'zh' ? 'En/中' : '中/En';
    }
}
```

### 3. 页面内容实现
每个页面使用 data 属性标记中英文内容：

```html
<h1 data-lang data-lang-en="Hello" data-lang-zh="你好">Hello</h1>
<p data-lang data-lang-en="Welcome to my website" data-lang-zh="欢迎来到我的网站">Welcome to my website</p>
```

## 实施顺序

1. ✅ 创建 `_data/languages.yml` 文件
2. ✅ 更新 `_includes/footer/custom.html` 中的 JavaScript
3. ✅ 为主要页面添加中英文内容
4. ✅ 更新 `_includes/masthead.html` 导航栏
5. ✅ 优化用户体验（动画、过渡效果）

## 注意事项

1. **性能**：语言切换应该快速响应，避免页面闪烁
2. **持久化**：使用 localStorage 保存用户语言偏好
3. **默认语言**：默认为英文，用户首次访问看到英文版本
4. **SEO**：考虑为不同语言创建不同的 URL（可选）
5. **可维护性**：语言数据集中管理，便于后续更新
