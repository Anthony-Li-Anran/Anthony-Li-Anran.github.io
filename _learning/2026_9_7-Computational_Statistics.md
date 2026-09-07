---
title: "Computational Statistics"
collection: learning
permalink: /learning/2026-09-07-computational-statistics
excerpt: 'Understanding computational methods for statistical inference'
date: 2026-09-07
tags: [computational-statistics, statistics, monte-carlo, bootstrap]
---

## 1. Overview of Computational Statistics

Computational statistics bridges statistics and computer science. While classical statistics relies on tractable mathematical derivations, computational statistics asks: what do we do when the integral is intractable, the distribution is unknown, or the dataset is too large for closed-form solutions?

The answer is simulation. Instead of deriving the sampling distribution of an estimator analytically, we approximate it by repeatedly drawing samples from the data. Three core ideas underpin the field:

- **Monte Carlo integration** replaces intractable integrals with sample averages. If we can simulate from a distribution, we can estimate any expectation.
- **The bootstrap** treats the observed sample as a proxy for the population. By resampling with replacement, we build empirical confidence intervals and standard errors without parametric assumptions.
- **The EM algorithm** handles latent variables by iterating between imputing missing data and refitting the model, turning an intractable likelihood into a sequence of tractable steps.

Computational statistics is not just a bag of tricks. It is the reason modern statistics can tackle problems that were mathematically impossible fifty years ago.
