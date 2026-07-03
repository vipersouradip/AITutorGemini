import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Increase body limit to handle freehand pencil strokes safely
app.use(express.json({ limit: "50mb" }));

// Initialize the Gemini API client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Prompt system instruction defining the whiteboard tutor capabilities,
// coordinate standards (680x480 snapshot canvas), and visual templates.
const TUTOR_SYSTEM_INSTRUCTION = `You are an expert, highly experienced AI physics and mathematics tutor.
Your goal is to teach the student concepts step-by-step using a collaborative infinite storyboard whiteboard.
You teach by constructing a visible, persistent visual chain of reasoning on the board, where EVERY distinct explanation or derivation step is represented by a NEW diagram snapshot.

=== CORE WHITEBOARD PHILOSOPHY ===
1. EVERY STEP MUST BE A NEW DIAGRAM SNAPSHOT. Do not overwrite or pollute the previous step diagrams.
2. For each successive explanation, derivation, or drawing change, you MUST first duplicate the active snapshot using the "DUPLICATE_SNAPSHOT" action to preserve visual continuity.
3. Write the detailed explanation for each step in the "description" field of the DUPLICATE_SNAPSHOT action. This description is displayed in the caption box under that specific diagram snapshot.
4. Keep the text message in your main chat response ("message" field) short, warm, companion-like, and conversational (1-2 sentences), prompting the student to view the new step diagram or ask a question.
5. In the snapshot "description" caption underneath the diagram, explain the concept clearly. Use LaTeX scientific equations wrapped in single dollar signs like $F = m \\cdot a$ or double dollar signs for blocks like $$\\Sigma F = m \\cdot a$$ to render beautiful KaTeX formulas.
6. For whiteboard "text" objects with semanticType "Equation", write the raw LaTeX equation directly WITHOUT any wrapping dollar signs (e.g. "\\Sigma F_x = m \\cdot a_x" or "a_c = \\frac{v^2}{r}"). Remember to double-escape backslashes in JSON (e.g. "\\\\frac" or "\\\\Sigma" or "\\\\cdot").

=== OBJECT ROTATION FOR WEDGE ALIGNMENT ===
- You can ROTATE any whiteboard object (blocks, wedges, vectors, texts) by specifying a "rotation" property (in degrees from 0 to 360) in CREATE_OBJECT or UPDATE_OBJECT payloads.
- This is extremely useful for aligning blocks on wedge sides!
  * For example, for an incline sloping down at 27 degrees, create or update a Block (rectangle) with "rotation": 27 (or -27 depending on direction) to make it sit perfectly flush and aligned on the wedge surface.
  * Adjust vector arrows (force, velocity) to also align with the incline slope or perpendicular to it (e.g. normal force).

=== SNAPSHOT FRAME COORDINATE SYSTEM ===
Each snapshot is a card frame of size: Width = 680, Height = 480.
The coordinate system is local to the snapshot (x and y range from 0 to 680 and 0 to 480, respectively).
All drawings (rectangles, triangles, circles, arrows, text) created in a snapshot must have coordinates strictly inside these bounds.

=== DETAILED VISUAL DRAWING TEMPLATES ===
Use these coordinate templates to construct beautiful, professional visual diagrams:

1. INCLINED PLANE & BLOCK (Physics Wedge):
   - Wedge (Triangle): x: 100, y: 200, width: 400, height: 200. This forms a diagonal surface sloping down from (100, 200) to (500, 400).
   - Block (Rectangle): x: 220, y: 210, width: 75, height: 50. (This rests on the slope). Specify a "rotation": 27 to make it perfectly flush with the incline!
   - Gravity vector Fg (Arrow): Starts at block center (257, 235) and points straight down to (257, 315).
   - Normal force Fn (Arrow): Starts at block center (257, 235) and points perpendicular to slope (up and right) to (297, 155) (rotation: 27).
   - Friction force Ff (Arrow): Starts at block bottom center and points up-left along the slope to (177, 195).
   - Slope Angle Label: Text "\\theta" at x: 130, y: 380.

2. ORBIT / CENTRIPETAL MOTION:
   - Central body (Planet) (Circle): x: 340, y: 240, radius: 45.
   - Orbit Path (Circle, dashed styled or thin outline): x: 340, y: 240, radius: 180.
   - Orbiting body (Satellite) (Circle): x: 520, y: 240, radius: 15.
   - Tangential Velocity Vector v (Arrow): Starts at (520, 240) and points straight up to (520, 140).
   - Centripetal Gravitational Force Fg (Arrow): Starts at (520, 240) and points straight left to (410, 240) toward center.

3. SIMPLE PENDULUM:
   - Rigid Ceiling (Rectangle): x: 240, y: 50, width: 200, height: 10.
   - Pendulum Pivot Point: (340, 55).
   - String (Arrow or line): Starts at (340, 55) and ends at bob center (440, 280).
   - Bob (Circle): Center x: 440, y: 280, radius: 22.
   - Gravity Fg (Arrow): Starts at bob center (440, 280) and points down to (440, 360).
   - Tension T (Arrow): Starts at bob center (440, 280) and points up-left to (365, 115).

=== RELATIONSHIPS & SEMANTIC DATA ===
Ensure all objects have semantic metadata where appropriate:
- Rectangles/Triangles can be "Block", "Wedge", "Ceiling".
- Arrows can be "ForceVector", "VelocityVector", "AccelerationVector", "DisplacementVector". Use properties: { attached_to: "block_id", resting_on: "wedge_id" }.
- Texts can be "Equation", "Label", "Explanation". Use properties: { refers_to: "object_id" }.

=== RESPONSE SCHEMA ===
You MUST respond with a single, valid JSON object matching the following structure exactly:
{
  "message": "A short, engaging companion-like text response to show in the chat sidebar (1-2 sentences).",
  "actions": [
    // FIRST action: ALWAYS duplicate the active snapshot to preserve diagram context!
    {
      "type": "DUPLICATE_SNAPSHOT",
      "payload": {
        "sourceSnapshotId": "id_of_current_active_snapshot",
        "title": "Short descriptive title of this step (e.g. Free Body Diagram or Step 1: Force Balance)",
        "description": "Your detailed step-by-step scientific explanation or mathematical derivation. Use LaTeX formulas wrapped in $...$ (e.g., $F = m \\\\cdot a$) or $$...$$."
      }
    },
    // SUBSEQUENT actions: apply visual changes (draw vectors, blocks, equations) to the newly created snapshot!
    // Note: leave "snapshotId" as "" or omit it, which automatically targets the newly duplicated snapshot!
    {
      "type": "CREATE_OBJECT",
      "payload": {
        "type": "rectangle" | "triangle" | "circle" | "arrow" | "text" | "curve",
        "rotation": number, // Optional: rotation in degrees (0 to 360) for perfect alignment
        "x": number, "y": number, "width": number, "height": number, "radius": number,
        "x1": number, "y1": number, "x2": number, "y2": number,
        "qx": number, "qy": number, // For curves, specify start (x1, y1), end (x2, y2) and quadratic control point (qx, qy)
        "text": "scientific equation (e.g. \\\\Sigma F_x = m \\\\cdot a_x) or label",
        "color": "hex color code",
        "thickness": number,
        "semanticType": "Block" | "Wedge" | "ForceVector" | "Equation" | "AngleLabel" | "Label",
        "label": "Human label"
      }
    }
  ]
}

Ensure your response is valid, parsable JSON. Do not include any explanation markdown around the JSON block. Remember to double escape backslashes in LaTeX strings!`;


function getSimulatedTutorResponse(snapshots: any[], activeSnapshotId: string | null, objects: any[], chatHistory: any[], studentMessage: string) {
  const msg = studentMessage.toLowerCase();
  
  // 1. FRESH TOPIC REQUESTS
  if (msg.includes("introduce the concept of") || msg.includes("please introduce the concept")) {
    // Extract topic
    let topic = "Physics Concept";
    const match = studentMessage.match(/introduce the concept of "([^"]+)"/i) || studentMessage.match(/introduce the concept of ([^.]+)/i);
    if (match && match[1]) {
      topic = match[1].trim();
    } else {
      if (msg.includes("projectile")) topic = "Projectile Motion";
      else if (msg.includes("harmonic") || msg.includes("shm")) topic = "Simple Harmonic Motion";
      else if (msg.includes("optics") || msg.includes("reflection")) topic = "Optics Reflection";
      else if (msg.includes("circuit") || msg.includes("ohm")) topic = "Circuits & Ohm's Law";
    }

    if (topic.toLowerCase().includes("projectile")) {
      return {
        message: "I've started our whiteboard on **Projectile Motion**! I've created a trajectory diagram with gravity and velocity components. Let's study how horizontal and vertical motions are independent.",
        actions: [
          {
            type: "CREATE_SNAPSHOT",
            payload: {
              title: "1. Projectile Trajectory",
              description: "Projectile motion describes an object launched into the air subject only to gravity ($g$). The horizontal motion has constant velocity ($v_x = v_0 \\cos\\theta$), while the vertical motion experiences constant downward acceleration ($a_y = -g$).\n\n### Core Equations:\n- **Horizontal position:** $x(t) = v_0 \\cos\\theta \\cdot t$\n- **Vertical position:** $y(t) = v_0 \\sin\\theta \\cdot t - \\frac{1}{2}gt^2$\n- **Range:** $R = \\frac{v_0^2 \\sin(2\\theta)}{g}$"
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 50, y: 400, width: 580, height: 10, color: "#475569", semanticType: "Wedge", label: "Ground" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 100, y: 390, radius: 10, color: "#1e293b", label: "Launch Point" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "curve", x1: 100, y1: 390, x2: 580, y2: 390, qx: 340, qy: 120, color: "#3b82f6", thickness: 2, semanticType: "Trajectory", label: "Parabolic Trajectory Path" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 100, y1: 390, x2: 180, y2: 310, color: "#ef4444", thickness: 2.5, semanticType: "VelocityVector", label: "Initial Velocity v0" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 340, y: 220, radius: 6, color: "#1e293b", label: "Peak Position" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 340, y1: 220, x2: 400, y2: 220, color: "#ef4444", thickness: 2.5, semanticType: "VelocityVector", label: "Velocity at Peak vx" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 340, y1: 220, x2: 340, y2: 280, color: "#a855f7", thickness: 2, semanticType: "ForceVector", label: "Gravity acceleration g" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 580, y: 390, radius: 8, color: "#22c55e", label: "Impact Point" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 120, y: 360, text: "v_0", color: "#ef4444", semanticType: "Label" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 330, y: 190, text: "v_y = 0", color: "#475569", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 350, y: 250, text: "g", color: "#a855f7", semanticType: "Label" }
          }
        ]
      };
    } else if (topic.toLowerCase().includes("harmonic") || topic.toLowerCase().includes("shm") || topic.toLowerCase().includes("spring")) {
      return {
        message: "I've initialized our workspace to study **Simple Harmonic Motion**! Look at the mass-spring diagram below to analyze Hooke's Law and oscillations.",
        actions: [
          {
            type: "CREATE_SNAPSHOT",
            payload: {
              title: "1. Spring Oscillation System",
              description: "A block of mass $m$ connected to a spring oscillates back and forth. The restoring force is governed by Hooke's Law: $F = -k \\cdot x$.\n\n### Key Concepts:\n- **Angular Frequency:** $\\omega = \\sqrt{\\frac{k}{m}}$\n- **Period:** $T = 2\\pi\\sqrt{\\frac{m}{k}}$\n- **Position Function:** $x(t) = A \\cos(\\omega t + \\phi)$"
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 80, y: 150, width: 20, height: 160, color: "#475569", semanticType: "Wedge", label: "Rigid Support Wall" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 80, y: 300, width: 500, height: 10, color: "#64748b", semanticType: "Wedge", label: "Frictionless Table" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 100, y: 220, width: 180, height: 15, color: "#94a3b8", semanticType: "Block", label: "Coil Spring" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 280, y: 200, width: 80, height: 100, color: "#1e293b", semanticType: "Block", label: "Block mass m" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 180, y: 195, text: "k", color: "#94a3b8", semanticType: "Label" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 310, y: 240, text: "m", color: "#ffffff", semanticType: "Label" }
          }
        ]
      };
    } else if (topic.toLowerCase().includes("optics") || topic.toLowerCase().includes("reflection") || topic.toLowerCase().includes("refraction")) {
      return {
        message: "I've set up an **Optics Reflection & Refraction** lesson on the board! Take a look at Snell's Law and ray boundaries below.",
        actions: [
          {
            type: "CREATE_SNAPSHOT",
            payload: {
              title: "1. Ray Optics Boundary",
              description: "Light rays incident on a boundary undergo reflection and refraction. This behavior is described by the Law of Reflection ($\\theta_1 = \\theta_{refl}$) and Snell's Law:\n\n$$n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2$$\n\nwhere $n_1$ and $n_2$ are the refractive indices of the media."
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 80, y: 240, width: 520, height: 4, color: "#3b82f6", semanticType: "Wedge", label: "Media Interface" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 340, y1: 80, x2: 340, y2: 400, color: "#94a3b8", thickness: 1.5, semanticType: "AngleLabel", label: "Normal Normal" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 180, y1: 100, x2: 340, y2: 240, color: "#ef4444", thickness: 2.5, semanticType: "VelocityVector", label: "Incident Ray" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 340, y1: 240, x2: 500, y2: 100, color: "#f59e0b", thickness: 2.5, semanticType: "VelocityVector", label: "Reflected Ray" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 340, y1: 240, x2: 440, y2: 380, color: "#10b981", thickness: 2.5, semanticType: "VelocityVector", label: "Refracted Ray" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 120, y: 120, text: "n_1 (Air)", color: "#475569", semanticType: "Label" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 120, y: 320, text: "n_2 (Glass)", color: "#3b82f6", semanticType: "Label" }
          }
        ]
      };
    } else if (topic.toLowerCase().includes("circuit") || topic.toLowerCase().includes("ohm") || topic.toLowerCase().includes("electricity")) {
      return {
        message: "I've drawn a complete **DC Circuit & Ohm's Law** diagram on the board! Look at the voltage generator and resistor schematic below.",
        actions: [
          {
            type: "CREATE_SNAPSHOT",
            payload: {
              title: "1. Basic DC Circuit",
              description: "A basic electric circuit comprises a voltage source $V$ and a resistor $R$. The current $I$ flowing through the resistor is directly proportional to voltage and inversely proportional to resistance:\n\n$$I = \\frac{V}{R}$$\n\nPower dissipated is given by $P = I^2 \\cdot R = V \\cdot I$."
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 290, y: 120, width: 100, height: 40, color: "#cbd5e1", semanticType: "Wedge", label: "Resistor R" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 150, y: 220, radius: 25, color: "#3b82f6", semanticType: "Wedge", label: "Voltage Generator" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 150, y1: 140, x2: 290, y2: 140, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 390, y1: 140, x2: 530, y2: 140, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 530, y1: 140, x2: 530, y2: 300, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 530, y1: 300, x2: 150, y2: 300, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 150, y1: 300, x2: 150, y2: 245, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 150, y1: 140, x2: 150, y2: 195, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 200, y1: 120, x2: 250, y2: 120, color: "#ef4444", thickness: 2, semanticType: "VelocityVector", label: "Current direction" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 335, y: 130, text: "R", color: "#1e293b", semanticType: "Label" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 142, y: 212, text: "V", color: "#ffffff", semanticType: "Label" }
          }
        ]
      };
    } else {
      return {
        message: `I've set up a conceptual layout for **${topic}**! Ask me questions, and let's study how this topic works.`,
        actions: [
          {
            type: "CREATE_SNAPSHOT",
            payload: {
              title: `1. Study of ${topic}`,
              description: `Let's explore **${topic}** together on the whiteboard!\n\nHere is an overview of the key mathematical and physical representations for this topic. We will structure our study step-by-step. Feel free to ask me to draw specific elements, explain formulas, or derive equations.`
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "rectangle", x: 240, y: 180, width: 200, height: 100, color: "#1e293b", semanticType: "Block", label: topic }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 140, y: 140, radius: 20, color: "#3b82f6", semanticType: "Wedge" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "circle", x: 540, y: 140, radius: 20, color: "#10b981", semanticType: "Wedge" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 160, y1: 140, x2: 240, y2: 200, color: "#64748b", thickness: 2, semanticType: "Block" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 520, y1: 140, x2: 440, y2: 200, color: "#64748b", thickness: 2, semanticType: "Block" }
          }
        ]
      };
    }
  }

  // 2. SPECIFIC PRESET MODIFICATIONS
  
  // A. Inclined Plane / Ramp Active
  if (activeSnapshotId && (activeSnapshotId.includes("ramp") || activeSnapshotId.includes("plane") || activeSnapshotId.includes("wedge"))) {
    if (msg.includes("force") || msg.includes("gravity") || msg.includes("normal") || msg.includes("friction") || msg.includes("vector") || msg.includes("equation") || msg.includes("solve")) {
      return {
        message: "I've drawn the free-body diagram for the block resting on the incline! I added vectors representing the forces of gravity ($F_g$), normal force ($F_N$), and static friction ($F_f$). Notice how gravity splits along the coordinates.",
        actions: [
          {
            type: "DUPLICATE_SNAPSHOT",
            payload: {
              sourceSnapshotId: activeSnapshotId,
              title: "2. Free Body Diagram on Slope",
              description: "By isolating the block of mass $m$, we can resolve the forces acting on it into components parallel and perpendicular to the inclined plane at angle $\\theta$:\n\n- **Gravity force:** straight down, $F_g = m \\cdot g$.\n- **Normal force:** perpendicular to slope, $F_N = m \\cdot g \\cdot \\cos\\theta$.\n- **Parallel gravity component:** down the slope, $F_{g, \\parallel} = m \\cdot g \\cdot \\sin\\theta$.\n- **Frictional force:** opposing motion up the slope, $F_f = \\mu \\cdot F_N$."
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 307, y1: 335, x2: 307, y2: 415, color: "#ef4444", thickness: 2.5, semanticType: "ForceVector", label: "Gravity Force Fg" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 307, y1: 335, x2: 347, y2: 255, color: "#3b82f6", thickness: 2.5, semanticType: "ForceVector", label: "Normal Force Fn" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 307, y1: 335, x2: 227, y2: 295, color: "#10b981", thickness: 2.5, semanticType: "ForceVector", label: "Friction Force Ff" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 307, y1: 335, x2: 387, y2: 375, color: "#f59e0b", thickness: 1.5, semanticType: "ForceVector", label: "Parallel component" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 315, y: 390, text: "F_g = m \\cdot g", color: "#ef4444", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 355, y: 260, text: "F_N", color: "#3b82f6", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 235, y: 270, text: "F_f", color: "#10b981", semanticType: "Equation" }
          }
        ]
      };
    }
  }

  // B. Satellite Orbit Active
  if (activeSnapshotId && activeSnapshotId.includes("orbit")) {
    if (msg.includes("force") || msg.includes("gravity") || msg.includes("velocity") || msg.includes("centripetal") || msg.includes("vector") || msg.includes("equation") || msg.includes("speed")) {
      return {
        message: "I've added centripetal pull and orbital velocity vectors to our orbiting satellite! Notice how the velocity vector is strictly tangential, meaning it is always perpendicular to gravity.",
        actions: [
          {
            type: "DUPLICATE_SNAPSHOT",
            payload: {
              sourceSnapshotId: activeSnapshotId,
              title: "2. Centripetal Force & Velocity",
              description: "To maintain a circular orbit at radius $r$, the gravitational pull acts as a centripetal force pointing towards the center of the planet:\n\n$$F_c = F_g \\implies \\frac{m \\cdot v^2}{r} = \\frac{G \\cdot M \\cdot m}{r^2}$$\n\nSolving for the orbital speed yields:\n\n$$v = \\sqrt{\\frac{G \\cdot M}{r}}$$"
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 550, y1: 340, x2: 450, y2: 340, color: "#ef4444", thickness: 2.5, semanticType: "ForceVector", label: "Gravity Centripetal Pull Fg" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 550, y1: 340, x2: 550, y2: 240, color: "#10b981", thickness: 2.5, semanticType: "VelocityVector", label: "Tangential Velocity v" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 480, y: 315, text: "F_g", color: "#ef4444", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 560, y: 260, text: "v", color: "#10b981", semanticType: "Equation" }
          }
        ]
      };
    }
  }

  // C. Pendulum Active
  if (activeSnapshotId && (activeSnapshotId.includes("pend") || activeSnapshotId.includes("pendulum"))) {
    if (msg.includes("force") || msg.includes("gravity") || msg.includes("tension") || msg.includes("bob") || msg.includes("vector") || msg.includes("equation")) {
      return {
        message: "I've drawn the force vectors for our pendulum bob! We have tension $T$ along the string and straight-down gravity ($F_g = m \\cdot g$). See how the tangential component acts as the restoring force.",
        actions: [
          {
            type: "DUPLICATE_SNAPSHOT",
            payload: {
              sourceSnapshotId: activeSnapshotId,
              title: "2. Pendulum Force Resolution",
              description: "The bob experiences two primary forces:\n1. **Gravity ($F_g = m \\cdot g$):** straight down.\n2. **Tension ($T$):** along the suspension string.\n\nResolving gravity along the radial direction shows that the radial component balances tension ($T = m \\cdot g \\cdot \\cos\\theta$), while the tangential component ($F_{restoring} = -m \\cdot g \\cdot \\sin\\theta$) acts to restore the bob back to equilibrium."
            }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 460, y1: 360, x2: 460, y2: 440, color: "#ef4444", thickness: 2.5, semanticType: "ForceVector", label: "Gravity Fg" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 460, y1: 360, x2: 410, y2: 225, color: "#3b82f6", thickness: 2.5, semanticType: "ForceVector", label: "Tension T" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "arrow", x1: 460, y1: 360, x2: 390, y2: 395, color: "#f59e0b", thickness: 1.5, semanticType: "ForceVector", label: "Restoring Force" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 470, y: 410, text: "F_g = m \\cdot g", color: "#ef4444", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 435, y: 280, text: "T", color: "#3b82f6", semanticType: "Equation" }
          },
          {
            type: "CREATE_OBJECT",
            payload: { type: "text", x: 340, y: 380, text: "-mg\\sin\\theta", color: "#f59e0b", semanticType: "Equation" }
          }
        ]
      };
    }
  }

  // 3. GENERIC REPLIES IF NO SPECIFIC RULE MATCHES
  return {
    message: "I understand! I've annotated our active snapshot below with some detailed mathematical formulations to help explain this concept clearly.",
    actions: [
      {
        type: "DUPLICATE_SNAPSHOT",
        payload: {
          sourceSnapshotId: activeSnapshotId || "",
          title: "Conceptual Explanation Step",
          description: `Excellent question! Let's break down this topic conceptually:\n\n1. we need to establish our reference frame.\n2. We isolate the system into independent forces or variables.\n3. We apply the fundamental law (e.g. $F = m \\cdot a$ or conservation laws).\n\nWhat specific part of this derivation would you like to explore deeper?`
        }
      },
      {
        type: "CREATE_OBJECT",
        payload: {
          type: "text",
          x: 200,
          y: 40,
          text: "\\Sigma F = m \\cdot a",
          color: "#a855f7",
          semanticType: "Equation",
          label: "Fundamental Law"
        }
      }
    ]
  };
}

// API route to handle AI Tutor requests
app.post("/api/tutor", async (req, res) => {
  const { snapshots, activeSnapshotId, objects, chatHistory, studentMessage } = req.body;

  try {
    // Check if API key is present; if not, use offline simulation
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY environment variable is not configured. Falling back to offline rule-based simulation.");
      const simulatedResponse = getSimulatedTutorResponse(snapshots, activeSnapshotId, objects, chatHistory, studentMessage);
      return res.json(simulatedResponse);
    }

    // Construct the context summarizing the current board
    const boardStateSummary = {
      activeSnapshotId: activeSnapshotId,
      activeSnapshots: snapshots.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        index: s.index
      })),
      semanticObjectsOnBoard: objects.map((obj: any) => ({
        id: obj.id,
        snapshotId: obj.snapshotId,
        type: obj.type,
        rotation: obj.rotation || 0,
        semanticType: obj.semanticType,
        label: obj.label,
        text: obj.text,
        properties: obj.properties,
        coordinates: obj.type === 'arrow' || obj.type === 'pencil' 
          ? { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 }
          : obj.type === 'curve'
            ? { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2, qx: obj.qx, qy: obj.qy }
            : { x: obj.x, y: obj.y, width: obj.width, height: obj.height, radius: obj.radius }
      }))
    };

    const promptMessage = `
Current Whiteboard State:
${JSON.stringify(boardStateSummary, null, 2)}
Active Snapshot ID: "${activeSnapshotId}"

Chat History:
${chatHistory.map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

Student Input Message:
"${studentMessage}"

Respond to the student's message. Follow the rules:
1. Speak as a companion tutor. Explain conceptually and briefly in your chat response.
2. ALWAYS duplicate the active snapshot to create a new step diagram (snap ID: "${activeSnapshotId}") using the DUPLICATE_SNAPSHOT action. Write your main explanation for this step in the snapshot's "description" field.
3. Perform drawing modifications (draw arrows, shapes, equations, or labels) on the newly created snapshot using CREATE_OBJECT or UPDATE_OBJECT actions.
4. Keep snapshot titles short, and use LaTeX equations (double backslashed in JSON) beautifully inside descriptions and equation texts.
5. Output your response strictly as valid, raw JSON conforming to the schema. Do not enclose the JSON inside \`\`\`json markdown blocks.
`;

    // Query the Gemini model (gemini-3.5-flash is perfect, fast, and does not block on paid flows)
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: TUTOR_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const responseText = response.text || "{}";
    let tutorResponse;
    try {
      tutorResponse = JSON.parse(responseText.trim());
    } catch (parseErr) {
      console.warn("Failed to parse Gemini JSON response. Raw output:", responseText);
      // Fallback response in case JSON parse failed
      tutorResponse = {
        message: "I've reviewed the whiteboard state. Let's look at this together!",
        actions: []
      };
    }

    res.json(tutorResponse);
  } catch (error: any) {
    const errorStr = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    const isQuotaError = errorStr.includes("429") || errorStr.toLowerCase().includes("quota") || errorStr.toLowerCase().includes("rate") || errorStr.toLowerCase().includes("exhausted");
    
    if (isQuotaError) {
      console.log("AI Tutor switched to offline sandbox mode due to API rate limit.");
    } else {
      console.log("AI Tutor switching to offline sandbox mode due to API exception:", error?.message || error);
    }

    try {
      console.log("Gracefully invoking offline rule-based sandbox tutor response.");
      const simulatedResponse = getSimulatedTutorResponse(snapshots, activeSnapshotId, objects, chatHistory, studentMessage);
      
      if (isQuotaError) {
        simulatedResponse.message = `⚠️ **[Live Gemini API Quota Reached]** I've seamlessly activated our high-fidelity offline sandbox tutor so your learning session continues without interruption! Here is your next lesson step:\n\n` + simulatedResponse.message;
      }
      return res.json(simulatedResponse);
    } catch (fallbackErr: any) {
      console.error("Critical fallback failure:", fallbackErr);
      res.status(500).json({ error: error.message || "An error occurred while contacting the AI Tutor." });
    }
  }
});

// Setup Vite development server or production static serving
async function initializeApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

initializeApp();
