---
title: "Open Claw: Why AI Needs Design(ers)"
description: "OpenClaw is a great example of why AI needs designers. All the technical pieces already existed — someone just had to put them together around a real need. That's what designers do."
pubDate: "2026-02-16"
---

**ai;dr** I was listening to Lex Fridman's conversation with Peter Steinberger, the creator of OpenClaw, the open-source AI agent that is breaking the internet. OpenClaw is a great example of why AI needs designers. All the technical pieces already existed, and Peter put them together in line with a real need. That's what designers do. The technical pieces for better AI are all here now. Designers should start building.

## What's OpenClaw

OpenClaw is an open-source AI agent framework built by Austrian developer Peter Steinberger. Originally a personal project called Clawdbot, it lets you run an AI assistant that actually does things on your behalf — managing emails, booking flights, coordinating tasks — through messaging apps like WhatsApp, Signal, and Telegram. Unlike chatbots that just respond to prompts, OpenClaw agents operate continuously, connecting to external services and executing multi-step workflows. It went viral in late January 2026 and has since become one of the most talked-about AI projects in the world.

## Putting things together

At some point, Peter responds to a tweet criticising OpenClaw for not being original:

> "Isn't magic often just like you take a lot of things that are already there but bring them together in new ways? ... Maybe there's no magic in there, but sometimes just rearranging things and adding a few new ideas is all the magic that you need."

Lex picks up on this and draws an analogy to the scrolling on the original iPhone. All the components existed, scrolling existed, touchscreens existed, but someone had to put them together. Peter agrees: *"Nobody did it... and afterwards it felt so obvious."*

That is what designers do. We don't invent new physics. We look at what exists and figure out how to arrange it so it works for people. But the harder part, the part that usually goes unnoticed, is knowing *what* to put together. That comes from finding the need first.

## Need over desire

In design, there's an important distinction between needs and desires. Desmet & Fokkinga's work on human needs makes this clear: needs are fundamental and universal, desires are surface-level and situational. You might *desire* a faster car, but you *need* to get somewhere. Designing for desires can be useful, but designing for needs is where new things come from.

Peter built from need. He wanted a personal AI assistant, was annoyed it didn't exist, and in his words, "just prompted it into existence." Lex asks why OpenClaw won where well-funded startups failed. Peter replies:

> "Because they all take themselves too serious. It's hard to compete against someone who's just there to have fun."

The startups were probably designing for desires: market demand, feature lists, investor expectations. Peter was scratching an itch. Not a market opportunity, a personal need. And he followed it with play rather than strategy.

That's also what drove him fifteen years earlier when he built PSPDFKit: *"Why does this not exist? Let me build it."*

This is precisely what designers are trained for. Talking to people, figuring out their actual needs, and arriving at that question: *Why does this not exist yet? Let me build it!*

## soul.md

The story of soul.md is where it gets interesting. Peter noticed that Claude Code's default voice felt wrong in a WhatsApp conversation:

> "When you talk to a friend on WhatsApp, they don't talk like Claude Code."

So he gave the agent a personality. Made it spicy, weird, lobster-themed. Then he told the agent to write its own soul file.

A coding assistant in a terminal is a work tool. You expect precision, efficiency, maybe some shorthand. WhatsApp is where you talk to friends. You expect personality, casualness, humor. Peter was using the same underlying AI in both cases, but the social contract was completely different. He felt that mismatch and fixed it by giving the agent a character.

This points to something bigger: one-size-fits-all doesn't work for AI. And it's not enough to just tailor systems to a domain. Take healthcare. An LLM designed for a doctor and an LLM designed for a patient are operating in the same domain, but they need completely different characters. Different tone, different level of detail, different assumptions about what the person on the other end knows and needs. Same domain, different context, different character.

Character design for LLMs remains under-explored, though some companies are taking it seriously (Anthropic is leading the way). But this goes beyond the character of an LLM. The idea that different contexts need different things applies to any AI system being deployed. Every specific context requires a specific combination and configuration of components that align with the needs of that context — a task cut out for designers.

## The pieces are there

You don't have to train models to engage with AI. You don't have to be a machine learning engineer to build AI systems. You don't even have to code anymore.

In the last few months alone, open-source reasoning models like DeepSeek R1 have made frontier-level AI available to anyone. Anthropic open-sourced its Model Context Protocol, giving developers a standard way to connect AI to tools and data. Coding agents like Claude Code have made it possible to build functional software through conversation.

The technical pieces are there. And you don't need to push that barrier further to make something great.

Peter built OpenClaw's memory system out of markdown files. He made the agent behave naturally in group chats with a simple no-reply token. The whole project started as a one-hour prototype piping WhatsApp messages to a CLI. These aren't complex technical feats. They're (very) creative, (very) insightful decisions about how to put accessible components together in the right way.

Airbnb was built by designers who saw that spare rooms, the internet, and payment systems were all there. Someone just had to put them together around a real need. The iPod didn't invent the MP3 player. Spotify's Discover Weekly didn't invent recommendation algorithms. Same pattern every time: the pieces were there, someone put them together.

That's exactly where AI is right now. The components are all there. **Start building.**
