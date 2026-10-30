# xlPro Financial Modelling

React/TypeScript prototype for universal corporate financial modelling, scenario forecasting and equity valuation.

## Project status

The revised application source is prepared but has not yet been imported into this repository. This repository is initialized for source import.

## Import the revised application

Download the revised source archive from the ChatGPT conversation, extract it, then from inside the extracted `xlpro-work` folder run:

```bash
git init
git branch -M main
git remote add origin https://github.com/enterpriseparoll/xlpro-financial-modelling.git
git add .
git commit -m "Import xlPro Financial Modelling React application"
git push -u origin main
```

If the repository already has this README commit, run `git pull origin main --allow-unrelated-histories` before pushing and resolve any README conflict.

## Running the application

Requires Node 20.19+ or 22.12+:

```bash
npm install
npm run dev
npm run lint
npm run build
```

The app currently uses illustrative financial data. Its financial calculations have not been independently validated, and it does not yet have production authentication or tenant isolation.
