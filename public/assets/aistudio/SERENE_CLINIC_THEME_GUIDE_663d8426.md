# Serene Clinic Theme System Guide
### Soft Blue · White · Charcoal — Calm, Premium, Clinical UI

---

## Visual Identity Summary

This design system is based on the attached modern dental-clinic interface. It should feel:

- calm and reassuring
- clinically clean without looking cold
- premium but not luxurious or decorative
- spacious, precise, and easy to trust
- editorial in the hero area and minimal everywhere else

The visual language uses five anchors:

- **Soft clinical blue** — primary actions, highlighted words, icons, and active states
- **Pure white** — page canvas, cards, navigation, and large breathing areas
- **Cool mist gray** — secondary surfaces, input backgrounds, and subtle section separation
- **Deep charcoal** — headlines and primary text
- **Fine cool-gray borders** — structure without visual heaviness

The interface must never feel crowded, overly colorful, playful, glossy, or dashboard-heavy.

---

## Core Design Principles

1. **Whitespace is a functional element.** Use generous padding and wide gaps.
2. **One soft blue accent only.** Do not introduce additional brand colors.
3. **Hero headlines use an editorial serif.** All navigation, labels, buttons, and body copy use a clean sans-serif.
4. **Photography carries visual richness.** UI surfaces remain quiet and restrained.
5. **Borders are lighter than text.** Shadows are barely visible.
6. **Corners are controlled.** Use small-to-medium radii; avoid exaggerated pill-shaped cards.
7. **Actions are clear but calm.** Primary buttons use muted blue rather than bright saturated blue.
8. **Icons are thin-line and minimal.** Avoid filled, cartoon-like, or multicolored icons.

---

## Color Token Definitions

Paste these into the `:root` block in `index.css`:

```css
:root {
  /* ── Page and surfaces ───────────────────────── */
  --background:            210 25% 98%;
  --foreground:            220 18% 14%;

  --card:                  0 0% 100%;
  --card-foreground:       220 18% 14%;

  --popover:               0 0% 100%;
  --popover-foreground:    220 18% 14%;

  --muted:                 205 24% 96%;
  --muted-foreground:      215 11% 48%;

  /* ── Brand ───────────────────────────────────── */
  --primary:               202 29% 57%;
  --primary-foreground:    0 0% 100%;

  --primary-soft:          202 38% 93%;
  --primary-soft-foreground: 202 34% 39%;

  --secondary:             205 22% 95%;
  --secondary-foreground:  220 16% 21%;

  --accent:                202 29% 57%;
  --accent-foreground:     0 0% 100%;

  /* ── Structure ───────────────────────────────── */
  --border:                210 20% 90%;
  --input:                 210 20% 90%;
  --ring:                  202 29% 57%;

  /* ── Semantic ────────────────────────────────── */
  --success:               151 40% 42%;
  --success-foreground:    0 0% 100%;

  --warning:               38 78% 52%;
  --warning-foreground:    220 18% 14%;

  --destructive:           2 64% 50%;
  --destructive-foreground:0 0% 100%;

  /* ── Radius ──────────────────────────────────── */
  --radius-sm:             0.25rem;
  --radius:                0.5rem;
  --radius-lg:             0.75rem;

  /* ── Shadows ─────────────────────────────────── */
  --shadow-xs: 0 1px 2px hsl(220 18% 14% / 0.03);
  --shadow-sm: 0 2px 8px hsl(220 18% 14% / 0.05);
  --shadow-md: 0 8px 24px hsl(220 18% 14% / 0.07);
  --shadow-image: 0 18px 45px hsl(220 18% 14% / 0.10);

  /* ── Layout ──────────────────────────────────── */
  --content-max: 1200px;
  --header-height: 76px;
}
```

### Approximate Hex Reference

| Token | Hex family | Use |
|---|---:|---|
| Primary | `#789CB3` | buttons, highlighted words, icons |
| Primary soft | `#EAF2F6` | icon circles, soft badges, active tint |
| Background | `#F9FBFC` | page canvas |
| Card | `#FFFFFF` | header, cards, feature panels |
| Foreground | `#1D232B` | headings and primary text |
| Muted text | `#6C7680` | supporting copy and metadata |
| Border | `#E3E9ED` | dividers, inputs, card outlines |

The hex values are visual references only. Components must use semantic tokens.

---

## Tailwind Theme Mapping

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
          'soft-foreground': 'hsl(var(--primary-soft-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      maxWidth: {
        content: 'var(--content-max)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        image: 'var(--shadow-image)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
      },
    },
  },
};
```

---

## Typography System

### Font Pairing

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap');

:root {
  --font-sans: 'DM Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Playfair Display', Georgia, serif;
}

body {
  font-family: var(--font-sans);
  font-weight: 400;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  -webkit-font-smoothing: antialiased;
}

h1,
.display-heading {
  font-family: var(--font-serif);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 0.98;
}

h2,
h3,
h4 {
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
```

### Type Scale

| Role | Desktop | Mobile | Weight | Font |
|---|---:|---:|---:|---|
| Hero display | `text-6xl` | `text-4xl` | 500 | Serif |
| Large section heading | `text-4xl` | `text-3xl` | 600 | Sans |
| Standard section heading | `text-3xl` | `text-2xl` | 600 | Sans |
| Card heading | `text-base` | `text-base` | 600 | Sans |
| Body copy | `text-base` | `text-sm` | 400 | Sans |
| Navigation | `text-xs` | `text-sm` | 600 | Sans |
| Eyebrow | `text-xs` | `text-xs` | 600 | Sans |
| Helper text | `text-sm` | `text-xs` | 400 | Sans |
| Button label | `text-xs` | `text-xs` | 600 | Sans |

### Signature Typography Pattern

```tsx
<div className="space-y-5">
  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
    Healthy Smile
  </p>

  <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium leading-[0.98] tracking-[-0.035em] text-foreground">
    Your Smile.
    <br />
    <span className="text-primary">Our Priority.</span>
  </h1>

  <p className="max-w-md text-base leading-7 text-muted-foreground">
    Modern care presented with clarity, comfort, and confidence.
  </p>
</div>
```

---

## Spacing and Layout Rules

### Global Container

```tsx
<div className="mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12">
  {children}
</div>
```

### Section Spacing

```tsx
<section className="py-16 sm:py-20 lg:py-28">
  {/* content */}
</section>
```

### Layout Rhythm

Use this spacing hierarchy consistently:

```txt
4px   — icon/internal micro spacing
8px   — label-to-value spacing
12px  — compact component spacing
16px  — card internal groups
24px  — standard card padding
32px  — component groups
48px  — column or section group spacing
64px+ — major page section separation
```

### Width Rules

- Body paragraphs should normally stay between `max-w-md` and `max-w-2xl`.
- Hero text should not exceed `max-w-xl`.
- Navigation should remain visually light and should not wrap on desktop.
- Primary content uses a centered maximum width of approximately `1200px`.
- Full-width bands may extend edge-to-edge, but their content remains inside the global container.

---

## Header and Navigation Recipe

```tsx
<header className="sticky top-0 z-50 border-b border-border/70 bg-card/95 backdrop-blur-sm">
  <div className="mx-auto flex h-[76px] max-w-content items-center justify-between px-5 sm:px-8 lg:px-12">
    <a href="/" className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft">
        <Tooth className="h-5 w-5 stroke-[1.6] text-primary" />
      </div>
      <div className="leading-none">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
          Brand Name
        </p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Professional Service
        </p>
      </div>
    </a>

    <nav className="hidden items-center gap-8 lg:flex">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="relative text-xs font-semibold uppercase tracking-[0.08em] text-foreground/75 transition-colors hover:text-primary"
        >
          {item.label}
        </a>
      ))}
    </nav>

    <Button className="hidden rounded-md bg-primary px-5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-none hover:bg-primary/90 sm:inline-flex">
      Book Appointment
    </Button>
  </div>
</header>
```

### Navigation Rules

- Header background is always white or translucent white.
- Navigation text is small, uppercase, and letter-spaced.
- Active navigation uses a short thin underline or `text-primary`.
- Do not use a dark header in this theme.
- Do not use oversized logos.
- Do not add heavy shadows below the header.

---

## Hero Section Recipe

```tsx
<section className="bg-card">
  <div className="mx-auto grid min-h-[610px] max-w-content grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
    <div className="flex items-center px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="max-w-xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Healthy Smile
        </p>

        <h1 className="font-serif text-4xl font-medium leading-[0.98] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
          Your Smile.
          <br />
          <span className="text-primary">Our Priority.</span>
        </h1>

        <p className="mt-7 max-w-md text-sm leading-7 text-muted-foreground sm:text-base">
          Modern care for the whole family. Comfortable, gentle, and effective.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="h-11 rounded-md bg-primary px-6 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-none hover:bg-primary/90">
            Book Appointment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            className="h-11 justify-start rounded-md px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-primary-soft hover:text-primary"
          >
            Our Services
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <div className="relative min-h-[420px] overflow-hidden lg:min-h-full">
      <img
        src={heroImage}
        alt="Bright, modern clinic interior"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-card/10 to-transparent" />
    </div>
  </div>
</section>
```

### Hero Rules

- Desktop hero is a two-column split: text left, image right.
- The image should occupy approximately 52–58% of the width.
- The image must be bright, naturally lit, neutral, and uncluttered.
- Use one serif headline with one blue line or phrase.
- Keep the body copy short.
- Use no more than two actions.
- Do not overlay large text directly on busy photography.
- On mobile, stack text above image.

---

## Feature Assurance Strip

```tsx
<section className="border-y border-border bg-card">
  <div className="mx-auto grid max-w-content grid-cols-1 divide-y divide-border px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-8 lg:grid-cols-4 lg:px-12">
    {features.map((feature) => (
      <div key={feature.title} className="flex items-start gap-4 px-0 py-6 sm:px-6 lg:px-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <feature.icon className="h-5 w-5 stroke-[1.5] text-primary" />
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
            {feature.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {feature.description}
          </p>
        </div>
      </div>
    ))}
  </div>
</section>
```

### Feature Strip Rules

- Use 3–4 equal-width feature items.
- Separate items with thin borders, not cards with large gaps.
- Use circular `bg-primary-soft` icon containers.
- Feature titles are uppercase and compact.
- Descriptions should be no more than two short lines.

---

## Standard Content Section

```tsx
<section className="bg-background py-20 lg:py-28">
  <div className="mx-auto grid max-w-content gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        About the Practice
      </p>

      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.025em] text-foreground sm:text-4xl">
        Thoughtful care in a calm environment.
      </h2>

      <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
        Supporting copy should be clear, concise, and focused on comfort, expertise, and outcomes.
      </p>
    </div>

    <div className="overflow-hidden rounded-lg bg-card shadow-image">
      <img
        src={sectionImage}
        alt="Professional clinical environment"
        className="aspect-[4/3] h-full w-full object-cover"
      />
    </div>
  </div>
</section>
```

---

## Service Card Recipe

```tsx
<article className="group rounded-lg border border-border bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-soft">
    <Stethoscope className="h-5 w-5 stroke-[1.5] text-primary" />
  </div>

  <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-foreground">
    Service Name
  </h3>

  <p className="mt-3 text-sm leading-6 text-muted-foreground">
    Brief service description written in plain, reassuring language.
  </p>

  <a
    href="#"
    className="mt-6 inline-flex items-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground transition-colors group-hover:text-primary"
  >
    Learn More
    <ArrowRight className="ml-2 h-4 w-4" />
  </a>
</article>
```

### Card Rules

- Cards use a white surface, thin border, and minimal shadow.
- Default card radius is `rounded-lg`, not `rounded-2xl` or `rounded-3xl`.
- Use one icon, one heading, one short paragraph, and one optional action.
- Hover states should be subtle.
- Do not use saturated backgrounds for standard cards.

---

## Appointment CTA Recipe

```tsx
<section className="bg-primary">
  <div className="mx-auto flex max-w-content flex-col gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/75">
        Ready When You Are
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-primary-foreground">
        Schedule your next appointment.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80">
        Keep CTA copy short, direct, and reassuring.
      </p>
    </div>

    <Button className="h-11 shrink-0 rounded-md bg-card px-6 text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:bg-card/90">
      Book Appointment
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </div>
</section>
```

### CTA Rules

- Use a single full-width primary-blue band.
- White text only on the blue CTA surface.
- Use a white action button with blue text.
- Do not add gradients, glass effects, glowing shadows, or decorative blobs.

---

## Button System

### Primary Button

```tsx
<Button className="h-11 rounded-md bg-primary px-6 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-none hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Primary Action
</Button>
```

### Secondary Outline Button

```tsx
<Button
  variant="outline"
  className="h-11 rounded-md border-border bg-card px-6 text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary"
>
  Secondary Action
</Button>
```

### Quiet Text Action

```tsx
<Button
  variant="ghost"
  className="h-10 rounded-md px-3 text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-primary-soft hover:text-primary"
>
  View Details
  <ArrowRight className="ml-2 h-4 w-4" />
</Button>
```

### Button Rules

- Buttons use compact uppercase labels.
- Primary buttons use `bg-primary` only.
- Button corners use `rounded-md`.
- Never use pill buttons unless the component is specifically a status badge.
- Do not use gradients or strong drop shadows.
- Keep icon size between `14px` and `16px` inside buttons.

---

## Form and Input Recipe

```tsx
<div className="space-y-2">
  <Label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
    Full Name
  </Label>

  <Input
    className="h-11 rounded-md border-border bg-card px-4 text-sm text-foreground shadow-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/20"
    placeholder="Enter your full name"
  />
</div>
```

### Form Rules

- Inputs are white on a mist-gray page or mist-gray on a white card.
- Labels are small, clear, and placed above inputs.
- Use thin borders and a soft blue focus ring.
- Validation messages appear below the field in `text-xs`.
- Do not use floating labels.
- Do not place icons in every input unless they add real meaning.

---

## Badge and Status Recipe

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
  <CheckCircle2 className="h-3.5 w-3.5" />
  Available Today
</span>
```

Badges are the only components that should normally use `rounded-full`.

---

## Image Direction

Use imagery with the following characteristics:

```txt
✓ naturally bright interiors
✓ white, ivory, soft gray, glass, and pale wood environments
✓ soft daylight and balanced exposure
✓ professional equipment presented neatly
✓ calm human expressions and natural interaction
✓ clean negative space
✓ realistic photography
✓ neutral wardrobe and subtle blue accents
```

Avoid:

```txt
✗ dark moody photography
✗ harsh cyan or electric-blue lighting
✗ heavy medical stock-photo clichés
✗ exaggerated smiles or staged poses
✗ busy backgrounds
✗ oversaturated colors
✗ glossy 3D renders when photography is expected
✗ low-quality AI-generated clinical details
```

---

## Icon Direction

Use Lucide, Heroicons Outline, or another consistent thin-line icon library.

```txt
Icon stroke width: 1.5–1.75
Standard icon size: 18–20px
Feature icon size: 20px
Button icon size: 14–16px
Icon color: text-primary or text-muted-foreground
Icon container: bg-primary-soft
```

Never mix filled icons with outline icons on the same page.

---

## Table Recipe

```tsx
<div className="overflow-hidden rounded-lg border border-border bg-card">
  <table className="w-full text-left">
    <thead className="bg-muted">
      <tr className="border-b border-border">
        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Name
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="transition-colors hover:bg-muted/60">
        <td className="px-5 py-4 text-sm text-foreground">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Table Rules

- Use thin horizontal dividers.
- Table headers use a very light muted background.
- Avoid boxed cells and heavy gridlines.
- Keep row height comfortable.
- Use blue only for links, selected rows, or primary status emphasis.

---

## Responsive Behavior

### Desktop

- Use a centered maximum-width layout.
- Hero uses two columns with image on the right.
- Navigation remains inline.
- Feature strip shows four columns.
- Service sections may use three columns.

### Tablet

- Reduce horizontal padding to `32px`.
- Keep hero split only when text remains readable.
- Feature strip uses two columns.
- Navigation may collapse to a menu trigger.

### Mobile

- Stack all major two-column layouts.
- Place hero text first and image second.
- Use `px-5` page padding.
- Use full-width primary buttons when appropriate.
- Feature strip becomes one column with horizontal dividers.
- Keep the hero headline between `text-4xl` and `text-5xl`.
- Maintain at least `44px` touch targets.

---

## Animation and Interaction

Use motion sparingly:

```txt
Standard duration: 150–220ms
Standard easing: ease-out
Hover lift: maximum -2px
Scale effects: maximum 1.01
Image zoom: maximum 1.03
```

Allowed interactions:

- slight button background shift
- subtle card lift
- soft border-color transition
- gentle image scale on hover
- simple fade and translate reveal

Do not use:

- bouncing
- glowing
- rotating icons
- elastic transitions
- dramatic parallax
- animated gradients
- excessive scroll effects

---

## Accessibility Requirements

```txt
✓ Maintain WCAG AA contrast for all body text and controls
✓ Keep body text at 14px minimum, preferably 16px
✓ Use visible focus states with ring-ring
✓ Do not communicate state through color alone
✓ Provide descriptive alt text for meaningful images
✓ Use semantic heading order
✓ Keep touch targets at least 44×44px
✓ Preserve keyboard navigation in menus, dialogs, and forms
✓ Respect prefers-reduced-motion
```

---

## ✅ DO

```txt
✅ Use white and soft cool-gray surfaces generously
✅ Use one muted clinical-blue primary color throughout
✅ Use serif typography only for hero-level editorial headlines
✅ Use sans-serif typography for navigation, buttons, forms, and body text
✅ Pair dark charcoal text with one blue highlighted phrase
✅ Use thin borders and nearly invisible shadows
✅ Use bright, neutral, realistic photography
✅ Use small uppercase labels with generous letter spacing
✅ Keep cards compact, clear, and lightly bordered
✅ Use circular soft-blue icon containers in assurance strips
✅ Keep button labels concise and action-oriented
✅ Use semantic Tailwind tokens instead of raw color utilities
✅ Preserve generous spacing between content groups
```

---

## ❌ DON'T

```txt
❌ Never hardcode colors such as bg-blue-500, text-gray-900, or #789CB3
❌ Never introduce purple, teal, red, orange, or neon accent colors
❌ Never use a dark navigation bar in this theme
❌ Never use large rounded-3xl cards throughout the interface
❌ Never use heavy box shadows or glowing buttons
❌ Never use gradients on standard cards or buttons
❌ Never overcrowd the hero with badges, statistics, and multiple CTAs
❌ Never use more than two font families
❌ Never use serif typography for long body text, forms, or navigation
❌ Never use saturated medical-blue backgrounds across the whole page
❌ Never place long paragraphs inside feature cards
❌ Never mix outline and filled icon styles
❌ Never use stock photography with harsh lighting or unnatural expressions
❌ Never make every section look like a separate floating card
```

---

## LLM Implementation Instructions

Use the following block as the system instruction for any coding agent or LLM implementing this theme:

```txt
You are building a production-ready interface using the Serene Clinic design system.

VISUAL INTENT
Create a calm, premium, clinically clean interface inspired by a modern dental-clinic website. The page must feel bright, spacious, trustworthy, and editorial without becoming decorative.

NON-NEGOTIABLE THEME RULES

1. COLOR TOKENS ONLY
Never hardcode colors in JSX, TSX, CSS modules, or Tailwind classes.
Use only semantic tokens:

bg-background
bg-card
bg-muted
bg-primary
bg-primary-soft
text-foreground
text-muted-foreground
text-primary
text-primary-foreground
border-border
ring-ring

Do not use raw classes such as bg-blue-500, text-gray-900, border-slate-200, or arbitrary hex values.

2. COLOR PALETTE
Use one muted clinical-blue primary color with white, cool mist gray, charcoal text, and fine cool-gray borders.
Do not add secondary brand colors.

3. TYPOGRAPHY
Use Playfair Display or an equivalent high-contrast serif only for the main hero display headline.
Use DM Sans, Inter, or an equivalent clean sans-serif for everything else.
Hero headings are medium weight, tightly tracked, and compact in line height.
Section headings are sans-serif, semibold, and slightly tightly tracked.
Eyebrow labels and navigation are small, uppercase, and letter-spaced.

4. HERO COMPOSITION
Desktop hero must use a split layout:
- text on the left
- bright professional image on the right
- approximately 42–48% text and 52–58% image
- short eyebrow label
- serif headline with one blue phrase
- short supporting paragraph
- no more than two actions

On mobile, stack text above image.

5. HEADER
Use a white or translucent-white header with a thin bottom border.
Navigation must be compact, uppercase, and widely spaced.
Use a small primary-blue appointment button.
Never use a dark header.

6. BUTTONS
Primary button:
bg-primary text-primary-foreground rounded-md shadow-none

Secondary button:
border border-border bg-card text-foreground rounded-md
hover:border-primary hover:bg-primary-soft hover:text-primary

Do not use gradients, pills, large shadows, or highly saturated colors.

7. CARDS
Every standard card must use:
bg-card border border-border rounded-lg shadow-xs

Hover states may use:
hover:border-primary/35 hover:shadow-sm hover:-translate-y-0.5

Do not use rounded-2xl or rounded-3xl unless a specific visual requirement justifies it.

8. ICONS
Use one consistent outline icon library.
Use stroke width around 1.5–1.75.
Place important icons inside bg-primary-soft containers with text-primary icons.
Do not mix filled and outline icon sets.

9. FEATURE STRIP
For trust, benefit, or assurance items, use an edge-to-edge white strip with thin dividers.
Each item contains:
- soft-blue circular icon container
- compact uppercase title
- one or two lines of muted helper text

Do not turn each feature into a large floating card.

10. IMAGERY
Use bright, naturally lit, realistic professional imagery.
Prefer white, ivory, pale gray, glass, and subtle pale-blue environments.
Avoid dark scenes, saturated lighting, clutter, or visibly artificial medical details.

11. SPACING
Use generous whitespace.
Standard section padding:
py-16 sm:py-20 lg:py-28

Standard container:
mx-auto w-full max-w-content px-5 sm:px-8 lg:px-12

Do not compress content to fit more above the fold.

12. SHADOWS AND BORDERS
Borders create structure; shadows create only slight separation.
Use border-border for dividers and outlines.
Use shadow-xs or shadow-sm for cards.
Use shadow-image only for large photography or image panels.
Never use strong or colored shadows.

13. RESPONSIVENESS
Ensure every layout works at 320px width and above.
Use 44px minimum touch targets.
Collapse navigation cleanly on mobile.
Stack all split sections.
Allow buttons to become full-width when needed.

14. ACCESSIBILITY
Maintain WCAG AA contrast.
Use semantic HTML.
Provide keyboard focus states.
Use alt text.
Respect reduced motion.
Do not rely on color alone for meaning.

15. OUTPUT QUALITY
Produce clean, reusable, typed React components.
Use TypeScript.
Use semantic component names.
Avoid duplicated class strings when a reusable variant is appropriate.
Do not alter the theme with personal design preferences.
Do not introduce visual elements not supported by this guide.
```

---

## Compact Agent Prompt

```txt
Build this page in the Serene Clinic visual system.

Theme:
- soft muted clinical blue
- pure white cards and header
- cool mist-gray canvas
- deep charcoal typography
- thin cool-gray borders
- nearly invisible shadows

Typography:
- editorial serif only for the hero headline
- clean sans-serif everywhere else
- small uppercase letter-spaced labels and navigation

Required patterns:
- desktop split hero with text left and bright image right
- one blue phrase in the hero headline
- compact blue primary CTA
- quiet secondary action
- white feature strip with thin vertical dividers
- soft-blue circular outline-icon containers
- spacious sections and narrow body-copy widths

Use semantic theme tokens only. Never hardcode colors. Avoid gradients, dark headers, large pills, saturated blues, heavy shadows, oversized cards, and decorative clutter.
```

---

## Quick Reference Cheat Sheet

| Element | Required classes | Never use |
|---|---|---|
| Page canvas | `bg-background text-foreground` | `bg-gray-50` |
| Header | `bg-card border-b border-border` | dark header |
| Hero heading | serif + `text-foreground` | sans-only hero |
| Highlighted phrase | `text-primary` | raw blue class |
| Eyebrow | `text-xs uppercase tracking-[0.22em] text-primary` | large badge |
| Primary button | `bg-primary text-primary-foreground rounded-md shadow-none` | gradient or pill |
| Secondary button | `border-border bg-card text-foreground` | filled gray button |
| Standard card | `bg-card border border-border rounded-lg shadow-xs` | `rounded-3xl shadow-xl` |
| Soft icon background | `bg-primary-soft` | `bg-blue-100` |
| Icon color | `text-primary` | multicolor icons |
| Section background | `bg-background` or `bg-card` | saturated blue section |
| Feature strip | `bg-card border-y border-border divide-border` | floating card grid |
| Body copy | `text-muted-foreground leading-7` | pure black paragraph |
| Input | `border-border bg-card focus:ring-ring` | heavy inset shadow |
| Badge | `rounded-full bg-primary-soft text-primary-soft-foreground` | large capsule button |
| Photography | bright, neutral, realistic | dark, busy, oversaturated |

---

## Final Visual Check

Before considering a page complete, verify:

```txt
[ ] The page uses only one blue accent color.
[ ] The header is white and visually light.
[ ] The hero uses serif typography and a split layout.
[ ] One hero phrase is highlighted in blue.
[ ] The hero contains no more than two actions.
[ ] Cards use thin borders and very light shadows.
[ ] Spacing feels generous rather than compressed.
[ ] Feature icons use soft-blue circular containers.
[ ] Photography is bright, clean, and realistic.
[ ] No raw Tailwind color utilities or hex values appear in components.
[ ] No gradients, glowing shadows, or oversized pill controls appear.
[ ] Mobile layouts stack cleanly and remain easy to tap.
[ ] Focus states, alt text, and semantic headings are present.
```
