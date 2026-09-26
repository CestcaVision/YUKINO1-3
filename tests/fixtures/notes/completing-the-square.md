---
title: Completing the square, visually
summary: A geometric route from a quadratic expression to vertex form.
slug: completing-the-square
date: 2026-09-05
updated: 2026-09-10
lifecycle: published
subject: Mathematics
media:
  - Written explanation
  - Code
capabilities:
  - Explains a mathematical idea
---

Starting with $x^2 + 6x$, arrange one square of side $x$ and two rectangles of dimensions $x$ by $3$. Adding the missing square of side $3$ completes the larger square:

$$
x^2 + 6x + 9 = (x + 3)^2.
$$

A small function can expose the vertex's horizontal coordinate:

```ts
function vertexX(a: number, b: number) {
  return -b / (2 * a);
}
```

This is test fixture content, not applicant-authored evidence.
