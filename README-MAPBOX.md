# Mapbox Navigation SDK setup

Turn-by-turn navigation in this app is powered by the real
[Mapbox Navigation SDK v3](https://docs.mapbox.com/navigation/), wrapped by
[`@badatgil/expo-mapbox-navigation`](https://www.npmjs.com/package/@badatgil/expo-mapbox-navigation)
(formerly `@youssefhenna/expo-mapbox-navigation`). This gives us lane guidance,
speed-limit signs, junction views, traffic-aware rerouting, and voice — all
native, no custom UI to maintain.

## One-time setup

### 1. Create a Mapbox account and two tokens

Go to <https://account.mapbox.com/> and sign up (free tier: 1k MAU).

Create **two separate tokens**:

| Token | Prefix | Used for | Scopes to enable |
|-------|--------|----------|-------------------|
| **Public access token** | `pk.*` | Runtime (JS bundle) | `styles:read`, `fonts:read`, `datasets:read`, `tilesets:read`, `navigation:*` |
| **Secret SDK download token** | `sk.*` | Native build time (CocoaPods + Gradle download the paid SDK) | `DOWNLOADS:READ` (this scope only appears on secret tokens) |

The public one is safe to ship in the bundle. The secret one must never be
committed — it authorises downloading Mapbox's binary SDKs at build time.

### 2. Put them in a local `.env` file

Copy `.env.example` to `.env.local` (already git-ignored):

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx
MAPBOX_DOWNLOADS_TOKEN=sk.xxxxxxxxxxxxxxxxxxxxxxxx
```

`app.config.js` reads both automatically.

### 3. Install the JS packages

```bash
npm install
```

This pulls in:
- `@badatgil/expo-mapbox-navigation` — the wrapper
- `@rnmapbox/maps@^10.3.0` — required peer dep (RN wrapper; the *native*
  Mapbox Maps SDK is pinned to `11.11.0` via the plugin config)
- `expo-build-properties` — to flip iOS to static frameworks

### 4. Regenerate native projects

The SDK is a native module — it can't be hot-reloaded. After adding it (or
after changing tokens), run a clean prebuild:

```bash
npx expo prebuild --clean
```

### 5. Build and run on a device

```bash
# iOS (simulator OR device)
npx expo run:ios

# Android (device recommended — emulator GPS is frozen)
npx expo run:android
```

First build takes ~10–15 min (Mapbox SDK + Navigation SDK pods/aars are large).

## For EAS / CI builds

Upload both tokens as EAS secrets so the build servers can read them:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN --value pk.xxxxx
eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value sk.xxxxx
```

They're injected as env vars during build and consumed by `app.config.js`.

## Testing notes

- **iOS Simulator**: GPS is frozen by default — use Xcode's *Debug → Simulate
  Location → City Run* to get movement, or test on a real device.
- **Android Emulator**: same story — use the location controls in the emulator
  toolbar.
- **Demo mode** (`/navigate/demo`) uses a Nice → Cannes route. On a real
  device it will start from your actual GPS, not Nice, so the SDK will compute
  its own route.

## What changed

| Before (custom stack) | After (Mapbox SDK) |
|-----------------------|--------------------|
| Hand-rolled `NavigationView` with 3D-car arrow, `InstructionBar`, `NavigationFooter` | Native `<MapboxNavigationView />` with full pre-built UI |
| Voice via `expo-speech` + announcement scheduler | SDK-native voice, French localised, user-mutable |
| Off-route detection + manual Mapbox/OSRM re-fetch | Traffic-aware rerouting inside the SDK |
| Simulator fake GPS feeder | Real GPS; simulator uses Xcode's simulate-location |
| OpenFreeMap tiles for the drive | Mapbox's own streets style (dark/light) |

The MapLibre route **preview** (before you tap Start) is unchanged — we still
use free tiles there so we don't pay a Mapbox MAU for users who never enter
navigation mode.

## Troubleshooting

- **"Token Mapbox manquant" screen on Start**: `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
  isn't in the env. Restart Metro with `npx expo start --clear` after editing
  `.env.local`.
- **iOS build fails with "No such module 'MapboxNavigation'"**: forgot
  `npx expo prebuild --clean` after installing the package.
- **Android build fails with `401 Unauthorized` on aar download**: the secret
  `MAPBOX_DOWNLOADS_TOKEN` is missing or doesn't have the `DOWNLOADS:READ`
  scope.
- **Cost concerns**: at >200 trips/MAU, unlimited-trip MAU pricing is cheaper
  than metered. For a driver doing 5-20 trips/day, budget ~$0.20–$0.50/MAU.
