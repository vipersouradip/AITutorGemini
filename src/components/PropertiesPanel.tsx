import React from 'react';
import { WhiteboardObject } from '../types';
import { Sparkles, Trash2, Tag, Link2, Settings, Info, ChevronRight } from 'lucide-react';

interface PropertiesPanelProps {
  selectedObject: WhiteboardObject | null;
  allObjectsInSnapshot: WhiteboardObject[];
  onUpdateObject: (updated: WhiteboardObject) => void;
  onDeleteObject: (id: string) => void;
  onCollapse: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  allObjectsInSnapshot,
  onUpdateObject,
  onDeleteObject,
  onCollapse,
}) => {
  if (!selectedObject) {
    return (
      <div className="w-80 border-l border-slate-200 bg-white p-6 flex flex-col items-center justify-center text-center text-slate-400 relative">
        <button
          onClick={onCollapse}
          className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-colors"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <Settings className="w-10 h-10 stroke-[1.2] mb-3 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No Object Selected</p>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Click any shape, arrow, or text inside a snapshot to edit its semantic properties and relationships.
        </p>
      </div>
    );
  }

  const otherObjects = allObjectsInSnapshot.filter((obj) => obj.id !== selectedObject.id);

  const handleSemanticTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateObject({
      ...selectedObject,
      semanticType: e.target.value,
    });
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateObject({
      ...selectedObject,
      label: e.target.value,
    });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateObject({
      ...selectedObject,
      text: e.target.value,
    });
  };

  const handlePropertyChange = (key: string, value: string) => {
    const properties = { ...(selectedObject.properties || {}), [key]: value };
    onUpdateObject({
      ...selectedObject,
      properties,
    });
  };

  const handleColorSelect = (hex: string) => {
    onUpdateObject({
      ...selectedObject,
      color: hex,
    });
  };

  const presetColors = [
    { name: 'Default Dark', value: '#1e293b' },
    { name: 'Red Force', value: '#ef4444' },
    { name: 'Blue Vector', value: '#3b82f6' },
    { name: 'Green Value', value: '#10b981' },
    { name: 'Orange Tension', value: '#f97316' },
    { name: 'Purple Angle', value: '#a855f7' },
  ];

  const semanticTypeOptions = [
    { value: 'Block', label: 'Mass Block (Rectangle)' },
    { value: 'Wedge', label: 'Wedge/Incline (Triangle)' },
    { value: 'ForceVector', label: 'Force Vector (Arrow)' },
    { value: 'VelocityVector', label: 'Velocity Vector (Arrow)' },
    { value: 'AccelerationVector', label: 'Acceleration Vector (Arrow)' },
    { value: 'DisplacementVector', label: 'Displacement Vector (Arrow)' },
    { value: 'Equation', label: 'Equation (Text)' },
    { value: 'AngleLabel', label: 'Angle Label (Text)' },
    { value: 'Label', label: 'Standard Label (Text)' },
    { value: 'Ceiling', label: 'Fixed Ceiling (Line/Rect)' },
    { value: 'Sketch', label: 'Freehand Sketch (Pencil)' },
  ];

  return (
    <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto" id="properties_panel">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Semantic Metadata</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteObject(selectedObject.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
            title="Delete Object"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onCollapse}
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-colors"
            title="Collapse Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="p-4 space-y-5 flex-1">
        {/* Object Info Badge */}
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>OBJECT ID</span>
            <span className="font-mono">{selectedObject.id.substring(0, 15)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>GRAPHIC TYPE</span>
            <span className="capitalize font-medium text-slate-600">{selectedObject.type}</span>
          </div>
        </div>

        {/* Text/Equation Content (Visible if type is text) */}
        {selectedObject.type === 'text' && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Text / Equation Value
            </label>
            <input
              type="text"
              value={selectedObject.text || ''}
              onChange={handleTextChange}
              className="w-full text-sm font-mono border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
              placeholder="e.g. F = m * a"
            />
          </div>
        )}

        {/* Semantic Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Semantic Concept
          </label>
          <select
            value={selectedObject.semanticType || ''}
            onChange={handleSemanticTypeChange}
            className="w-full text-sm border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="">-- Choose Semantic Category --</option>
            {semanticTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descriptive Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Descriptive Label
          </label>
          <input
            type="text"
            value={selectedObject.label || ''}
            onChange={handleLabelChange}
            className="w-full text-sm border border-slate-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="e.g. Normal Force Vector"
          />
        </div>

        {/* Aesthetic Palette */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Aesthetic Style Color
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presetColors.map((clr) => (
              <button
                key={clr.value}
                onClick={() => handleColorSelect(clr.value)}
                className={`flex items-center gap-1.5 p-1.5 rounded-md border text-[10px] font-medium transition-all ${
                  selectedObject.color === clr.value
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: clr.value }}
                />
                <span className="truncate">{clr.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rotation Property Control */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Rotate Object
            </label>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              {selectedObject.rotation || 0}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            value={selectedObject.rotation || 0}
            onChange={(e) => {
              onUpdateObject({
                ...selectedObject,
                rotation: parseInt(e.target.value) || 0,
              });
            }}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
            <span>270°</span>
            <span>360°</span>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                const current = selectedObject.rotation || 0;
                onUpdateObject({
                  ...selectedObject,
                  rotation: (current - 15 + 360) % 360,
                });
              }}
              className="px-2 py-1 text-[10px] border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-medium font-mono"
            >
              -15°
            </button>
            <button
              onClick={() => {
                const current = selectedObject.rotation || 0;
                onUpdateObject({
                  ...selectedObject,
                  rotation: (current + 15) % 360,
                });
              }}
              className="px-2 py-1 text-[10px] border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-medium font-mono"
            >
              +15°
            </button>
            <button
              onClick={() => {
                const current = selectedObject.rotation || 0;
                // Align block to typical 26.6 degree incline slope (arctan(200/400) = 26.565 degrees)
                onUpdateObject({
                  ...selectedObject,
                  rotation: 27,
                });
              }}
              className="px-2 py-1 text-[10px] border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-medium"
              title="Align directly to wedge incline (~27 degrees)"
            >
              Align Incline
            </button>
            <button
              onClick={() => {
                onUpdateObject({
                  ...selectedObject,
                  rotation: 0,
                });
              }}
              className="px-2 py-1 text-[10px] border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-medium ml-auto"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Semantic Relationships */}
        <div className="pt-2 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <Link2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Interactive Relationships</span>
          </div>

          {/* Attached To Relationship */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium block">
              Attached To (e.g. Force on a Block)
            </label>
            <select
              value={selectedObject.properties?.attached_to || ''}
              onChange={(e) => handlePropertyChange('attached_to', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
            >
              <option value="">-- No Attachment --</option>
              {otherObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label || obj.semanticType || obj.type} ({obj.id.substring(0, 6)})
                </option>
              ))}
            </select>
          </div>

          {/* Resting On Relationship */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium block">
              Resting On (e.g. Block on Incline)
            </label>
            <select
              value={selectedObject.properties?.resting_on || ''}
              onChange={(e) => handlePropertyChange('resting_on', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
            >
              <option value="">-- None --</option>
              {otherObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label || obj.semanticType || obj.type} ({obj.id.substring(0, 6)})
                </option>
              ))}
            </select>
          </div>

          {/* Refers To Relationship */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-500 font-medium block">
              Refers To (e.g. Equation describing a Force)
            </label>
            <select
              value={selectedObject.properties?.refers_to || ''}
              onChange={(e) => handlePropertyChange('refers_to', e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md p-2 bg-white"
            >
              <option value="">-- No Reference --</option>
              {otherObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.label || obj.semanticType || obj.type} ({obj.id.substring(0, 6)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameters for physics wedges, blocks, and forces */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Physics System Constants</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">MASS (m)</label>
              <input
                type="text"
                value={selectedObject.properties?.mass || ''}
                onChange={(e) => handlePropertyChange('mass', e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md p-1.5"
                placeholder="e.g. m"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">SLOPE ANGLE (θ)</label>
              <input
                type="text"
                value={selectedObject.properties?.angle || ''}
                onChange={(e) => handlePropertyChange('angle', e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-md p-1.5"
                placeholder="e.g. 30°"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2 text-[10px] text-slate-400 leading-normal">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          Semantic properties are invisible on the drawing board but are read by the AI Tutor to understand mechanical structure.
        </span>
      </div>
    </div>
  );
};
