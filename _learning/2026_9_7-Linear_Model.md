---
title: "Linear Model"
collection: learning
permalink: /learning/2026-09-07-linear-model
excerpt: 'Understanding the classical linear model from a statistical perspective'
date: 2026-09-07
tags: [linear-model, statistics, least-squares, regression]
---

## 1. Overview of Linear Models

A linear model captures the relationship between a response variable $Y$ and one or more predictor variables $X$ by assuming a linear structure. In its simplest form — simple linear regression:

\[
Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i
\]

Here $\beta_0$ is the intercept, $\beta_1$ is the slope, and $\varepsilon_i$ is the random error term. The goal is to estimate $\beta_0$ and $\beta_1$ from observed data. The classical approach is **ordinary least squares** (OLS): choose the line that minimizes the sum of squared vertical distances from the data points to the line. OLS yields closed-form estimators, and under the Gauss-Markov assumptions it is the **best linear unbiased estimator** (BLUE).

The strength of the linear model lies in its **interpretability**: every parameter carries a clear meaning, and the framework supports rigorous inference — hypothesis tests, confidence intervals, and beyond. It is not merely a prediction tool, but the foundation of statistical modeling.
