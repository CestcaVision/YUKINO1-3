---
title: Correlation and regression experiment
summary: An interactive experiment showing how sample size, outliers, and confounding variables reshape the apparent relationship between two quantities.
slug: correlation-regression
date: 2026-09-19
lifecycle: published
subject: Mathematics
category: Interactive systems
media:
  - Web experience
  - Interactive application
capabilities:
  - Interprets evidence
  - Explains a mathematical idea
contribution: I designed the statistical experiment, implemented the interactive component with a seeded pseudo-random number generator, and authored the analysis of what correlation and regression can and cannot establish.
interaction: correlation-experiment
evidence:
  problem: Correlation and regression are widely cited as evidence of a relationship, but the numbers alone conceal whether the relationship is linear, whether it survives disaggregation, and whether any causal claim is warranted.
  hypothesis: Giving a reader direct control over the data-generating conditions will make the gap between a correlation coefficient and a reliable conclusion more legible than a static example can.
  process: I built a seeded pseudo-random number generator so results are reproducible, implemented Pearson's r and ordinary least-squares calculations from scratch, and rendered the scatter plot as an accessible SVG with a live text summary providing equivalent numeric information.
  decisions: I used a confounder toggle rather than a continuous slider so the before-and-after contrast is sharp — the regression slope often reverses direction, which is a clearer demonstration of Simpson's paradox than a gradual shift would be.
  outcome: The experiment produces a scatter plot and regression line that update as the reader adjusts sample size, outlier count, confounding variable, and random seed. Resetting always restores the same starting state.
  validation: I verified reproducibility by running identical parameters twice and comparing r values, and tested boundary inputs (n = 10, n = 200, ten outliers) to confirm the calculations remain numerically stable.
  limitations: The data are simulated with a fixed signal-to-noise structure; the experiment demonstrates how the coefficient responds to these controls rather than modelling any real-world dataset. It does not perform significance tests or confidence-interval estimation.
---

Pearson's $r$ measures the strength of a *linear* relationship between two quantities. A value close to $+1$ or $-1$ indicates that a straight line fits the data well; a value near $0$ means either no relationship or a non-linear one that the coefficient cannot detect. Anscombe's quartet illustrates this limit: four datasets share $r \approx 0.82$ while having entirely different structures, one of which is a perfect curve with a single outlier.

The regression line minimises $\sum (y_i - \hat{y}_i)^2$ — the sum of squared vertical distances from each point to the line. Adding a single high-leverage outlier can shift both the slope and the intercept substantially, which is why validating the model matters as much as computing its coefficients. Standard checks include inspecting residuals for patterns, testing normality, and identifying influential points by Cook's distance.

A confounding variable $Z$ that correlates with both $X$ and $Y$ produces an inflated or deflated $r$ in the aggregated data. Conditioning on $Z$ — splitting the data by group — can reverse the apparent direction of association. This is Simpson's paradox: a positive overall correlation can become negative within every subgroup, or vice versa, whenever the groups differ in their mean $X$ values. The experiment shows both views so the reader can observe the reversal directly.

Several conclusions remain inaccessible even after observing a strong correlation. Correlation does not establish causation: a hidden common cause, a selection effect, or a coincidental time trend can produce $|r|$ values arbitrarily close to $1$. Ecological correlations — computed from group averages — cannot be used to draw inferences about individual-level relationships. And extrapolating the regression line beyond the observed range of $x$ assumes the linear structure continues, which rarely holds in practice.
