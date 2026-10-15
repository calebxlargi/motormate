# MotorMate

React + Vite marketing website, with GSAP scroll animation and an interactive six-step buying journey.

## Local development

npm install
npm run dev

## Cloudflare Pages

Connect this repository and use:
- Framework preset: Vite
- Build command: npm run build
- Build output directory: dist
- Root directory: leave blank
- Node.js: 22 or newer

Or run `npm run build` and upload the `dist` directory using Cloudflare Pages Direct Upload.

## Content and contact

Content is based on the supplied dealer pitch and buying-journey infographic. No unconfirmed partner names or invented testimonials are included. The contact form prepares an enquiry that visitors can copy or download; it does not submit or store data. Connect an approved contact destination before using it to collect live leads.

The site uses the supplied MotorMate SVGs, Google Fonts, and the supplied BYD Sealion 7 photograph at `public/assets/bs7_exterior4.jpg`. The photograph is included locally so it will be uploaded alongside the source to GitHub. Reduced-motion preferences disable decorative animations. No runtime backend or environment variables are required.

## Personalised enquiry forms

The customer enquiry uses four steps: contact details, car preferences, budget and timeline, and financing/insurance/trade-in details. Dealer enquiries stay within the dealer partnership section. Both forms remain browser-local and produce copyable/downloadable text; an actual sending destination still needs to be connected.

The budget supports RM30,000 upward in RM10,000 increments, direct entry beyond the slider range, and a No upper limit option. Timeline choices span two weeks to six months. Changing the make resets the model; choosing No for trade-in omits all previous trade-in answers from the final enquiry.

`src/car-catalog.json` is a dated snapshot researched from https://www.carbase.my/car-brands-malaysia/ and its individual brand pages on 15 October 2026. The initial 30 popular-brand choices were informed by https://www.bitauto.my/en/brand-sales-ranking/2025/ and extended with the wider CarBase directory. Tesla and Mercedes-Benz are excluded. Brand choices indicate preferences, not confirmed representation or stock. The directory has incomplete entries for some niche brands, and may lag manufacturer changes; Other model / Other brand inputs cover gaps. Historical entries are included for trade-in selection. Review this catalogue before launch and periodically thereafter.
