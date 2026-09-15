---
title: "Linear Model"
collection: learning
permalink: /learning/2026-09-07-linear-model
excerpt: 'Understanding the classical linear model from a statistical perspective'
date: 2026-09-07
tags: [linear-model, statistics, least-squares, regression]
---

## 1. Overview of Linear Models

A linear model captures the relationship between a response variable $Y$ and one or more predictor variables $X$ by assuming a linear structure. In its simplest form -- simple linear regression:

$$
Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i
$$

Here $\beta_0$ is the intercept, $\beta_1$ is the slope, and $\varepsilon_i$ is the random error term. The goal is to estimate $\beta_0$ and $\beta_1$ from observed data. The classical approach is **ordinary least squares** (OLS): choose the line that minimizes the sum of squared vertical distances from the data points to the line. OLS yields closed-form estimators, and under the Gauss-Markov assumptions it is the **best linear unbiased estimator** (BLUE).

The strength of the linear model lies in its **interpretability**: every parameter carries a clear meaning, and the framework supports rigorous inference -- hypothesis tests, confidence intervals, and beyond. It is not merely a prediction tool, but the foundation of statistical modeling.

## 2. Deterministic Relationship vs Statistical Relationship

First of all, we are going to distinguish between two types of relationships, deterministic relationship & statistical relationship. For deterministic relationship, one of the variables can be expressed as an exact mathematical function of the others -- there is no randomness involved. For example, given the radius $r$ of a circle, its area $A = \pi r^2$ is perfectly determined; or in physics, the distance $d$ traveled by an object moving at constant speed $v$ over time $t$ is exactly $d = vt$. In a deterministic world, knowing the predictors gives you the response without error.

A **statistical relationship**, by contrast, is one where the response is not perfectly predictable from the predictors. The observed values scatter around some underlying trend, and the deviations are captured by a random error term. This is precisely the kind of relationship that linear models are designed to handle:

$$
Y = f(X) + \varepsilon
$$

where $f(X)$ represents the systematic component (e.g., $\beta_0 + \beta_1 X$) and $\varepsilon$ represents the random, unpredictable part. In most real-world problems -- from economics to biology to engineering -- relationships are statistical rather than deterministic. Measurement error, omitted variables, and inherent variability all contribute to the randomness.

In other words, it is the statistical relationship -- not the deterministic one -- that constitutes the object of study for linear models. This distinction is fundamental because it motivates why we need *inference* (not just calculation): we estimate parameters, quantify uncertainty, and make probabilistic statements rather than exact predictions.


## 3. Identifying a Statistical Relationship

How do we know we are looking at a statistical relationship? The most direct tool is the **scatterplot**. Given paired observations $(X_i, Y_i)$, we plot each point and inspect the pattern.

![Statistical vs Deterministic Relationship](../images/2026_9_7-scatter.png)

Three telltale signs of a statistical relationship in a scatterplot:

- **A visible trend** — as $X$ increases, $Y$ tends to increase (or decrease) systematically, suggesting a functional component $f(X)$.
- **Spread around the trend** — points deviate from any single line or curve; this is the signature of $\varepsilon$, the random error.
- **No perfect fit** — unlike the deterministic case on the right, no smooth function passes through all the points exactly.

Once a statistical relationship is visually confirmed, the next step is to model it — and the linear model is the natural starting point.


## 4. The Simple Linear Regression Model

Having identified a statistical relationship visually, we now formalize it mathematically. The **simple linear regression model** assumes:

$$
Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i, \quad i = 1, 2, \dots, n
$$

Each component carries a distinct meaning:

- $Y_i$ — the **response** (or dependent variable) for the $i$-th observation.
- $X_i$ — the **predictor** (or independent variable) for the $i$-th observation. In simple regression there is only one predictor.
- $\beta_0$ — the **intercept**: the expected value of $Y$ when $X = 0$. It anchors the line vertically.
- $\beta_1$ — the **slope**: the expected change in $Y$ for a one-unit increase in $X$. It captures the strength and direction of the linear association.
- $\varepsilon_i$ — the **random error term**: everything that affects $Y_i$ beyond the linear function of $X_i$. It absorbs measurement error, omitted variables, and inherent variability.

The model decomposes each observation into two parts:

$$
Y_i = \underbrace{\beta_0 + \beta_1 X_i}_{\text{systematic}} + \underbrace{\varepsilon_i}_{\text{random}}
$$

The systematic part $\beta_0 + \beta_1 X_i$ is the *signal* we wish to recover; the random part $\varepsilon_i$ is the *noise* we must contend with. Parameters $\beta_0$ and $\beta_1$ are unknown population quantities — our task is to estimate them from a sample of $n$ paired observations $(X_1, Y_1), \dots, (X_n, Y_n)$.

## 5. Ordinary Least Squares Estimation

### 5.1 The Principle

Given $n$ data points, infinitely many lines could be drawn through the scatter. We need a criterion to choose among them. **Ordinary least squares** (OLS) selects the line that minimizes the sum of squared residuals:

$$
\hat{\beta}_0, \hat{\beta}_1 = \arg\min_{\beta_0, \beta_1} \sum_{i=1}^n \bigl(Y_i - \beta_0 - \beta_1 X_i\bigr)^2
$$

Define the residual for the $i$-th observation as $e_i = Y_i - \hat{\beta}_0 - \hat{\beta}_1 X_i$ — the vertical distance from the observed point to the fitted line. OLS minimizes $\sum_{i=1}^n e_i^2$.

Why *squared* residuals rather than absolute values? Three reasons: (1) squares are differentiable everywhere, yielding clean closed-form solutions; (2) squaring penalizes large deviations more heavily, pulling the line toward outliers in a controlled way; (3) under the Gauss-Markov assumptions (Section 6), OLS delivers optimal statistical properties.

### 5.2 Deriving the Estimators

Let $Q(\beta_0, \beta_1) = \sum_{i=1}^n (Y_i - \beta_0 - \beta_1 X_i)^2$. To find the minimizer, set partial derivatives to zero.

**Step 1: Derivative with respect to $\beta_0$.**

$$
\frac{\partial Q}{\partial \beta_0} = -2 \sum_{i=1}^n (Y_i - \beta_0 - \beta_1 X_i) = 0
$$

Dividing by $-2$ and rearranging:

$$
\sum_{i=1}^n Y_i - n\beta_0 - \beta_1 \sum_{i=1}^n X_i = 0
$$

Let $\bar{Y} = \frac{1}{n}\sum Y_i$ and $\bar{X} = \frac{1}{n}\sum X_i$. Then:

$$
n\bar{Y} - n\beta_0 - n\beta_1 \bar{X} = 0 \quad\Rightarrow\quad \hat{\beta}_0 = \bar{Y} - \hat{\beta}_1 \bar{X} \tag{1}
$$

This tells us the fitted line passes through the centroid of the data, $(\bar{X}, \bar{Y})$.

**Step 2: Derivative with respect to $\beta_1$.**

$$
\frac{\partial Q}{\partial \beta_1} = -2 \sum_{i=1}^n X_i (Y_i - \beta_0 - \beta_1 X_i) = 0
$$

Dividing by $-2$:

$$
\sum_{i=1}^n X_i Y_i - \beta_0 \sum_{i=1}^n X_i - \beta_1 \sum_{i=1}^n X_i^2 = 0
$$

Substitute $\beta_0$ from (1): $\beta_0 = \bar{Y} - \beta_1 \bar{X}$:

$$
\sum_{i=1}^n X_i Y_i - (\bar{Y} - \beta_1 \bar{X}) n\bar{X} - \beta_1 \sum_{i=1}^n X_i^2 = 0
$$

$$
\sum_{i=1}^n X_i Y_i - n\bar{X}\bar{Y} + \beta_1 n\bar{X}^2 - \beta_1 \sum_{i=1}^n X_i^2 = 0
$$

Group the $\beta_1$ terms:

$$
\beta_1 \left( \sum_{i=1}^n X_i^2 - n\bar{X}^2 \right) = \sum_{i=1}^n X_i Y_i - n\bar{X}\bar{Y}
$$

Recognize the sums of squares and cross-products:

$$
S_{XX} = \sum_{i=1}^n (X_i - \bar{X})^2 = \sum_{i=1}^n X_i^2 - n\bar{X}^2
$$

$$
S_{XY} = \sum_{i=1}^n (X_i - \bar{X})(Y_i - \bar{Y}) = \sum_{i=1}^n X_i Y_i - n\bar{X}\bar{Y}
$$

Thus:

$$
\boxed{\hat{\beta}_1 = \frac{S_{XY}}{S_{XX}} = \frac{\sum_{i=1}^n (X_i - \bar{X})(Y_i - \bar{Y})}{\sum_{i=1}^n (X_i - \bar{X})^2}} \tag{2}
$$

![OLS: Residuals and Centroid](../images/2026_9_7-ols.png)

Together, (1) and (2) are the **OLS estimators**. They are functions of the data alone — no unknown parameters remain.

### 5.3

### 5.3 An Alternative Expression

The slope estimator can also be written in terms of the sample correlation $r_{XY}$:

$$
\hat{\beta}_1 = r_{XY} \cdot \frac{s_Y}{s_X}
$$

where $s_X$ and $s_Y$ are the sample standard deviations of $X$ and $Y$. This form makes the interpretation transparent: the estimated slope is the correlation scaled by the ratio of variabilities. If $X$ and $Y$ are perfectly correlated ($r_{XY} = \pm 1$), then $\hat{\beta}_1$ is simply $\pm s_Y / s_X$.


## 6. Properties of the OLS Estimators

### 6.1 The Gauss-Markov Assumptions

The OLS formulas derived in Section 5 are purely algebraic — they minimize $\sum e_i^2$ regardless of any probabilistic model. To understand *why* OLS is a good estimator, we specify a data-generating process:

1. **Linearity**: $Y_i = \beta_0 + \beta_1 X_i + \varepsilon_i$.
2. **Strict exogeneity**: $\mathbb{E}[\varepsilon_i \mid X] = 0$.
3. **Homoskedasticity**: $\operatorname{Var}(\varepsilon_i \mid X) = \sigma^2$ for all $i$.
4. **No autocorrelation**: $\operatorname{Cov}(\varepsilon_i, \varepsilon_j \mid X) = 0$ for $i \neq j$.
5. **No perfect collinearity**: the $X_i$ are not all identical ($S_{XX} > 0$).

Note that **normality is not required** — only the first two moments matter.

### 6.2 The Gauss-Markov Theorem

Under assumptions 1–5, $\hat{\beta}_0$ and $\hat{\beta}_1$ are the **Best Linear Unbiased Estimators** (BLUE):

- **Linear**: $\hat{\beta}_1 = \sum c_i Y_i$ with $c_i = (X_i - \bar{X})/S_{XX}$. The theorem only compares OLS to estimators of this linear form.
- **Unbiased**: $\mathbb{E}[\hat{\beta}_1] = \beta_1$. A direct proof: $\mathbb{E}[\hat{\beta}_1] = \sum c_i \mathbb{E}[Y_i] = \sum c_i(\beta_0 + \beta_1 X_i) = \beta_1$, using $\sum c_i = 0$ and $\sum c_i X_i = 1$.
- **Best** (minimum variance): for any other linear unbiased estimator $\tilde{\beta}_1$, $\operatorname{Var}(\hat{\beta}_1) \leq \operatorname{Var}(\tilde{\beta}_1)$. The OLS variance is

  $$
  \operatorname{Var}(\hat{\beta}_1) = \frac{\sigma^2}{S_{XX}}
  $$

  which decreases as $X$ spreads wider or $\sigma^2$ shrinks — both under the researcher's control through study design.

The theorem gives OLS a firm theoretical footing with minimal assumptions. But it also has boundaries: biased estimators like ridge regression can beat OLS on mean squared error when predictors are highly correlated.

### 6.3 Connection to Maximum Likelihood: OLS = MLE

If we strengthen the assumptions by adding **normality**,

$$
\varepsilon_i \mid X \stackrel{\text{i.i.d.}}{\sim} N(0, \sigma^2)
$$

then $Y_i \mid X_i \sim N(\beta_0 + \beta_1 X_i, \sigma^2)$ and the log-likelihood is

$$
\ell(\beta_0, \beta_1, \sigma^2) = -\frac{n}{2}\ln(2\pi) - \frac{n}{2}\ln(\sigma^2) - \frac{1}{2\sigma^2}\sum_{i=1}^n (Y_i - \beta_0 - \beta_1 X_i)^2
$$

Crucially, $\beta_0$ and $\beta_1$ appear only in the sum-of-squares term with a negative sign. Maximizing $\ell$ is therefore equivalent to minimizing $\sum (Y_i - \beta_0 - \beta_1 X_i)^2$ — exactly the OLS objective. Hence:

$$
\boxed{\hat{\beta}_0^{\text{MLE}} = \hat{\beta}_0^{\text{OLS}}, \qquad \hat{\beta}_1^{\text{MLE}} = \hat{\beta}_1^{\text{OLS}}}
$$

OLS requires no distributional assumption to be BLUE; adding normality reveals it is also the maximum likelihood estimator. The two frameworks converge on the same answer.

As a corollary, the geometric property $\hat{\beta}_0 = \bar{Y} - \hat{\beta}_1\bar{X}$ (from Section 5.2) means the fitted line **always passes through the centroid** $(\bar{X}, \bar{Y})$ — true under both OLS and MLE.

### 6.4 Estimation of $\sigma^2$

Setting $\partial \ell / \partial \sigma^2 = 0$ gives the MLE of the error variance:

$$
\hat{\sigma}^2_{\text{MLE}} = \frac{1}{n}\sum_{i=1}^n (Y_i - \hat{\beta}_0 - \hat{\beta}_1 X_i)^2 = \frac{\text{RSS}}{n}
$$

But this estimator is **biased downward**: $\mathbb{E}[\hat{\sigma}^2_{\text{MLE}}] = \frac{n-2}{n}\sigma^2 < \sigma^2$. The bias comes from using estimated parameters in the residuals — fitting two parameters consumes two degrees of freedom. The standard correction is the **unbiased estimator**:

$$
\boxed{\hat{\sigma}^2 = \frac{\text{RSS}}{n-2}}
$$

This is the familiar Mean Squared Error (MSE). It is a useful reminder: MLE gives unbiased $\hat{\beta}$ but a biased $\hat{\sigma}^2$ — MLE asymptotic optimality does not guarantee finite-sample unbiasedness.
