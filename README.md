# Typhoon Eye · Waterspouts (台风眼 · 龙吸水)

A real-time WebGL scene of waterspouts over a storm sea inside a typhoon eye, built with three.js.

**Live:** https://koutian.is-a.dev/typhoon-eye/

- The eyewall, eye clouds and the spinning clouds the waterspouts hang from are volumetric raymarched clouds, accumulated over frames to remove noise.
- The sea is a sum of Gerstner waves from several swell directions, with foam where crests fold.
- The waterspouts are raymarched volumes with a twisting funnel and a spray sheath at the sea surface.

Drag to look around, scroll to zoom. The panel controls time of day, sun direction, wind, storm spin, number of waterspouts, low clouds, lightning and ship sway. Any setting can go in the URL, e.g. `?timeOfDay=0.95&sunAzimuth=-60&spouts=1&hideControls`.

The interface is in English by default. Switch to Chinese from the Language menu in the panel, or with `?lang=zh`; the choice is remembered.

The loading screen asks whether to play with sound: directional waterspout roars, wind lulls, hull impacts, creaking metal, and delayed thunder tied to lightning. The choice can be made while the scene is still loading. Mute and volume sit at the top right above the scene controls; preferences are remembered. Audio pauses while the tab is hidden. All sounds are synthesized locally with Web Audio, with no audio downloads or extra dependencies.

## Run locally

```sh
npm install
npm run dev
```

Reference photos and their licenses are listed in [refs/SOURCES.md](refs/SOURCES.md).
