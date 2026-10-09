---
{
  "title": "用后缀 -ize 将名词转化为动词",
  "summary": "系统梳理后缀 -ize 的构词机制：它如何把名词（以及形容词）变成表示“使……化、变得……”的动词，如何判断哪些名词可以加 -ize、哪些不能，并辨析英式 -ise 与 -ize 的拼写差异。",
  "slug": "issue-2",
  "date": "2026-10-09",
  "lifecycle": "published",
  "subject": "English",
  "media": [
    "Written explanation"
  ],
  "capabilities": [
    "Explains a language concept"
  ],
  "authorship": "ai-generated",
  "sourceIssue": "https://github.com/CestcaVision/YUKINO1-3/issues/2",
  "sourceHash": "4a13c9004ee26b99d32159243e0024ed22cb0512d1f3ff986e4ac96fafd80003",
  "generationModel": "mimo-v2.6-flash"
}
---

## 直观引入

读英语时，我们常遇到这样一族词：*modern*（现代的）变成 *modernize*（使现代化），*hospital*（医院）变成 *hospitalize*（送入医院治疗），*computer*（计算机）变成 *computerize*（使计算机化）。共同点很明显：词尾多了一个 **-ize**，词性由名词或形容词变成了动词，词义则大致是“使……变成某种状态”或“以……的方式处理”。

这就是本笔记要解决的问题：-ize 到底表达什么意义？它能接在哪些词后面？拼写上有什么讲究？英式 -ise 又是怎么回事？

## 核心定义

**-ize**（也写作 -ise）是一个源自希腊语动词词干的**派生后缀**，附加在名词或形容词之后，构成动词。它的核心语义可以概括为两类：

1. **致使义（causative）**：“使……进入某种状态、使……具备”
   - *hospital → hospitalize*（使（某人）入院）
   - *legal → legalize*（使合法化）
   - *stabilize*（使稳定）
2. **方式义 / 状态变化义（inchoative）**：“以……方式处理、变得……”
   - *computer → computerize*（以计算机方式处理）
   - *sterilize*（使无菌、消毒）
   - *realize*（认识到，即“使……成为现实/被意识到”）

用形态学的写法，这一过程可以表示为：



$$
\text{N/Adj} + \text{-ize} \;\Rightarrow\; \text{V}
$$



其语义操作大致是：



$$
\llbracket X + \text{ize} \rrbracket = \lambda x.\; \text{CAUSE}(x,\, \text{BECOME } X)
$$



即“让某物 X 化”。这只是理解性模型，具体词义仍需逐词确认。

## 构词规律逐步拆解

**第一步：确认基词的词类与语义。** 只有名词、形容词（少数是其他词根）才适合加 -ize。基词必须是一个可以被“达成”的状态或可被使用的工具。

**第二步：判断语义是否合法。** 问自己：“使……化”在常识上说不说得通？*hospitalize* 合法，因为“使人进入医院状态”是可实现的；而 *chairize*（使椅子化）在一般语境下没有意义，因此不用。

**第三步：检查拼写与重音。** -ize 读作 /aɪz/，派生后重音通常落在基词的重读音节上：*MOdern → modernIZE*，*COMputer → computerIZE*。基词以 e 结尾时通常直接加 -ize（*real → realize*）；以辅音字母加 y 结尾时先变 y 为 i（实际已体现在 -ize 中）；以 -fy、-ate 等已有的动词化后缀结尾的词不再叠加 -ize。

**第四步：检查是否已有更合适的动词。** 很多名词已有固定动词形式，此时应使用现成动词，而不是自造 -ize 形式（详见下文“常见误区”）。

**第五步：按需派生名词。** 若需要名词，可在动词后加 **-ation**：*computerize → computerization*，*realize → realization*。

## 一个完整例子：computer → computerize → computerization

1. 基词 *computer* 是名词，指“计算机”，可作为“被使用的工具”。
2. 加 -ize 得动词 *computerize*，读作 /kəmˈpjuːtəraɪz/，重音模式为“基词重音 + 词尾 /aɪz/”。
3. 语义取“方式义”：把某项工作**改用计算机来处理**，例如 “The company computerized its records.”（公司把记录计算机化。）注意主语通常是施事者，宾语才是被改造的对象——这与 *hospitalize* 的结构（*hospitalize the patient*）一致。
4. 派生名词 *computerization*，用于描述这一过程本身。
5. 拼写核对：英式与美式均接受 *computerize*；若采用英式 -ise，可写 *computerise*，但同一文本中应保持一致。

## 常见误区与限制

**一、并非所有名词都能直接加 -ize。**

- **已有固定动词的名词**：*advice*（建议）的动词是 *advise*，不能造 *advize*；*choice → choose*、*belief → believe* 同理，这类词属于不规则或历史音变，后缀无法介入。
- **以 -ise 结尾的动词不能再加**：*advise、revise、supervise、exercise、promise、surprise、improvise* 等本已是动词，不存在 *adviseize* 这类形式。
- **动作性名词（-ation 等）通常不再 -ize**：*hesitation、organization* 已对应动词 *hesitate、organize*，说 *hesitationize* 是冗余的。
- **语义不可实现的名词**：表示具体、不可“状态化”事物的名词，如 *table、chair、window*，一般不能加 -ize；即便某些专业语境下造出新词（如 *weaponize*），也属于特定领域的临时构词，不能推广。
- **专有名词需谨慎**：如 *Americanize*、*modernize* 可以，但随意把任意专有名词 -ize 化会显得生造。

**二、-ize 不是万能的“名词转动词”手段。** 英语中还有 *-ify*（*purify*）、*-ate*（*activate*）等动词化后缀，选择哪一个往往由词源固定，不能随意替换：说 *purify* 而非 *purize*，说 *activate* 而非 *activeize*（*active* 的动词是 *activate*）。

**三、-ize 词并非全是“使动词”。** 少数词已发生语义漂移，如 *compromise*、*criticize*、*surprise*，不能简单套用“使……化”来推词义，必须逐词记忆。

## 英式 -ise 与美式 -ize 的区别

- **-ize 主要是国际拼写与美式标准**，也得到牛津大学出版社等采用（所谓 Oxford spelling）；**-ise 是英式常见变体**（*organise、realise、recognise*），源于古法语 -iser 的影响。
- 两者**发音相同**，均为 /aɪz/，意思完全一样，写作时最重要的是**全文统一**，不要混用。
- **必须写 -ise、不能写 -ize 的动词**（无论英美）包括：*advise、devise、revise、supervise、exercise、promise、surprise、compromise、precise*（形容词 *precise* 不动词化）等。它们与 -ize 词源不同，拼写不可互换。
- 判断技巧：不确定时查词典的拼写标注；若词典给出 “-ise/-ize”，说明两可；若只列 -ise，说明是固定拼写。

## 小结

-ize 的本质是一个**语义可预测的动词化工具**：把可“达成”的状态（名词或形容词）变成“使……化 / 以……方式处理”的动词。使用它要经过四道检查——词类是否合适、语义是否成立、是否已有现成动词、拼写是否一致。掌握了“意义—词类—拼写”这三条线，就能既准确理解 *modernize* 一类词，也避免生造 *tableize*、*advize* 这样的错误形式；遇到 -ise 与 -ize 时，只须记住“读音相同、拼写按词典与文体统一”的原则。
