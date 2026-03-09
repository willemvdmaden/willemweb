---
title: "The Results-Actionability Gap: How Do Teams Actually Evaluate LLM Products?"
description: "Our CHI 2026 paper reveals that practitioners building LLM products can gather evaluation data but often can't translate it into improvements — and that 'vibe checks' might not be the problem everyone thinks they are."
pubDate: "2026-02-11"
heroImage: "/images/publications/heal-chi26.jpg"
---

Our paper **"Results-Actionability Gap: Understanding How Practitioners Evaluate LLM Products in the Wild"** has been accepted at [CHI 2026](https://chi2026.acm.org/) in Barcelona. Written with [Malak Sadek](https://scholar.google.com/citations?user=mfzas2), [Ziang Xiao](https://www.zianxiao.com/), [Aske Mottelson](https://askemottelson.com/), [Q. Vera Liao](https://www.qveraliao.com/), and [Jichen Zhu](https://pure.itu.dk/en/persons/jichen-zhu), this work investigates the messy reality of how product teams evaluate LLM-powered systems in production.

## The gap between gathering data and knowing what to do with it

We interviewed 19 practitioners — from startups to Fortune 500 companies, across healthcare, legal, education, and enterprise software — about how they evaluate LLM products. We expected to find the usual complaints about missing metrics and tooling. We found something different.

The most striking finding was what we call the **results-actionability gap**: teams *can* collect evaluation data, but they *can't* translate findings into concrete improvements. 17 of 19 participants experienced this. When a chatbot gets a groundedness score of 0.5, or a user reports that a response feels "patronizing" — what do you actually change? The prompt? The temperature? The retrieval pipeline? The model itself?

As one participant put it:
> "If we get a groundedness score of 0.5, what do we do? The developers don't want to answer... We're collecting data without a plan for what we're going to do with it."

LLM products involve so many interacting components that poor results rarely point to a single root cause. This breaks the feedback loop that traditional software testing relies on.

## In defense of vibe checks

One of my favorite findings: the much-maligned "vibe check" — where developers just... use the system and see if it feels right — turns out to be an **essential first-line evaluation practice**. Twelve participants described beginning evaluation this way, and several called it "irreplaceable."

Prior work tends to treat this reliance on manual, interpretive methods as a transitional phase — something teams do while waiting for better metrics. We argue it's actually a *necessary adaptation* to the nature of LLMs. When you're building a product on top of a probabilistic system that can surprise you in endless ways, structured intuition captures things that formal metrics miss.

That doesn't mean vibe checks are sufficient on their own. But they shouldn't be dismissed. One participant described systematically "dissecting their vibing" — identifying what they liked or disliked about outputs, then converting those intuitions into explicit evaluation criteria. That's rigorous qualitative inquiry, even if it doesn't look like traditional ML evaluation.

## Ten practices, five challenges

We identified **ten evaluation practices** that span three categories:

- **Execution**: vibe checks, user feedback, expert evaluation, automated tests
- **Design**: extracting evaluation constructs, selecting metrics pragmatically, systematizing ad-hoc toolkits
- **Organizational meta-work**: alignment sessions, documentation, and advocating for evaluation resources

And **five challenges**, four of which confirm prior work (aligning objectives, defining constructs, choosing methods, technical barriers) plus the novel results-actionability gap.

## What this means for HCI

Rather than developing yet another evaluation framework, we suggest HCI researchers focus on supporting practitioners in **systematizing what they're already doing**. The methods practitioners independently develop — reflective practice, think-aloud protocols, disambiguation workshops — are established HCI methods. Practitioners just don't always have the vocabulary or structure to recognize them as such.

We also propose three practical strategies for bridging the actionability gap:

1. **Evaluation-by-design** — build evaluation thinking into product development from the start, not as a post-hoc checkpoint
2. **Continuous sense-making** — convert informal observations into institutional knowledge through lightweight documentation
3. **Incremental changes** — when evaluation reveals problems, change one variable at a time rather than overhauling everything

## Read the paper

The full paper is available via the ACM Digital Library: [doi.org/10.1145/3772318.3791069](https://doi.org/10.1145/3772318.3791069)

I'll be presenting this work at CHI 2026 in Barcelona (April 13–17). If you're working on LLM evaluation in practice, I'd love to chat.
