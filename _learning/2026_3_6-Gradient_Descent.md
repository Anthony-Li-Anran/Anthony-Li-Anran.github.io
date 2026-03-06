---
title: "Gradient Descent"
collection: learning
permalink: /learning/2026-03-06-gradient-descent
excerpt: 'Understanding gradient descent optimization algorithm for machine learning'
date: 2026-03-06
tags: [optimization, machine-learning, gradient-descent]
---

## 1. What is Gradient Descent?

Gradient descent is a first-order iterative optimization algorithm used to find local minima of differentiable functions. It is one of the most core optimization algorithms in machine learning and deep learning, widely applied in the training process of linear regression, logistic regression, neural networks, and other models.

### Core Idea

Imagine you are at the top of a mountain and want to walk to the lowest point in the valley, but heavy fog obscures the full view. You can only feel the slope (gradient) under your feet, then step forward along the steepest downhill direction until you reach the valley bottom.

![Gradient Descent Visualization](/images/2026_3_6-figure1.png)

## 2. Mathematical Principles

### 2.1 Basic Formula

The parameter update formula for gradient descent is:

$$
\theta_{t+1} = \theta_t - \alpha \nabla J(\theta_t)
$$

Where:
- \\(\theta_t\\): Parameter vector at iteration \\(t\\)
- \\(\alpha\\): Learning rate, controlling the step size
- \\(\nabla J(\theta_t)\\): Gradient (derivative) of the loss function \\(J\\) at \\(\theta_t\\)
- \\(\theta_{t+1}\\): Updated parameter

### 2.2 Gradient Descent for Univariate Functions

For a univariate function \\(f(x)\\), the update formula simplifies to:

$$
x_{t+1} = x_t - \alpha \cdot f'(x_t)
$$

**Example:** Minimizing \\(f(x) = x^2\\)

- Derivative: \\(f'(x) = 2x\\)
- Update rule: \\(x_{t+1} = x_t - \alpha \cdot 2x_t = x_t(1 - 2\alpha)\\)

### 2.3 Gradient Descent for Multivariate Functions

For a multivariate function \\(J(\theta_1, \theta_2, ..., \theta_n)\\), the gradient is a vector composed of partial derivatives:

$$
\nabla J = \begin{bmatrix}
\frac{\partial J}{\partial \theta_1} \\
\frac{\partial J}{\partial \theta_2} \\
\vdots \\
\frac{\partial J}{\partial \theta_n}
\end{bmatrix}
$$

Parameter update (vectorized form):

$$
\theta := \theta - \alpha \nabla J(\theta)
$$

![Gradient Vector Visualization](/images/2026_3_6-figure2.png)

## 3. Learning Rate Selection

The learning rate \\(\alpha\\) is the most important hyperparameter in gradient descent, determining the step size of each iteration.

### 3.1 Impact of Learning Rate

| Learning Rate Size | Phenomenon | Result |
|-------------------|------------|--------|
| Too small (\\(\alpha \approx 0.01\\)) | Step size too small | Slow convergence, long training time |
| Appropriate (\\(\alpha \approx 0.1\\)) | Moderate step size | Fast and stable convergence |
| Too large (\\(\alpha \approx 0.5\\)) | Step size too large | Oscillation near optimal solution |
| Excessive (\\(\alpha > 1\\)) | Extremely large step size | Divergence, unable to converge |

![Learning Rate Impact](/images/2026_3_6-figure3.png)

### 3.2 Learning Rate Scheduling Strategies

**Fixed Learning Rate:** Always remains constant

**Decaying Learning Rate:** Decreases over time

$$
\alpha_t = \frac{\alpha_0}{1 + \gamma t}
$$

**Adaptive Learning Rate:** Algorithms like AdaGrad, RMSprop, and Adam automatically adjust

## 4. Three Variants of Gradient Descent

### 4.1 Batch Gradient Descent (BGD)

**Definition:** Uses all training data to calculate the gradient in each iteration.

**Formula:**

$$
\nabla J(\theta) = \frac{1}{m} \sum_{i=1}^{m} \nabla J_i(\theta)
$$

**Characteristics:**
- ✅ Accurate gradient estimation, stable convergence
- ✅ Suitable for convex functions, guarantees convergence to global optimum
- ❌ Slow computation for large datasets
- ❌ High memory usage

### 4.2 Stochastic Gradient Descent (SGD)

**Definition:** Uses a randomly selected sample to calculate the gradient in each iteration.

**Formula:**

$$
\theta := \theta - \alpha \nabla J_i(\theta)
$$

**Characteristics:**
- ✅ Fast computation, suitable for online learning
- ✅ Random noise helps escape local optima
- ❌ High variance in gradient estimation, oscillatory convergence
- ❌ Requires gradually decreasing learning rate to ensure convergence

### 4.3 Mini-batch Gradient Descent

**Definition:** Uses a small batch of samples (typically 32-512) to calculate the gradient in each iteration.

**Formula:**

$$
\nabla J(\theta) = \frac{1}{b} \sum_{i=1}^{b} \nabla J_i(\theta)
$$

Where \\(b\\) is the batch size.

**Characteristics:**
- ✅ Balances BGD stability and SGD speed
- ✅ Can leverage matrix operations for acceleration (vectorization)
- ✅ Standard choice for modern deep learning frameworks

![Gradient Descent Variants](/images/2026_3_6-figure4.png)

## 5. Challenges Faced by Gradient Descent

### 5.1 Local Minima

In non-convex functions, gradient descent may get trapped in local minima and cannot reach the global minimum.

**Mathematical conditions:**
- Local minimum: \\(\nabla f(x) = 0\\) and Hessian matrix is positive definite
- Global minimum: \\(f(x^*) \leq f(x)\\) for all \\(x\\)

**Coping strategies:**
- Random initialization (run multiple times and select the best)
- Momentum method
- Noise in SGD helps escape local optima

### 5.2 Saddle Points

In high-dimensional spaces, saddle points are more common than local minima. At saddle points, the gradient is zero, but the Hessian matrix has both positive and negative eigenvalues.

**Mathematical form (2D example):**

$$
f(x, y) = x^2 - y^2
$$

At the origin \\((0, 0)\\):
- \\(\nabla f = (0, 0)\\)
- Minimum along \\(x\\) direction, maximum along \\(y\\) direction

**Coping strategies:**
- Second-order methods (Newton's method)
- Momentum method
- Adaptive learning rate methods (Adam, RMSprop)

![Saddle Point Visualization](/images/2026_3_6-figure5.png)

### 5.3 Feature Scaling

When feature scales differ significantly, the loss function contours become elliptical, causing the gradient descent path to be zigzagged and convergence to be slow.

**Normalization methods:**

**Min-Max Normalization:**

$$
x_{norm} = \frac{x - x_{min}}{x_{max} - x_{min}}
$$

**Standardization (Z-score):**

$$
x_{std} = \frac{x - \mu}{\sigma}
$$

**Effects:**
- Contours become circular
- Gradient descent path is more direct
- Accelerates convergence speed

![Feature Scaling Effect](/images/2026_3_6-figure6.png)

## 6. Advanced Optimization Algorithms

### 6.1 Momentum Method

Introduces velocity variable \\(v\\) to accumulate historical gradients:

$$
v_t = \beta v_{t-1} + \alpha \nabla J(\theta_t)
$$

$$
\theta_{t+1} = \theta_t - v_t
$$

Where \\(\beta \in [0, 1]\\) is the momentum coefficient (typically 0.9).

**Physical analogy:** Like a ball rolling down a hill, inertia helps overcome small pits (local minima).

### 6.2 AdaGrad (Adaptive Gradient)

Adjusts learning rate separately for each parameter:

$$
\theta_{t+1} = \theta_t - \frac{\alpha}{\sqrt{G_t + \epsilon}} \odot \nabla J(\theta_t)
$$

Where \\(G_t\\) is the cumulative sum of squared historical gradients.

**Characteristics:** Gives larger updates for sparse gradients.

### 6.3 RMSprop

Improves AdaGrad's monotonically decreasing learning rate issue:

$$
E[g^2]_t = \beta E[g^2]_{t-1} + (1 - \beta)g_t^2
$$

$$
\theta_{t+1} = \theta_t - \frac{\alpha}{\sqrt{E[g^2]_t + \epsilon}} g_t
$$

### 6.4 Adam (Adaptive Moment Estimation)

Combines the advantages of Momentum and RMSprop:

$$
m_t = \beta_1 m_{t-1} + (1 - \beta_1)g_t
$$

$$
v_t = \beta_2 v_{t-1} + (1 - \beta_2)g_t^2
$$

$$
\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}
$$

$$
\theta_{t+1} = \theta_t - \frac{\alpha}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t
$$

Default parameters: \\(\beta_1 = 0.9\\), \\(\beta_2 = 0.999\\), \\(\epsilon = 10^{-8}\\)

## 7. Debugging Techniques

### 7.1 Gradient Checking

Validate analytical gradients using numerical gradients:

$$
\frac{\partial J}{\partial \theta} \approx \frac{J(\theta + \epsilon) - J(\theta - \epsilon)}{2\epsilon}
$$

Where \\(\epsilon \approx 10^{-7}\\).

### 7.2 Loss Function Curve Analysis

- **Continuous decrease:** Normal training
- **Severe oscillation:** Learning rate too large
- **Flat and unchanged:** Learning rate too small or gradient vanishing
- **Decrease then increase:** Overfitting

### 7.3 Learning Rate Range Test

Start training with a very small learning rate, gradually increase it, observe loss changes, and select the range where loss decreases fastest.

## 8. Summary

Gradient descent is the cornerstone algorithm of machine learning. Understanding its principles and variants is crucial for building efficient models. Key takeaways:

- **Core formula:** \\(\theta := \theta - \alpha \nabla J(\theta)\\)
- Learning rate is the most critical hyperparameter and requires careful tuning
- Mini-batch is the standard choice in practice
- Feature scaling can significantly accelerate convergence
- Adaptive algorithms like Adam simplify the tuning process, but SGD + momentum often has better generalization performance
