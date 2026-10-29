# Commute Compare

[中文](README.md) · [Project index](https://github.com/AndyZhang666666/AndyZhang666666/blob/main/PROJECTS.en.md) · [Live demo](https://andyzhang666666.github.io/commute-compare/)

Does the route with a lower average duration let you leave later?

![Actual Commute Compare interface](https://andyzhang666666.github.io/assets/work/showcase/commute-crop.jpg)

## Product decisions

- Compare duration distributions, cost and tail risk together.
- Label estimates separately from personal observations and expose sparse samples.
- Preview threshold changes before committing; adding a route must not change another route’s samples.

## Walkthrough

1. Start with typical duration estimates or paste personal door-to-door records.
2. Compare cost, time and lateness risk alongside each route’s data source.
3. Preview and confirm a departure threshold, then export its assumptions.

## Run mode and limits

Browser calculations without maps or live traffic. Personal records use empirical resampling; estimated routes use explicit distribution assumptions. Neither guarantees future punctuality.

## Develop locally

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/commute-compare/`. The repository base path is part of the URL.

## Lightweight checks

```sh
npm run check
npm run build
```

These commands are provided for reproduction; this documentation update did not run a new model benchmark.

## Documentation

- [Product scope](docs/PRD.md)
- [Validation records](docs/VALIDATION.md)
- [Implementation details and original records, Chinese](README.md)

Use the repository’s existing licence and notices. This update does not change usage rights.
