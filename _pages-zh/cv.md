---
layout: archive
title: "简历"
permalink: /zh/cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

<h2>教育</h2>
======
<p>上海财经大学数据科学学士，2024-2028（预计）</p>

<h2>经验</h2>
======
<p>即将推出...</p>

<h2>技能</h2>
======

<h3>编程</h3>
<ul>
  <li>Python</li>
  <ul>
    <li>NumPy, Pandas, Scikit-learn, Pytorch, Plotly...</li>
  </ul>
  <li>C++, Markdown, HTML</li>
</ul>

<h3>英语水平</h3>
<p>即将推出...</p>

<h3>已完成课程</h3>
<ul>
  <li>Kaggle 平台上提供的所有课程。</li>
  <li>数学分析、高等代数、概率论、数理统计（正在学习中）</li>
</ul>

<h2>项目</h2>
======
  <ul>{% for post in site.projects reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>

<h2>出版物</h2>
======
  <ul>{% for post in site.publications reversed %}
    {% include archive-single-cv.html %}
  {% endfor %}</ul>