/**
 * Shared Type Definitions for the AI Whiteboard Tutor
 */

export type ObjectType = 'rectangle' | 'triangle' | 'circle' | 'arrow' | 'text' | 'pencil' | 'curve';

export interface WhiteboardObject {
  id: string;
  snapshotId: string;
  type: ObjectType;
  rotation?: number; // Rotation in degrees (0 to 360)
  
  // Position / Size relative to the snapshot top-left corner
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  
  // For line segments / vectors
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;

  // For quadratic Bezier curves
  qx?: number;
  qy?: number;
  
  // For freehand drawing (pencil)
  points?: { x: number; y: number }[];
  
  // Display text for Text/Equation objects
  text?: string;
  
  // Styling properties
  color: string;
  thickness: number;
  
  // Semantic properties (invisible to the user but available to the AI)
  semanticType?: string; // e.g. 'Block', 'Wedge', 'ForceVector', 'Equation', 'AngleLabel'
  label?: string; // Human-friendly descriptor (e.g. "Gravity Force")
  
  // Relationship mappings
  properties?: {
    mass?: string;
    angle?: string;
    friction?: string;
    attached_to?: string; // ID of other object
    resting_on?: string; // ID of other object
    refers_to?: string; // ID of other object
    [key: string]: any;
  };
}

export interface WhiteboardSnapshot {
  id: string;
  title: string;
  description: string; // The text caption explaining what changed in this step
  index: number;
  
  // Canvas coordinate of this snapshot frame
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  timestamp: string;
  
  // Actions performed on the whiteboard by the tutor in this response
  actionsPerformed?: TutorAction[];
}

export type TutorActionType = 
  | 'CREATE_SNAPSHOT'
  | 'DUPLICATE_SNAPSHOT'
  | 'UPDATE_SNAPSHOT_METADATA'
  | 'CREATE_OBJECT'
  | 'UPDATE_OBJECT'
  | 'DELETE_OBJECT'
  | 'HIGHLIGHT_OBJECT';

export interface TutorAction {
  type: TutorActionType;
  payload: any;
}
