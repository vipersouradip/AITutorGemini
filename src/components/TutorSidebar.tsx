import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, WhiteboardSnapshot, WhiteboardObject } from '../types';
import { Send, Sparkles, GraduationCap, ArrowUpRight, HelpCircle, RefreshCcw, CheckSquare, Compass, ChevronLeft, Plus } from 'lucide-react';

interface TutorSidebarProps {
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  onSendMessage: (msg: string) => void;
  onLoadLessonPreset: (presetName: 'plane' | 'orbit' | 'pendulum') => void;
  activeSnapshotId: string | null;
  snapshots: WhiteboardSnapshot[];
  onStartFresh: (topic: string) => void;
  onCollapse: () => void;
}

export const TutorSidebar: React.FC<TutorSidebarProps> = ({
  chatHistory,
  isGenerating,
  onSendMessage,
  onLoadLessonPreset,
  activeSnapshotId,
  snapshots,
  onStartFresh,
  onCollapse,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'fresh'>('chat');
  const [freshTopic, setFreshTopic] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { title: 'Projectile Motion', desc: 'Study launch velocity vectors, parabolas, gravity components, and drag equations.' },
    { title: 'Simple Harmonic Motion', desc: 'Observe a block sliding back and forth connected to a spring on a frictionless surface.' },
    { title: 'Optics Reflection', desc: 'Analyze incoming light rays, angle of incidence θ1, angle of refraction θ2, and Snell\'s Law.' },
    { title: 'Circuits & Ohm\'s Law', desc: 'Model resistors, voltages, currents, and loop equations.' }
  ];

  const handleStartFreshSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freshTopic.trim() || isGenerating) return;
    onStartFresh(freshTopic.trim());
    setFreshTopic('');
    setActiveTab('chat');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isGenerating]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickQuestion = (text: string) => {
    if (isGenerating) return;
    onSendMessage(text);
  };

  // Safe markdown-lite formatter to render code blocks, equations, and bold text beautifully
  const renderMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold rendering
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Equation / inline code rendering
      formatted = formatted.replace(/`(.*?)`/g, '<code class="px-1 py-0.5 bg-slate-100 border border-slate-200 text-xs rounded font-mono text-indigo-600">$1</code>');
      
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li
            key={idx}
            className="text-sm text-slate-700 ml-4 list-disc mb-1"
            dangerouslySetInnerHTML={{ __html: formatted.trim().substring(2) }}
          />
        );
      }
      if (line.trim().match(/^\d+\.\s/)) {
        const content = line.trim().replace(/^\d+\.\s/, '');
        return (
          <li
            key={idx}
            className="text-sm text-slate-700 ml-4 list-decimal mb-1"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p
          key={idx}
          className="text-sm text-slate-700 leading-relaxed mb-1.5"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  };

  return (
    <div className="w-96 border-r border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-hidden" id="tutor_sidebar">
      {/* Header Info */}
      <div className="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">AI Whiteboard Tutor</h2>
            <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected • Ready to Teach
            </p>
          </div>
        </div>
        <button
          onClick={onCollapse}
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
            activeTab === 'chat'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Active Study Chat
        </button>
        <button
          onClick={() => setActiveTab('fresh')}
          className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
            activeTab === 'fresh'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Ask New Topic (Start Fresh)
        </button>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Lesson / Board Presets Selection */}
          <div className="p-3 bg-white border-b border-slate-100 flex flex-col gap-2 shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Select Study Lesson Preset
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onLoadLessonPreset('plane')}
                className="flex flex-col items-center gap-1 p-2 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-md text-[10px] font-medium text-slate-600 transition-all text-center"
              >
                <Compass className="w-4 h-4 text-slate-500" />
                <span className="truncate w-full">Inclined Plane</span>
              </button>
              <button
                onClick={() => onLoadLessonPreset('orbit')}
                className="flex flex-col items-center gap-1 p-2 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-md text-[10px] font-medium text-slate-600 transition-all text-center"
              >
                <Sparkles className="w-4 h-4 text-slate-500" />
                <span className="truncate w-full">Orbital Gravity</span>
              </button>
              <button
                onClick={() => onLoadLessonPreset('pendulum')}
                className="flex flex-col items-center gap-1 p-2 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 rounded-md text-[10px] font-medium text-slate-600 transition-all text-center"
              >
                <RefreshCcw className="w-4 h-4 text-slate-500" />
                <span className="truncate w-full">Simple Pendulum</span>
              </button>
            </div>
          </div>

          {/* Chat Conversation Logs */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <GraduationCap className="w-12 h-12 stroke-[1] text-indigo-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No History Yet</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                  Choose a study lesson preset above or ask the AI tutor a custom teaching question.
                </p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender & Timestamp */}
                  <span className="text-[9px] text-slate-400 font-medium mb-1 px-1">
                    {msg.sender === 'student' ? 'Student' : 'AI Tutor'} • {msg.timestamp}
                  </span>

                  {/* Chat Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                      msg.sender === 'student'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    {msg.sender === 'student' ? (
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    ) : (
                      <div className="space-y-1">{renderMessageText(msg.text)}</div>
                    )}
                  </div>

                  {/* Visual action markers indicating whiteboard changes done by tutor */}
                  {msg.sender === 'tutor' && msg.actionsPerformed && msg.actionsPerformed.length > 0 && (
                    <div className="mt-1 px-1 flex flex-wrap gap-1">
                      {msg.actionsPerformed.map((act, aIdx) => (
                        <span
                          key={aIdx}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[9px] text-emerald-700 border border-emerald-100 font-mono"
                        >
                          <CheckSquare className="w-2.5 h-2.5" />
                          {act.type === 'DUPLICATE_SNAPSHOT' && 'Duplicated Snapshot'}
                          {act.type === 'CREATE_OBJECT' && `Drew ${act.payload.type || 'Object'}`}
                          {act.type === 'UPDATE_OBJECT' && `Edited Object`}
                          {act.type === 'DELETE_OBJECT' && `Erased Object`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* AI Thinking indicator */}
            {isGenerating && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] text-slate-400 font-medium mb-1 px-1">
                  AI Tutor is drawing/reasoning...
                </span>
                <div className="bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Preset Action Prompt Tags */}
          <div className="p-3 border-t border-slate-100 bg-white flex flex-col gap-1.5 shrink-0">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
              Tutor Quick Prompts
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => handleQuickQuestion('Please review my current diagram on the active snapshot and tell me if it is correct.')}
                disabled={isGenerating || !activeSnapshotId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium transition-colors disabled:opacity-50"
              >
                <CheckSquare className="w-3 h-3 text-slate-500" />
                Review Diagram
              </button>
              <button
                onClick={() => handleQuickQuestion('Can you draw the forces acting on the block in the next step, duplicating the snapshot first?')}
                disabled={isGenerating || !activeSnapshotId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium transition-colors disabled:opacity-50"
              >
                <ArrowUpRight className="w-3 h-3 text-slate-500" />
                Draw Force Diagram
              </button>
              <button
                onClick={() => handleQuickQuestion('Explain the mathematical equations for this system and list them on a new snapshot step.')}
                disabled={isGenerating || !activeSnapshotId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium transition-colors disabled:opacity-50"
              >
                <GraduationCap className="w-3 h-3 text-slate-500" />
                Show Equations
              </button>
              <button
                onClick={() => handleQuickQuestion('What is the next logical teaching step for this lesson? Draw it for me.')}
                disabled={isGenerating || !activeSnapshotId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-medium transition-colors disabled:opacity-50"
              >
                <HelpCircle className="w-3 h-3 text-slate-500" />
                Give Me a Hint
              </button>
            </div>
          </div>

          {/* Message Chat Input Form */}
          <form onSubmit={handleFormSubmit} className="p-3 border-t border-slate-200 bg-white flex gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isGenerating}
              placeholder={activeSnapshotId ? "Ask the AI tutor a question..." : "Select an active snapshot first..."}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating || !activeSnapshotId}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-indigo-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      ) : (
        <div className="flex-1 flex flex-col bg-white overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-4 h-4" />
              <h3 className="font-bold text-slate-800 text-sm">Ask Custom Concept</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clear the whiteboard and start a fresh session with your own custom physics or mathematics topic.
            </p>
          </div>

          <form onSubmit={handleStartFreshSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Enter Custom Topic Description
              </label>
              <textarea
                value={freshTopic}
                onChange={(e) => setFreshTopic(e.target.value)}
                rows={3}
                disabled={isGenerating}
                placeholder="e.g. Explain how spring potential energy converts to kinetic energy as a block slides, and show the force vector changes..."
                className="w-full text-xs border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white disabled:opacity-60 resize-none leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!freshTopic.trim() || isGenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs shadow-sm hover:shadow transition-all disabled:opacity-45 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Start Fresh & Teach Concept
            </button>
          </form>

          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Or Choose a Suggestion:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => setFreshTopic(`Explain ${sug.title.toLowerCase()}: ${sug.desc}`)}
                  disabled={isGenerating}
                  className="p-2.5 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
                    {sug.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    {sug.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
