# Model files

These are **not** committed — around 20 MB of binary weights that belong in
release assets or Git LFS, not in source control.

Until they are present, `isMediaPipeAvailable()` returns false and the app falls
back to the built-in pixel analyser in `src/services/ai/subjectDetection.service.ts`.
Everything works; measurements are just coarser.

## What to download

| File | Destination | Size | Licence |
|---|---|---|---|
| `face_landmarker.task` | `public/models/mediapipe/` | ~3 MB | Apache-2.0 |
| `hand_landmarker.task` | `public/models/mediapipe/` | ~7 MB | Apache-2.0 |
| tasks-vision `wasm/` | `public/models/mediapipe/wasm/` | ~5 MB | Apache-2.0 |

### Face landmarker

```bash
curl -o public/models/mediapipe/face_landmarker.task https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

### Hand landmarker

```bash
curl -o public/models/mediapipe/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

### WASM runtime

Copy it out of the installed package rather than downloading separately, so the
runtime version always matches `@mediapipe/tasks-vision` in `package.json`:

```bash
cp -r node_modules/@mediapipe/tasks-vision/wasm public/models/mediapipe/wasm
```

## A note on YOLOv8

`src/services/ml/yolo.model.ts` names Ultralytics YOLOv8, which is
**AGPL-3.0**. That is fine for an open-source project, but shipping it in a
closed-source product would require a commercial licence from Ultralytics.

MediaPipe's own object detector is Apache-2.0 and detects the people and toys
this screening cares about. Prefer it unless you have a specific reason not to.

## Why these are not in git

A 20 MB binary in git history is there permanently — every clone pays for it
forever, and the files change with each model release. Options, in order of
preference:

1. Download at setup time (a `postinstall` script, or the commands above)
2. Git LFS, if your host supports it
3. Serve them from a CDN and point `MODEL_BASE` at it
