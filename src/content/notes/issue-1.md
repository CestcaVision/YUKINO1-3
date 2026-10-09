---
{
  "title": "学习记录：从最小二乘推导简单线性回归",
  "summary": "用一元线性模型拟合观测点，从平方残差和出发推导正规方程与 a、b 的闭式解，说明平方损失可求导、所有 x 相同时斜率不唯一的原因，并以 (0,1)、(1,2)、(2,2) 三点完整算例核对预测值与残差，最后讨论离群点影响以及相关性与因果性的区别。",
  "slug": "issue-1",
  "date": "2026-10-09",
  "lifecycle": "published",
  "subject": "Mathematics",
  "media": [
    "Written explanation"
  ],
  "capabilities": [
    "Explains a mathematical idea"
  ],
  "authorship": "ai-generated",
  "sourceIssue": "https://github.com/CestcaVision/YUKINO1-3/issues/1",
  "sourceHash": "884622fa3a93ca9fb1ca11a3d12447e8a1fd3f1018dc4b3bc991eff2dc002089",
  "generationModel": "mimo-v2.6-flash"
}
---

# 从最小二乘推导简单线性回归

## 一、直观引入

给定平面上若干个观测点 $(x_i, y_i)$，我们希望用一条直线穿过它们。但没有一条直线能同时经过所有点，于是需要一个**评价标准**，说明哪条直线“最好”。最小二乘法的选择是：让所有点到直线的**竖直距离的平方和**最小。

这个准则之所以常用，原因之一是平方函数光滑、处处可导，且平方和关于参数是二次函数，因此可以借助求导得到解析解，而不必做数值搜索。

## 二、模型与目标函数

一元线性模型写作

$$y = ax + b$$

其中 $a$ 是斜率，$b$ 是截距。给定 $n$ 个观测点，记第 $i$ 个点的拟合值为 $\hat y_i = a x_i + b$，残差为 $e_i = y_i - \hat y_i$。目标是最小化平方残差和（sum of squared errors）：

$$S(a, b) = \sum_{i=1}^{n} (y_i - a x_i - b)^2$$

**为什么平方损失可求导：** $S$ 是 $a$、$b$ 的多项式函数，各阶导数都存在且连续；进一步说，它是凸二次函数，梯度为零的点就是全局最小值点。绝对值损失 $|e_i|$ 则在原点不可导，处理起来更麻烦。

## 三、正规方程的推导

分别对 $a$、$b$ 求偏导并令其为零：

$$\frac{\partial S}{\partial a} = -2 \sum_{i=1}^{n} x_i (y_i - a x_i - b) = 0$$

$$\frac{\partial S}{\partial b} = -2 \sum_{i=1}^{n} (y_i - a x_i - b) = 0$$

整理后得到**正规方程**（normal equations）：

$$\begin{cases}
 a \sum x_i^2 + b \sum x_i = \sum x_i y_i \\
 a \sum x_i + n b = \sum y_i
\end{cases}$$

写成矩阵形式即 $X^{\mathsf T} X \boldsymbol{\theta} = X^{\mathsf T} \boldsymbol{y}$，其中 $\boldsymbol{\theta} = (a, b)^{\mathsf T}$。几何上，这等价于把向量 $\boldsymbol{y}$ 正交投影到 $X$ 的列空间上。

**闭式解。** 记 $\bar x = \frac{1}{n}\sum x_i$，$\bar y = \frac{1}{n}\sum y_i$，由第二式得 $b = \bar y - a \bar x$，代入第一式：

$$a = \frac{\sum (x_i - \bar x)(y_i - \bar y)}{\sum (x_i - \bar x)^2} = \frac{n\sum x_i y_i - \sum x_i \sum y_i}{n \sum x_i^2 - \left(\sum x_i\right)^2}, \qquad b = \bar y - a\bar x$$

**为什么所有 $x$ 相同时斜率不唯一：** 分母满足

$$n \sum x_i^2 - \left(\sum x_i\right)^2 = n \sum_{i=1}^{n} (x_i - \bar x)^2$$

若所有 $x_i$ 都相等，则每个 $x_i - \bar x = 0$，分母为零，$X^{\mathsf T} X$ 奇异，正规方程不再有唯一解。直观上，当所有点共一条竖直线时，$y$ 的变化无法归因于 $x$ 的变化，任意斜率配合适当截距都能得到相同的拟合值，斜率因而无法确定。此时必须额外假设（例如强制 $a=0$）才能得到唯一答案。

## 四、逐步算例

取三点 $(0,1)$、$(1,2)$、$(2,2)$，$n=3$。

**第一步：求和。**

$$\sum x_i = 3,\quad \sum y_i = 5,\quad \sum x_i^2 = 0+1+4=5,\quad \sum x_i y_i = 0+2+4=6$$

**第二步：代入公式。**

$$a = \frac{3 \times 6 - 3 \times 5}{3 \times 5 - 3^2} = \frac{18-15}{15-9} = \frac{3}{6} = \frac{1}{2}$$

$$b = \bar y - a\bar x = \frac{5}{3} - \frac{1}{2} \cdot 1 = \frac{7}{6}$$

故回归直线为 $\hat y = \dfrac{1}{2}x + \dfrac{7}{6}$。

**第三步：核对正规方程。**

$$a\sum x_i^2 + b\sum x_i = \tfrac12 \cdot 5 + \tfrac76 \cdot 3 = 2.5 + 3.5 = 6 = \sum x_i y_i \;\checkmark$$

$$a\sum x_i + nb = \tfrac12 \cdot 3 + 3 \cdot \tfrac76 = 1.5 + 3.5 = 5 = \sum y_i \;\checkmark$$

**第四步：预测值与残差。**

| $x_i$ | $y_i$ | $\hat y_i$ | $e_i = y_i - \hat y_i$ |
|---|---|---|---|
| 0 | 1 | $7/6 \approx 1.167$ | $-1/6$ |
| 1 | 2 | $5/3 \approx 1.667$ | $+1/3$ |
| 2 | 2 | $13/6 \approx 2.167$ | $-1/6$ |

平方残差和为

$$S = \frac{1}{36} + \frac{1}{9} + \frac{1}{36} = \frac{6}{36} = \frac{1}{6} \approx 0.167$$

同时残差之和为 $-\tfrac16 + \tfrac13 - \tfrac16 = 0$，与第二个正规方程一致，可作为额外校验。

## 五、常见误区与局限

1. **相关不等于因果。** 拟合出的正斜率只说明 $x$ 与 $y$ 同向变动（统计相关），并不能证明 $x$ 导致 $y$ 变化。共同的第三方因素、反向因果或选择偏差都可能产生同样的拟合线。因果结论需要实验设计或额外的因果假设。
2. **离群点对平方损失影响很大。** 单个残差按二次增长：残差扩大 10 倍，损失扩大 100 倍。因此偏离主趋势的离群点会在平方和中占据主导，把回归线“拉”向自己，斜率和截距都会明显偏移。稳健做法包括检查异常值、使用绝对值损失或对数据做变换。
3. **模型假设要分清。** “误差均值为零、与 $x$ 独立、方差齐性”等是推导置信区间时的**假设**，不是最小二乘点估计本身需要的条件；而“分母为零导致斜率不唯一”是**结论**，可由公式直接推出。
4. **样本太少也不可靠。** 两点总能被一条直线精确拟合，但此时无法判断拟合是否具有代表性。

## 六、小结

最小二乘把“拟合得好”转化为可计算的优化问题：平方损失光滑可导，求导后得到正规方程，进而解出

$$a = \frac{\sum (x_i-\bar x)(y_i-\bar y)}{\sum (x_i-\bar x)^2}, \qquad b = \bar y - a\bar x$$

当所有 $x_i$ 相同时分母为零，斜率不可识别。三点算例验证了公式与正规方程的一致性。最后要牢记：回归给出的是关联描述，而非因果证明，且平方损失对离群点较为敏感。
