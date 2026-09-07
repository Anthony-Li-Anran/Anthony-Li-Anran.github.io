---
layout: archive
title: "CV"
permalink: /cv/
author_profile: true
redirect_from:
  - /resume
---

{% include base_path %}

# Anran Li

2024111713@stu.sufe.edu.cn · 18213009360 · Shanghai · [https://anthony-li-anran.github.io/](https://anthony-li-anran.github.io/)

## Summary

Data Science undergraduate at Shanghai University of Finance and Economics, focused on LLM agent applications and financial research automation. Hands-on experience across the full multi-agent system lifecycle — design, development, and evaluation. Proficient in Python and C++, skilled with AI-assisted development tools including Dify, Codex, and Claude Code. Strong foundation in statistical modeling and financial time series analysis, with an emphasis on reproducibility and end-to-end delivery.

## Personal

- **GitHub** — Anthony-Li-Anran ([https://github.com/Anthony-Li-Anran](https://github.com/Anthony-Li-Anran))
- **LinkedIn** — anthony-li-anran ([https://www.linkedin.com/in/anthony-li-anran/](https://www.linkedin.com/in/anthony-li-anran/))

## Education

### Shanghai University of Finance and Economics · School of Statistics and Data Science — B.S., Data Science (2024.09 – 2028.06)

_Shanghai · GPA: 3.4_

English CET-6: 537 · CET-4: 598
Self-study: Stanford CS229 _Machine Learning_ · _Build a Large Language Model from Scratch_

## Experience

### Shanghai Chuangzhi Institute — Data Agent Engineer Intern (2026.07 – 2026.10)

_Shanghai_

**Overview**: Responsible for the **AI Eval** benchmarking framework design for the "Data Brain" Data Agent and delivery of the "Chuangzhi Find People" Agent.
**Contributions**: Diagnosed data retrieval pipeline failures via **trace-level link tracking**, and built **evaluation data recycling** and **model continuous improvement** mechanisms. Abstracted high-frequency query patterns into reusable **Skills** to improve retrieval efficiency and accuracy. Upgraded Agent permission control from prompt-level constraints to **code-level enforcement**. Developed Agents and orchestrated tool-calling workflows on **Dify**, deployed via **Docker**, closing the loop from requirements analysis to production.

## Projects

### AutoSTAT — Multi-Agent Automated Statistical Analysis System (2025.08 – 2025.10)

**Overview**: A beginner-friendly data analysis agent framework jointly open-sourced by SUFE × LSE × SUSTech, covering the end-to-end pipeline of data import, preprocessing, visualization, modeling, and report generation. Supports natural language interaction for iterative refinement, and is designed to accommodate future LLM capability upgrades.
**Contributions**: Officially credited contributor (Anran Li). Responsible for the initial **modeling module development** and **system-wide evaluation**. Built an automated closed loop of **task decomposition, tool invocation, and result verification**, delivering an evaluable and reproducible statistical workflow.

[autostat.cc](https://autostat.cc)

### Thesis-Studio — AI Research Assistant for Undergraduate Thesis Generation (2026.07 – Present)

**Overview**: Independently developed and maintained **multi-agent collaborative** end-to-end thesis generation system (open-source · MIT). Adopts a **generative-discriminative adversarial (GAN-like) multi-agent collaboration** architecture, where each specialized Agent is bound to a dedicated **Skill** for role-based execution.
**Contributions**: Designed **task decomposition, tool invocation, and state management** mechanisms, enabling **context passing** and result handoff across agents. Planning to incorporate **LLM-assisted Bayesian Experiment Design** from recent literature for automated generation and selection of experimental protocols.

[GitHub](https://github.com/Anthony-Li-Anran/Thesis-Studio)

## Research

### Bootstrap Localized Conformal Prediction: Decoupling Response Noise from Sample-Induced Uncertainty (2025.07 – Present · Targeting UAI 2027)

**Overview**: Under the supervision of Prof. Jiaye Teng. Proposes the **MAD-BLCP** method to address the failure of localized conformal prediction in distinguishing response noise from sample-induced fluctuation.
**Contributions**: Uses **Median Absolute Deviation (MAD)** combined with **bootstrap resampling** to locally model predictor instability. Proves **marginal coverage validity** in finite samples, with empirical performance surpassing traditional quantile regression conformal prediction.

### MSD-HF: Multi-Scale Decomposition Heterogeneous Fusion Framework for Financial Market Return Forecasting (2026.06)

**Overview**: Validates the **multi-scale signal structure hypothesis** — low-frequency trends, nonlinear residuals, and external risk regimes — for U.S. equity market return extrapolation.
**Contributions**: Constructed a four-stage "STL decomposition — ARIMA trend modeling — deep residual modeling — gradient boosting fusion" framework. Trained on 3,470 daily IXIC samples with 84 features under strict temporal out-of-sample extrapolation. Achieved out-of-sample directional accuracy of **65.81%** and RMSE of **0.0138**, outperforming Naive and standalone ARIMA baselines.
