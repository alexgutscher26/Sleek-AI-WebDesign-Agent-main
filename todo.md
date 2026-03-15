# Sleek Design Engine - Master TODO Roadmap

## Vision
- [ ] Build Sleek into a complete design engine for web + mobile UI + growth assets
- [ ] Support end-to-end workflow: idea -> design system -> multi-platform screens -> launch-ready marketing creatives
- [ ] Ensure outputs are production-quality, exportable, and reusable across teams

## Roadmap Governance
- [ ] Assign owner + due date to every item
- [ ] Label every item: `P0`, `P1`, `P2`, `P3`
- [ ] Add status labels: `todo`, `in-progress`, `blocked`, `done`
- [ ] Create weekly triage for top 15 priorities
- [ ] Review and re-score roadmap every month
- [ ] Add KPI target to each major epic
- [ ] Link each completed task to commit/PR

## P0 - Stability and correctness
- [x] Fix message conversion issue in `app/action/action.ts` (text part mapping mismatch)
- [x] Add strict request validation in `POST /api/project`
- [x] Add ownership checks for project/page access by `slugId`
- [x] Add route-level schema validation for all APIs
- [x] Add unified error response shape across APIs
- [x] Add hard limits for prompt length and file upload size
- [ ] Add MIME/type verification for uploaded files
- [ ] Add abort-safe stream handling with no partial DB writes
- [ ] Add retries for transient AI provider errors
- [ ] Add fallback behavior when analysis JSON parsing fails
- [ ] Add database transaction boundaries for multi-step writes
- [ ] Prevent duplicate project creation race conditions
- [ ] Add idempotency token support for generation requests
- [ ] Add safe timeout handling for long-running generations
- [ ] Add guardrails for empty/invalid `messages` arrays
- [ ] Add strict null checks and remove critical runtime `any`
- [ ] Block dangerous HTML/script patterns before rendering in iframe
- [ ] Add secure defaults for all environment variables
- [ ] Remove hardcoded production fallback base URL
- [ ] Add boot-time config validation with fail-fast logging

## P0 - Security hardening
- [ ] Add rate limiting by user + IP for generation endpoints
- [ ] Add abuse prevention for repeated regenerate spam
- [ ] Add CSRF strategy for sensitive server actions
- [ ] Add Content Security Policy headers
- [ ] Add clickjacking/XSS protection headers
- [ ] Add secure cookie settings verification
- [ ] Add audit logs for delete/update actions
- [ ] Add signed URL flow for file uploads
- [ ] Add prompt injection detection and mitigation rules
- [ ] Add model output sanitization before persistence
- [ ] Add role-based access controls for future team workspaces
- [ ] Add privacy retention policy for prompts/images
- [ ] Add secure deletion workflow for user data
- [ ] Add suspicious activity alerts and lockouts

## P1 - Core app UX improvements
- [x] Add robust empty/loading/error states for all views
- [x] Add global command palette for project actions
- [ ] Add keyboard shortcuts across chat + canvas
- [ ] Add better mobile and tablet layouts for editor UI
- [ ] Add undo/redo for prompt, page, and canvas operations
- [ ] Add duplicate/rename/reorder page controls
- [ ] Add page pin/favorite action
- [ ] Add project archive and restore flows
- [ ] Add autosave indicator and last-saved timestamp
- [ ] Add project search and filter on home screen
- [ ] Add sort options for recents (newest, updated, title)
- [ ] Add compact/comfortable density modes
- [ ] Add onboarding tour with sample prompts
- [ ] Add first-run setup wizard for Insforge config
- [ ] Add inline hints for regenerate intent usage
- [ ] Add side-by-side compare for regenerated pages
- [ ] Add generation history timeline per page
- [ ] Add one-click revert to previous generation
- [ ] Add better drag snapping and alignment guides on canvas
- [ ] Add zoom presets and fit-to-content action
- [ ] Add multi-select and bulk page actions

## P1 - AI quality improvements
- [ ] Add selectable generation modes (landing, dashboard, auth, docs, ecommerce)
- [ ] Add style intensity controls (minimal, balanced, bold)
- [ ] Add creativity controls (strict-to-prompt <-> exploratory)
- [ ] Add layout complexity controls
- [ ] Add content depth controls (wireframe, realistic copy, complete)
- [ ] Add model provider selector with cost/latency hints
- [ ] Add prompt improvement assistant before generation
- [ ] Add auto-clarifying questions when prompt is vague
- [ ] Add structured constraints input (brand colors, spacing scale, typography)
- [ ] Add preserve-elements lock for regenerate
- [ ] Add section-scoped regenerate (hero, pricing, FAQ, footer)
- [ ] Add semantic quality checker for generated markup
- [ ] Add accessibility checker pass before save
- [ ] Add visual hierarchy quality score
- [ ] Add regeneration confidence score + warnings
- [ ] Add multi-pass generation pipeline (analyze -> draft -> polish)
- [ ] Add optional critique agent for design QA
- [ ] Add deterministic seed support for reproducible outputs
- [ ] Add prompt templates for high-converting page types
- [ ] Add automatic language/localization options for generated content

## P1 - Data model and platform APIs
- [ ] Add `updatedAt` support for projects/messages tables
- [ ] Add `position` field for stable page ordering
- [ ] Add project `metadata` JSON for engine settings
- [ ] Add page `metadata` JSON for viewports and tags
- [ ] Add generation run table with status, latency, token usage
- [ ] Add asset table for screenshots/icons/thumbnails
- [ ] Add job table for async render/export pipelines
- [ ] Add prompt template table with tags and versions
- [ ] Add design token set table per workspace
- [ ] Add project collaborator table for team features
- [ ] Add soft delete flags and archival timestamps
- [ ] Add pagination APIs for projects/messages/pages
- [ ] Add filtering APIs for date/model/type
- [ ] Add webhook/event stream for run status updates
- [ ] Add API versioning strategy and compatibility notes

## P1 - Observability and operations
- [ ] Add structured logging for request and generation lifecycle
- [ ] Add correlation IDs for traceability
- [ ] Add metrics for success rate, latency, retries
- [ ] Add dashboard for generation throughput and error trends
- [ ] Add alerting on failure spikes and long queue times
- [ ] Add cost tracking per model/provider/user
- [ ] Add budgets and caps for generation usage
- [ ] Add runbook docs for incidents
- [ ] Add health check endpoints and readiness probes

## P1 - Testing and CI/CD
- [ ] Add unit tests for utility and action functions
- [ ] Add API contract tests for each route
- [ ] Add integration tests for generation streams
- [ ] Add component tests for chat/canvas controls
- [ ] Add E2E tests for new project to export flow
- [ ] Add snapshot tests for key generated structures
- [ ] Add load tests for concurrent stream sessions
- [ ] Add security tests for access control and injection
- [ ] Add CI pipeline: lint + typecheck + test + build
- [ ] Add preview deployment checks before merge
- [ ] Add release checklist automation

## P2 - Mobile App Design Engine (major epic)

### Mobile generation core
- [ ] Add `mobile-app` generation mode
- [ ] Add platform selector: iOS, Android, both
- [ ] Add design system selector: Cupertino, Material, custom hybrid
- [ ] Add mobile-first prompt schema (app type, audience, flows)
- [ ] Add screen map planner (onboarding -> auth -> home -> detail -> settings)
- [ ] Add multi-screen generation in one run
- [ ] Add navigation pattern selector (tab, stack, drawer, bottom sheet)
- [ ] Add component library tuned for mobile patterns
- [ ] Add gesture-aware layout directives
- [ ] Add safe area awareness for all generated screens
- [ ] Add dynamic island/notch-safe spacing rules
- [ ] Add keyboard and input focus state handling

### Mobile screen templates
- [ ] Add login/signup/reset password templates
- [ ] Add onboarding carousel templates
- [ ] Add profile/account settings templates
- [ ] Add dashboard/home feed templates
- [ ] Add ecommerce product listing/detail/cart templates
- [ ] Add fintech wallet/transactions templates
- [ ] Add booking calendar/search/detail templates
- [ ] Add social feed/chat/story templates
- [ ] Add fitness tracking templates
- [ ] Add healthcare appointment templates
- [ ] Add music/media player templates
- [ ] Add map/location templates
- [ ] Add notifications center templates
- [ ] Add subscription/paywall templates
- [ ] Add empty states and error states templates

### Mobile quality standards
- [ ] Add viewport checks for common phone sizes
- [ ] Add touch target compliance checks
- [ ] Add contrast and readability checks for outdoor mode
- [ ] Add status bar adaptation rules (light/dark content)
- [ ] Add orientation support (portrait + landscape where relevant)
- [ ] Add RTL support rules for mobile screens
- [ ] Add mobile accessibility checks (VoiceOver/TalkBack basics)
- [ ] Add localization-ready constraints for longer text

### Mobile export paths
- [ ] Add export to React Native component scaffold
- [ ] Add export to Flutter widget scaffold
- [ ] Add export to SwiftUI view scaffold
- [ ] Add export to Jetpack Compose scaffold
- [ ] Add asset packaging for mobile export bundles
- [ ] Add code comments with mapping to design sections
- [ ] Add naming conventions for screen/component files

## P2 - App Store Screenshot Engine (iOS + Android)

### Screenshot planning
- [ ] Add screenshot storyboard generator from app flow
- [ ] Add region strategy templates (US, EU, JP, etc.)
- [ ] Add localization slots for screenshot copy
- [ ] Add tone styles (bold, clean, playful, premium)
- [ ] Add visual campaign consistency check across all screenshots

### iOS screenshot generation
- [ ] Add iPhone 6.7-inch screenshot export support
- [ ] Add iPhone 6.5-inch screenshot export support
- [ ] Add iPhone 5.5-inch fallback export support
- [ ] Add iPad screenshot support (if required by app category)
- [ ] Add portrait + landscape screenshot variants
- [ ] Add Apple-style frame/mockup options
- [ ] Add raw no-frame screenshot option
- [ ] Add typography and headline placement presets
- [ ] Add CTA-safe margins for App Store display crops

### Android screenshot generation
- [ ] Add phone screenshot sizes aligned with Play requirements
- [ ] Add tablet screenshot variants
- [ ] Add Chromebook/large screen variants where useful
- [ ] Add Android frame/mockup options
- [ ] Add light and dark screenshot packs
- [ ] Add no-frame screenshot output for flexible use

### Screenshot content tooling
- [ ] Add headline generator for each screenshot panel
- [ ] Add feature-priority sequencing (panel 1-8)
- [ ] Add automatic copy length fitting and wrapping
- [ ] Add icon/illustration accent libraries for screenshot overlays
- [ ] Add visual badges (new, AI, offline, secure, etc.)
- [ ] Add legal/disclaimer text placement options
- [ ] Add color consistency check against brand tokens

### Screenshot export and validation
- [ ] Add one-click pack export as zip
- [ ] Add PNG and JPG output options
- [ ] Add export quality controls (1x, 2x, 3x)
- [ ] Add naming conventions by platform and order
- [ ] Add preflight validation for dimensions and aspect ratio
- [ ] Add reject list if any screenshot fails store constraints
- [ ] Add final checklist report for submission readiness

## P2 - Product Hunt Marketing Asset Engine

### Launch image set generation
- [ ] Add Product Hunt gallery image set generator
- [ ] Add hero thumbnail generator for PH listing
- [ ] Add launch day banner generator
- [ ] Add social card generator for PH announcement
- [ ] Add maker comment visual quote cards
- [ ] Add before/after transformation visuals
- [ ] Add problem/solution story slides

### Product Hunt style presets
- [ ] Add PH-style clean tech preset
- [ ] Add bold startup preset
- [ ] Add playful indie hacker preset
- [ ] Add premium SaaS preset
- [ ] Add dark cinematic preset

### Product Hunt copy and messaging
- [ ] Add headline variants for PH tagline testing
- [ ] Add short value prop variants for thumbnails
- [ ] Add benefit bullets for gallery panels
- [ ] Add launch CTA variants (upvote, try now, feedback)
- [ ] Add social teaser copy pairings per image

### Product Hunt asset dimensions and formats
- [ ] Add correct PH thumbnail dimension presets
- [ ] Add gallery panel presets for PH image carousel
- [ ] Add OG/social image presets for X/LinkedIn
- [ ] Add export bundles grouped by channel
- [ ] Add watermark toggle and brand lock option

## P2 - Thumbnail Engine (YouTube, social, ads)

### Thumbnail generation core
- [ ] Add thumbnail mode with platform presets
- [ ] Add style selector (minimal, high-contrast, editorial, neon)
- [ ] Add subject focal point controls
- [ ] Add text hierarchy layers (hook, subhook, badge)
- [ ] Add A/B thumbnail variant generation
- [ ] Add emotion/intent style tags (urgent, curiosity, authority)

### Platform presets
- [ ] Add YouTube 1280x720 preset
- [ ] Add X post image presets
- [ ] Add LinkedIn feed presets
- [ ] Add Instagram post and story presets
- [ ] Add Meta ads image presets
- [ ] Add Google display ad variants

### Thumbnail quality checks
- [ ] Add readability check at small preview sizes
- [ ] Add color clash detection
- [ ] Add safe text zone guides per platform
- [ ] Add max-word recommendation warnings
- [ ] Add click-through score heuristic
- [ ] Add anti-clutter scoring and suggestions

## P2 - Icon and logo asset engine

### App icon generation
- [ ] Add iOS app icon pack generator (all required sizes)
- [ ] Add Android adaptive icon generator (foreground/background layers)
- [ ] Add monochrome icon variant generation
- [ ] Add rounded-corner mask simulation preview
- [ ] Add icon legibility check at tiny sizes
- [ ] Add icon style packs (flat, gradient, glass, glyph)
- [ ] Add auto-export with platform folder structure

### Brand icon/logo kits
- [ ] Add favicon set generator
- [ ] Add social profile icon variants
- [ ] Add dark/light background logo variants
- [ ] Add wordmark + mark lockup generation
- [ ] Add SVG clean export and optimization
- [ ] Add icon usage guidelines sheet export

## P2 - Marketing image packs
- [ ] Add launch pack generator (hero, features, testimonials, pricing)
- [ ] Add ad creative pack generator for paid campaigns
- [ ] Add feature announcement image generator
- [ ] Add changelog/release visual card generator
- [ ] Add blog header image generator
- [ ] Add email banner generator
- [ ] Add case study visual template generator
- [ ] Add webinar/event cover generator
- [ ] Add partner/co-marketing asset templates
- [ ] Add seasonal campaign template sets

## P2 - Brand system and creative direction
- [ ] Add brand profile setup wizard (voice, color, typography, imagery)
- [ ] Add multiple brand kits per workspace
- [ ] Add brand token lock mode for strict consistency
- [ ] Add creative direction board (mood references + constraints)
- [ ] Add reusable style presets by project type
- [ ] Add automatic brand compliance checks for generated assets
- [ ] Add prohibited style rules (avoid colors/fonts/layouts)
- [ ] Add brand-safe copy style guardrails

## P2 - Asset library and DAM-style management
- [ ] Add centralized asset library with tags
- [ ] Add folder and collection organization
- [ ] Add version history for every exported asset
- [ ] Add duplicate detection for similar assets
- [ ] Add smart search by text and visual style
- [ ] Add bulk export and bulk rename tools
- [ ] Add asset approval workflow and statuses
- [ ] Add usage tracking across projects
- [ ] Add expired/outdated asset reminders

## P2 - Collaboration and review workflows
- [ ] Add comments on pages and images
- [ ] Add pin annotations for exact edit requests
- [ ] Add reviewer roles (owner, editor, viewer)
- [ ] Add approval gates before export/download
- [ ] Add mention notifications for team members
- [ ] Add side-by-side revision compare
- [ ] Add review summary generation from comments
- [ ] Add resolved/unresolved thread tracking

## P2 - Export and integration workflows
- [ ] Add export to Figma-ready assets package
- [ ] Add export to design tokens JSON
- [ ] Add export to Notion launch docs bundle
- [ ] Add export to marketing calendar formats
- [ ] Add one-click publish to cloud storage buckets
- [ ] Add API endpoints for external automation systems
- [ ] Add Zapier/Make webhook triggers for completed jobs
- [ ] Add scheduled export pipelines

## P2 - Prompt and template marketplace
- [ ] Add personal prompt library with categories
- [ ] Add team-shared prompt templates
- [ ] Add prompt performance stats
- [ ] Add recommended prompt improvements
- [ ] Add template rating and favorites
- [ ] Add import/export for prompt collections
- [ ] Add curated templates for specific industries

## P2 - Documentation and learning system
- [ ] Add built-in docs panel for each mode
- [ ] Add mode-specific quickstart guides
- [ ] Add example project walkthroughs
- [ ] Add troubleshooting knowledge base
- [ ] Add glossary for design and growth terms
- [ ] Add tooltip help system for controls
- [ ] Add interactive prompt coaching examples

## P2 - Billing, plans, quotas
- [ ] Add usage metering by generation type (web, mobile, assets)
- [ ] Add free/pro/agency/enterprise plan matrix
- [ ] Add monthly and annual billing options
- [ ] Add credit packs for extra renders
- [ ] Add workspace-level spending limits
- [ ] Add invoice and receipt management
- [ ] Add usage warning emails and in-app alerts
- [ ] Add hard stop behavior at quota limits

## P3 - Advanced intelligence
- [ ] Add trend-aware style recommendations from market categories
- [ ] Add conversion-oriented layout suggestions
- [ ] Add audience persona-aware design generation
- [ ] Add competitor-style gap analysis mode
- [ ] Add launch readiness score across all generated assets
- [ ] Add automatic campaign kit generation from one prompt
- [ ] Add reinforcement from past high-performing assets
- [ ] Add predictive quality scoring for thumbnails/icons

## P3 - Multimodal and media expansion
- [ ] Add short motion graphics generation for social teasers
- [ ] Add lightweight animated app preview videos
- [ ] Add GIF previews for Product Hunt gallery
- [ ] Add template-driven video storyboards
- [ ] Add auto-caption overlays for promo clips

## P3 - Internationalization and localization
- [ ] Add multilingual UI for the Sleek editor
- [ ] Add locale-specific marketing copy tone presets
- [ ] Add right-to-left layout adaptation for generated assets
- [ ] Add region-specific screenshot packs with translated text
- [ ] Add localized date/number/currency formatting in mock data

## P3 - Enterprise readiness
- [ ] Add SSO and SCIM provisioning support
- [ ] Add team workspace hierarchy and permissions
- [ ] Add audit export for compliance teams
- [ ] Add data residency options and controls
- [ ] Add managed retention policies by workspace
- [ ] Add private model routing options for enterprise users

## Engineering Backlog - Refactor and maintainability
- [ ] Split huge prompt strings into versioned files by mode
- [ ] Add prompt regression tests
- [ ] Introduce domain services layer for generation pipelines
- [ ] Add queue worker layer for async jobs
- [ ] Add retry + dead-letter queue strategy
- [ ] Add typed event bus for stream events
- [ ] Add migration scripts with rollbacks
- [ ] Add repository pattern for DB operations
- [ ] Add test fixtures for message/page/project factories
- [ ] Add local dev seed scripts for sample projects
- [ ] Add smoke tests for every export mode

## Design QA checklist backlog
- [ ] Add spacing rhythm validator
- [ ] Add typography hierarchy validator
- [ ] Add color harmony validator
- [ ] Add contrast checker for WCAG AA baseline
- [ ] Add component alignment checker
- [ ] Add consistency checker across multi-screen mobile flows
- [ ] Add screenshot narrative coherence checker
- [ ] Add thumbnail attention map estimate checker

## Launch and growth operations
- [ ] Create public roadmap page
- [ ] Create changelog page with feature tags
- [ ] Create template of the week campaign
- [ ] Create creator affiliate launch kit
- [ ] Create customer showcase gallery
- [ ] Create onboarding drip for new users
- [ ] Create retention campaign for inactive users
- [ ] Create NPS + feature request feedback loop

## Immediate next sprint candidates (top picks)
- [ ] `Sprint` Lock Tailwind to 3.4 and stabilize core editor
- [ ] `Sprint` Add strict API validation + ownership checks
- [ ] `Sprint` Add mobile app generation mode v1 (5 core screens)
- [ ] `Sprint` Add app store screenshot generator v1 (iOS + Android packs)
- [ ] `Sprint` Add Product Hunt image set generator v1
- [ ] `Sprint` Add app icon pack generator v1
- [ ] `Sprint` Add thumbnail generator v1 with A/B variants
- [ ] `Sprint` Add export zip bundles and naming conventions

## Nice-to-have backlog
- [ ] Gamified quality score badges for generated assets
- [ ] Community prompt challenges and leaderboards
- [ ] Public template marketplace with creator profiles
- [ ] One-click recreate from trending design references
- [ ] AI naming assistant for projects and campaigns
- [ ] Auto-generate launch checklist from selected channels
