import React, { useState, useEffect, useRef } from 'react';
import { WhiteboardSnapshot, WhiteboardObject, ChatMessage, TutorAction } from './types';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { TutorSidebar } from './components/TutorSidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { 
  MousePointer, 
  Square, 
  Triangle as TriangleIcon, 
  Circle as CircleIcon, 
  ArrowRight, 
  Type as TextIcon, 
  Edit2, 
  Trash2, 
  Compass, 
  Spline,
  HelpCircle,
  Sparkles,
  RefreshCcw,
  BookOpen,
  Undo,
  Redo,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Starting demo setups
const INITIAL_SNAP: WhiteboardSnapshot[] = [
  {
    id: 'snap_ramp_1',
    title: '1. Gravity & Wedge',
    description: 'A block of mass m rests on a wedge with slope θ. Let\'s draw the gravity force Fg acting downwards and learn how it splits into components.',
    index: 0,
    x: 50,
    y: 100,
    width: 680,
    height: 480,
  }
];

const INITIAL_OBJ: WhiteboardObject[] = [
  {
    id: 'wedge_1',
    snapshotId: 'snap_ramp_1',
    type: 'triangle',
    x: 150,
    y: 300,
    width: 400,
    height: 200,
    color: '#1e293b',
    thickness: 2.5,
    semanticType: 'Wedge',
    label: 'Inclined Wedge Incline',
    properties: { angle: 'theta' }
  },
  {
    id: 'block_1',
    snapshotId: 'snap_ramp_1',
    type: 'rectangle',
    x: 270,
    y: 310,
    width: 75,
    height: 50,
    color: '#1e293b',
    thickness: 2.5,
    semanticType: 'Block',
    label: 'Mass Block',
    properties: { mass: 'm', resting_on: 'wedge_1' }
  },
  {
    id: 'text_theta',
    snapshotId: 'snap_ramp_1',
    type: 'text',
    x: 180,
    y: 480,
    text: 'θ',
    color: '#a855f7',
    thickness: 1,
    semanticType: 'AngleLabel',
    label: 'Slope Angle θ'
  },
  {
    id: 'text_m',
    snapshotId: 'snap_ramp_1',
    type: 'text',
    x: 300,
    y: 280,
    text: 'm',
    color: '#1e293b',
    thickness: 1,
    semanticType: 'Label',
    label: 'Mass Label'
  }
];

export default function App() {
  const [snapshots, setSnapshots] = useState<WhiteboardSnapshot[]>(INITIAL_SNAP);
  const [objects, setObjects] = useState<WhiteboardObject[]>(INITIAL_OBJ);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>('snap_ramp_1');
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Side Panel Collapsible States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);

  // Undo/Redo History States
  const [history, setHistory] = useState<{
    past: { snapshots: WhiteboardSnapshot[]; objects: WhiteboardObject[]; activeSnapshotId: string | null }[];
    future: { snapshots: WhiteboardSnapshot[]; objects: WhiteboardObject[]; activeSnapshotId: string | null }[];
  }>({ past: [], future: [] });

  const stateRef = useRef({ snapshots, objects, activeSnapshotId });
  useEffect(() => {
    stateRef.current = { snapshots, objects, activeSnapshotId };
  }, [snapshots, objects, activeSnapshotId]);

  const pushStateToHistory = () => {
    const { snapshots: snaps, objects: objs, activeSnapshotId: activeId } = stateRef.current;
    setHistory((prev) => {
      // Avoid pushing identical states consecutively
      if (prev.past.length > 0) {
        const last = prev.past[prev.past.length - 1];
        if (
          JSON.stringify(last.snapshots) === JSON.stringify(snaps) &&
          JSON.stringify(last.objects) === JSON.stringify(objs) &&
          last.activeSnapshotId === activeId
        ) {
          return prev;
        }
      }
      return {
        past: [...prev.past, { snapshots: snaps, objects: objs, activeSnapshotId: activeId }],
        future: [],
      };
    });
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previousState = prev.past[prev.past.length - 1];
      const remainingPast = prev.past.slice(0, -1);
      
      const currentState = stateRef.current;
      const newFuture = [
        { snapshots: currentState.snapshots, objects: currentState.objects, activeSnapshotId: currentState.activeSnapshotId },
        ...prev.future,
      ];

      setSnapshots(previousState.snapshots);
      setObjects(previousState.objects);
      setActiveSnapshotId(previousState.activeSnapshotId);

      return {
        past: remainingPast,
        future: newFuture,
      };
    });
  };

  const handleRedo = () => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const nextState = prev.future[0];
      const remainingFuture = prev.future.slice(1);

      const currentState = stateRef.current;
      const newPast = [
        ...prev.past,
        { snapshots: currentState.snapshots, objects: currentState.objects, activeSnapshotId: currentState.activeSnapshotId },
      ];

      setSnapshots(nextState.snapshots);
      setObjects(nextState.objects);
      setActiveSnapshotId(nextState.activeSnapshotId);

      return {
        past: newPast,
        future: remainingFuture,
      };
    });
  };

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When an object is selected, automatically expand properties panel
  useEffect(() => {
    if (selectedObjectId) {
      setIsPropertiesOpen(true);
    }
  }, [selectedObjectId]);

  // Active drawing settings
  const [tool, setTool] = useState<'select' | 'rectangle' | 'triangle' | 'circle' | 'arrow' | 'text' | 'pencil' | 'curve'>('select');
  const [color, setColor] = useState<string>('#1e293b');
  const [thickness, setThickness] = useState<number>(2.5);

  // AI Tutor chat & generation state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Welcome message
  useEffect(() => {
    setChatHistory([
      {
        id: 'welcome',
        sender: 'tutor',
        text: "Hi there! I am your **AI Whiteboard Tutor**. Today we can study physics and mathematics together.\n\nI teach by constructing a **chain of reasoning across snapshots** on the board. You can select drawing tools at the top to draw your own ideas, label them, or simply ask me a question in the chat! Let's get started.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  }, []);

  // Preset loaders for lessons
  const handleLoadLessonPreset = (presetName: 'plane' | 'orbit' | 'pendulum') => {
    let newSnaps: WhiteboardSnapshot[] = [];
    let newObjs: WhiteboardObject[] = [];
    let activeId = '';
    let tutorMsg = '';

    if (presetName === 'plane') {
      activeId = 'snap_ramp_1';
      newSnaps = INITIAL_SNAP;
      newObjs = INITIAL_OBJ;
      tutorMsg = "I've reset our whiteboard to a fresh **Inclined Plane Wedge** system. We have a mass block resting on a wedge at angle `θ`. Ask me to: `Draw gravity and normal forces`, and let's study!";
    } else if (presetName === 'orbit') {
      activeId = 'snap_orbit_1';
      newSnaps = [
        {
          id: 'snap_orbit_1',
          title: '1. Satellite Orbit Gravity',
          description: 'A satellite revolves around a heavy center planet at radius r. Let\'s draw centripetal pulls and study orbital velocity vectors.',
          index: 0,
          x: 50,
          y: 100,
          width: 680,
          height: 480,
        }
      ];
      newObjs = [
        {
          id: 'planet_1',
          snapshotId: 'snap_orbit_1',
          type: 'circle',
          x: 390,
          y: 340,
          radius: 45,
          color: '#3b82f6',
          thickness: 3,
          semanticType: 'Planet',
          label: 'Center Heavy Planet'
        },
        {
          id: 'orbit_path_1',
          snapshotId: 'snap_orbit_1',
          type: 'circle',
          x: 390,
          y: 340,
          radius: 160,
          color: '#94a3b8',
          thickness: 1,
          semanticType: 'OrbitPath',
          label: 'Orbital Path Orbit'
        },
        {
          id: 'satellite_1',
          snapshotId: 'snap_orbit_1',
          type: 'circle',
          x: 550,
          y: 340,
          radius: 14,
          color: '#1e293b',
          thickness: 2,
          semanticType: 'Satellite',
          label: 'Orbiting Satellite'
        },
        {
          id: 'text_r',
          snapshotId: 'snap_orbit_1',
          type: 'text',
          x: 460,
          y: 325,
          text: 'radius r',
          color: '#64748b',
          thickness: 1,
          semanticType: 'Label'
        }
      ];
      tutorMsg = "Welcome to the **Satellite Orbit Gravity** lesson! We have a satellite orbiting a central massive planet. Ask me to: `Show gravity and velocity vectors` to begin.";
    } else if (presetName === 'pendulum') {
      activeId = 'snap_pend_1';
      newSnaps = [
        {
          id: 'snap_pend_1',
          title: '1. Simple Pendulum System',
          description: 'A pendulum bob mass m is suspended by a string of length L. Let\'s analyze tension and gravitational forces at maximum displacement θ.',
          index: 0,
          x: 50,
          y: 100,
          width: 680,
          height: 480,
        }
      ];
      newObjs = [
        {
          id: 'ceiling_1',
          snapshotId: 'snap_pend_1',
          type: 'rectangle',
          x: 290,
          y: 160,
          width: 200,
          height: 10,
          color: '#475569',
          thickness: 2,
          semanticType: 'Ceiling',
          label: 'Fixed Rigid Ceiling'
        },
        {
          id: 'bob_1',
          snapshotId: 'snap_pend_1',
          type: 'circle',
          x: 460,
          y: 360,
          radius: 20,
          color: '#1e293b',
          thickness: 2.5,
          semanticType: 'Bob',
          label: 'Pendulum Bob Bob'
        },
        {
          id: 'string_1',
          snapshotId: 'snap_pend_1',
          type: 'arrow',
          x1: 390,
          y1: 170,
          x2: 460,
          y2: 360,
          color: '#64748b',
          thickness: 1.5,
          semanticType: 'TensionVector',
          label: 'Suspension String'
        },
        {
          id: 'text_L',
          snapshotId: 'snap_pend_1',
          type: 'text',
          x: 405,
          y: 265,
          text: 'Length L',
          color: '#64748b',
          thickness: 1,
          semanticType: 'Label'
        }
      ];
      tutorMsg = "Welcome to the **Simple Pendulum** lesson! The pendulum is currently pulled to the side at angle `θ`. Ask me to: `Draw tension and gravitation vectors` to study mechanical equilibrium.";
    }

    pushStateToHistory();
    setSnapshots(newSnaps);
    setObjects(newObjs);
    setActiveSnapshotId(activeId);
    setSelectedObjectId(null);
    setChatHistory((prev) => [
      ...prev,
      {
        id: `preset_${Date.now()}`,
        sender: 'tutor',
        text: tutorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  // Safe object updates
  const handleUpdateObject = (updated: WhiteboardObject) => {
    pushStateToHistory();
    setObjects(objects.map((obj) => (obj.id === updated.id ? updated : obj)));
  };

  // Delete/erase an object
  const handleDeleteObject = (id: string) => {
    pushStateToHistory();
    setObjects(objects.filter((obj) => obj.id !== id));
    if (selectedObjectId === id) setSelectedObjectId(null);
  };

  // Erase all shapes in the active snapshot
  const handleClearSnapshot = () => {
    if (!activeSnapshotId) return;
    pushStateToHistory();
    setObjects(objects.filter((obj) => obj.snapshotId !== activeSnapshotId));
    setSelectedObjectId(null);
  };

  // Main state-aware client-server tutor chat communication handler
  const handleSendMessageWithState = async (
    msg: string,
    currentSnaps = snapshots,
    currentActiveId = activeSnapshotId,
    currentObjs = objects,
    currentHistory = chatHistory
  ) => {
    const studentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentMsg: ChatMessage = {
      id: `student_${Date.now()}`,
      sender: 'student',
      text: msg,
      timestamp: studentTime,
    };

    const updatedHistory = [...currentHistory, studentMsg];
    setChatHistory(updatedHistory);
    setIsGenerating(true);

    // Convert absolute coordinates to relative ones for the tutor API
    const relativeObjects = currentObjs.map((obj) => {
      const snap = currentSnaps.find((s) => s.id === obj.snapshotId);
      const snapX = snap ? snap.x : 0;
      const snapY = snap ? snap.y : 0;
      return {
        ...obj,
        x: obj.x !== undefined ? obj.x - snapX : undefined,
        y: obj.y !== undefined ? obj.y - snapY : undefined,
        x1: obj.x1 !== undefined ? obj.x1 - snapX : undefined,
        y1: obj.y1 !== undefined ? obj.y1 - snapY : undefined,
        x2: obj.x2 !== undefined ? obj.x2 - snapX : undefined,
        y2: obj.y2 !== undefined ? obj.y2 - snapY : undefined,
        points: obj.points ? obj.points.map((p) => ({ x: p.x - snapX, y: p.y - snapY })) : undefined,
      };
    });

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshots: currentSnaps,
          activeSnapshotId: currentActiveId,
          objects: relativeObjects,
          chatHistory: updatedHistory,
          studentMessage: msg,
        }),
      });

      if (!response.ok) {
        throw new Error('Tutor API server failed. Please check if GEMINI_API_KEY is configured.');
      }

      const data = await response.json();
      const tutorTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Execute tutor actions sequentially to modify whiteboard state using custom lists
      if (data.actions && data.actions.length > 0) {
        executeTutorActions(data.actions, currentSnaps, currentObjs, currentActiveId);
      }

      const tutorMsg: ChatMessage = {
        id: `tutor_${Date.now()}`,
        sender: 'tutor',
        text: data.message || "I've updated the whiteboard. Take a look at the reasoning steps!",
        timestamp: tutorTime,
        actionsPerformed: data.actions || [],
      };

      setChatHistory((prev) => [...prev, tutorMsg]);
    } catch (err: any) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'tutor',
          text: `⚠️ **Unable to reach the AI Tutor:** ${err.message || "Unknown error"}.\n\nPlease ensure you have added a valid \`GEMINI_API_KEY\` in **Settings > Secrets** so the tutor can compute drawings and explanations.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (msg: string) => {
    await handleSendMessageWithState(msg, snapshots, activeSnapshotId, objects, chatHistory);
  };

  // Start fresh with a new concept
  const handleStartFresh = (topic: string) => {
    pushStateToHistory();

    const freshSnapId = `snap_${Date.now()}`;
    const firstSnap: WhiteboardSnapshot = {
      id: freshSnapId,
      title: '1. Overview',
      description: `We are starting a fresh whiteboard study session on:\n\n**${topic}**.\n\nAsk me questions or request drawings to learn more!`,
      index: 0,
      x: 50,
      y: 100,
      width: 680,
      height: 480,
    };

    setSnapshots([firstSnap]);
    setObjects([]);
    setActiveSnapshotId(freshSnapId);
    setSelectedObjectId(null);

    const freshWelcome: ChatMessage = {
      id: `fresh_welcome_${Date.now()}`,
      sender: 'tutor',
      text: `Let's start fresh and learn about: **${topic}**!\n\nI am analyzing the topic to draw appropriate concept illustrations on our first snapshot diagram. One moment...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const initialHistory = [freshWelcome];
    setChatHistory(initialHistory);

    // Prompt the AI to begin teaching this topic with drawing commands
    handleSendMessageWithState(
      `Please introduce the concept of "${topic}". Setup 1 or 2 diagram snapshots with beautiful physics blocks, vectors, and text labels to explain it from scratch.`,
      [firstSnap],
      freshSnapId,
      [],
      initialHistory
    );
  };

  // State sequencer to modify snapshots/objects based on AI commands
  const executeTutorActions = (
    actions: TutorAction[],
    currentSnaps = snapshots,
    currentObjs = objects,
    currentActiveId = activeSnapshotId
  ) => {
    pushStateToHistory();
    let updatedSnaps = [...currentSnaps];
    let updatedObjs = [...currentObjs];
    let lastSnapId = currentActiveId;

    // Track map of IDs to link new objects correctly
    const idMap = new Map<string, string>();

    actions.forEach((action) => {
      switch (action.type) {
        case 'CREATE_SNAPSHOT': {
          const newIndex = updatedSnaps.length;
          const newId = action.payload.id || `snap_ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          if (action.payload.id) idMap.set(action.payload.id, newId);

          const lastSnap = updatedSnaps[updatedSnaps.length - 1];
          const newX = lastSnap ? lastSnap.x + lastSnap.width + 160 : 50;
          const newY = lastSnap ? lastSnap.y : 100;

          const newSnap: WhiteboardSnapshot = {
            id: newId,
            title: action.payload.title || `${newIndex + 1}. Reasoning Step`,
            description: action.payload.description || '',
            index: newIndex,
            x: newX,
            y: newY,
            width: 680,
            height: 480,
          };
          updatedSnaps.push(newSnap);
          lastSnapId = newId;
          break;
        }

        case 'DUPLICATE_SNAPSHOT': {
          const sourceId = action.payload.sourceSnapshotId || lastSnapId;
          const sourceSnap = updatedSnaps.find((s) => s.id === sourceId || s.title.includes(sourceId));
          // Default to latest snapshot if not found directly
          const actualSource = sourceSnap || updatedSnaps[updatedSnaps.length - 1];
          if (!actualSource) break;

          const newIndex = updatedSnaps.length;
          const newId = action.payload.id || `snap_ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          if (action.payload.id) idMap.set(action.payload.id, newId);

          const lastSnap = updatedSnaps[updatedSnaps.length - 1];
          const newX = lastSnap ? lastSnap.x + lastSnap.width + 160 : 50;
          const newY = lastSnap ? lastSnap.y : 100;

          const newSnap: WhiteboardSnapshot = {
            id: newId,
            title: action.payload.title || `${newIndex + 1}. Reasoning Step`,
            description: action.payload.description || '',
            index: newIndex,
            x: newX,
            y: newY,
            width: actualSource.width,
            height: actualSource.height,
          };

          const dx = newX - actualSource.x;
          const dy = newY - actualSource.y;

          // Copy all objects belonging to source snapshot and shift them absolutely
          const duplicatedObjects = updatedObjs
            .filter((obj) => obj.snapshotId === actualSource.id)
            .map((obj) => {
              const originalId = obj.id;
              const duplicateId = `${obj.type}_ai_dup_${Math.random().toString(36).substr(2, 4)}`;
              idMap.set(originalId, duplicateId);

              return {
                ...obj,
                id: duplicateId,
                snapshotId: newId,
                x: obj.x !== undefined ? obj.x + dx : undefined,
                y: obj.y !== undefined ? obj.y + dy : undefined,
                x1: obj.x1 !== undefined ? obj.x1 + dx : undefined,
                y1: obj.y1 !== undefined ? obj.y1 + dy : undefined,
                x2: obj.x2 !== undefined ? obj.x2 + dx : undefined,
                y2: obj.y2 !== undefined ? obj.y2 + dy : undefined,
                points: obj.points ? obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
              };
            });

          updatedSnaps.push(newSnap);
          updatedObjs = [...updatedObjs, ...duplicatedObjects];
          lastSnapId = newId;
          break;
        }

        case 'UPDATE_SNAPSHOT_METADATA': {
          const targetId = action.payload.snapshotId || lastSnapId;
          updatedSnaps = updatedSnaps.map((s) => {
            if (s.id !== targetId) return s;
            return {
              ...s,
              title: action.payload.title !== undefined ? action.payload.title : s.title,
              description: action.payload.description !== undefined ? action.payload.description : s.description,
            };
          });
          break;
        }

        case 'CREATE_OBJECT': {
          let targetSnapId = action.payload.snapshotId;
          if (targetSnapId === 'newly_created' || !targetSnapId) {
            targetSnapId = lastSnapId;
          } else {
            targetSnapId = idMap.get(targetSnapId) || targetSnapId;
          }

          if (!targetSnapId) break;

          const originalId = action.payload.id || `${action.payload.type}_ai_${Date.now()}`;
          const realId = `${action.payload.type}_ai_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          idMap.set(originalId, realId);

          const snap = updatedSnaps.find((s) => s.id === targetSnapId);
          const snapX = snap ? snap.x : 0;
          const snapY = snap ? snap.y : 0;

          // Map relationships
          const properties = { ...(action.payload.properties || {}) };
          if (properties.attached_to && idMap.has(properties.attached_to)) {
            properties.attached_to = idMap.get(properties.attached_to);
          }
          if (properties.resting_on && idMap.has(properties.resting_on)) {
            properties.resting_on = idMap.get(properties.resting_on);
          }
          if (properties.refers_to && idMap.has(properties.refers_to)) {
            properties.refers_to = idMap.get(properties.refers_to);
          }

          // Convert relative incoming coords to absolute
          const absX = action.payload.x !== undefined ? action.payload.x + snapX : undefined;
          const absY = action.payload.y !== undefined ? action.payload.y + snapY : undefined;
          const absX1 = action.payload.x1 !== undefined ? action.payload.x1 + snapX : undefined;
          const absY1 = action.payload.y1 !== undefined ? action.payload.y1 + snapY : undefined;
          const absX2 = action.payload.x2 !== undefined ? action.payload.x2 + snapX : undefined;
          const absY2 = action.payload.y2 !== undefined ? action.payload.y2 + snapY : undefined;
          const absPoints = action.payload.points
            ? action.payload.points.map((p: any) => ({ x: p.x + snapX, y: p.y + snapY }))
            : undefined;

          const newObj: WhiteboardObject = {
            id: realId,
            snapshotId: targetSnapId,
            type: action.payload.type,
            x: absX,
            y: absY,
            width: action.payload.width,
            height: action.payload.height,
            radius: action.payload.radius,
            x1: absX1,
            y1: absY1,
            x2: absX2,
            y2: absY2,
            text: action.payload.text,
            points: absPoints,
            color: action.payload.color || '#1e293b',
            thickness: action.payload.thickness || 2,
            semanticType: action.payload.semanticType,
            label: action.payload.label,
            properties,
          };
          updatedObjs.push(newObj);
          break;
        }

        case 'UPDATE_OBJECT': {
          const targetObjId = idMap.get(action.payload.id) || action.payload.id;
          updatedObjs = updatedObjs.map((obj) => {
            if (obj.id !== targetObjId) return obj;

            const snap = updatedSnaps.find((s) => s.id === obj.snapshotId);
            const snapX = snap ? snap.x : 0;
            const snapY = snap ? snap.y : 0;

            const properties = { ...(obj.properties || {}), ...(action.payload.properties || {}) };
            if (properties.attached_to && idMap.has(properties.attached_to)) {
              properties.attached_to = idMap.get(properties.attached_to);
            }

            // Convert relative incoming coords to absolute
            const absX = action.payload.x !== undefined ? action.payload.x + snapX : obj.x;
            const absY = action.payload.y !== undefined ? action.payload.y + snapY : obj.y;
            const absX1 = action.payload.x1 !== undefined ? action.payload.x1 + snapX : obj.x1;
            const absY1 = action.payload.y1 !== undefined ? action.payload.y1 + snapY : obj.y1;
            const absX2 = action.payload.x2 !== undefined ? action.payload.x2 + snapX : obj.x2;
            const absY2 = action.payload.y2 !== undefined ? action.payload.y2 + snapY : obj.y2;
            const absPoints = action.payload.points
              ? action.payload.points.map((p: any) => ({ x: p.x + snapX, y: p.y + snapY }))
              : obj.points;

            return {
              ...obj,
              ...action.payload,
              id: targetObjId,
              x: absX,
              y: absY,
              x1: absX1,
              y1: absY1,
              x2: absX2,
              y2: absY2,
              points: absPoints,
              properties,
            };
          });
          break;
        }

        case 'DELETE_OBJECT': {
          const targetObjId = idMap.get(action.payload.id) || action.payload.id;
          updatedObjs = updatedObjs.filter((obj) => obj.id !== targetObjId);
          break;
        }

        case 'HIGHLIGHT_OBJECT': {
          const targetObjId = idMap.get(action.payload.id) || action.payload.id;
          setSelectedObjectId(targetObjId);
          break;
        }

        default:
          break;
      }
    });

    setSnapshots(updatedSnaps);
    setObjects(updatedObjs);
    if (lastSnapId) {
      setActiveSnapshotId(lastSnapId);
    }
  };

  const selectedObject = objects.find((o) => o.id === selectedObjectId) || null;
  const allObjectsInSnapshot = objects.filter((o) => o.snapshotId === activeSnapshotId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-800 font-sans relative" id="app_root">
      {/* Tutor sidebar Chat panel */}
      {isSidebarOpen ? (
        <TutorSidebar
          chatHistory={chatHistory}
          isGenerating={isGenerating}
          onSendMessage={handleSendMessage}
          onLoadLessonPreset={handleLoadLessonPreset}
          activeSnapshotId={activeSnapshotId}
          snapshots={snapshots}
          onCollapse={() => setIsSidebarOpen(false)}
          onStartFresh={handleStartFresh}
        />
      ) : (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-30 p-2 bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-lg text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
          title="Show Sidebar Tutor"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Floating Toolbar for student tools */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur shadow-md px-3 py-1.5 rounded-full border border-slate-200">
          <button
            onClick={() => { setTool('select'); setSelectedObjectId(null); }}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'select' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Select & Move Objects"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          <button
            onClick={() => setTool('rectangle')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'rectangle' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Block (Rectangle)"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('triangle')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'triangle' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Incline Wedge (Triangle)"
          >
            <TriangleIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('circle')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'circle' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Particle / Bob (Circle)"
          >
            <CircleIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('arrow')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'arrow' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Force / Velocity Vector (Arrow)"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('pencil')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'pencil' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Sketches (Freehand)"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('curve')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'curve' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Draw Curved Line / Trajectory (Curve)"
          >
            <Spline className="w-4 h-4" />
          </button>

          <button
            onClick={() => setTool('text')}
            className={`p-1.5 rounded-full transition-all ${
              tool === 'text' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Add Equation or Text Label (Double-click Canvas)"
          >
            <TextIcon className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Color pickers */}
          <div className="flex gap-1 px-1">
            {['#1e293b', '#ef4444', '#3b82f6', '#10b981', '#a855f7'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-4 h-4 rounded-full border border-white shadow-sm hover:scale-110 transition-all ${
                  color === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          {/* Undo and Redo operations */}
          <button
            onClick={handleUndo}
            disabled={history.past.length === 0}
            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={history.future.length === 0}
            className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          <button
            onClick={handleClearSnapshot}
            disabled={!activeSnapshotId}
            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-full transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            title="Clear Current Board snapshot"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Selected Snapshot Name indicator */}
        <div className="absolute top-16 left-6 z-10 flex items-center gap-1.5 bg-slate-900 text-white px-3 py-1 rounded-full text-xs shadow">
          <BookOpen className="w-3.5 h-3.5" />
          <span>
            Active Snapshot: <strong className="font-semibold text-indigo-300">
              {snapshots.find((s) => s.id === activeSnapshotId)?.title || "None Selected"}
            </strong>
          </span>
        </div>

        {/* Whiteboard canvas viewport */}
        <WhiteboardCanvas
          snapshots={snapshots}
          objects={objects}
          activeSnapshotId={activeSnapshotId}
          selectedObjectId={selectedObjectId}
          tool={tool}
          color={color}
          thickness={thickness}
          onSnapshotsChange={setSnapshots}
          onObjectsChange={setObjects}
          onSelectSnapshot={setActiveSnapshotId}
          onSelectObject={setSelectedObjectId}
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onActionStart={pushStateToHistory}
        />
      </div>

      {/* Semantic properties edit inspector */}
      {isPropertiesOpen ? (
        <PropertiesPanel
          selectedObject={selectedObject}
          allObjectsInSnapshot={allObjectsInSnapshot}
          onUpdateObject={handleUpdateObject}
          onDeleteObject={handleDeleteObject}
          onCollapse={() => setIsPropertiesOpen(false)}
        />
      ) : (
        <button
          onClick={() => setIsPropertiesOpen(true)}
          className="absolute top-4 right-4 z-30 p-2 bg-white/95 backdrop-blur border border-slate-200 shadow-md rounded-lg text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
          title="Show Properties Panel"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
