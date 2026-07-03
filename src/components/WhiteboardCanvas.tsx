import React, { useState, useRef, useEffect } from 'react';
import { WhiteboardSnapshot, WhiteboardObject, ObjectType } from '../types';
import { MousePointer, Square, Triangle as TriangleIcon, Circle as CircleIcon, ArrowRight, Type as TextIcon, Edit2, ZoomIn, ZoomOut, Maximize2, Plus, ArrowUpRight, Link } from 'lucide-react';
import { KatexRenderer } from './KatexRenderer';

interface WhiteboardCanvasProps {
  snapshots: WhiteboardSnapshot[];
  objects: WhiteboardObject[];
  activeSnapshotId: string | null;
  selectedObjectId: string | null;
  tool: 'select' | 'rectangle' | 'triangle' | 'circle' | 'arrow' | 'text' | 'pencil';
  color: string;
  thickness: number;
  onSnapshotsChange: (s: WhiteboardSnapshot[]) => void;
  onObjectsChange: (o: WhiteboardObject[]) => void;
  onSelectSnapshot: (id: string) => void;
  onSelectObject: (id: string | null) => void;
  onSendMessage?: (msg: string) => void;
  isGenerating?: boolean;
  onActionStart?: () => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  snapshots,
  objects,
  activeSnapshotId,
  selectedObjectId,
  tool,
  color,
  thickness,
  onSnapshotsChange,
  onObjectsChange,
  onSelectSnapshot,
  onSelectObject,
  onSendMessage,
  isGenerating = false,
  onActionStart,
}) => {
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.9);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [spacePressed, setSpacePressed] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [dragObject, setDragObject] = useState<{ id: string; startX: number; startY: number; initialCoords: any } | null>(null);
  const [resizeObject, setResizeObject] = useState<{ id: string; type: 'rect' | 'arrow-end' | 'arrow-start' | 'circle'; startX: number; startY: number; initialCoords: any } | null>(null);
  
  // State for dragging snapshots themselves
  const [dragSnapshot, setDragSnapshot] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialObjects: WhiteboardObject[];
  } | null>(null);

  // Dictionary to store custom follow up questions per snapshot/diagram
  const [followUpTexts, setFollowUpTexts] = useState<Record<string, string>>({});

  // Freehand drawing points
  const [pencilPoints, setPencilPoints] = useState<{ x: number; y: number }[]>([]);
  // Temp shapes while drawing
  const [tempShape, setTempShape] = useState<any>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Global keydown event listener to delete selected objects on Backspace/Delete keypresses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when the user is typing in forms, inputs, or textareas
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectId) {
          onObjectsChange(objects.filter((obj) => obj.id !== selectedObjectId));
          onSelectObject(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, objects, onObjectsChange, onSelectObject]);

  // Spacebar listener for hand/pan tool shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }

      if (e.code === 'Space') {
        setSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Get mouse coordinates relative to the zoomed and panned canvas
  const getCanvasCoords = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;
    return { x, y };
  };

  // Find which snapshot a canvas coordinate belongs to
  const findSnapshotAtCoords = (x: number, y: number): WhiteboardSnapshot | null => {
    for (const snap of snapshots) {
      if (
        x >= snap.x &&
        x <= snap.x + snap.width &&
        y >= snap.y &&
        y <= snap.y + snap.height
      ) {
        return snap;
      }
    }
    return null;
  };

  // Start dragging a snapshot and capture initial positions of its children objects
  const handleSnapshotDragStart = (snapId: string) => (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    onSelectSnapshot(snapId);
    onSelectObject(null);
    onActionStart?.();
    const startCoords = getCanvasCoords(e);
    const snap = snapshots.find((s) => s.id === snapId);
    if (snap) {
      const snapObjects = objects.filter((o) => o.snapshotId === snapId);
      setDragSnapshot({
        id: snapId,
        startX: startCoords.x,
        startY: startCoords.y,
        initialX: snap.x,
        initialY: snap.y,
        initialObjects: snapObjects,
      });
    }
    e.stopPropagation();
  };

  // Handle wheel scrolling to zoom in/out of the storyboard
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Zoom intensity factor
    const zoomIntensity = 0.05;
    
    // Zoom in or out based on deltaY direction
    let newScale = scale;
    if (e.deltaY < 0) {
      newScale = Math.min(3.0, scale + zoomIntensity);
    } else {
      newScale = Math.max(0.2, scale - zoomIntensity);
    }
    
    // Smooth zoom focused on the mouse pointer position
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const prevScale = scale;
      setScale(newScale);
      
      const ratio = newScale / prevScale;
      setPanX(mouseX - (mouseX - panX) * ratio);
      setPanY(mouseY - (mouseY - panY) * ratio);
    }
  };

  // Pan actions
  const handleMouseDown = (e: React.MouseEvent) => {
    const isBackground =
      e.target === svgRef.current ||
      (e.target as Element)?.id === 'grid-background' ||
      (e.target as Element)?.tagName === 'svg';

    // Left click with select tool on background, or when space is pressed, or middle click to pan
    if (e.button === 1 || spacePressed || (tool === 'select' && isBackground)) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panX, y: e.clientY - panY };
      e.preventDefault();
      return;
    }

    const coords = getCanvasCoords(e);
    let targetSnap = findSnapshotAtCoords(coords.x, coords.y);

    if (tool !== 'select') {
      onActionStart?.();
      let targetSnapId = '';

      if (!targetSnap) {
        // Create a new snapshot centered at the current click point
        const newIndex = snapshots.length;
        const newId = `snapshot_${Date.now()}`;
        const snapX = Math.round(coords.x - 340);
        const snapY = Math.round(coords.y - 240);
        const newSnapshot: WhiteboardSnapshot = {
          id: newId,
          title: `${newIndex + 1}. Diagram ${newIndex + 1}`,
          description: `Created at board location (${coords.x.toFixed(0)}, ${coords.y.toFixed(0)}).`,
          index: newIndex,
          x: snapX,
          y: snapY,
          width: 680,
          height: 480,
        };
        onSnapshotsChange([...snapshots, newSnapshot]);
        onSelectSnapshot(newId);
        targetSnapId = newId;
      } else {
        targetSnapId = targetSnap.id;
      }

      // Start drawing inside the target snapshot
      setIsDrawing(true);
      onSelectSnapshot(targetSnapId);
      
      const absX = coords.x;
      const absY = coords.y;

      if (tool === 'pencil') {
        setPencilPoints([{ x: absX, y: absY }]);
      } else {
        setTempShape({
          x1: absX,
          y1: absY,
          x2: absX,
          y2: absY,
          x: absX,
          y: absY,
          width: 0,
          height: 0,
          radius: 0,
        });
      }
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanX(e.clientX - panStartRef.current.x);
      setPanY(e.clientY - panStartRef.current.y);
      return;
    }

    const coords = getCanvasCoords(e);

    // If dragging a snapshot/diagram card
    if (dragSnapshot) {
      const dx = coords.x - dragSnapshot.startX;
      const dy = coords.y - dragSnapshot.startY;

      const updatedSnapshots = snapshots.map((snap) => {
        if (snap.id !== dragSnapshot.id) return snap;
        return {
          ...snap,
          x: Math.round(dragSnapshot.initialX + dx),
          y: Math.round(dragSnapshot.initialY + dy),
        };
      });
      onSnapshotsChange(updatedSnapshots);

      const updatedObjects = objects.map((obj) => {
        const initialObj = dragSnapshot.initialObjects.find((io) => io.id === obj.id);
        if (!initialObj) return obj;

        if (obj.type === 'arrow') {
          return {
            ...obj,
            x1: (initialObj.x1 || 0) + dx,
            y1: (initialObj.y1 || 0) + dy,
            x2: (initialObj.x2 || 0) + dx,
            y2: (initialObj.y2 || 0) + dy,
          };
        } else if (obj.type === 'curve') {
          return {
            ...obj,
            x1: (initialObj.x1 || 0) + dx,
            y1: (initialObj.y1 || 0) + dy,
            x2: (initialObj.x2 || 0) + dx,
            y2: (initialObj.y2 || 0) + dy,
            qx: (initialObj.qx || 0) + dx,
            qy: (initialObj.qy || 0) + dy,
          };
        } else if (obj.type === 'pencil') {
          const points = (initialObj.points || []).map((p: any) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
          return { ...obj, points };
        } else {
          return {
            ...obj,
            x: (initialObj.x || 0) + dx,
            y: (initialObj.y || 0) + dy,
          };
        }
      });
      onObjectsChange(updatedObjects);
      return;
    }

    // If dragging an object
    if (dragObject) {
      const dx = coords.x - dragObject.startX;
      const dy = coords.y - dragObject.startY;

      const updatedObjects = objects.map((obj) => {
        if (obj.id !== dragObject.id) return obj;
        if (obj.type === 'arrow') {
          return {
            ...obj,
            x1: dragObject.initialCoords.x1 + dx,
            y1: dragObject.initialCoords.y1 + dy,
            x2: dragObject.initialCoords.x2 + dx,
            y2: dragObject.initialCoords.y2 + dy,
          };
        } else if (obj.type === 'curve') {
          return {
            ...obj,
            x1: dragObject.initialCoords.x1 + dx,
            y1: dragObject.initialCoords.y1 + dy,
            x2: dragObject.initialCoords.x2 + dx,
            y2: dragObject.initialCoords.y2 + dy,
            qx: dragObject.initialCoords.qx + dx,
            qy: dragObject.initialCoords.qy + dy,
          };
        } else if (obj.type === 'pencil') {
          const points = dragObject.initialCoords.points.map((p: any) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
          return { ...obj, points };
        } else {
          return {
            ...obj,
            x: dragObject.initialCoords.x + dx,
            y: dragObject.initialCoords.y + dy,
          };
        }
      });
      onObjectsChange(updatedObjects);
      return;
    }

    // If resizing an object
    if (resizeObject) {
      const dx = coords.x - resizeObject.startX;
      const dy = coords.y - resizeObject.startY;

      const updatedObjects = objects.map((obj) => {
        if (obj.id !== resizeObject.id) return obj;
        if (resizeObject.type === 'rect') {
          return {
            ...obj,
            width: Math.max(10, resizeObject.initialCoords.width + dx),
            height: Math.max(10, resizeObject.initialCoords.height + dy),
          };
        } else if (resizeObject.type === 'circle') {
          return {
            ...obj,
            radius: Math.max(5, resizeObject.initialCoords.radius + dx),
          };
        } else if (resizeObject.type === 'arrow-end') {
          return {
            ...obj,
            x2: resizeObject.initialCoords.x2 + dx,
            y2: resizeObject.initialCoords.y2 + dy,
          };
        } else if (resizeObject.type === 'arrow-start') {
          return {
            ...obj,
            x1: resizeObject.initialCoords.x1 + dx,
            y1: resizeObject.initialCoords.y1 + dy,
          };
        } else if (resizeObject.type === 'curve-start') {
          return {
            ...obj,
            x1: resizeObject.initialCoords.x1 + dx,
            y1: resizeObject.initialCoords.y1 + dy,
          };
        } else if (resizeObject.type === 'curve-end') {
          return {
            ...obj,
            x2: resizeObject.initialCoords.x2 + dx,
            y2: resizeObject.initialCoords.y2 + dy,
          };
        } else if (resizeObject.type === 'curve-control') {
          return {
            ...obj,
            qx: resizeObject.initialCoords.qx + dx,
            qy: resizeObject.initialCoords.qy + dy,
          };
        }
        return obj;
      });
      onObjectsChange(updatedObjects);
      return;
    }

    // If drawing a new object
    if (isDrawing && activeSnapshotId) {
      const activeSnap = snapshots.find((s) => s.id === activeSnapshotId);
      if (!activeSnap) return;

      const absX = coords.x;
      const absY = coords.y;

      if (tool === 'pencil') {
        setPencilPoints((prev) => [...prev, { x: absX, y: absY }]);
      } else if (tempShape) {
        if (tool === 'arrow' || tool === 'curve') {
          setTempShape({ ...tempShape, x2: absX, y2: absY });
        } else if (tool === 'rectangle') {
          const w = absX - tempShape.x1;
          const h = absY - tempShape.y1;
          setTempShape({
            ...tempShape,
            x: w < 0 ? absX : tempShape.x1,
            y: h < 0 ? absY : tempShape.y1,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        } else if (tool === 'triangle') {
          const w = absX - tempShape.x1;
          const h = absY - tempShape.y1;
          setTempShape({
            ...tempShape,
            x: w < 0 ? absX : tempShape.x1,
            y: h < 0 ? absY : tempShape.y1,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        } else if (tool === 'circle') {
          const dx = absX - tempShape.x1;
          const dy = absY - tempShape.y1;
          const r = Math.sqrt(dx * dx + dy * dy);
          setTempShape({
            ...tempShape,
            radius: r,
          });
        }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);

    if (dragSnapshot) {
      setDragSnapshot(null);
      return;
    }

    if (dragObject) {
      // Re-evaluate snapshotId based on new center of the object
      const draggedObj = objects.find((o) => o.id === dragObject.id);
      if (draggedObj) {
        let cx = 0;
        let cy = 0;
        if (draggedObj.type === 'arrow') {
          cx = ((draggedObj.x1 || 0) + (draggedObj.x2 || 0)) / 2;
          cy = ((draggedObj.y1 || 0) + (draggedObj.y2 || 0)) / 2;
        } else if (draggedObj.type === 'curve') {
          cx = ((draggedObj.x1 || 0) + (draggedObj.x2 || 0) + (draggedObj.qx || 0)) / 3;
          cy = ((draggedObj.y1 || 0) + (draggedObj.y2 || 0) + (draggedObj.qy || 0)) / 3;
        } else if (draggedObj.type === 'pencil') {
          const pts = draggedObj.points || [];
          if (pts.length > 0) {
            cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
            cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
          }
        } else {
          cx = (draggedObj.x || 0) + (draggedObj.width || 0) / 2;
          cy = (draggedObj.y || 0) + (draggedObj.height || 0) / 2;
        }

        const newSnap = findSnapshotAtCoords(cx, cy);
        if (newSnap && newSnap.id !== draggedObj.snapshotId) {
          onObjectsChange(objects.map((o) => o.id === draggedObj.id ? { ...o, snapshotId: newSnap.id } : o));
          onSelectSnapshot(newSnap.id);
        }
      }
      setDragObject(null);
      return;
    }

    if (resizeObject) {
      setResizeObject(null);
      return;
    }

    if (isDrawing && activeSnapshotId) {
      setIsDrawing(false);
      const activeSnap = snapshots.find((s) => s.id === activeSnapshotId);
      if (!activeSnap) return;

      const newId = `${tool}_${Date.now()}`;
      let newObj: WhiteboardObject | null = null;

      if (tool === 'pencil' && pencilPoints.length > 1) {
        newObj = {
          id: newId,
          snapshotId: activeSnapshotId,
          type: 'pencil',
          points: pencilPoints,
          color,
          thickness,
          semanticType: 'Sketch',
          label: 'Freehand Sketch',
        };
      } else if (tempShape) {
        if (tool === 'arrow') {
          newObj = {
            id: newId,
            snapshotId: activeSnapshotId,
            type: 'arrow',
            x1: tempShape.x1,
            y1: tempShape.y1,
            x2: tempShape.x2,
            y2: tempShape.y2,
            color,
            thickness: thickness + 1,
            semanticType: 'ForceVector',
            label: 'Vector Arrow',
            properties: {}
          };
        } else if (tool === 'curve') {
          const x1 = tempShape.x1;
          const y1 = tempShape.y1;
          const x2 = tempShape.x2;
          const y2 = tempShape.y2;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          let qx = midX;
          let qy = midY;
          if (len > 0) {
            const offset = len * 0.2;
            qx = midX - (dy / len) * offset;
            qy = midY + (dx / len) * offset;
          } else {
            qx = midX - 20;
            qy = midY - 20;
          }
          newObj = {
            id: newId,
            snapshotId: activeSnapshotId,
            type: 'curve',
            x1,
            y1,
            x2,
            y2,
            qx,
            qy,
            color,
            thickness,
            semanticType: 'Trajectory',
            label: 'Curved Path',
            properties: {}
          };
        } else if (tool === 'rectangle') {
          newObj = {
            id: newId,
            snapshotId: activeSnapshotId,
            type: 'rectangle',
            x: tempShape.x,
            y: tempShape.y,
            width: tempShape.width || 30,
            height: tempShape.height || 30,
            color,
            thickness,
            semanticType: 'Block',
            label: 'Block',
            properties: {}
          };
        } else if (tool === 'triangle') {
          newObj = {
            id: newId,
            snapshotId: activeSnapshotId,
            type: 'triangle',
            x: tempShape.x,
            y: tempShape.y,
            width: tempShape.width || 40,
            height: tempShape.height || 40,
            color,
            thickness,
            semanticType: 'Wedge',
            label: 'Wedge Incline',
            properties: {}
          };
        } else if (tool === 'circle') {
          newObj = {
            id: newId,
            snapshotId: activeSnapshotId,
            type: 'circle',
            x: tempShape.x1,
            y: tempShape.y1,
            radius: tempShape.radius || 15,
            color,
            thickness,
            semanticType: 'Particle',
            label: 'Circle Object',
            properties: {}
          };
        }
      }

      if (newObj) {
        onObjectsChange([...objects, newObj]);
        onSelectObject(newObj.id);
      }

      setPencilPoints([]);
      setTempShape(null);
    }
  };

  // Add text input object
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return;
    onActionStart?.();
    const coords = getCanvasCoords(e);
    let targetSnap = findSnapshotAtCoords(coords.x, coords.y);

    let targetSnapId = '';
    if (!targetSnap) {
      // Create a new snapshot centered at double-click location
      const newIndex = snapshots.length;
      const newId = `snapshot_${Date.now()}`;
      const snapX = Math.round(coords.x - 340);
      const snapY = Math.round(coords.y - 240);
      const newSnapshot: WhiteboardSnapshot = {
        id: newId,
        title: `${newIndex + 1}. Diagram ${newIndex + 1}`,
        description: `Created at board location (${coords.x.toFixed(0)}, ${coords.y.toFixed(0)}).`,
        index: newIndex,
        x: snapX,
        y: snapY,
        width: 680,
        height: 480,
      };
      onSnapshotsChange([...snapshots, newSnapshot]);
      onSelectSnapshot(newId);
      targetSnapId = newId;
    } else {
      targetSnapId = targetSnap.id;
    }

    const textVal = prompt('Enter text or equation:', 'm * g');
    if (textVal) {
      const newObj: WhiteboardObject = {
        id: `text_${Date.now()}`,
        snapshotId: targetSnapId,
        type: 'text',
        x: coords.x,
        y: coords.y,
        text: textVal,
        color,
        thickness: 1,
        semanticType: textVal.includes('=') ? 'Equation' : 'Label',
        label: 'Text Label',
        properties: {}
      };
      onObjectsChange([...objects, newObj]);
      onSelectObject(newObj.id);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setScale((s) => Math.min(2.5, s + 0.1));
  const handleZoomOut = () => setScale((s) => Math.max(0.4, s - 0.1));
  const handleResetZoom = () => {
    setScale(0.9);
    setPanX(40);
    setPanY(20);
  };

  useEffect(() => {
    handleResetZoom();
  }, []);

  // Duplicate the selected snapshot
  const handleAddSnapshot = () => {
    if (!activeSnapshotId) return;
    const sourceSnap = snapshots.find((s) => s.id === activeSnapshotId);
    if (!sourceSnap) return;

    onActionStart?.();

    const newIndex = snapshots.length;
    const newId = `snapshot_${Date.now()}`;
    const newX = sourceSnap.x + sourceSnap.width + 160; // 160px spacing

    const newSnapshot: WhiteboardSnapshot = {
      id: newId,
      title: `${newIndex + 1}. Step ${newIndex + 1}`,
      description: `Cloned from ${sourceSnap.title}. Explain changes here.`,
      index: newIndex,
      x: newX,
      y: sourceSnap.y,
      width: sourceSnap.width,
      height: sourceSnap.height,
    };

    const dx = newX - sourceSnap.x;
    const dy = 0;

    // Duplicate all objects in the active snapshot and shift them absolutely
    const duplicatedObjects = objects
      .filter((obj) => obj.snapshotId === sourceSnap.id)
      .map((obj) => ({
        ...obj,
        id: `${obj.type}_dup_${Math.random().toString(36).substr(2, 5)}`,
        snapshotId: newId,
        x: obj.x !== undefined ? obj.x + dx : undefined,
        y: obj.y !== undefined ? obj.y + dy : undefined,
        x1: obj.x1 !== undefined ? obj.x1 + dx : undefined,
        y1: obj.y1 !== undefined ? obj.y1 + dy : undefined,
        x2: obj.x2 !== undefined ? obj.x2 + dx : undefined,
        y2: obj.y2 !== undefined ? obj.y2 + dy : undefined,
        points: obj.points ? obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
      }));

    onSnapshotsChange([...snapshots, newSnapshot]);
    onObjectsChange([...objects, ...duplicatedObjects]);
    onSelectSnapshot(newId);
    onSelectObject(null);
  };

  return (
    <div className="relative flex-1 bg-slate-50 overflow-hidden h-full select-none" id="whiteboard_container">
      {/* Zoom / Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-white/95 backdrop-blur shadow-sm rounded-lg p-2 border border-slate-200">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
          title="Fit Canvas"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
        <div className="h-px bg-slate-200 my-1" />
        <button
          onClick={handleAddSnapshot}
          disabled={!activeSnapshotId}
          className="p-1.5 hover:bg-emerald-50 text-emerald-600 disabled:opacity-40 disabled:hover:bg-transparent rounded transition-colors"
          title="Duplicate Active Snapshot & Create Transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Main SVG Infinite Canvas */}
      <svg
        ref={svgRef}
        className={`w-full h-full cursor-${isPanning ? 'grabbing' : spacePressed ? 'grab' : tool === 'select' ? 'grab' : 'crosshair'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      >
        {/* Render inside a group with Zoom/Pan transformation */}
        <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
          
          {/* Background grid lines for infinite paper look */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
            {/* Arrow marker for force arrows */}
            <marker
              id="arrow-marker"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="context-stroke" />
            </marker>
            <marker
              id="transition-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
          </defs>
          <rect id="grid-background" x="-10000" y="-10000" width="20000" height="20000" fill="url(#grid)" />

          {/* Render Snapshot Transition Arrows */}
          {snapshots.map((snap, idx) => {
            if (idx === snapshots.length - 1) return null;
            const nextSnap = snapshots[idx + 1];
            // Compute arrow endpoints
            const x1 = snap.x + snap.width;
            const y1 = snap.y + snap.height / 2;
            const x2 = nextSnap.x;
            const y2 = nextSnap.y + nextSnap.height / 2;

            return (
              <g key={`transition_${snap.id}`}>
                {/* Horizontal line curve connecting step boards */}
                <path
                  d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2 - 12} ${y2}`}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  markerEnd="url(#transition-arrow)"
                />
                <rect
                  x={(x1 + x2) / 2 - 50}
                  y={(y1 + y2) / 2 - 12}
                  width="100"
                  height="24"
                  rx="12"
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 + 4}
                  fill="#475569"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  Step {idx + 1} → {idx + 2}
                </text>
              </g>
            );
          })}

          {/* Render Whiteboard Snapshots (Frames) */}
          {snapshots.map((snap) => {
            const isActive = snap.id === activeSnapshotId;

            return (
              <g key={snap.id} id={`snap_frame_${snap.id}`}>
                {/* Outer frame container - rendered 60px taller for interactive footer */}
                <rect
                  x={snap.x}
                  y={snap.y}
                  width={snap.width}
                  height={snap.height + 60}
                  rx="12"
                  fill="#ffffff"
                  stroke={isActive ? '#3b82f6' : '#cbd5e1'}
                  strokeWidth={isActive ? '3' : '1.5'}
                  className={`shadow-md ${tool === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                  onMouseDown={handleSnapshotDragStart(snap.id)}
                  onClick={(e) => {
                    onSelectSnapshot(snap.id);
                    onSelectObject(null);
                    e.stopPropagation();
                  }}
                />

                {/* Title Header Bar */}
                <rect
                  x={snap.x}
                  y={snap.y}
                  width={snap.width}
                  height="45"
                  rx="12"
                  fill={isActive ? '#eff6ff' : '#f8fafc'}
                  className={`${tool === 'select' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                  onMouseDown={handleSnapshotDragStart(snap.id)}
                />
                {/* Header separator line */}
                <line
                  x1={snap.x}
                  y1={snap.y + 45}
                  x2={snap.x + snap.width}
                  y2={snap.y + 45}
                  stroke={isActive ? '#bfdbfe' : '#e2e8f0'}
                  strokeWidth="1.5"
                />

                {/* Title Text */}
                <text
                  x={snap.x + 16}
                  y={snap.y + 28}
                  fill={isActive ? '#1e40af' : '#1e293b'}
                  fontWeight="bold"
                  fontSize="16"
                  fontFamily="sans-serif"
                  className="pointer-events-none select-none"
                >
                  {snap.title}
                </text>

                {/* Visual Grab Handle for Draggability */}
                <g className="text-slate-400 cursor-grab opacity-40 pointer-events-none">
                  <circle cx={snap.x + snap.width - 72} cy={snap.y + 19} r="1.5" fill="currentColor" />
                  <circle cx={snap.x + snap.width - 72} cy={snap.y + 25} r="1.5" fill="currentColor" />
                  <circle cx={snap.x + snap.width - 72} cy={snap.y + 31} r="1.5" fill="currentColor" />
                  <circle cx={snap.x + snap.width - 66} cy={snap.y + 19} r="1.5" fill="currentColor" />
                  <circle cx={snap.x + snap.width - 66} cy={snap.y + 25} r="1.5" fill="currentColor" />
                  <circle cx={snap.x + snap.width - 66} cy={snap.y + 31} r="1.5" fill="currentColor" />
                </g>

                {/* Delete Snapshot Button */}
                <foreignObject
                  x={snap.x + snap.width - 42}
                  y={snap.y + 6}
                  width="32"
                  height="32"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this step diagram? All objects drawn in this diagram will be deleted.')) {
                        onActionStart?.();
                        // Remove snapshot
                        const updatedSnapshots = snapshots.filter((s) => s.id !== snap.id);
                        onSnapshotsChange(updatedSnapshots);
                        // Remove all objects belonging to this snapshot
                        const updatedObjects = objects.filter((o) => o.snapshotId !== snap.id);
                        onObjectsChange(updatedObjects);
                        // If deleted snapshot was active, set a different active snapshot
                        if (activeSnapshotId === snap.id) {
                          if (updatedSnapshots.length > 0) {
                            onSelectSnapshot(updatedSnapshots[updatedSnapshots.length - 1].id);
                          } else {
                            // Create a new blank snapshot if all are deleted
                            const newId = `snapshot_${Date.now()}`;
                            const newSnapshot: WhiteboardSnapshot = {
                              id: newId,
                              title: '1. Diagram 1',
                              description: 'Describe the changes or derivation steps in this snapshot.',
                              index: 0,
                              x: 50,
                              y: 100,
                              width: 680,
                              height: 480,
                            };
                            onSnapshotsChange([newSnapshot]);
                            onSelectSnapshot(newId);
                          }
                        }
                      }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer"
                    title="Delete this step diagram"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                </foreignObject>

                {/* Snapshot Description / Explanation Caption underneath */}
                <foreignObject
                  x={snap.x + 16}
                  y={snap.y + snap.height - 75}
                  width={snap.width - 32}
                  height="65"
                  className="pointer-events-auto"
                >
                  <div className="text-slate-600 text-xs leading-relaxed font-sans border-t border-slate-100 pt-2 h-full overflow-y-auto select-text">
                    <KatexRenderer text={snap.description || "Describe the changes or derivation steps in this snapshot."} isFormula={false} />
                  </div>
                </foreignObject>

                {/* Separator line between canvas area and footer controls */}
                <line
                  x1={snap.x}
                  y1={snap.y + snap.height}
                  x2={snap.x + snap.width}
                  y2={snap.y + snap.height}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {/* Continue and Follow-up Question Footer Panel */}
                <foreignObject
                  x={snap.x}
                  y={snap.y + snap.height}
                  width={snap.width}
                  height="60"
                >
                  <div className="w-full h-full bg-slate-50 px-4 flex items-center justify-between border-t border-slate-100 rounded-b-xl gap-3">
                    {/* Continue Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSendMessage) {
                          onSendMessage(`Great, please explain the next step after "${snap.title}"!`);
                        }
                      }}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                      title="Click to have AI explain the next step"
                    >
                      <span>Continue Step</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                    </button>

                    <div className="h-5 w-px bg-slate-200 shrink-0" />

                    {/* Follow-up Question Input Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const typedText = followUpTexts[snap.id] || '';
                        if (!typedText.trim() || isGenerating) return;
                        if (onSendMessage) {
                          onSendMessage(`Regarding "${snap.title}": ${typedText.trim()}`);
                          // Clear the text box after sending
                          setFollowUpTexts({
                            ...followUpTexts,
                            [snap.id]: '',
                          });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent double clicks or canvas selections
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseUp={(e) => e.stopPropagation()}
                      className="flex-1 flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Ask a follow-up question about this step..."
                        value={followUpTexts[snap.id] || ''}
                        onChange={(e) => {
                          setFollowUpTexts({
                            ...followUpTexts,
                            [snap.id]: e.target.value,
                          });
                        }}
                        disabled={isGenerating}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700"
                      />
                      <button
                        type="submit"
                        disabled={!followUpTexts[snap.id]?.trim() || isGenerating}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 disabled:opacity-40 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                        title="Send question"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </button>
                    </form>
                  </div>
                </foreignObject>

                {/* Render local semantic objects inside this Snapshot */}
                {objects
                  .filter((obj) => obj.snapshotId === snap.id)
                  .map((obj) => {
                    const isSelected = obj.id === selectedObjectId;
                    const strokeColor = obj.color;
                    const widthVal = obj.width || 0;
                    const heightVal = obj.height || 0;

                    // Calculate center for rotation
                    let cx = 0;
                    let cy = 0;
                    if (obj.type === 'rectangle' || obj.type === 'triangle') {
                      cx = (obj.x || 0) + widthVal / 2;
                      cy = (obj.y || 0) + heightVal / 2;
                    } else if (obj.type === 'circle') {
                      cx = obj.x || 0;
                      cy = obj.y || 0;
                    } else if (obj.type === 'arrow') {
                      cx = ((obj.x1 || 0) + (obj.x2 || 0)) / 2;
                      cy = ((obj.y1 || 0) + (obj.y2 || 0)) / 2;
                    } else if (obj.type === 'curve') {
                      cx = ((obj.x1 || 0) + (obj.x2 || 0) + (obj.qx || 0)) / 3;
                      cy = ((obj.y1 || 0) + (obj.y2 || 0) + (obj.qy || 0)) / 3;
                    } else if (obj.type === 'text') {
                      cx = obj.x || 0;
                      cy = obj.y || 0;
                    } else if (obj.type === 'pencil' && obj.points && obj.points.length > 0) {
                      const pts = obj.points;
                      const sumX = pts.reduce((acc, p) => acc + p.x, 0);
                      const sumY = pts.reduce((acc, p) => acc + p.y, 0);
                      cx = sumX / pts.length;
                      cy = sumY / pts.length;
                    }

                    const rotationTransform = obj.rotation ? `rotate(${obj.rotation}, ${cx}, ${cy})` : undefined;

                    const selectGlow = isSelected ? (
                      <g className="pointer-events-none">
                        {obj.type === 'rectangle' && (
                          <rect
                            x={(obj.x || 0) - 4}
                            y={(obj.y || 0) - 4}
                            width={widthVal + 8}
                            height={heightVal + 8}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                          />
                        )}
                        {obj.type === 'triangle' && (
                          <rect
                            x={(obj.x || 0) - 4}
                            y={(obj.y || 0) - 4}
                            width={widthVal + 8}
                            height={heightVal + 8}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                          />
                        )}
                        {obj.type === 'circle' && (
                          <circle
                            cx={obj.x || 0}
                            cy={obj.y || 0}
                            r={(obj.radius || 0) + 4}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                          />
                        )}
                        {obj.type === 'arrow' && (
                          <line
                            x1={obj.x1 || 0}
                            y1={obj.y1 || 0}
                            x2={obj.x2 || 0}
                            y2={obj.y2 || 0}
                            stroke="#3b82f6"
                            strokeWidth={obj.thickness + 4}
                            opacity="0.3"
                          />
                        )}
                        {obj.type === 'curve' && (
                          <path
                            d={`M ${obj.x1 || 0} ${obj.y1 || 0} Q ${obj.qx || 0} ${obj.qy || 0} ${obj.x2 || 0} ${obj.y2 || 0}`}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={obj.thickness + 4}
                            opacity="0.3"
                          />
                        )}
                      </g>
                    ) : null;

                    const handleDragStart = (e: React.MouseEvent) => {
                      onSelectObject(obj.id);
                      onSelectSnapshot(snap.id);
                      onActionStart?.();
                      const startCoords = getCanvasCoords(e);
                      setDragObject({
                        id: obj.id,
                        startX: startCoords.x,
                        startY: startCoords.y,
                        initialCoords: { ...obj },
                      });
                      e.stopPropagation();
                    };

                    const handleResizeStart = (type: any) => (e: React.MouseEvent) => {
                      onActionStart?.();
                      const startCoords = getCanvasCoords(e);
                      setResizeObject({
                        id: obj.id,
                        type,
                        startX: startCoords.x,
                        startY: startCoords.y,
                        initialCoords: { ...obj },
                      });
                      e.stopPropagation();
                    };

                    let deleteBtnX = 0;
                    let deleteBtnY = 0;
                    if (obj.type === 'rectangle' || obj.type === 'triangle') {
                      deleteBtnX = (obj.x || 0) + widthVal + 8;
                      deleteBtnY = (obj.y || 0) - 16;
                    } else if (obj.type === 'circle') {
                      const r = obj.radius || 15;
                      deleteBtnX = (obj.x || 0) + r + 8;
                      deleteBtnY = (obj.y || 0) - r - 16;
                    } else if (obj.type === 'arrow') {
                      deleteBtnX = Math.max(obj.x1 || 0, obj.x2 || 0) + 8;
                      deleteBtnY = Math.min(obj.y1 || 0, obj.y2 || 0) - 16;
                    } else if (obj.type === 'curve') {
                      deleteBtnX = Math.max(obj.x1 || 0, obj.x2 || 0, obj.qx || 0) + 8;
                      deleteBtnY = Math.min(obj.y1 || 0, obj.y2 || 0, obj.qy || 0) - 16;
                    } else if (obj.type === 'text') {
                      const textWidth = Math.max(40, (obj.text || '').length * 8 + 12);
                      deleteBtnX = (obj.x || 0) + textWidth + 8;
                      deleteBtnY = (obj.y || 0) - 24;
                    } else if (obj.type === 'pencil' && obj.points && obj.points.length > 0) {
                      const pts = obj.points;
                      const maxX = Math.max(...pts.map(p => p.x));
                      const minY = Math.min(...pts.map(p => p.y));
                      deleteBtnX = maxX + 8;
                      deleteBtnY = minY - 16;
                    }

                    const floatingDeleteBtn = isSelected ? (
                      <foreignObject
                        x={deleteBtnX}
                        y={deleteBtnY}
                        width="24"
                        height="24"
                        className="overflow-visible pointer-events-auto"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionStart?.();
                            onObjectsChange(objects.filter((o) => o.id !== obj.id));
                            onSelectObject(null);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full shadow-md hover:scale-110 transition-all cursor-pointer border border-white"
                          title="Delete object"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </foreignObject>
                    ) : null;

                    return (
                      <g key={obj.id} id={`board_obj_${obj.id}`} transform={rotationTransform}>
                        {selectGlow}
                        {floatingDeleteBtn}

                        {/* Rectangle */}
                        {obj.type === 'rectangle' && (
                          <g>
                            <rect
                              x={obj.x || 0}
                              y={obj.y || 0}
                              width={widthVal}
                              height={heightVal}
                              fill={obj.color || '#1e293b'}
                              fillOpacity={0.08}
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {isSelected && (
                              <circle
                                cx={(obj.x || 0) + widthVal}
                                cy={(obj.y || 0) + heightVal}
                                r="5"
                                fill="#3b82f6"
                                className="cursor-se-resize"
                                onMouseDown={handleResizeStart('rect')}
                              />
                            )}
                          </g>
                        )}

                        {/* Triangle (Wedge incline) */}
                        {obj.type === 'triangle' && (
                          <g>
                            <polygon
                              points={`
                                ${obj.x || 0},${(obj.y || 0) + heightVal} 
                                ${(obj.x || 0) + widthVal},${(obj.y || 0) + heightVal} 
                                ${obj.x || 0},${obj.y || 0}
                              `}
                              fill={obj.color || '#1e293b'}
                              fillOpacity={0.08}
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {isSelected && (
                              <circle
                                cx={(obj.x || 0) + widthVal}
                                cy={(obj.y || 0) + heightVal}
                                r="5"
                                fill="#3b82f6"
                                className="cursor-se-resize"
                                onMouseDown={handleResizeStart('rect')}
                              />
                            )}
                          </g>
                        )}

                        {/* Circle */}
                        {obj.type === 'circle' && (
                          <g>
                            <circle
                              cx={obj.x || 0}
                              cy={obj.y || 0}
                              r={obj.radius || 15}
                              fill={obj.color || '#1e293b'}
                              fillOpacity={0.08}
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {isSelected && (
                              <circle
                                cx={(obj.x || 0) + (obj.radius || 15)}
                                cy={obj.y || 0}
                                r="5"
                                fill="#3b82f6"
                                className="cursor-e-resize"
                                onMouseDown={handleResizeStart('circle')}
                              />
                            )}
                          </g>
                        )}

                        {/* Arrow vector */}
                        {obj.type === 'arrow' && (
                          <g>
                            {/* Invisible wider drag target line */}
                            <line
                              x1={obj.x1 || 0}
                              y1={obj.y1 || 0}
                              x2={obj.x2 || 0}
                              y2={obj.y2 || 0}
                              stroke="transparent"
                              strokeWidth={Math.max(16, obj.thickness + 12)}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {/* Visible Arrow */}
                            <line
                              x1={obj.x1 || 0}
                              y1={obj.y1 || 0}
                              x2={obj.x2 || 0}
                              y2={obj.y2 || 0}
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              markerEnd="url(#arrow-marker)"
                              className="pointer-events-none"
                            />
                            {isSelected && (
                              <>
                                <circle
                                  cx={obj.x1 || 0}
                                  cy={obj.y1 || 0}
                                  r="5"
                                  fill="#10b981"
                                  className="cursor-pointer"
                                  onMouseDown={handleResizeStart('arrow-start')}
                                />
                                <circle
                                  cx={obj.x2 || 0}
                                  cy={obj.y2 || 0}
                                  r="5"
                                  fill="#ef4444"
                                  className="cursor-pointer"
                                  onMouseDown={handleResizeStart('arrow-end')}
                                />
                              </>
                            )}
                          </g>
                        )}

                        {/* Curve */}
                        {obj.type === 'curve' && (
                          <g>
                            {/* Invisible wider drag target path */}
                            <path
                              d={`M ${obj.x1 || 0} ${obj.y1 || 0} Q ${obj.qx || 0} ${obj.qy || 0} ${obj.x2 || 0} ${obj.y2 || 0}`}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={Math.max(16, obj.thickness + 12)}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {/* Visible Curve */}
                            <path
                              d={`M ${obj.x1 || 0} ${obj.y1 || 0} Q ${obj.qx || 0} ${obj.qy || 0} ${obj.x2 || 0} ${obj.y2 || 0}`}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              strokeDasharray={obj.semanticType === 'Trajectory' ? '5 5' : undefined}
                              className="pointer-events-none"
                            />
                            {isSelected && (
                              <>
                                {/* Start Point Handle */}
                                <circle
                                  cx={obj.x1 || 0}
                                  cy={obj.y1 || 0}
                                  r="5"
                                  fill="#10b981"
                                  className="cursor-pointer"
                                  onMouseDown={handleResizeStart('curve-start')}
                                />
                                {/* End Point Handle */}
                                <circle
                                  cx={obj.x2 || 0}
                                  cy={obj.y2 || 0}
                                  r="5"
                                  fill="#ef4444"
                                  className="cursor-pointer"
                                  onMouseDown={handleResizeStart('curve-end')}
                                />
                                {/* Curve Control Point Handle (Bend handle) */}
                                <circle
                                  cx={obj.qx || 0}
                                  cy={obj.qy || 0}
                                  r="6"
                                  fill="#a855f7"
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  className="cursor-pointer"
                                  title="Drag to bend curve"
                                  onMouseDown={handleResizeStart('curve-control')}
                                />
                                {/* Dotted lines from control point to endpoints */}
                                <line
                                  x1={obj.x1 || 0}
                                  y1={obj.y1 || 0}
                                  x2={obj.qx || 0}
                                  y2={obj.qy || 0}
                                  stroke="#a855f7"
                                  strokeWidth="1"
                                  strokeDasharray="2 2"
                                  opacity="0.5"
                                  className="pointer-events-none"
                                />
                                <line
                                  x1={obj.x2 || 0}
                                  y1={obj.y2 || 0}
                                  x2={obj.qx || 0}
                                  y2={obj.qy || 0}
                                  stroke="#a855f7"
                                  strokeWidth="1"
                                  strokeDasharray="2 2"
                                  opacity="0.5"
                                  className="pointer-events-none"
                                />
                              </>
                            )}
                          </g>
                        )}

                        {/* Text / Equation */}
                        {obj.type === 'text' && (
                          <g>
                            {/* Invisible wider hit box backing for text */}
                            <rect
                              x={(obj.x || 0) - 8}
                              y={(obj.y || 0) - 22}
                              width={Math.max(40, (obj.text || '').length * 9 + 20)}
                              height="34"
                              fill="rgba(255,255,255,0.01)"
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {/* Render text or beautiful KaTeX using foreignObject */}
                            <foreignObject
                              x={(obj.x || 0) - 6}
                              y={(obj.y || 0) - 20}
                              width={Math.max(160, (obj.text || '').length * 11 + 40)}
                              height="50"
                              className="pointer-events-none select-none overflow-visible"
                            >
                              <div 
                                style={{ color: strokeColor }}
                                className={`text-sm ${obj.semanticType === 'Equation' ? 'font-mono font-semibold' : 'font-sans'}`}
                              >
                                {obj.semanticType === 'Equation' ? (
                                  <KatexRenderer text={obj.text || ''} isFormula={true} inline={true} />
                                ) : (
                                  <KatexRenderer text={obj.text || ''} isFormula={false} inline={true} />
                                )}
                              </div>
                            </foreignObject>
                          </g>
                        )}

                        {/* Freehand Pencil Stroke */}
                        {obj.type === 'pencil' && (
                          <g>
                            {/* Invisible wider target path */}
                            <path
                              d={`M ${(obj.points || []).map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                              fill="none"
                              stroke="transparent"
                              strokeWidth={Math.max(16, obj.thickness + 12)}
                              className="cursor-move"
                              onMouseDown={handleDragStart}
                            />
                            {/* Visible Pencil Stroke */}
                            <path
                              d={`M ${(obj.points || []).map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={obj.thickness}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="pointer-events-none"
                            />
                          </g>
                        )}

                        {/* Object semantic label indicator (rendered only if selected for neatness) */}
                        {isSelected && obj.label && (
                          <g className="pointer-events-none">
                            <rect
                              x={obj.x || obj.x1 || 0}
                              y={(obj.y || obj.y1 || 0) - 26}
                              width={obj.label.length * 7 + 16}
                              height="18"
                              rx="4"
                              fill="#1e293b"
                              opacity="0.9"
                            />
                            <text
                              x={(obj.x || obj.x1 || 0) + 8}
                              y={(obj.y || obj.y1 || 0) - 13}
                              fill="#ffffff"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {obj.label} ({obj.semanticType})
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                {/* Render live temp drawing preview */}
                {isDrawing && activeSnapshotId === snap.id && (
                  <g className="pointer-events-none">
                    {tool === 'pencil' && pencilPoints.length > 0 && (
                      <path
                        d={`M ${pencilPoints.map((p) => `${p.x} ${p.y}`).join(' L ')}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {tool === 'rectangle' && tempShape && (
                      <rect
                        x={tempShape.x}
                        y={tempShape.y}
                        width={tempShape.width}
                        height={tempShape.height}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                      />
                    )}
                    {tool === 'triangle' && tempShape && (
                      <polygon
                        points={`
                          ${tempShape.x},${tempShape.y + tempShape.height} 
                          ${tempShape.x + tempShape.width},${tempShape.y + tempShape.height} 
                          ${tempShape.x},${tempShape.y}
                        `}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                      />
                    )}
                    {tool === 'circle' && tempShape && (
                      <circle
                        cx={tempShape.x1}
                        cy={tempShape.y1}
                        r={tempShape.radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                      />
                    )}
                    {tool === 'arrow' && tempShape && (
                      <line
                        x1={tempShape.x1}
                        y1={tempShape.y1}
                        x2={tempShape.x2}
                        y2={tempShape.y2}
                        stroke={color}
                        strokeWidth={thickness + 1}
                        markerEnd="url(#arrow-marker)"
                      />
                    )}
                    {tool === 'curve' && tempShape && (
                      <path
                        d={`M ${tempShape.x1} ${tempShape.y1} Q ${(tempShape.x1 + tempShape.x2) / 2} ${(tempShape.y1 + tempShape.y2) / 2} ${tempShape.x2} ${tempShape.y2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={thickness}
                      />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
