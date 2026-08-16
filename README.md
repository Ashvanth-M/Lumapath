# LumaPath AI 🧠

### AI-Assisted Developmental Communication Screening Platform

> **LumaPath AI helps parents perform structured, guided communication screenings at home by recording short assessment activities and transforming them into measurable behavioural insights for early intervention.**

⚠️ **LumaPath AI is a screening aid and is not intended to replace professional clinical diagnosis. Results should be interpreted by qualified clinicians alongside developmental history and direct observation.**

---

## 🌟 The Problem

Early identification of communication and auditory concerns in young children is critical.

However, families in remote and underserved regions often face:

- Limited access to speech-language pathologists
- Long waiting times for developmental assessments
- High costs of repeated clinical visits
- Difficulty continuously tracking developmental progress
- Lack of standardized observations collected at home

Parents may notice that something feels different, but they often don't know **what to observe, how to record it, or when to seek professional help.**

---

## 💡 Our Solution

**LumaPath AI** transforms the parent's phone or computer into a structured developmental screening assistant.

Instead of asking parents to answer complicated questionnaires, LumaPath guides them through short standardized activities.

### The workflow

```text
Parent Login
     ↓
Create Child Profile
     ↓
Age-Based Assessment
     ↓
Guided Activities
     ↓
Record Video
     ↓
Secure Upload
     ↓
AI-Assisted Analysis
     ↓
Behavioural Metrics
     ↓
Communication Matrix Mapping
     ↓
Response Latency
     ↓
Results & Recommendations
     ↓
Progress Tracking
     ↓
Clinician-Ready Report
````

---

## 🎯 Core Features

### 👨‍👩‍👧 Parent-Guided Screening

Parents receive clear instructions for every activity, including:

* What to do
* Where to position the child
* Where to place the camera
* What to say
* What behaviour to observe
* How long to record

Example activities include:

* Response to Name
* Toy Presentation
* Requesting a Toy
* Social Play
* Free Play
* Auditory Response
* Joint Attention
* Gesture & Pointing
* Vocalisation

---

### 🎥 Video-Based Assessment

Parents record short videos during guided activities and upload them for analysis.

The system extracts behavioural signals such as:

* Eye contact
* Face orientation
* Gaze behaviour
* Gesture usage
* Hand movement
* Shared attention
* Vocal activity
* Auditory response
* Response latency

---

### 🤖 AI-Assisted Behaviour Analysis

LumaPath is designed around a multimodal analysis pipeline.

The architecture supports computer-vision and audio-analysis models for extracting behavioural signals from recorded sessions.

Potential model components include:

* **MediaPipe Face Landmarker**
* **MediaPipe Hand Landmarker**
* **MoveNet**
* **YOLO-based object detection**
* **Silero VAD**
* **ONNX Runtime Web**
* **TensorFlow.js**

The extracted signals are combined into higher-level behavioural observations.

---

## ⏱️ Response Latency

One of LumaPath's key measurements is **response latency**.

For example:

```text
Parent calls child's name
          ↓
Audio event detected
          ↓
Child orientation detected
          ↓
Time difference calculated
          ↓
Response latency
```

Example:

```text
Name called
    ↓
Child turns after 1.42 seconds
    ↓
Response latency = 1.42 s
```

Repeated observations across activities allow the platform to track changes over time.

---

## 🧩 Communication Matrix Mapping

Observed communication behaviours are mapped against developmental communication levels.

```text
Level 1
Pre-Intentional Behaviour

        ↓

Level 2
Intentional Behaviour

        ↓

Level 3
Unconventional Communication

        ↓

Level 4
Conventional Communication

        ↓

Level 5
Concrete Symbols

        ↓

Level 6
Abstract Symbols

        ↓

Level 7
Language
```

The platform presents the observed level alongside the supporting behavioural evidence.

---

## 📊 Developmental Dashboard

Parents can view:

* Overall communication score
* Domain scores
* Response latency
* Communication Matrix level
* Assessment history
* Milestone timeline
* Developmental trends
* Personalized recommendations

Example domains:

| Domain                | Example Metric |
| --------------------- | -------------: |
| Eye Contact           |             82 |
| Speech & Vocalisation |             68 |
| Gesture               |             84 |
| Shared Attention      |             76 |
| Facial Expression     |             88 |
| Auditory Response     |             74 |

---

## 🔄 Longitudinal Progress Tracking

LumaPath doesn't treat screening as a one-time event.

Every completed session can contribute to a child's longitudinal developmental profile.

The platform can visualize:

```text
Previous Session
       ↓
Current Session
       ↓
Change Detection
       ↓
Developmental Trend
       ↓
Next Recommended Activities
```

This allows parents and clinicians to see **how communication behaviours change over time.**

---

## 🧠 LumaTwin

### A longitudinal communication profile

LumaTwin represents the child's evolving communication profile across completed screenings.

It combines historical observations into an interpretable profile containing:

* Domain strengths
* Areas requiring attention
* Behavioural trends
* Response latency patterns
* Activity recommendations
* Developmental milestones

The goal is not to create a medical diagnosis, but to provide a **continuously updated behavioural profile** that can support parent-clinician conversations.

---

## 📈 Personalized Recommendations

Based on observed behaviours, LumaPath can recommend targeted activities.

Example:

```text
Observed:
Slower response latency

        ↓

Recommendation:
Repeat name-response activity

        ↓

Parent Practice:
3 sessions per week

        ↓

Next Screening:
Compare response latency
```

Recommendations are designed to be simple enough for parents to practice at home.

---

## 👨‍⚕️ Clinician Workstation

LumaPath also provides a clinician-oriented view.

Clinicians can review:

* Shared screenings
* AI observations
* Video evidence
* Response latency
* Domain scores
* Confidence
* Risk indicators
* Previous sessions
* Generated reports

### Review-first workflow

```text
AI Observation
      ↓
Video Evidence
      ↓
Clinician Review
      ↓
Clinical Impression
```

The AI assists the clinician rather than replacing clinical judgement.

---

## 📄 Automated Clinician Report

Each completed screening can generate a structured report containing:

* Child information
* Assessment date
* Age band
* Overall score
* Domain scores
* Communication Matrix level
* Response latency
* AI observations
* Key behavioural observations
* Risk factors
* Recommendations
* Screening disclaimer

Reports can be prepared for sharing with qualified professionals.

---

## 🔐 Privacy & Security

LumaPath is designed with privacy in mind because developmental screening involves sensitive child data.

The architecture includes:

* Supabase authentication
* Row Level Security
* Secure database access
* Controlled video storage
* User-specific data isolation
* Authenticated access to child profiles
* Secure assessment records

Parents should only be able to access their own children's data.

---

# 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      Parent         │
                    │   Web Application   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Guided Assessment │
                    │   & Video Upload    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   AI Processing     │
                    │                     │
                    │ Face Landmarks      │
                    │ Hand Detection      │
                    │ Pose Estimation     │
                    │ Object Detection    │
                    │ Voice Activity      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Behaviour Engine    │
                    │                     │
                    │ Eye Contact         │
                    │ Gesture             │
                    │ Attention           │
                    │ Vocalisation        │
                    │ Auditory Response   │
                    │ Response Latency    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Communication       │
                    │ Matrix Mapping      │
                    └──────────┬──────────┘
                               │
                               ▼
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
    ┌──────────────────┐                ┌──────────────────┐
    │ Parent Dashboard │                │ Clinician Report │
    └──────────────────┘                └──────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* TanStack Router
* TanStack Query
* Zustand
* Framer Motion
* Recharts
* Lucide Icons

## Backend / Platform

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Storage
* Row Level Security

## AI / Computer Vision

* TensorFlow.js
* MediaPipe Tasks Vision
* MoveNet
* YOLO
* ONNX Runtime Web
* Silero VAD

## Development

* Git
* GitHub
* npm
* TypeScript

---

# 🗄️ Data Architecture

Core entities include:

```text
User
 │
 └── Parent Profile
       │
       └── Child Profile
             │
             ├── Assessments
             │     ├── Activities
             │     ├── Videos
             │     ├── AI Observations
             │     └── Scores
             │
             ├── Milestones
             │
             ├── Recommendations
             │
             └── Reports
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/Ashvanth-M/Lumapath.git
cd Lumapath
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Create:

```text
.env.local
```

Add the required Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 4. Start development server

```bash
npm run dev
```

---

# 🧪 Development Status

### Current MVP

* [x] Parent authentication flow
* [x] Child onboarding
* [x] Age-based assessment selection
* [x] Guided assessment activities
* [x] Video recording/upload workflow
* [x] Assessment dashboard
* [x] Communication Matrix visualization
* [x] Response latency visualization
* [x] Progress tracking
* [x] Recommendations
* [x] Clinician report interface
* [x] Behaviour replay interface
* [x] AI-assisted analysis architecture
* [ ] Production-grade ML validation
* [ ] Clinical validation
* [ ] Large-scale anonymised dataset validation
* [ ] Production deployment

---

# 🔬 Future Development

LumaPath can be expanded with:

* More robust multimodal models
* Better speech analysis
* Multilingual assessment support
* Offline-first assessment
* Low-bandwidth video upload
* Clinician collaboration
* Telehealth integration
* Automated follow-up reminders
* Hospital / clinic dashboards
* Population-level anonymised insights
* Mobile applications
* Continuous model evaluation

---

# 🌍 Impact

LumaPath aims to make early developmental screening:

**Accessible → Structured → Measurable → Continuous → Clinician-friendly**

Instead of:

> "I think my child may be developing differently."

Parents can bring structured observations such as:

> "Across four name-response trials, the average response latency was 1.42 seconds, with observable orientation in 4/5 trials."

That difference can help create a more informed conversation between **parents and clinicians.**

---

# ⚠️ Medical Disclaimer

LumaPath AI is an **AI-assisted developmental screening tool**.

It is **not a diagnostic device** and must not be used to independently diagnose developmental, speech, language, hearing, or neurological conditions.

AI-generated observations are intended to support screening and communication with qualified healthcare professionals.

---

# 👥 Team

### HexAckers

* **Ashvanth M**
* **Arjun K**
* **Anirudh Kashyab LM**
* **Abhishek S**

---

# 🏆 Hackathon

LumaPath AI was developed as a solution for the challenge of improving early identification of communication and auditory concerns among young children, particularly in underserved and remote communities.

### Our vision

> **Make structured developmental screening accessible from anywhere, while keeping clinicians at the center of the decision-making process.**

---

## ⭐ Why LumaPath?

**Record → Understand → Track → Act**

LumaPath turns everyday parent-child interactions into structured developmental observations that can help families take the next informed step.

```
```
