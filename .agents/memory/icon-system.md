---
name: Icon System
description: Topic icon field is a Lucide icon name string, not an emoji; frontend lookup table required
---

**Rule:** The `icon` field in `TopicDefinition` (topics.ts) is a kebab-case Lucide React icon name, not an emoji.

Current mapping:
- "cpu" → Cpu (AI topic)
- "laptop" → Laptop (Technology topic)
- "bar-chart-2" → BarChart2 (Stocks topic)
- "globe" → Globe (Economy topic)
- "landmark" → Landmark (Politics topic)

**Frontend:** Both `pages/home.tsx` and `pages/saved-briefings.tsx` use a `TOPIC_ICON_MAP` lookup object and a `TopicIcon` component. New topics must have a matching entry in both files.

**Why:** Emoji icons looked unprofessional (user feedback, Sprint 2). Lucide SVG icons match Bloomberg/Reuters aesthetic.

**How to apply:** When adding a new topic, add the Lucide icon name to topics.ts AND add the import + mapping entry to both page files.
